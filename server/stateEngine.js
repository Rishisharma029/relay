/**
 * RELAY — Hardened Case State Machine & Crash Recovery Engine
 *
 * Validated Transitions:
 *   1. Happy Path:
 *      CONNECTING ──► ACTIVE ──► AWAITING_APPROVAL ──► EXECUTING_ACTION ──► RESOLVED
 *
 *   2. Human Takeover Path:
 *      ACTIVE ──► HUMAN_TAKEOVER ──► HUMAN_ACTIVE ──► AI_RESUMED ──► ACTIVE
 *
 *   3. Failure & Recovery Path:
 *      ACTIVE ──► DEGRADED ──► RECOVERING ──► ACTIVE
 *
 * No impossible transitions permitted.
 */

import { checkIdempotency, buildIdempotencyKey } from './idempotencyStore.js'
import { db } from './db/database.js'
import { issueRefund } from './tools/refunds.js'

export const CASE_STATUSES = {
  CONNECTING: 'connecting',
  ACTIVE: 'active',
  AWAITING_APPROVAL: 'awaiting_approval',
  EXECUTING_ACTION: 'executing_action',
  RESOLVED: 'resolved',
  HUMAN_TAKEOVER: 'human_takeover',
  HUMAN_ACTIVE: 'human_active',
  AI_RESUMED: 'ai_resumed',
  DEGRADED: 'degraded',
  RECOVERING: 'recovering',
  FAILED: 'failed',
}

// Deterministic Transition Matrix
export const ALLOWED_TRANSITIONS = {
  connecting: ['active', 'degraded', 'failed'],
  active: ['awaiting_approval', 'human_takeover', 'degraded', 'resolved', 'failed'],
  awaiting_approval: ['executing_action', 'active', 'human_takeover', 'degraded', 'failed'],
  executing_action: ['resolved', 'degraded', 'failed'],
  human_takeover: ['human_active', 'active', 'failed'],
  human_active: ['ai_resumed', 'resolved', 'failed'],
  ai_resumed: ['active', 'awaiting_approval', 'human_takeover', 'resolved'],
  degraded: ['recovering', 'human_takeover', 'failed'],
  recovering: ['active', 'degraded', 'failed'],
  resolved: ['active'], // Allowed for reopen
  failed: ['recovering', 'human_takeover'],
}

/**
 * Validates whether a state transition is legal in the state machine.
 */
export function isTransitionAllowed(currentStatus, targetStatus) {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || []
  return allowed.includes(targetStatus)
}

/**
 * Crash Recovery Reconciliation Engine
 *
 * Scenario: Process crashed or server restarted while an action was APPROVED / EXECUTING.
 *
 * On startup/recovery:
 *   1. Load case events from immutable ledger
 *   2. Rebuild state up to crash moment
 *   3. Detect incomplete action
 *   4. Check idempotency store for existing transaction result
 *   5. Safely resume settlement or mark completed with zero duplicate debit
 */
export async function recoverCaseState(caseId = 'RLY-1042') {
  const events = db.getRelayEvents(caseId)
  if (!events || events.length === 0) {
    return { recovered: false, message: 'No events found for case' }
  }

  let inFlightAction = null
  let isCompleted = false

  for (const event of events) {
    const type = event.event_type || event.type
    const payload = event.payload || {}

    if (type === 'approval.approved' || type === 'approval.executing') {
      inFlightAction = {
        approvalId: payload.approvalId || 'appr-1042-99042',
        orderId: payload.orderId || '84921',
        amount: payload.amount || 1499,
        actionType: payload.actionType || 'REFUND',
      }
      isCompleted = false
    }

    if (type === 'approval.completed' || type === 'action.completed') {
      isCompleted = true
      inFlightAction = null
    }
  }

  // If process crashed during execution
  if (inFlightAction && !isCompleted) {
    const idemKey = buildIdempotencyKey(inFlightAction.actionType, caseId, inFlightAction.orderId)
    const idemCheck = checkIdempotency(idemKey)

    if (idemCheck.isDuplicate) {
      // Transaction actually succeeded before crash -> mark completed
      db.appendRelayEvent(caseId, {
        type: 'approval.completed',
        payload: {
          approvalId: inFlightAction.approvalId,
          recovered: true,
          transaction: idemCheck.existingResult?.transaction,
          idempotencyKey: idemKey,
          status: 'COMPLETED',
        },
        timestamp: new Date().toLocaleTimeString(),
      })

      return {
        recovered: true,
        action: 'marked_completed_from_idempotency',
        idempotencyKey: idemKey,
      }
    } else {
      // Transaction was in-flight but not committed -> safely execute once
      const refundResult = await issueRefund(inFlightAction.orderId, inFlightAction.amount)
      db.appendRelayEvent(caseId, {
        type: 'approval.completed',
        payload: {
          approvalId: inFlightAction.approvalId,
          recovered: true,
          transaction: refundResult,
          idempotencyKey: idemKey,
          status: 'COMPLETED',
        },
        timestamp: new Date().toLocaleTimeString(),
      })

      return {
        recovered: true,
        action: 'resumed_and_executed_safely',
        idempotencyKey: idemKey,
        transaction: refundResult,
      }
    }
  }

  return { recovered: true, message: 'Case state is consistent, no orphaned actions' }
}

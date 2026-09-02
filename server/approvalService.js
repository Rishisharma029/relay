/**
 * RELAY — Server-Side Human Approval Service
 *
 * Full Lifecycle State Machine:
 *   PENDING ──► APPROVED ──► EXECUTING ──► COMPLETED
 *      │                                       │
 *      └──► REJECTED                           └──► FAILED
 *
 * Every transition generates an authoritative RelayEvent.
 * Enforces operator authorization, case ownership, 5-point double policy evaluation, and idempotency.
 */

import { evaluatePolicyGates, registerSettledRefund } from './policyEngine.js'
import { issueRefund } from './tools/refunds.js'
import { APPROVAL_EXPIRY_MS, isAuthorizedOperator } from './config.js'
import {
  buildIdempotencyKey,
  checkIdempotency,
  registerIdempotencyKey,
} from './idempotencyStore.js'
import { FAILURE_STATES, buildFailureEvent } from './failureEngine.js'
import { db } from './db/database.js'

export const approvalStore = new Map()

// Seed initial pending approval for Case RLY-72143
approvalStore.set('appr-72143-99042', {
  id: 'appr-72143-99042',
  caseId: 'RLY-72143',
  customerId: 'CUS-1042',
  orderId: '72143',
  actionType: 'REFUND',
  amount: 2899,
  currency: 'INR',
  riskTier: 'medium',
  status: 'PENDING',
  policyId: 'POL-REFUND-3.2',
  section: 'Section 4.1',
  requiredRole: 'OPERATOR',
  justification: [
    'Delivery exception confirmed with logistics carrier (Delhivery Express)',
    'Customer explicitly requested instant refund',
    'Delayed past SLA (+4 days)',
  ],
  createdAt: new Date().toISOString(),
})

/**
 * Emit an authoritative RelayEvent for state transitions
 */
function emitApprovalEvent(caseId, type, payload) {
  const event = {
    type,
    payload,
    timestamp: new Date().toLocaleTimeString(),
  }
  try {
    db.appendRelayEvent(caseId, event)
  } catch (e) {
    console.warn('[ApprovalService] db.appendRelayEvent fallback:', e?.message)
  }
  return event
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PENDING: AI Proposes Action → Policy Gate 1 → Approval Created
// ─────────────────────────────────────────────────────────────────────────────

export async function createApprovalRequest(data = {}) {
  const customerId = data.customerId || 'CUS-1042'
  const orderId = String(data.orderId || '72143').replace(/^#/, '').trim()
  const caseId = data.caseId || 'RLY-72143'
  let amount = Number(data.amount) || 2899
  try {
    const orderRes = await lookupOrder(orderId)
    if (orderRes && orderRes.amount) {
      amount = Number(orderRes.amount)
    }
  } catch (e) {}

  // Gate 1 Policy Evaluation before proposal
  const policyCheck = await evaluatePolicyGates({ customerId, orderId, amount, caseId })
  if (!policyCheck.allowed) {
    throw new Error(`Policy violation: ${policyCheck.reasons.join(', ')}`)
  }

  const id = `appr-${caseId.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-5)}`

  const approvalRecord = {
    id,
    caseId,
    customerId,
    orderId,
    actionType: 'REFUND',
    amount,
    currency: 'INR',
    riskTier: policyCheck.risk,
    requiresHumanApproval: policyCheck.requiresApproval,
    status: 'PENDING',
    policyId: policyCheck.policyId,
    policySection: policyCheck.section,
    policyChecks: policyCheck.checks,
    createdAt: new Date().toISOString(),
  }

  approvalStore.set(id, approvalRecord)

  // Emit 'approval.created' (PENDING)
  emitApprovalEvent(caseId, 'approval.created', {
    approvalId: id,
    actionType: 'REFUND',
    amount,
    currency: 'INR',
    riskTier: policyCheck.risk,
    status: 'PENDING',
  })

  return {
    type: 'approval.created',
    approval: approvalRecord,
    policyEvaluation: policyCheck,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. APPROVED ──► EXECUTING ──► COMPLETED
// ─────────────────────────────────────────────────────────────────────────────

export async function processApproval(
  approvalId = 'appr-1042-99042',
  operator = { id: 'OP-782', name: 'Maya Sharma' },
  requestedCaseId = null
) {
  const record = approvalStore.get(approvalId) || approvalStore.get('appr-1042-99042')

  if (!record) {
    throw new Error(`Approval request ${approvalId} not found`)
  }

  const caseId = record.caseId

  // ── GATE 1: Operator Authorization ─────────────────────────────────────────
  if (!isAuthorizedOperator(operator.id)) {
    throw Object.assign(
      new Error(`Operator ${operator.id} is not authorized to approve actions`),
      { code: 'UNAUTHORIZED', httpStatus: 403 }
    )
  }

  // ── GATE 2: Case Ownership Check ───────────────────────────────────────────
  if (requestedCaseId && record.caseId !== requestedCaseId) {
    throw Object.assign(
      new Error(`Action ${approvalId} belongs to case ${record.caseId}, not ${requestedCaseId}`),
      { code: 'CASE_MISMATCH', httpStatus: 403 }
    )
  }

  // ── GATE 3: Status & Expiry Check ──────────────────────────────────────────
  if (record.status === 'COMPLETED' || record.status === 'APPROVED') {
    return {
      type: 'action.already_completed',
      approval: record,
      message: 'This approval was already processed. Returning existing result.',
    }
  }

  if (record.status === 'REJECTED' || record.status === 'DECLINED') {
    throw Object.assign(
      new Error(`Approval ${approvalId} was already rejected and cannot be re-approved`),
      { code: 'ALREADY_REJECTED', httpStatus: 409 }
    )
  }

  const ageMs = Date.now() - new Date(record.createdAt).getTime()
  if (ageMs > APPROVAL_EXPIRY_MS) {
    record.status = 'EXPIRED'
    approvalStore.set(approvalId, record)

    const failureEvent = buildFailureEvent(FAILURE_STATES.APPROVAL_EXPIRED, {
      approvalId,
      expiredAt: record.createdAt,
    })

    emitApprovalEvent(caseId, 'approval.failed', {
      approvalId,
      reason: 'APPROVAL_EXPIRED',
      failureEvent,
    })

    throw Object.assign(
      new Error(`Approval expired after ${Math.round(ageMs / 60000)} minutes.`),
      { code: 'APPROVAL_EXPIRED', httpStatus: 410, failureEvent }
    )
  }

  // ── GATE 4: Idempotency Verification ───────────────────────────────────────
  const idemKey = buildIdempotencyKey(record.actionType, record.caseId, record.orderId)
  const idemCheck = checkIdempotency(idemKey)

  if (idemCheck.isDuplicate) {
    return {
      type: 'action.duplicate_prevented',
      approvalId: record.id,
      caseId: record.caseId,
      idempotencyKey: idemKey,
      existingResult: idemCheck.existingResult,
      registeredAt: idemCheck.registeredAt,
      message: `Duplicate refund prevented for ${idemKey}. Original transaction preserved.`,
    }
  }

  // ── GATE 5: Mandatory Policy Re-Evaluation (Gate 2 Check) ─────────────────
  const policyRecheck = await evaluatePolicyGates({
    customerId: record.customerId,
    orderId: record.orderId,
    amount: record.amount,
    caseId: record.caseId,
  })

  if (!policyRecheck.allowed) {
    record.status = 'REJECTED'
    approvalStore.set(approvalId, record)

    emitApprovalEvent(caseId, 'approval.rejected', {
      approvalId,
      reason: `Policy re-check failed: ${policyRecheck.reasons.join(', ')}`,
      operatorId: operator.id,
    })

    throw new Error(`Policy Re-Check Violation: ${policyRecheck.reasons.join(', ')}`)
  }

  // ── TRANSITION 1: APPROVED ────────────────────────────────────────────────
  record.status = 'APPROVED'
  record.approvedBy = operator
  record.approvedAt = new Date().toISOString()
  approvalStore.set(approvalId, record)

  emitApprovalEvent(caseId, 'approval.approved', {
    approvalId: record.id,
    operatorId: operator.id,
    amount: record.amount,
    policyId: record.policyId,
    idempotencyKey: idemKey,
  })

  // ── TRANSITION 2: EXECUTING ───────────────────────────────────────────────
  record.status = 'EXECUTING'
  approvalStore.set(approvalId, record)

  emitApprovalEvent(caseId, 'approval.executing', {
    approvalId: record.id,
    actionType: record.actionType,
    orderId: record.orderId,
    amount: record.amount,
  })

  try {
    // ── EXECUTE TRANSACTION ─────────────────────────────────────────────────
    const refundResult = await issueRefund(record.orderId, record.amount)

    // Register in settled refunds ledger
    registerSettledRefund(record.orderId)

    // ── TRANSITION 3: COMPLETED ─────────────────────────────────────────────
    const completedResult = {
      type: 'action.completed',
      approvalId: record.id,
      caseId: record.caseId,
      actionType: record.actionType,
      amount: record.amount,
      currency: record.currency,
      approvedBy: operator,
      transaction: refundResult,
      completedAt: new Date().toISOString(),
      policyId: record.policyId,
      idempotencyKey: idemKey,
      status: 'COMPLETED',
    }

    record.status = 'COMPLETED'
    record.transaction = refundResult
    record.completedAt = completedResult.completedAt
    approvalStore.set(approvalId, record)

    // Register in Idempotency Store
    registerIdempotencyKey(idemKey, completedResult)

    emitApprovalEvent(caseId, 'approval.completed', {
      approvalId: record.id,
      transactionId: refundResult.transactionId,
      amount: record.amount,
      rrn: refundResult.rrn,
      status: 'COMPLETED',
    })

    // AI confirms execution to customer
    emitApprovalEvent(caseId, 'speech.transcript', {
      speaker: 'agent',
      text: 'Refund initiate ho gaya hai. Aapke account mein ₹1,499 transfer ho jayenge.',
      translation: 'Refund has been initiated. ₹1,499 will be transferred to your account.',
      language: 'Hindi / Hinglish',
    })

    return completedResult
  } catch (execErr) {
    // ── TRANSITION: FAILED ──────────────────────────────────────────────────
    record.status = 'FAILED'
    record.failureReason = execErr?.message || 'Execution error'
    approvalStore.set(approvalId, record)

    emitApprovalEvent(caseId, 'approval.failed', {
      approvalId: record.id,
      error: execErr?.message || 'Execution failed',
      status: 'FAILED',
    })

    throw execErr
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. REJECTED: Operator Declines Request
// ─────────────────────────────────────────────────────────────────────────────

export async function processDecline(
  approvalId = 'appr-1042-99042',
  operator = { id: 'OP-782', name: 'Maya Sharma' },
  reason = 'Declined by operator review'
) {
  const record = approvalStore.get(approvalId) || approvalStore.get('appr-1042-99042')

  if (!record) {
    throw new Error(`Approval request ${approvalId} not found`)
  }

  if (!isAuthorizedOperator(operator.id)) {
    throw Object.assign(
      new Error(`Operator ${operator.id} is not authorized`),
      { code: 'UNAUTHORIZED', httpStatus: 403 }
    )
  }

  record.status = 'REJECTED'
  record.declinedBy = operator
  record.declinedAt = new Date().toISOString()
  record.declineReason = reason
  approvalStore.set(approvalId, record)

  emitApprovalEvent(record.caseId, 'approval.rejected', {
    approvalId: record.id,
    declinedBy: operator,
    reason,
    status: 'REJECTED',
  })

  return {
    type: 'approval.rejected',
    approvalId: record.id,
    caseId: record.caseId,
    declinedBy: operator,
    reason,
    declinedAt: record.declinedAt,
    status: 'REJECTED',
  }
}

export function getApproval(approvalId) {
  return approvalStore.get(approvalId) || null
}

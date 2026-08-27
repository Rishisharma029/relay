/**
 * RELAY — Server-Side Human Approval Service
 * Security boundaries: expiry gate, operator authorization, case & action ownership,
 * idempotency check, 5-point policy re-evaluation, then execute.
 */

import { evaluatePolicyGates, registerSettledRefund } from './policyEngine.js'
import { issueRefund } from './tools/refunds.js'
import {
  APPROVAL_EXPIRY_MS,
  isAuthorizedOperator,
} from './config.js'
import {
  buildIdempotencyKey,
  checkIdempotency,
  registerIdempotencyKey,
} from './idempotencyStore.js'
import {
  FAILURE_STATES,
  buildFailureEvent,
} from './failureEngine.js'

export const approvalStore = new Map()

// Seed initial pending approval for Case RLY-1042
approvalStore.set('appr-1042-99042', {
  id:                  'appr-1042-99042',
  caseId:              'RLY-1042',
  customerId:          'CUST-AARAV-01',
  orderId:             '84921',
  actionType:          'REFUND',
  amount:              1499,
  currency:            'INR',
  riskTier:            'MEDIUM',
  status:              'PENDING',
  policyId:            'POL-DELIVERY-DELAY-01',
  requiredRole:        'OPERATOR',
  justification: [
    'Delivery exception confirmed with logistics carrier',
    'Customer explicitly requested instant refund',
    'Delayed past SLA (+3 days)',
  ],
  createdAt: '2026-08-27T21:34:08Z',
})

// ─────────────────────────────────────────────
// Step 1: AI Proposes Action → 5-Point Policy Gate → Approval Created
// ─────────────────────────────────────────────

export async function createApprovalRequest(data = {}) {
  const customerId = data.customerId || 'CUST-AARAV-01'
  const orderId    = data.orderId    || '84921'
  const amount     = Number(data.amount) || 1499
  const caseId     = data.caseId    || 'RLY-1042'

  // First 5-point policy evaluation
  const policyCheck = await evaluatePolicyGates({ customerId, orderId, amount })
  if (!policyCheck.passed) {
    throw new Error(`Policy violation: ${policyCheck.reasons.join(', ')}`)
  }

  const id = `appr-${caseId.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-5)}`

  const approvalRecord = {
    id,
    caseId,
    customerId,
    orderId,
    actionType:            'REFUND',
    amount,
    currency:              'INR',
    riskTier:              policyCheck.riskTier,
    requiresHumanApproval: policyCheck.requiresHumanApproval,
    status:                'PENDING',
    policyId:              policyCheck.policyId,
    policyName:            policyCheck.policyName,
    policyChecks:          policyCheck.checks,
    createdAt:             new Date().toISOString(),
  }

  approvalStore.set(id, approvalRecord)

  return {
    type:             'approval.created',
    approval:         approvalRecord,
    policyEvaluation: policyCheck,
  }
}

// ─────────────────────────────────────────────
// Step 2: Operator Approves
// Security gates run in strict order — all must pass before execution.
// ─────────────────────────────────────────────

export async function processApproval(
  approvalId = 'appr-1042-99042',
  operator   = { id: 'OP-782', name: 'Maya Sharma' },
  requestedCaseId = null
) {
  const record = approvalStore.get(approvalId) || approvalStore.get('appr-1042-99042')

  if (!record) {
    throw new Error(`Approval request ${approvalId} not found`)
  }

  // ── GATE 1: Operator Authorization ──────────────────────────────────────
  if (!isAuthorizedOperator(operator.id)) {
    throw Object.assign(
      new Error(`Operator ${operator.id} is not authorized to approve actions`),
      { code: 'UNAUTHORIZED', httpStatus: 403 }
    )
  }

  // ── GATE 2: Case Ownership ───────────────────────────────────────────────
  // Prevent cross-case approval injection (e.g. operator for case A approving case B action)
  if (requestedCaseId && record.caseId !== requestedCaseId) {
    throw Object.assign(
      new Error(`Action ${approvalId} belongs to case ${record.caseId}, not ${requestedCaseId}`),
      { code: 'CASE_MISMATCH', httpStatus: 403 }
    )
  }

  // ── GATE 3: Action Ownership / Status Check ──────────────────────────────
  if (record.status === 'APPROVED') {
    // Already approved — idempotent return, not an error
    return {
      type:     'action.already_completed',
      approval: record,
      message:  'This approval was already processed. Returning existing result.',
    }
  }

  if (record.status === 'DECLINED') {
    throw Object.assign(
      new Error(`Approval ${approvalId} was already declined and cannot be re-approved`),
      { code: 'ALREADY_DECLINED', httpStatus: 409 }
    )
  }

  // ── GATE 4: Approval Expiry ──────────────────────────────────────────────
  const ageMs = Date.now() - new Date(record.createdAt).getTime()
  if (ageMs > APPROVAL_EXPIRY_MS) {
    const expiredAt = record.createdAt
    record.status = 'EXPIRED'
    approvalStore.set(approvalId, record)

    const failureEvent = buildFailureEvent(FAILURE_STATES.APPROVAL_EXPIRED, {
      approvalId,
      expiredAt,
    })

    throw Object.assign(
      new Error(`Approval expired after ${Math.round(ageMs / 60000)} minutes. Create a new request.`),
      { code: 'APPROVAL_EXPIRED', httpStatus: 410, failureEvent }
    )
  }

  // ── GATE 5: Idempotency Check ────────────────────────────────────────────
  // If this exact financial action was already executed, return the original result.
  const idemKey = buildIdempotencyKey(record.actionType, record.caseId, record.orderId)
  const idemCheck = checkIdempotency(idemKey)

  if (idemCheck.isDuplicate) {
    const failureEvent = buildFailureEvent(FAILURE_STATES.APPROVAL_DUPLICATE, {
      approvalId,
      existingResult: idemCheck.existingResult,
    })

    return {
      type:           'action.duplicate_prevented',
      approvalId:     record.id,
      caseId:         record.caseId,
      idempotencyKey: idemKey,
      existingResult: idemCheck.existingResult,
      registeredAt:   idemCheck.registeredAt,
      failureEvent,
      message:        `Duplicate prevented. Original execution: ${idemCheck.registeredAt}. No charge applied.`,
    }
  }

  // ── GATE 6: Policy Re-Evaluation (mandatory double-check) ───────────────
  // Never assume the action is still valid from when it was proposed.
  const policyRecheck = await evaluatePolicyGates({
    customerId: record.customerId,
    orderId:    record.orderId,
    amount:     record.amount,
  })

  if (!policyRecheck.passed) {
    throw new Error(`Policy Re-Check Violation: ${policyRecheck.reasons.join(', ')}`)
  }

  // ── EXECUTE: Financial Transaction ──────────────────────────────────────
  const refundResult = await issueRefund(record.orderId, record.amount)

  // Register in settled refunds ledger (duplicate protection layer 2)
  registerSettledRefund(record.orderId)

  // Register idempotency key so any repeat call returns this result
  const completedResult = {
    type:           'action.completed',
    approvalId:     record.id,
    caseId:         record.caseId,
    actionType:     record.actionType,
    amount:         record.amount,
    currency:       record.currency,
    approvedBy:     operator,
    transaction:    refundResult,
    completedAt:    new Date().toISOString(),
    recheckPassed:  true,
    policyId:       record.policyId,
    idempotencyKey: idemKey,
  }
  registerIdempotencyKey(idemKey, completedResult)

  // Commit updated record
  record.status      = 'APPROVED'
  record.approvedBy  = operator
  record.approvedAt  = completedResult.completedAt
  record.transaction = refundResult
  record.finalPolicyCheck = policyRecheck
  approvalStore.set(approvalId, record)

  return completedResult
}

// ─────────────────────────────────────────────
// Decline
// ─────────────────────────────────────────────

export async function processDecline(
  approvalId = 'appr-1042-99042',
  operator   = { id: 'OP-782', name: 'Maya Sharma' },
  reason     = 'Declined by operator review'
) {
  const record = approvalStore.get(approvalId) || approvalStore.get('appr-1042-99042')

  if (!record) {
    throw new Error(`Approval request ${approvalId} not found`)
  }

  // Authorization check on decline too
  if (!isAuthorizedOperator(operator.id)) {
    throw Object.assign(
      new Error(`Operator ${operator.id} is not authorized`),
      { code: 'UNAUTHORIZED', httpStatus: 403 }
    )
  }

  record.status      = 'DECLINED'
  record.declinedBy  = operator
  record.declinedAt  = new Date().toISOString()
  record.declineReason = reason
  approvalStore.set(approvalId, record)

  return {
    type:       'approval.declined',
    approvalId: record.id,
    caseId:     record.caseId,
    declinedBy: operator,
    reason,
    declinedAt: record.declinedAt,
  }
}

export function getApproval(approvalId) {
  return approvalStore.get(approvalId) || null
}

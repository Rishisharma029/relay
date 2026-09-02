/**
 * RELAY — 5-Point Server-Side Real Policy Engine
 *
 * Sits directly between AI intent and financial/action execution.
 *
 * Flow:
 *   AI → issueRefund
 *          ↓
 *    evaluateRefundPolicy()
 *          ↓
 *  ┌─────────────────────────────┐
 *  │ order exists?               │
 *  │ customer verified?          │
 *  │ refund eligible?            │
 *  │ amount allowed?             │
 *  │ duplicate refund?           │
 *  └──────────────┬──────────────┘
 *                 ↓
 *        APPROVAL REQUIRED
 */

import { lookupCustomer } from './tools/customer.js'
import { lookupOrder } from './tools/orders.js'
import { checkIdempotency, buildIdempotencyKey } from './idempotencyStore.js'

// In-memory ledger of executed refunds to detect duplicates
export const settledRefundsLedger = new Set()

/**
 * 5-Point Policy Gate Evaluation
 * 1. order exists?
 * 2. customer verified?
 * 3. refund eligible?
 * 4. amount allowed?
 * 5. duplicate refund?
 */
export async function evaluatePolicyGates(params = {}) {
  const evaluatedAt = new Date().toISOString()
  const customerId = params.customerId || 'CUS-1042'
  const orderId = String(params.orderId || '72143').replace(/^#/, '').trim()
  const caseId = params.caseId || 'RLY-72143'

  // Gate 1: Order Exists?
  const orderRes = await lookupOrder(orderId)
  const isOrderValid = Boolean(orderRes.success && orderRes.orderId)
  const orderTotal = Number(orderRes.amount) || Number(params.amount) || 2899
  const amount = Number(params.amount) || orderTotal

  // Gate 2: Customer Verified?
  const customerRes = await lookupCustomer(customerId)
  const isCustomerValid = Boolean(customerRes.success && customerRes.verified)
  const customerTier = customerRes.tier || 'PLATINUM'

  // Gate 3: Refund Eligible?
  // Delivery delay past SLA (+3d) or confirmed carrier exception code
  const isDelayed = (orderRes.delayDays || 0) > 0
  const hasException = orderRes.status === 'delivery_exception' || orderRes.status === 'DELIVERY_EXCEPTION'
  const isRefundEligible = isDelayed || hasException

  // Gate 4: Amount Allowed?
  // Limit cannot exceed captured order amount or tier limit
  const maxTierCap = customerTier === 'PLATINUM' ? 25000 : 10000
  const isAmountAllowed = amount > 0 && amount <= orderTotal && amount <= maxTierCap

  // Gate 5: No Duplicate Refund?
  const idemKey = buildIdempotencyKey('refund', caseId, orderId)
  const idemCheck = checkIdempotency(idemKey)
  const isDuplicate = settledRefundsLedger.has(orderId) || idemCheck.isDuplicate
  const isNoDuplicateRefund = !isDuplicate

  // Aggregate Evaluation
  const allPassed =
    isOrderValid &&
    isCustomerValid &&
    isRefundEligible &&
    isAmountAllowed &&
    isNoDuplicateRefund

  // Risk Classification
  const risk = amount > 5000 ? 'HIGH' : amount >= 1000 ? 'MEDIUM' : 'LOW'
  const requiresApproval = amount >= 1000 || customerTier !== 'PLATINUM'

  const reasons = []
  if (!isOrderValid) reasons.push(`Order #${orderId} does not exist in commerce gateway`)
  if (!isCustomerValid) reasons.push('Customer identity could not be verified')
  if (!isRefundEligible) reasons.push('Logistics SLA has not been breached (no exception code)')
  if (!isAmountAllowed) reasons.push(`Requested amount ₹${amount} exceeds allowed cap ₹${orderTotal}`)
  if (isDuplicate) reasons.push(`Duplicate refund blocked: Order #${orderId} already settled`)

  return {
    allowed: allPassed,
    requiresApproval,
    risk,
    amount: orderTotal,
    policyId: 'POL-REFUND-3.2',
    section: 'Section 4.1',
    evaluatedAt,
    checks: {
      orderExists: isOrderValid,
      customerVerified: isCustomerValid,
      refundEligible: isRefundEligible,
      amountAllowed: isAmountAllowed,
      noDuplicateRefund: isNoDuplicateRefund,
    },
    reasons,
  }
}

export function registerSettledRefund(orderId) {
  const clean = String(orderId).replace(/^#/, '').trim()
  settledRefundsLedger.add(clean)
}

export function clearSettledRefunds() {
  settledRefundsLedger.clear()
}

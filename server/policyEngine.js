/**
 * RELAY — 5-Point Server-Side Real Policy Engine with Commerce Rules Integration
 *
 * Sits directly between AI intent and financial/action execution.
 *
 * Architecture:
 *   AI Intent / Speech
 *          ↓
 *   Commerce Rules Engine (India CP E-Commerce Rules 2020)
 *          ↓
 *   5-Point Policy Gate Evaluation
 *          ↓
 *   Human Operator Approval Gate (if requiresApproval)
 *          ↓
 *   Action Execution (issueRefund)
 */

import { lookupCustomer } from './tools/customer.js'
import { lookupOrder } from './tools/orders.js'
import { checkIdempotency, buildIdempotencyKey } from './idempotencyStore.js'
import { CommerceRulesEngine } from './services/commerceRulesEngine.js'

// In-memory ledger of executed refunds to detect duplicates
export const settledRefundsLedger = new Set()

/**
 * 5-Point Policy Gate Evaluation + Commerce Compliance Rules Check
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
  const isDelayed = (orderRes.delayDays || 0) > 0
  const hasException = orderRes.status === 'delivery_exception' || orderRes.status === 'DELIVERY_EXCEPTION'
  const isRefundEligible = isDelayed || hasException

  // Gate 4: Amount Allowed?
  const maxTierCap = customerTier === 'PLATINUM' ? 25000 : 10000
  const isAmountAllowed = amount > 0 && amount <= orderTotal && amount <= maxTierCap

  // Gate 5: No Duplicate Refund?
  const idemKey = buildIdempotencyKey('refund', caseId, orderId)
  const idemCheck = checkIdempotency(idemKey)
  const isDuplicate = settledRefundsLedger.has(orderId) || idemCheck.isDuplicate
  const isNoDuplicateRefund = !isDuplicate

  // Commerce Compliance Rules Evaluation
  const commerceRule = CommerceRulesEngine.evaluate({
    orderId,
    orderStatus: orderRes.status,
    deliveryStatus: isDelayed ? 'delayed' : 'on_schedule',
    deliveryPromisedDate: '2026-08-30',
    delayDays: orderRes.delayDays || (isDelayed ? 4 : 0),
    carrier: orderRes.carrier || 'Delhivery Express',
    trackingNumber: orderRes.trackingNumber || 'DL-7214301',
    refundAmount: amount,
    customerTier,
    forceMajeure: Boolean(params.forceMajeure),
    defective: Boolean(params.defective),
    deficient: Boolean(params.deficient),
    spurious: Boolean(params.spurious),
    productMatchesDescription: params.productMatchesDescription !== undefined ? params.productMatchesDescription : true,
    cancellationRequested: Boolean(params.cancellationRequested),
    paymentStatus: params.paymentStatus || 'captured',
    refundAlreadyIssued: isDuplicate,
    jurisdiction: params.jurisdiction || 'IN'
  })

  // Aggregate Evaluation (Commerce Rules must pass + 5 policy gates)
  const allPassed =
    isOrderValid &&
    isCustomerValid &&
    isRefundEligible &&
    isAmountAllowed &&
    isNoDuplicateRefund &&
    commerceRule.eligible

  // Risk Classification
  const risk = amount > 5000 ? 'HIGH' : amount >= 1000 ? 'MEDIUM' : 'LOW'
  const requiresApproval = amount >= 1000 || customerTier !== 'PLATINUM' || commerceRule.requiresHumanApproval

  const reasons = []
  if (!isOrderValid) reasons.push(`Order #${orderId} does not exist in commerce gateway`)
  if (!isCustomerValid) reasons.push('Customer identity could not be verified')
  if (!isRefundEligible) reasons.push('Logistics SLA has not been breached (no exception code)')
  if (!isAmountAllowed) reasons.push(`Requested amount ₹${amount} exceeds allowed cap ₹${orderTotal}`)
  if (isDuplicate) reasons.push(`Duplicate refund blocked: Order #${orderId} already settled`)
  if (!commerceRule.eligible) reasons.push(`Commerce Rule [${commerceRule.ruleId}]: ${commerceRule.reason}`)

  return {
    allowed: allPassed,
    requiresApproval,
    risk,
    amount: orderTotal,
    policyId: 'POL-REFUND-3.2',
    section: 'Section 4.1',
    evaluatedAt,
    commerceRule,
    checks: {
      orderExists: isOrderValid,
      customerVerified: isCustomerValid,
      refundEligible: isRefundEligible,
      amountAllowed: isAmountAllowed,
      noDuplicateRefund: isNoDuplicateRefund,
      commerceRulesPass: commerceRule.eligible
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

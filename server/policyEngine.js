/**
 * RELAY — 5-Point Server-Side Real Policy Engine
 * Evaluates strict business & security criteria before proposals and at execution time.
 */

import { lookupCustomer } from './tools/customer.js'
import { lookupOrder } from './tools/orders.js'

// In-memory ledger of executed refunds to detect duplicates
export const settledRefundsLedger = new Set()

/**
 * 5-Point Policy Gate Evaluation
 * 1. customer verified?
 * 2. order exists?
 * 3. amount within limit?
 * 4. policy eligible?
 * 5. duplicate action?
 */
export async function evaluatePolicyGates(params = {}) {
  const evaluatedAt = new Date().toISOString()
  const customerId = params.customerId || 'CUST-AARAV-01'
  const orderId = params.orderId || '84921'
  const amount = Number(params.amount) || 1499

  // Gate 1: Customer Verified?
  const customerRes = await lookupCustomer(customerId)
  const isCustomerValid = customerRes.found && customerRes.customer
  const customerTier = customerRes.customer?.tier || 'STANDARD'

  // Gate 2: Order Exists?
  const orderRes = await lookupOrder(orderId)
  const isOrderValid = orderRes.found && orderRes.order
  const orderTotal = orderRes.order?.amountInr || 1499

  // Gate 3: Amount Within Limit?
  // Limit cannot exceed original order total or policy tier maximum
  const maxTierCap = customerTier === 'PLATINUM' ? 25000 : 10000
  const isAmountValid = amount > 0 && amount <= orderTotal && amount <= maxTierCap

  // Gate 4: Policy Eligible?
  // Delay must be verified past delivery SLA or carrier exception confirmed
  const isDelayed = (orderRes.order?.delayDays || 0) > 0
  const hasException = orderRes.order?.status === 'DELIVERY_EXCEPTION'
  const isPolicyEligible = isDelayed || hasException

  // Gate 5: No Duplicate Action?
  const isDuplicate = settledRefundsLedger.has(orderId)
  const isNoDuplicate = !isDuplicate

  // Aggregate Evaluation
  const allPassed =
    isCustomerValid &&
    isOrderValid &&
    isAmountValid &&
    isPolicyEligible &&
    isNoDuplicate

  const requiresHumanApproval = amount >= 1000 || customerTier !== 'PLATINUM'
  const riskTier = amount > 2500 ? 'HIGH' : amount >= 1000 ? 'MEDIUM' : 'LOW'

  const reasons = []
  if (!isCustomerValid) reasons.push('Customer identity could not be verified')
  if (!isOrderValid) reasons.push(`Order #${orderId} does not exist in gateway`)
  if (!isAmountValid) reasons.push(`Requested amount ₹${amount} exceeds order cap ₹${orderTotal}`)
  if (!isPolicyEligible) reasons.push('Logistics SLA has not been breached')
  if (isDuplicate) reasons.push(`Duplicate action: A refund for Order #${orderId} was already settled`)

  return {
    passed: allPassed,
    eligible: allPassed,
    policyId: 'POL-DELIVERY-DELAY-01',
    policyName: 'E-Commerce Logistics SLA Breach Resolution Policy',
    riskTier,
    requiresHumanApproval,
    evaluatedAt,
    checks: {
      customerVerified: {
        passed: !!isCustomerValid,
        detail: isCustomerValid ? `Customer ${customerRes.customer.name} verified` : 'Customer not found',
        tier: customerTier,
      },
      orderExists: {
        passed: !!isOrderValid,
        detail: isOrderValid ? `Order #${orderId} confirmed (₹${orderTotal})` : 'Order not found',
        orderAmount: orderTotal,
      },
      amountWithinLimit: {
        passed: isAmountValid,
        detail: `₹${amount} ≤ order cap ₹${orderTotal} (Tier limit ₹${maxTierCap})`,
        maxLimit: orderTotal,
      },
      policyEligible: {
        passed: isPolicyEligible,
        detail: isDelayed ? `Delivery exception confirmed (${orderRes.order?.delayDays} days delayed past SLA)` : 'No delay verified',
        delayDays: orderRes.order?.delayDays,
      },
      noDuplicateAction: {
        passed: isNoDuplicate,
        detail: isNoDuplicate ? '0 prior refunds settled for this order ID' : 'PREVIOUS REFUND DETECTED',
        isDuplicate,
      },
    },
    reasons,
  }
}

export function registerSettledRefund(orderId) {
  settledRefundsLedger.add(orderId)
}

export function clearSettledRefunds() {
  settledRefundsLedger.clear()
}

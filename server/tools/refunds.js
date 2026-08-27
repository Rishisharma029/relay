/**
 * RELAY Tool: refunds.js
 * Financial policy validation and atomic UPI refund execution.
 */

export async function evaluateRefundPolicy(orderId = '84921', amount = 1499) {
  await new Promise((res) => setTimeout(res, 38))

  const numericAmount = Number(amount) || 1499
  const requiresHumanApproval = numericAmount >= 1000

  return {
    policyId: 'POL-DELIVERY-DELAY-01',
    eligible: true,
    amount: numericAmount,
    currency: 'INR',
    riskTier: numericAmount > 2500 ? 'HIGH' : numericAmount >= 1000 ? 'MEDIUM' : 'LOW',
    requiresHumanApproval,
    policyBasis: [
      'Order delayed past SLA (+3 days)',
      'Customer explicitly requested refund',
      'No previous refund detected on transaction',
      'Delivery exception verified with logistics carrier',
    ],
  }
}

export async function issueRefund(orderId = '84921', amount = 1499) {
  await new Promise((res) => setTimeout(res, 62))

  const txnId = `RF-${Math.floor(Math.random() * 90000 + 10000)}`
  const rrn = `9481${Date.now().toString().slice(-8)}`

  return {
    success: true,
    transactionId: txnId,
    orderId,
    amount: Number(amount) || 1499,
    currency: 'INR',
    paymentMethod: 'UPI_INSTANT',
    rrn,
    timestamp: new Date().toISOString(),
    status: 'SETTLED_OK',
    bankAck: 'NPCI_SETTLEMENT_CONFIRMED',
  }
}

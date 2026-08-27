/**
 * RELAY — 3-Level Persistent AI Memory & Selective Retrieval Architecture
 *
 * 1. CONVERSATION MEMORY (Turn Memory):
 *    Immediate utterance context, active language, and slot extractions.
 *
 * 2. CASE MEMORY:
 *    Current active call session facts, order status, and proposed actions.
 *
 * 3. CUSTOMER MEMORY (Long-Term Cross-Session):
 *    Preferences, dispute rating, historical issues, and past resolutions across calls.
 */

export const customerMemoryStore = new Map([
  [
    'CUS-1042',
    {
      customerId: 'CUS-1042',
      name: 'Aarav Mehta',
      preferredLanguage: 'hi-IN',
      preferredChannel: 'voice',
      tier: 'PLATINUM',
      disputeRate: 0.0002,
      previousIssues: [
        'payment_failure',
        'delivery_delay',
      ],
      resolutionHistory: [
        {
          type: 'refund',
          amount: 799,
          date: '2026-08-12',
          caseId: 'PAY-2026-881',
          issue: 'Payment failure during checkout (timeout)',
          resolutionMethod: 'NPCI UPI Instant Refund',
        },
        {
          type: 'address_reroute',
          amount: 0,
          date: '2026-07-04',
          caseId: 'LOG-2026-104',
          issue: 'Delivery hub rerouting to Gurgaon',
        },
      ],
      notes: 'High-value customer. Acknowledge previous payment resolution if customer references it.',
    },
  ],
])

export const caseMemoryStore = new Map([
  [
    'RLY-1042',
    {
      caseId: 'RLY-1042',
      customerId: 'CUS-1042',
      orderId: '84921',
      orderAmount: 1499,
      deliveryStatus: 'delivery_exception',
      delayDays: 3,
      carrier: 'BlueDart Air',
      carrierTracking: 'BD-948192841',
      facts: [
        'Order #84921 delayed past SLA by 3 days',
        'Customer requested instant UPI refund',
        'Carrier confirmed delivery exception',
      ],
    },
  ],
])

export class MemoryService {
  /**
   * Selective Memory Retrieval:
   * Extracts only relevant snippets rather than dumping entire history into LLM.
   */
  static retrieveRelevantMemory(customerId = 'CUS-1042', utterance = '', intent = 'general') {
    const customer = customerMemoryStore.get(customerId) || customerMemoryStore.get('CUS-1042')
    const lower = utterance.toLowerCase()

    const isPaymentReferenced =
      lower.includes('payment') ||
      lower.includes('pehle') ||
      lower.includes('previous') ||
      lower.includes('fail') ||
      lower.includes('paisa')

    let targetedCustomerHistory = null

    if (isPaymentReferenced) {
      const paymentRes = customer.resolutionHistory.find((r) => r.type === 'refund')
      targetedCustomerHistory = {
        topic: 'previous_payment_failure',
        summary: `Previous payment issue on Aug 12 resolved with ₹${paymentRes.amount} instant refund.`,
        relevantResolution: paymentRes,
      }
    }

    return {
      customerId: customer?.customerId || customerId,
      name: customer?.name || 'Customer',
      preferredLanguage: customer?.preferredLanguage || 'hi-IN',
      preferredChannel: customer?.preferredChannel || 'voice',
      relevantMemorySnippet: targetedCustomerHistory,
      previousIssues: customer?.previousIssues || [],
      resolutionHistory: customer?.resolutionHistory || [],
    }
  }

  /**
   * Full 3-Level Memory Context for the AI turn
   */
  static getFullMemoryContext(caseId = 'RLY-1042', currentUtterance = '') {
    const caseMemory = caseMemoryStore.get(caseId) || { caseId }
    const selectiveCustomerMemory = this.retrieveRelevantMemory(caseMemory.customerId || 'CUS-1042', currentUtterance)

    const turnMemory = {
      timestamp: new Date().toISOString(),
      utterance: currentUtterance,
      detectedLanguage: currentUtterance.includes('Mera') || currentUtterance.includes('chahiye') ? 'hi-IN' : 'en-IN',
      slotExtractions: {
        orderId: currentUtterance.match(/#?(\d{5})/)?.[1] || caseMemory.orderId || '84921',
        isRefundRequested: currentUtterance.toLowerCase().includes('refund') || currentUtterance.includes('chahiye'),
        isDeliveryInquiry: currentUtterance.toLowerCase().includes('order') || currentUtterance.includes('aaya'),
      },
    }

    return {
      turnMemory,
      caseMemory,
      customerMemory: selectiveCustomerMemory,
    }
  }
}

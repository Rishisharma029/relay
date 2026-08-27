/**
 * RELAY Tool: customer.js
 * Customer profile, tier verification, and historical sentiment retrieval.
 */

export const mockCustomerDatabase = {
  '84921': {
    customerId: 'CUST-AARAV-01',
    name: 'Aarav Mehta',
    phone: '+91 98201 44102',
    tier: 'PLATINUM',
    totalOrders: 34,
    disputeRate: '0.02%',
    preferredLanguage: 'Hindi / English',
    sentimentTrend: 'POSITIVE_HISTORICAL',
  },
  '1042': {
    customerId: 'CUST-AARAV-01',
    name: 'Aarav Mehta',
    phone: '+91 98201 44102',
    tier: 'PLATINUM',
    totalOrders: 34,
    disputeRate: '0.02%',
    preferredLanguage: 'Hindi / English',
    sentimentTrend: 'POSITIVE_HISTORICAL',
  },
}

export async function lookupCustomer(customerId = 'CUST-AARAV-01') {
  // Simulate database query latency
  await new Promise((res) => setTimeout(res, 45))

  const customer = mockCustomerDatabase[customerId] || mockCustomerDatabase['84921']
  return {
    found: true,
    customer,
  }
}

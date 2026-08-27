/**
 * RELAY Tool: customer.js
 * Customer profile, tier verification, and historical sentiment retrieval.
 */

export const customerDatabase = {
  'CUS-1042': {
    customerId: 'CUS-1042',
    name: 'Aarav Mehta',
    phone: '+91 98201 44102',
    tier: 'PLATINUM',
    totalOrders: 34,
    disputeRate: '0.02%',
    preferredLanguage: 'Hindi / English',
    sentimentTrend: 'POSITIVE_HISTORICAL',
    activeCaseId: 'RLY-1042',
    accountCreated: '2025-01-10',
    verified: true,
  },
  'CUST-AARAV-01': {
    customerId: 'CUS-1042',
    name: 'Aarav Mehta',
    phone: '+91 98201 44102',
    tier: 'PLATINUM',
    totalOrders: 34,
    disputeRate: '0.02%',
    preferredLanguage: 'Hindi / English',
    sentimentTrend: 'POSITIVE_HISTORICAL',
    activeCaseId: 'RLY-1042',
    accountCreated: '2025-01-10',
    verified: true,
  },
}

/**
 * Normalizes customer identifiers like 'CUS-1042', 'CUST-AARAV-01', '1042'
 */
function normalizeCustomerId(id) {
  if (!id) return 'CUS-1042'
  const str = String(id).trim().toUpperCase()
  if (str.includes('1042') || str.includes('AARAV')) return 'CUS-1042'
  return str
}

export async function lookupCustomer(customerId = 'CUS-1042') {
  // Simulate database RPC latency
  await new Promise((res) => setTimeout(res, 45))

  const normalized = normalizeCustomerId(customerId)
  const customer = customerDatabase[normalized] || customerDatabase['CUS-1042']

  return {
    success: true,
    customerId: customer.customerId,
    name: customer.name,
    phone: customer.phone,
    tier: customer.tier,
    preferredLanguage: customer.preferredLanguage,
    totalOrders: customer.totalOrders,
    disputeRate: customer.disputeRate,
    verified: customer.verified,
    activeCaseId: customer.activeCaseId,
  }
}

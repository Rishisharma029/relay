/**
 * RELAY — Financial Idempotency Store
 *
 * Prevents duplicate executions of financial operations (e.g. ₹1,499 refunded twice).
 *
 * Canonical Key Format:
 *   <action>:<caseId>:<orderId>
 *   Example: refund:RLY-1042:84921
 */

// In-memory store. In clustered production, this maps to Redis SETNX with TTL.
const store = new Map()

// Default TTL: 24 hours
const TTL_MS = 24 * 60 * 60 * 1000

/**
 * Build a canonical idempotency key from action components.
 */
export function buildIdempotencyKey(actionType = 'refund', caseId = 'RLY-1042', orderId = '84921') {
  const normalizedAction = String(actionType).toLowerCase().trim()
  const normalizedCase = String(caseId).toUpperCase().trim()
  const normalizedOrder = String(orderId).replace(/^#/, '').trim()
  return `${normalizedAction}:${normalizedCase}:${normalizedOrder}`
}

/**
 * Check if an idempotency key already exists.
 * Returns existing result if already completed.
 */
export function checkIdempotency(key) {
  const normalizedKey = key.replace(/#/, '')
  const entry = store.get(normalizedKey) || store.get(key)

  if (!entry) {
    return { isDuplicate: false, existingResult: null }
  }

  // Respect TTL
  if (Date.now() > entry.expiresAt) {
    store.delete(normalizedKey)
    store.delete(key)
    return { isDuplicate: false, existingResult: null }
  }

  return {
    isDuplicate: true,
    existingResult: entry.result,
    registeredAt: entry.registeredAt,
    expiresAt: new Date(entry.expiresAt).toISOString(),
  }
}

/**
 * Register a completed financial action so future requests with the same key
 * return the existing result without re-executing.
 */
export function registerIdempotencyKey(key, result) {
  const normalizedKey = key.replace(/#/, '')
  const record = {
    key: normalizedKey,
    result,
    registeredAt: new Date().toISOString(),
    expiresAt: Date.now() + TTL_MS,
  }
  store.set(normalizedKey, record)
  store.set(key, record)
}

/**
 * List all active idempotency keys (for audit/debug).
 */
export function listIdempotencyKeys() {
  const now = Date.now()
  const active = []
  for (const [key, entry] of store.entries()) {
    if (now <= entry.expiresAt) {
      if (!key.includes('#')) {
        active.push({
          key,
          registeredAt: entry.registeredAt,
          expiresAt: new Date(entry.expiresAt).toISOString(),
          status: entry.result?.status || 'SETTLED',
        })
      }
    } else {
      store.delete(key)
    }
  }
  return active
}

/**
 * Purge a specific key (for test reset).
 */
export function purgeIdempotencyKey(key) {
  const normalizedKey = key.replace(/#/, '')
  store.delete(normalizedKey)
  return store.delete(key)
}

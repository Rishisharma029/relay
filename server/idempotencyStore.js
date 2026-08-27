/**
 * RELAY — Idempotency Store
 * Composite-key ledger for financial actions. Redis-shaped for easy swap.
 * Prevents duplicate executions of the same action.
 *
 * Key format: refund:<caseId>:<orderId>
 * Example:    refund:RLY-1042:#84921
 */

// In-memory store. Swap for `ioredis` in production.
const store = new Map()

// TTL for idempotency keys: 24 hours
const TTL_MS = 24 * 60 * 60 * 1000

/**
 * Build a canonical idempotency key from parts.
 * Action type + case + order prevents cross-case collisions.
 */
export function buildIdempotencyKey(actionType, caseId, orderId) {
  const normalized = {
    action: actionType.toLowerCase().trim(),
    case:   caseId.toUpperCase().trim(),
    order:  String(orderId).replace(/^#/, '').trim(),
  }
  return `${normalized.action}:${normalized.case}:#${normalized.order}`
}

/**
 * Check if an idempotency key already exists.
 * Returns the original result if it does.
 */
export function checkIdempotency(key) {
  const entry = store.get(key)
  if (!entry) {
    return { isDuplicate: false, existingResult: null }
  }

  // Respect TTL
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return { isDuplicate: false, existingResult: null }
  }

  return {
    isDuplicate:    true,
    existingResult: entry.result,
    registeredAt:   entry.registeredAt,
    expiresAt:      new Date(entry.expiresAt).toISOString(),
  }
}

/**
 * Register a completed action so future requests with the same key
 * return the existing result without re-executing.
 */
export function registerIdempotencyKey(key, result) {
  store.set(key, {
    key,
    result,
    registeredAt: new Date().toISOString(),
    expiresAt:    Date.now() + TTL_MS,
  })
}

/**
 * List all active idempotency keys (for audit/debug endpoint).
 */
export function listIdempotencyKeys() {
  const now = Date.now()
  const active = []
  for (const [key, entry] of store.entries()) {
    if (now <= entry.expiresAt) {
      active.push({
        key,
        registeredAt: entry.registeredAt,
        expiresAt:    new Date(entry.expiresAt).toISOString(),
      })
    } else {
      store.delete(key)
    }
  }
  return active
}

/**
 * Purge a specific key (for test/reset purposes only).
 */
export function purgeIdempotencyKey(key) {
  return store.delete(key)
}

/**
 * RELAY Tool: orders.js
 * Multi-Platform Enterprise Order & Logistics Service.
 */

import { trackOrderAcrossPlatforms } from '../services/logisticsAggregator.js'

/**
 * Robust extractor for order identifiers from any payload format:
 * - Direct string: "72143"
 * - Direct number: 72143
 * - Object: { orderId: "72143" }, { order_id: "72143" }, { id: "72143" }
 */
export function extractOrderId(input) {
  if (input === undefined || input === null) return null
  if (typeof input === 'string' || typeof input === 'number') {
    const s = String(input).trim()
    return s.replace(/[^0-9a-zA-Z_-]/g, '') || null
  }
  if (typeof input === 'object') {
    const candidate = input.orderId || input.order_id || input.orderNumber || input.id || input.cleanId
    if (candidate !== undefined && candidate !== null) {
      return String(candidate).trim().replace(/[^0-9a-zA-Z_-]/g, '') || null
    }
  }
  return null
}

export async function lookupOrder(orderParam = '72143') {
  const cleanId = extractOrderId(orderParam)
  if (!cleanId) {
    return {
      success: false,
      error: 'Missing or invalid orderId parameter',
      orderId: null,
    }
  }

  const result = await trackOrderAcrossPlatforms(cleanId)
  return {
    success: true,
    endpoint: `GET /api/enterprise/orders/${cleanId}`,
    source: result.source || 'LOGISTICS_AGGREGATOR',
    dataSource: result.dataSource || 'SIMULATED_DATA',
    orderId: result.orderId,
    status: result.status,
    amount: result.amount,
    currency: result.currency || 'INR',
    carrier: result.carrier,
    trackingNumber: result.trackingNumber,
    delayDays: result.delayDays || 0,
    isSlaBreached: result.isSlaBreached || false,
    placedAt: result.placedAt,
    items: result.items || [],
  }
}

export async function getDeliveryStatus(orderParam = '72143') {
  const cleanId = extractOrderId(orderParam)
  if (!cleanId) {
    return {
      success: false,
      error: 'Missing or invalid orderId parameter',
      orderId: null,
    }
  }

  const result = await trackOrderAcrossPlatforms(cleanId)
  return {
    success: true,
    endpoint: `GET /api/enterprise/tracking/${cleanId}`,
    source: result.source || 'LOGISTICS_AGGREGATOR',
    dataSource: result.dataSource || 'SIMULATED_DATA',
    orderId: result.orderId,
    status: result.status,
    amount: result.amount,
    currency: result.currency || 'INR',
    carrier: result.carrier,
    trackingNumber: result.trackingNumber,
    lastCheckpoint: result.lastLocation || result.lastCheckpoint,
    delayDays: result.delayDays || 0,
    expectedDelivery: result.expectedDelivery,
    isSlaBreached: result.isSlaBreached || false,
    exceptionCode: result.exceptionCode || null,
    checkpoints: result.checkpoints || [],
  }
}

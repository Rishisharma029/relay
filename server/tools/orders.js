/**
 * RELAY Tool: orders.js
 * Logistics SLA check and order lookup via gRPC proxy simulation.
 */

export const ordersDatabase = {
  '84921': {
    orderId: '84921',
    amount: 1499,
    currency: 'INR',
    placedAt: '2026-08-21T14:20:00Z',
    expectedDelivery: '2026-08-24T18:00:00Z',
    status: 'delivery_exception',
    carrier: 'BlueDart Air',
    trackingNumber: 'BD-948192841',
    lastLocation: 'Hub 04 (Outer Ring Logistics Terminal)',
    exceptionCode: 'COURIER_DELAY_TRANSIT',
    delayDays: 3,
    items: [{ sku: 'SKU-AUDIO-99', name: 'Wireless Ergonomic Headset', qty: 1, price: 1499 }],
  },
}

/**
 * Normalizes order identifiers like '#84921', '84921', 'ORD-84921'
 */
function normalizeOrderId(id) {
  if (!id) return '84921'
  const clean = String(id).replace(/[^0-9]/g, '')
  return clean || '84921'
}

export async function lookupOrder(orderId = '84921') {
  // Simulate gRPC database query latency
  await new Promise((res) => setTimeout(res, 85))

  const cleanId = normalizeOrderId(orderId)
  const order = ordersDatabase[cleanId] || ordersDatabase['84921']

  return {
    success: true,
    orderId: order.orderId,
    status: order.status,
    amount: order.amount,
    currency: order.currency,
    carrier: order.carrier,
    trackingNumber: order.trackingNumber,
    delayDays: order.delayDays,
    placedAt: order.placedAt,
    items: order.items,
  }
}

export async function getDeliveryStatus(orderId = '84921') {
  // Simulate carrier API latency
  await new Promise((res) => setTimeout(res, 99))

  const cleanId = normalizeOrderId(orderId)
  const order = ordersDatabase[cleanId] || ordersDatabase['84921']

  return {
    success: true,
    orderId: order.orderId,
    status: order.status,
    amount: order.amount,
    currency: order.currency,
    carrier: order.carrier,
    trackingNumber: order.trackingNumber,
    lastCheckpoint: order.lastLocation,
    delayDays: order.delayDays,
    expectedDelivery: order.expectedDelivery,
    isSlaBreached: order.delayDays > 0,
    exceptionCode: order.exceptionCode,
  }
}

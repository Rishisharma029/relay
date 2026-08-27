/**
 * RELAY Tool: orders.js
 * Logistics SLA check and order lookup via gRPC proxy simulation.
 */

export const mockOrdersDatabase = {
  '84921': {
    orderId: '84921',
    amountInr: 1499,
    placedAt: '2026-08-21T14:20:00Z',
    expectedDelivery: '2026-08-24T18:00:00Z',
    status: 'DELIVERY_EXCEPTION',
    carrier: 'BlueDart Air',
    trackingNumber: 'BD-948192841',
    lastLocation: 'Hub 04 (Outer Ring Logistics Terminal)',
    exceptionCode: 'COURIER_DELAY_TRANSIT',
    delayDays: 3,
    items: [{ sku: 'SKU-AUDIO-99', name: 'Wireless Ergonomic Headset', qty: 1, price: 1499 }],
  },
}

export async function lookupOrder(orderId = '84921') {
  await new Promise((res) => setTimeout(res, 85))

  const order = mockOrdersDatabase[orderId] || mockOrdersDatabase['84921']
  return {
    found: true,
    order,
  }
}

export async function getDeliveryStatus(orderId = '84921') {
  await new Promise((res) => setTimeout(res, 99))

  const order = mockOrdersDatabase[orderId] || mockOrdersDatabase['84921']
  return {
    orderId: order.orderId,
    status: order.status,
    delayDays: order.delayDays,
    expectedDelivery: order.expectedDelivery,
    carrier: order.carrier,
    lastCheckpoint: order.lastLocation,
    isSlaBreached: order.delayDays > 0,
  }
}

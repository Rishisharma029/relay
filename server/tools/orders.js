/**
 * RELAY Tool: orders.js
 * Multi-Platform Logistics and Order Tracking Gateway.
 */

import { trackOrderAcrossPlatforms } from '../services/logisticsAggregator.js'

export async function lookupOrder(orderId = '84921') {
  const result = await trackOrderAcrossPlatforms(orderId)
  return {
    success: true,
    source: result.source || 'LOGISTICS_AGGREGATOR',
    dataSource: result.dataSource || 'SIMULATED_DATA',
    isLive: result.isLive || false,
    simulationBadge: result.simulationBadge || (result.isLive ? 'LIVE DATA' : 'SIMULATED DATA'),
    disclaimer: result.disclaimer || null,
    orderId: result.orderId,
    status: result.status,
    amount: result.amount,
    currency: result.currency || 'INR',
    carrier: result.carrier,
    trackingNumber: result.trackingNumber,
    delayDays: result.delayDays || 0,
    placedAt: result.placedAt,
    items: result.items || [],
  }
}

export async function getDeliveryStatus(orderId = '84921') {
  const result = await trackOrderAcrossPlatforms(orderId)
  return {
    success: true,
    source: result.source || 'LOGISTICS_AGGREGATOR',
    dataSource: result.dataSource || 'SIMULATED_DATA',
    isLive: result.isLive || false,
    simulationBadge: result.simulationBadge || (result.isLive ? 'LIVE DATA' : 'SIMULATED DATA'),
    disclaimer: result.disclaimer || null,
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

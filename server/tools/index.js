/**
 * RELAY — Backend Tool Engine Dispatcher
 *
 * Single controlled entry point delegating to ToolRouter.
 * Guarantees that the AI never calls arbitrary backend functions directly.
 */

import { lookupCustomer } from './customer.js'
import { lookupOrder, getDeliveryStatus, extractOrderId } from './orders.js'
import { evaluateRefundPolicy, issueRefund } from './refunds.js'
import { createTicket } from './tickets.js'
import { escalateCase } from './escalation.js'
import { ToolRouter, normalizeToolPayload } from '../toolRouter.js'
import { TOOL_REGISTRY, getApprovedToolDefinitions, isToolApproved, getToolDescriptor } from '../toolRegistry.js'

export {
  lookupCustomer,
  lookupOrder,
  getDeliveryStatus,
  evaluateRefundPolicy,
  issueRefund,
  createTicket,
  escalateCase,
  extractOrderId,
  ToolRouter,
  normalizeToolPayload,
  TOOL_REGISTRY,
  getApprovedToolDefinitions,
  isToolApproved,
  getToolDescriptor,
}

export const AVAILABLE_TOOLS = {
  lookupCustomer,
  lookupOrder,
  getOrderStatus: lookupOrder,
  getDeliveryStatus,
  evaluateRefundPolicy,
  issueRefund,
  refundOrder: issueRefund,
  createTicket,
  escalateCase,
}

/**
 * Public API — executes a tool with schema validation, policy checks, timeout + retry.
 * Delegates exclusively to ToolRouter.
 */
export async function executeTool(toolName, params = {}, context = {}) {
  const normalizedTool = toolName === 'getOrderStatus' ? 'lookupOrder' : toolName === 'refundOrder' ? 'issueRefund' : toolName
  return ToolRouter.execute(normalizedTool, params, context)
}

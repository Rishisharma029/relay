/**
 * RELAY — Backend Tool Engine Dispatcher
 * Executes tools with per-call timeout, auto-retry with backoff, and deterministic failure states.
 * No action is executed unless the tool call succeeds or retries are exhausted → human escalation.
 */

import { lookupCustomer } from './customer.js'
import { lookupOrder, getDeliveryStatus } from './orders.js'
import { evaluateRefundPolicy, issueRefund } from './refunds.js'
import { createTicket } from './tickets.js'
import { escalateCase } from './escalation.js'
import { TOOL_TIMEOUT_MS } from '../config.js'
import { withRetry, FAILURE_STATES, classifyFailure, buildFailureEvent } from '../failureEngine.js'

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
 * Core tool dispatcher — called with tool name and params.
 * Returns result or failure object; never throws.
 */
async function dispatchTool(toolName, params) {
  if (toolName === 'lookupCustomer')                          return lookupCustomer(params.customerId)
  if (toolName === 'lookupOrder' || toolName === 'getOrderStatus') return lookupOrder(params.orderId)
  if (toolName === 'getDeliveryStatus')                      return getDeliveryStatus(params.orderId)
  if (toolName === 'evaluateRefundPolicy')                   return evaluateRefundPolicy(params.orderId, params.amount)
  if (toolName === 'issueRefund' || toolName === 'refundOrder') return issueRefund(params.orderId, params.amount)
  if (toolName === 'createTicket')                           return createTicket(params.caseId, params.summary, params.priority)
  if (toolName === 'escalateCase')                           return escalateCase(params.caseId, params.reason, params.targetDesk)

  const fn = AVAILABLE_TOOLS[toolName]
  if (fn) return fn(params)

  throw new Error(`Unknown tool: ${toolName}`)
}

/**
 * Public API — executes a tool with timeout + retry + failure classification.
 *
 * Success:
 *   { type: 'tool.completed', tool, durationMs, result, attempts }
 *
 * Failure (all retries exhausted):
 *   { type: 'tool.failed', tool, failureState, failureEvent, error, attempts, escalate, userMessage }
 */
export async function executeTool(toolName, params = {}) {
  const startTime = Date.now()

  if (!AVAILABLE_TOOLS[toolName] && toolName !== 'lookupCustomer') {
    // Unknown tool — no retry, immediate failure
    return {
      type:         'tool.failed',
      tool:         toolName,
      failureState: FAILURE_STATES.TOOL_ERROR,
      error:        `Unknown tool: ${toolName}`,
      durationMs:   Date.now() - startTime,
      attempts:     0,
      escalate:     true,
    }
  }

  const retryResult = await withRetry(
    () => dispatchTool(toolName, params),
    {
      timeoutMs:    TOOL_TIMEOUT_MS,
      failureState: FAILURE_STATES.TOOL_TIMEOUT,
      context:      { tool: toolName, params },
    }
  )

  const durationMs = Date.now() - startTime

  if (retryResult.success) {
    return {
      type:      'tool.completed',
      tool:      toolName,
      durationMs,
      result:    retryResult.result,
      attempts:  retryResult.attempts,
    }
  }

  // Retries exhausted — return structured failure
  return {
    type:         'tool.failed',
    tool:         toolName,
    failureState: retryResult.failureState,
    failureEvent: retryResult.failureEvent,
    error:        retryResult.error,
    durationMs,
    attempts:     retryResult.attempts,
    escalate:     retryResult.escalate,
    userMessage:  retryResult.userMessage,
  }
}

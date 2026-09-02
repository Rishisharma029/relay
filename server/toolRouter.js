/**
 * RELAY — Controlled Tool Router
 *
 * Single controlled entry point for all tool executions across RELAY.
 *
 * Architecture:
 *   AI / LLM / Agora Turn
 *        │
 *        ▼
 *   toolRouter.execute(toolName, params, context)
 *        │
 *        ├── 1. Verify tool is in TOOL_REGISTRY (isToolApproved)
 *        ├── 2. Validate parameters against tool schema
 *        ├── 3. Evaluate safety & operator approval gates (risk tier check)
 *        ├── 4. Execute with per-call timeout & exponential backoff retry
 *        ├── 5. Record execution audit in PostgreSQL append-only store
 *        └── 6. Return deterministic result (never arbitrary throws)
 */

import { TOOL_REGISTRY, isToolApproved, getToolDescriptor } from './toolRegistry.js'
import { TOOL_TIMEOUT_MS } from './config.js'
import { withRetry, FAILURE_STATES } from './failureEngine.js'
import { db } from './db/database.js'

/**
 * Normalizes any incoming HTTP payload format into an unambiguous { tool, params } pair.
 * Safely supports:
 *   1. Wrapped: { "tool": "lookupOrder", "params": { "orderId": "72143" } }
 *   2. Parameters alias: { "tool": "lookupOrder", "parameters": { "orderId": "72143" } }
 *   3. Flattened orderId: { "orderId": "72143" } -> tool: "lookupOrder", params: { orderId: "72143" }
 *   4. Flattened parameters: { "parameters": { "orderId": "72143" } } -> tool: "lookupOrder", params: { orderId: "72143" }
 *   5. Flattened customerId: { "customerId": "CUST-1042" } -> tool: "lookupCustomer", params: { customerId: "CUST-1042" }
 */
export function normalizeToolPayload(body = {}) {
  if (!body || typeof body !== 'object') {
    return {
      valid: false,
      error: 'Invalid request payload: body must be a JSON object',
    }
  }

  // A. Explicit tool name provided
  if (body.tool || body.toolName || body.function || body.name) {
    const rawTool = body.tool || body.toolName || body.function || body.name
    const rawParams = body.params || body.parameters || body.args || body.arguments || {}

    let parsedParams = rawParams
    if (typeof rawParams === 'string') {
      try {
        parsedParams = JSON.parse(rawParams)
      } catch (e) {
        parsedParams = { orderId: rawParams }
      }
    }

    let normalizedTool = String(rawTool).trim()
    if (normalizedTool === 'getOrderStatus') normalizedTool = 'lookupOrder'
    if (normalizedTool === 'refundOrder') normalizedTool = 'issueRefund'

    return {
      valid: true,
      tool: normalizedTool,
      params: typeof parsedParams === 'object' && parsedParams !== null ? parsedParams : { orderId: String(parsedParams) },
    }
  }

  // B. Parameters object without explicit tool name
  if (body.params && typeof body.params === 'object') {
    return normalizeToolPayload(body.params)
  }
  if (body.parameters && typeof body.parameters === 'object') {
    return normalizeToolPayload(body.parameters)
  }

  // C. Unambiguous flattened payloads
  if (body.orderId || body.order_id || body.orderNumber || body.id) {
    const orderId = String(body.orderId || body.order_id || body.orderNumber || body.id).trim()
    return {
      valid: true,
      tool: 'lookupOrder',
      params: { orderId },
    }
  }

  if (body.customerId || body.customer_id) {
    const customerId = String(body.customerId || body.customer_id).trim()
    return {
      valid: true,
      tool: 'lookupCustomer',
      params: { customerId },
    }
  }

  if (body.awb || body.trackingNumber || body.tracking_number) {
    const trackingNumber = String(body.awb || body.trackingNumber || body.tracking_number).trim()
    return {
      valid: true,
      tool: 'getDeliveryStatus',
      params: { orderId: trackingNumber },
    }
  }

  // D. Empty or unrecognized
  return {
    valid: false,
    error: 'Could not determine tool from payload. Provide { "tool": "lookupOrder", "params": { ... } } or unambiguous parameters.',
  }
}

export class ToolRouter {
  /**
   * Execute an approved tool through the single controlled router entry point.
   */
  static async execute(toolName, params = {}, context = {}) {
    const startTime = Date.now()
    const caseId = context.caseId || 'RLY-72143'

    // ── 1. Gating: Is the tool approved in the registry? ─────────────────
    if (!isToolApproved(toolName)) {
      const errorMsg = `Unauthorized tool execution blocked: '${toolName}' is not registered in the approved Tool Registry.`
      console.warn(`[ToolRouter] 403 Forbidden: ${errorMsg}`)

      return {
        success: false,
        type: 'tool.failed',
        tool: toolName,
        failureState: FAILURE_STATES.TOOL_ERROR,
        error: errorMsg,
        durationMs: Date.now() - startTime,
        attempts: 0,
        escalate: true,
        userMessage: 'I encountered an issue accessing that service. Let me connect you with an operator.',
      }
    }

    const descriptor = getToolDescriptor(toolName)

    // ── 2. Parameter Validation against Tool Schema ──────────────────────
    const validation = descriptor.validate(params)
    if (!validation.valid) {
      const errorMsg = `Parameter validation failed for '${toolName}': ${validation.error}`
      console.warn(`[ToolRouter] 400 Bad Request: ${errorMsg}`)

      return {
        success: false,
        type: 'tool.failed',
        tool: toolName,
        failureState: FAILURE_STATES.TOOL_ERROR,
        error: errorMsg,
        durationMs: Date.now() - startTime,
        attempts: 0,
        escalate: false,
        userMessage: 'I need a few more details to look up that information.',
      }
    }

    // ── 3. Policy & Approval Gate Enforcement ────────────────────────────
    if (descriptor.requiresApproval && !context.isOperatorApproved) {
      console.log(`[ToolRouter] Gate 1 Policy Trigger: '${toolName}' requires human operator approval.`)

      return {
        success: false,
        type: 'tool.approval_required',
        tool: toolName,
        riskLevel: descriptor.riskLevel,
        requiresApproval: true,
        durationMs: Date.now() - startTime,
        attempts: 1,
        message: 'Action proposed and awaiting operator approval.',
      }
    }

    // ── 4. Resilient Execution with Per-Call Timeout & Auto-Retry ────────
    const retryResult = await withRetry(
      () => descriptor.handler(params),
      {
        timeoutMs: TOOL_TIMEOUT_MS,
        failureState: FAILURE_STATES.TOOL_TIMEOUT,
        context: { tool: toolName, params, caseId },
      }
    )

    const durationMs = Date.now() - startTime

    // ── 5. Record Audit Execution in Append-Only Database Log ───────────
    try {
      db.appendRelayEvent(caseId, {
        type: retryResult.success ? 'tool.completed' : 'tool.failed',
        tool: toolName,
        durationMs,
        attempts: retryResult.attempts,
        success: retryResult.success,
        timestamp: new Date().toLocaleTimeString(),
      })
    } catch (e) {}

    // ── 6. Return Standardized Execution Result ─────────────────────────
    if (retryResult.success) {
      return {
        success: true,
        type: 'tool.completed',
        tool: toolName,
        durationMs,
        result: retryResult.result,
        attempts: retryResult.attempts,
      }
    }

    // Failure after retries exhausted
    return {
      success: false,
      type: 'tool.failed',
      tool: toolName,
      failureState: retryResult.failureState,
      failureEvent: retryResult.failureEvent,
      error: retryResult.error,
      durationMs,
      attempts: retryResult.attempts,
      escalate: retryResult.escalate,
      userMessage: retryResult.userMessage,
    }
  }
}

/**
 * RELAY — Controlled Tool Router
 *
 * Single controlled entry point for all tool executions across RELAY.
 *
 * Architecture:
 *   AI / LLM Turn
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

export class ToolRouter {
  /**
   * Execute an approved tool through the single controlled router entry point.
   *
   * @param {string} toolName - Name of the approved tool requested
   * @param {object} params - Input parameters matching the registry schema
   * @param {object} context - Execution context { caseId, customerId, operatorId, approvalToken }
   * @returns {Promise<object>} Structured execution result or deterministic failure object
   */
  static async execute(toolName, params = {}, context = {}) {
    const startTime = Date.now()
    const caseId = context.caseId || 'RLY-1042'

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
      // High-risk financial tool called without active operator approval
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

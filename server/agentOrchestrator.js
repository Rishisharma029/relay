/**
 * RELAY — Autonomous AI Agent Reasoning & Function Calling (Tool Calling) Engine
 * ASR → Language Shift → LLM Intent → Tool Calling (timeout + retry) → LLM Response (timeout) → TTS
 * All failure paths produce deterministic failure events, never silent errors.
 */

import { executeTool } from './tools/index.js'
import { createApprovalRequest } from './approvalService.js'
import { sessionLanguageStore, detectLanguageShift } from './languageManager.js'
import { LLM_TIMEOUT_MS } from './config.js'
import {
  FAILURE_STATES,
  buildFailureEvent,
  getRecoveryPlan,
} from './failureEngine.js'

export const AGENT_TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'lookupOrder',
      description: 'Lookup e-commerce order details, logistics status, carrier tracking, and delay exceptions.',
      parameters: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'The 5-digit order identifier, e.g. 84921' },
        },
        required: ['orderId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getDeliveryStatus',
      description: 'Query real-time delivery checkpoints, SLA status, and courier exception codes.',
      parameters: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'The 5-digit order identifier' },
        },
        required: ['orderId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'evaluateRefundPolicy',
      description: 'Evaluate dispute eligibility and check if human supervisor approval is required.',
      parameters: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'The order identifier' },
          amount:  { type: 'number', description: 'Refund amount requested in INR, e.g. 1499' },
        },
        required: ['orderId', 'amount'],
      },
    },
  },
]

/**
 * Autonomous Conversation Turn Processing
 * Handles dynamic dialect shift, intent detection, tool execution (with failure handling),
 * LLM synthesis (with timeout), and voice response — without session reload.
 */
export async function processAgentTurn(customerUtterance = 'Mera order 5 din se nahi aaya.', caseId = 'RLY-1042') {
  const turnStartTime = Date.now()
  const events = []
  const failures = []

  let activeLanguage = sessionLanguageStore.getLanguage(caseId)

  // ── 1. Dynamic In-Call Language Shift Detection ──────────────────────────
  const shiftResult = detectLanguageShift(customerUtterance, activeLanguage)
  if (shiftResult.shifted) {
    activeLanguage = sessionLanguageStore.setLanguage(caseId, shiftResult.to)
    events.push({
      type:      'language.changed',
      from:      shiftResult.from,
      to:        shiftResult.to,
      reason:    shiftResult.reason,
      confidence: shiftResult.confidence,
      timestamp: new Date().toLocaleTimeString(),
    })
  }

  // ── 2. Customer Speech Transcript Event ──────────────────────────────────
  const isHindiText = customerUtterance.includes('Mera') || customerUtterance.includes('chahiye') || customerUtterance.includes('mein')
  events.push({
    type:        'speech.transcript',
    speaker:     'customer',
    text:        customerUtterance,
    language:    isHindiText ? 'Hindi' : 'English',
    translation: isHindiText
      ? (customerUtterance.includes('Mera') ? "My order hasn't arrived for 5 days."
        : customerUtterance.includes('refund') ? 'I want a refund.'
        : customerUtterance)
      : undefined,
    timestamp: new Date().toLocaleTimeString(),
  })

  // ── 3. Handle Language Switch Turn ───────────────────────────────────────
  if (shiftResult.shifted) {
    const isEn = activeLanguage === 'en-IN'
    const agentText = isEn
      ? "Certainly, I'll continue in English. How can I assist you with your order today?"
      : 'Zaroor, main ab se Hindi mein baat karti hoon. Main aapki kya madad kar sakti hoon?'

    events.push({
      type:      'speech.transcript',
      speaker:   'agent',
      text:      agentText,
      language:  isEn ? 'English (India)' : 'Hindi',
      timestamp: new Date().toLocaleTimeString(),
    })

    return {
      success: true,
      languageShift: shiftResult,
      activeLanguage,
      intent:       'language_switch',
      toolsCalled:  [],
      agentResponse: agentText,
      events,
      totalLatencyMs: Date.now() - turnStartTime,
    }
  }

  // ── 4. LLM Intent Detection (with timeout) ───────────────────────────────
  let detectedIntent = 'general_inquiry'
  let toolsToCall = []

  try {
    // Simulate LLM call with hard timeout
    await Promise.race([
      (async () => {
        if (customerUtterance.toLowerCase().includes('order') || customerUtterance.includes('din') || customerUtterance.includes('aaya')) {
          detectedIntent = 'delivery_issue'
          toolsToCall.push({ tool: 'lookupOrder', params: { orderId: '84921' } })
        }
        if (customerUtterance.toLowerCase().includes('refund') || customerUtterance.includes('chahiye')) {
          detectedIntent = 'refund_request'
          toolsToCall.push({ tool: 'evaluateRefundPolicy', params: { orderId: '84921', amount: 1499 } })
        }
      })(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('LLM timeout')), LLM_TIMEOUT_MS)
      ),
    ])
  } catch (err) {
    const failureEvent = buildFailureEvent(FAILURE_STATES.LLM_TIMEOUT, {
      attemptMs: LLM_TIMEOUT_MS,
    })
    failures.push(failureEvent)
    events.push({ ...failureEvent, timestamp: new Date().toLocaleTimeString() })

    // Canned response — don't drop the call
    const fallbackText = activeLanguage === 'en-IN'
      ? 'I am processing your request. Please hold for just a moment.'
      : 'Main aapki baat samajh rahi hoon. Ek moment please.'
    events.push({
      type:      'speech.transcript',
      speaker:   'agent',
      text:      fallbackText,
      language:  activeLanguage === 'en-IN' ? 'English (India)' : 'Hindi',
      timestamp: new Date().toLocaleTimeString(),
    })

    return {
      success:        false,
      failures,
      activeLanguage,
      intent:         'llm_timeout',
      toolsCalled:    [],
      agentResponse:  fallbackText,
      events,
      totalLatencyMs: Date.now() - turnStartTime,
      recovery:       getRecoveryPlan(FAILURE_STATES.LLM_TIMEOUT),
    }
  }

  // ── 5. Tool Execution (timeout + retry built into executeTool) ───────────
  const toolResults = []

  for (const call of toolsToCall) {
    events.push({
      type:      'tool.started',
      tool:      call.tool,
      params:    call.params,
      timestamp: new Date().toLocaleTimeString(),
    })

    const toolExec = await executeTool(call.tool, call.params)

    if (toolExec.type === 'tool.failed') {
      // Tool failed after all retries
      failures.push(toolExec.failureEvent)
      events.push({
        ...toolExec.failureEvent,
        timestamp: new Date().toLocaleTimeString(),
      })

      if (toolExec.escalate) {
        // Exhausted retries → escalate to human
        events.push({
          type:         'failure.escalation_required',
          reason:       `Tool ${call.tool} failed after ${toolExec.attempts} attempts`,
          failureState: toolExec.failureState,
          timestamp:    new Date().toLocaleTimeString(),
        })

        const escalationText = activeLanguage === 'en-IN'
          ? 'I am connecting you to a human operator who can assist you directly.'
          : 'Main aapko ek operator se connect kar rahi hoon jo directly help kar sakenge.'

        events.push({
          type:      'speech.transcript',
          speaker:   'agent',
          text:      escalationText,
          language:  activeLanguage === 'en-IN' ? 'English (India)' : 'Hindi',
          timestamp: new Date().toLocaleTimeString(),
        })

        return {
          success:        false,
          failures,
          activeLanguage,
          intent:         detectedIntent,
          toolsCalled:    [call.tool],
          agentResponse:  escalationText,
          events,
          escalateToHuman: true,
          totalLatencyMs: Date.now() - turnStartTime,
          recovery:       getRecoveryPlan(toolExec.failureState),
        }
      }

      // Non-escalating failure — continue with degraded response
      toolResults.push({ tool: call.tool, failed: true })
      continue
    }

    // Tool succeeded
    toolResults.push(toolExec)
    events.push({
      type:      'tool.completed',
      tool:      call.tool,
      durationMs: toolExec.durationMs,
      result:    toolExec.result,
      attempts:  toolExec.attempts,
      timestamp: new Date().toLocaleTimeString(),
    })

    // Trigger human approval if policy requires it
    if (call.tool === 'evaluateRefundPolicy' && toolExec.result?.requiresHumanApproval) {
      const approval = await createApprovalRequest({
        caseId,
        orderId: call.params.orderId,
        amount:  call.params.amount,
      })

      events.push({
        type:      'approval.created',
        actionId:  approval.approval.id,
        amount:    1499,
        riskTier:  'MEDIUM',
        timestamp: new Date().toLocaleTimeString(),
      })
    }
  }

  // ── 6. LLM Synthesizes Final Response ────────────────────────────────────
  let agentResponseText = ''
  let agentTranslation  = ''

  if (activeLanguage === 'en-IN') {
    if (detectedIntent === 'delivery_issue') {
      agentResponseText = "I'm checking that for you right now... Your order #84921 has a delivery exception with BlueDart Air."
    } else if (detectedIntent === 'refund_request') {
      agentResponseText = 'I have proposed an instant refund of ₹1,499. It is currently awaiting supervisor approval.'
    } else {
      agentResponseText = 'How else can I assist you with your delivery today?'
    }
  } else {
    if (detectedIntent === 'delivery_issue') {
      agentResponseText = 'Main order check karti hoon... Aapke order #84921 mein delivery delay hai.'
      agentTranslation  = "I'm checking the order... Your order #84921 has a delivery delay with BlueDart Air."
    } else if (detectedIntent === 'refund_request') {
      agentResponseText = 'Maine ₹1,499 refund request initiate kar di hai. Supervisor approval pending hai.'
      agentTranslation  = 'I have proposed a ₹1,499 refund. Human supervisor approval is currently requested.'
    } else {
      agentResponseText = 'Namaste! Main aapki order ke sath kya madad kar sakti hoon?'
      agentTranslation  = 'Namaste! How can I assist you with your order today?'
    }
  }

  events.push({
    type:        'speech.transcript',
    speaker:     'agent',
    text:        agentResponseText,
    translation: agentTranslation || undefined,
    language:    activeLanguage === 'en-IN' ? 'English (India)' : 'Hindi / Hinglish',
    timestamp:   new Date().toLocaleTimeString(),
  })

  return {
    success:        failures.length === 0,
    failures,
    activeLanguage,
    intent:         detectedIntent,
    toolsCalled:    toolsToCall.map((t) => t.tool),
    toolResults,
    agentResponse:  agentResponseText,
    agentTranslation,
    events,
    totalLatencyMs: Date.now() - turnStartTime,
  }
}

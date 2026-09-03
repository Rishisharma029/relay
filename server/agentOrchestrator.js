import { CommerceRulesEngine } from './services/commerceRulesEngine.js'
import { settledRefundsLedger } from './policyEngine.js'
import { normalizeForTts } from './services/ttsNormalizer.js'
/**
 * RELAY — Autonomous AI Agent Reasoning & Function Calling (Tool Calling) Engine
 * Multi-Turn Conversational Reasoning, Gemini 3.5/2.5 Intelligence, Tool Calling, Policy Grounding & Gender-Aware Synthesis
 */

import { ToolRouter } from './toolRouter.js'
import { getApprovedToolDefinitions } from './toolRegistry.js'
import { createApprovalRequest } from './approvalService.js'
import { sessionLanguageStore, detectLanguageShift } from './languageManager.js'
import { LLM_TIMEOUT_MS } from './config.js'
import { db } from './db/database.js'
import { MemoryService } from './memory/memoryService.js'
import { KnowledgeService } from './knowledge/knowledgeService.js'
import { GeminiService } from './geminiService.js'
import { trackOrderAcrossPlatforms } from './services/logisticsAggregator.js'
import {
  FAILURE_STATES,
  buildFailureEvent,
  getRecoveryPlan,
} from './failureEngine.js'

export const AGENT_TOOL_DEFINITIONS = getApprovedToolDefinitions()

/**
 * Autonomous Conversation Turn Processing
 * Dynamic Intent Detection, Tool Sequencing, Multi-Turn Dialog Branching,
 * Gemini Reasoning, and Gender-Aware Voice & Grammar Synthesis.
 */
export async function processAgentTurn(
  customerUtterance = 'Mera order 5 din se nahi aaya.',
  caseId = 'RLY-1042',
  customerNameOverride = null,
  agentGender = 'female'
) {
  // ── 0. RUNTIME TURN DIAGNOSTIC LOGGING ──────────────────────────────────
  const turnTimestamp = new Date().toISOString()
  console.log(`\n======================================================`)
  console.log(`[Turn Engine] ⏱️  Timestamp: ${turnTimestamp}`)
  console.log(`[Turn Engine] 🎙️  User Utterance: "${customerUtterance}"`)
  console.log(`[Turn Engine] 👤 Caller: ${customerNameOverride || 'Customer'}, Case: ${caseId}, Gender: ${agentGender}`)

  const turnStartTime = Date.now()
  const events = []
  const failures = []

  let activeLanguage = sessionLanguageStore.getLanguage(caseId)

  // ── 1. Dynamic In-Call Language Shift Detection ──────────────────────────
  const shiftResult = detectLanguageShift(customerUtterance, activeLanguage)
  if (shiftResult.shifted) {
    activeLanguage = sessionLanguageStore.setLanguage(caseId, shiftResult.to)
    events.push({
      type: 'language.changed',
      from: shiftResult.from,
      to: shiftResult.to,
      reason: shiftResult.reason,
      confidence: shiftResult.confidence,
      timestamp: new Date().toLocaleTimeString(),
    })
  }

  // ── 2. Customer Speech Transcript Event ──────────────────────────────────
  const isHindiText =
    customerUtterance.includes('Mera') ||
    customerUtterance.includes('chahiye') ||
    customerUtterance.includes('mein') ||
    customerUtterance.includes('aaya') ||
    customerUtterance.includes('karo') ||
    customerUtterance.includes('hai') ||
    customerUtterance.includes('nahi') ||
    customerUtterance.includes('kya') ||
    customerUtterance.includes('paisa') ||
    customerUtterance.includes('batao')

  events.push({
    type: 'speech.transcript',
    speaker: 'customer',
    text: customerUtterance,
    language: isHindiText ? 'Hindi' : 'English',
    translation: isHindiText
      ? customerUtterance.includes('Mera')
        ? "My order hasn't arrived for 5 days."
        : customerUtterance.includes('refund')
        ? 'I want a refund.'
        : customerUtterance.includes('cancel')
        ? 'Please cancel my order.'
        : undefined
      : undefined,
    timestamp: new Date().toLocaleTimeString(),
  })

  // ── 3. Handle Language Switch Turn ───────────────────────────────────────
  const isMale = agentGender === 'male'
  if (shiftResult.shifted && (customerUtterance.toLowerCase().includes('switch') || customerUtterance.toLowerCase().includes('speak in') || customerUtterance.toLowerCase().includes('continue in'))) {
    const isEn = activeLanguage === 'en-IN'
    const agentText = isEn
      ? "Certainly, I'll continue in English. How can I assist you with your order today?"
      : isMale
      ? 'Zaroor, main ab se Hindi mein baat karta hoon. Main aapki kya madad kar sakta hoon?'
      : 'Zaroor, main ab se Hindi mein baat karti hoon. Main aapki kya madad kar sakti hoon?'

    events.push({
      type: 'speech.transcript',
      speaker: 'agent',
      text: agentText,
      language: isEn ? 'English (India)' : 'Hindi',
      timestamp: new Date().toLocaleTimeString(),
    })

    return {
      success: true,
      languageShift: shiftResult,
      activeLanguage,
      intent: 'language_switch',
      toolsCalled: [],
      agentResponse: agentText,
      events,
      totalLatencyMs: Date.now() - turnStartTime,
    }
  }

  // ── 4. Context & Policy Retrieval ──────────────────────────────────────────
  const memoryContext = MemoryService.getFullMemoryContext(caseId, customerUtterance)
  const customerName = (customerNameOverride || memoryContext.customerMemory?.name || 'Customer').split(' ')[0]
  const policyEvidence = KnowledgeService.retrievePolicyEvidence(customerUtterance)

  // ── 5. Gemini 2.5/3.5 Reasoning Engine Invocation (with deterministic fallback) ──
  let detectedIntent = 'general_inquiry'
  let toolsToCall = []
  let geminiAgentResponse = null
  let geminiAgentSpeechText = null
  let geminiAgentTranslation = null

  const orderMatch = customerUtterance.match(/(?:order|package|awb|id|number)?\s*#?(\d{4,8})/i)
  const matchedOrderId = orderMatch ? orderMatch[1] : (memoryContext?.orderId || (caseId ? caseId.replace(/[^0-9]/g, '') : null) || '72143')
  const orderRecord = await trackOrderAcrossPlatforms(matchedOrderId)
  const orderAmount = orderRecord.amount || 2899
  const orderCarrier = orderRecord.carrier || 'Delhivery Express'
  const orderDelay = orderRecord.delayDays || (orderRecord.isSlaBreached ? 4 : 0)
  const orderItemName = orderRecord.items?.[0]?.name || 'Merchandise'

  let geminiResult = null
  try {
    geminiResult = await Promise.race([
      GeminiService.executeReasoningTurn({
        customerUtterance,
        caseId,
        customerName,
        agentGender,
        activeLanguage,
        memoryContext: {
          ...memoryContext,
          orderId: matchedOrderId,
          orderAmount,
          orderCarrier,
          orderDelayDays: orderDelay,
          orderItem: orderItemName,
        },
        policyEvidence,
      }),
      new Promise((resolve) => setTimeout(() => resolve(null), LLM_TIMEOUT_MS || 8000)),
    ])

    if (geminiResult && geminiResult.success) {
      detectedIntent = geminiResult.detectedIntent || 'general_inquiry'
      if (Array.isArray(geminiResult.toolsToCall) && geminiResult.toolsToCall.length > 0) {
        toolsToCall = geminiResult.toolsToCall
      }
      geminiAgentResponse = geminiResult.agentResponse
      geminiAgentSpeechText = geminiResult.speechText
      geminiAgentTranslation = geminiResult.agentTranslation
    }
  } catch (geminiErr) {
    console.warn('[Gemini Reasoning] Fallback to deterministic engine:', geminiErr?.message)
  }

  // If Gemini did not populate tools/intent or timed out, apply deterministic fallback classifier
  if (!toolsToCall || toolsToCall.length === 0) {
    const lower = customerUtterance.toLowerCase()

    const isGreeting =
      lower.includes('hello') ||
      lower.includes('namaste') ||
      lower.includes('hi') ||
      lower.includes('hey') ||
      lower.includes('sun rahe') ||
      lower.includes('good morning') ||
      lower.includes('good evening')

    const isDelivery =
      lower.includes('order') ||
      lower.includes('din') ||
      lower.includes('aaya') ||
      lower.includes('delivery') ||
      lower.includes('delay') ||
      lower.includes('late') ||
      lower.includes('kaha') ||
      lower.includes('status') ||
      lower.includes('track')

    const isRefund =
      lower.includes('refund') ||
      lower.includes('paisa') ||
      lower.includes('paise') ||
      lower.includes('chahiye') ||
      lower.includes('wapas') ||
      lower.includes('return')

    const isPaymentMethod =
      lower.includes('upi') ||
      lower.includes('bank') ||
      lower.includes('account') ||
      lower.includes('original') ||
      lower.includes('gpay') ||
      lower.includes('phonepe') ||
      lower.includes('paytm')

    const isCancel =
      lower.includes('cancel') ||
      lower.includes('radd') ||
      lower.includes('band kar') ||
      lower.includes('nahi chahiye')

    const isAddress =
      lower.includes('address') ||
      lower.includes('pata') ||
      lower.includes('pin code') ||
      lower.includes('location') ||
      lower.includes('change')

    const isPaymentFail =
      lower.includes('cut gaya') ||
      lower.includes('deduct') ||
      lower.includes('fail') ||
      lower.includes('kat gaye')

    const isPolicy =
      lower.includes('policy') ||
      lower.includes('rules') ||
      lower.includes('nirdesh') ||
      lower.includes('terms') ||
      lower.includes('guarantee')

    const isEscalation =
      lower.includes('human') ||
      lower.includes('operator') ||
      lower.includes('manager') ||
      lower.includes('senior') ||
      lower.includes('agent se')

    const isAffirmation =
      lower === 'haan' ||
      lower === 'ha' ||
      lower === 'yes' ||
      lower === 'theek hai' ||
      lower === 'thik hai' ||
      lower === 'okay' ||
      lower === 'ok' ||
      lower === 'sure' ||
      lower === 'kar do' ||
      lower === 'bhej do'

    const isGratitude =
      lower.includes('thank') ||
      lower.includes('dhanyawad') ||
      lower.includes('shukriya') ||
      lower.includes('bye') ||
      lower.includes('alvida') ||
      lower.includes('bas itna')

    if (isEscalation) {
      detectedIntent = 'escalation_requested'
    } else if (isPaymentMethod && !isDelivery) {
      detectedIntent = 'refund_payment_method'
      toolsToCall.push({ tool: 'evaluateRefundPolicy', params: { orderId: matchedOrderId, amount: orderAmount } })
    } else if (isRefund) {
      detectedIntent = 'refund_request'
      toolsToCall.push({ tool: 'lookupOrder', params: { orderId: matchedOrderId } })
      toolsToCall.push({ tool: 'evaluateRefundPolicy', params: { orderId: matchedOrderId, amount: orderAmount } })
    } else if (isCancel) {
      detectedIntent = 'order_cancellation'
      toolsToCall.push({ tool: 'lookupOrder', params: { orderId: matchedOrderId } })
    } else if (isAddress) {
      detectedIntent = 'address_change'
    } else if (isPaymentFail) {
      detectedIntent = 'payment_failure_issue'
    } else if (isPolicy) {
      detectedIntent = 'policy_inquiry'
    } else if (isDelivery) {
      detectedIntent = 'delivery_issue'
      toolsToCall.push({ tool: 'lookupCustomer', params: { customerId: 'CUS-1042' } })
      toolsToCall.push({ tool: 'lookupOrder', params: { orderId: matchedOrderId } })
      toolsToCall.push({ tool: 'getDeliveryStatus', params: { orderId: matchedOrderId } })
    } else if (isAffirmation) {
      detectedIntent = 'confirmation_affirm'
    } else if (isGratitude) {
      detectedIntent = 'gratitude_closing'
    } else if (isGreeting) {
      detectedIntent = 'greeting'
    } else {
      detectedIntent = 'general_inquiry'
    }
  }

  // ── 6. Tool Execution (Controlled Tool Router Entry Point) ───────────────
  const toolResults = []

  for (const call of toolsToCall) {
    events.push({
      type: 'tool.started',
      tool: call.tool,
      params: call.params,
      timestamp: new Date().toLocaleTimeString(),
    })

    const toolExec = await ToolRouter.execute(call.tool, call.params, { caseId })

    if (toolExec.type === 'tool.failed') {
      failures.push(toolExec.failureEvent)
      events.push({
        ...toolExec.failureEvent,
        timestamp: new Date().toLocaleTimeString(),
      })

      if (toolExec.escalate) {
        events.push({
          type: 'failure.escalation_required',
          reason: `Tool ${call.tool} failed after ${toolExec.attempts} attempts`,
          failureState: toolExec.failureState,
          timestamp: new Date().toLocaleTimeString(),
        })

        const escalationText =
          activeLanguage === 'en-IN'
            ? 'I am connecting you to a human operator who can assist you directly.'
            : isMale
            ? 'Main aapko ek operator se connect kar raha hoon jo directly help kar sakenge.'
            : 'Main aapko ek operator se connect kar rahi hoon jo directly help kar sakenge.'

        events.push({
          type: 'speech.transcript',
          speaker: 'agent',
          text: escalationText,
          language: activeLanguage === 'en-IN' ? 'English (India)' : 'Hindi',
          timestamp: new Date().toLocaleTimeString(),
        })

        return {
          success: false,
          failures,
          activeLanguage,
          intent: detectedIntent,
          toolsCalled: [call.tool],
          agentResponse: escalationText,
          events,
          orderData: orderRecord,
          escalateToHuman: true,
          totalLatencyMs: Date.now() - turnStartTime,
          recovery: getRecoveryPlan(toolExec.failureState),
        }
      }

      toolResults.push({ tool: call.tool, failed: true })
      continue
    }

    toolResults.push(toolExec)
    events.push({
      type: 'tool.completed',
      tool: call.tool,
      durationMs: toolExec.durationMs,
      result: toolExec.result,
      attempts: toolExec.attempts,
      timestamp: new Date().toLocaleTimeString(),
    })

    // Trigger human approval if refund policy requires sign-off
    if (call.tool === 'evaluateRefundPolicy' && toolExec.result?.requiresHumanApproval) {
      const approval = await createApprovalRequest({
        caseId,
        orderId: call.params.orderId,
        amount: orderAmount,
      })

      events.push({
        type: 'approval.created',
        actionId: approval.approval.id,
        amount: orderAmount,
        riskTier: 'MEDIUM',
        timestamp: new Date().toLocaleTimeString(),
      })
    }
  }

  // ── 6.5 Deterministic Commerce Rules Engine Evaluation ──────────────────
  const lowerUtterance = customerUtterance.toLowerCase()
  const isForceMajeure = lowerUtterance.includes('force majeure') || lowerUtterance.includes('flood') || lowerUtterance.includes('calamity') || lowerUtterance.includes('natural disaster')
  const isDefective = lowerUtterance.includes('defect') || lowerUtterance.includes('kharab') || lowerUtterance.includes('broken') || lowerUtterance.includes('toota') || lowerUtterance.includes('damaged')
  const isDeficient = lowerUtterance.includes('deficient') || lowerUtterance.includes('incomplete') || lowerUtterance.includes('adhoora')
  const isSpurious = lowerUtterance.includes('spurious') || lowerUtterance.includes('fake') || lowerUtterance.includes('nakli') || lowerUtterance.includes('counterfeit')
  const isNotAsAdvertised = lowerUtterance.includes('not as advertised') || lowerUtterance.includes('different') || lowerUtterance.includes('alag') || lowerUtterance.includes('wrong item')
  const isComplaint = lowerUtterance.includes('complaint') || lowerUtterance.includes('shikayat') || lowerUtterance.includes('grievance') || lowerUtterance.includes('ticket')
  const isWarrantyCheck = lowerUtterance.includes('warranty') || lowerUtterance.includes('guarantee')

  const commerceRule = CommerceRulesEngine.evaluate({
    orderId: matchedOrderId,
    orderStatus: orderRecord.status,
    deliveryStatus: orderDelay > 0 ? 'delayed' : 'on_schedule',
    deliveryPromisedDate: '2026-08-30',
    delayDays: orderDelay,
    carrier: orderCarrier,
    trackingNumber: orderRecord.trackingNumber || `DL-${matchedOrderId}01`,
    refundAmount: orderAmount,
    customerTier: 'PLATINUM',
    customerRequestedRefund: detectedIntent === 'refund_request' || lowerUtterance.includes('refund'),
    forceMajeure: isForceMajeure,
    defective: isDefective,
    deficient: isDeficient,
    spurious: isSpurious,
    productMatchesDescription: !isNotAsAdvertised,
    cancellationRequested: detectedIntent === 'order_cancellation' || lowerUtterance.includes('cancel'),
    paymentStatus: lowerUtterance.includes('double') ? 'captured_order_failed' : 'captured',
    refundAlreadyIssued: settledRefundsLedger.has(matchedOrderId),
    complaintExists: isComplaint,
    warrantyCheckRequested: isWarrantyCheck,
    warrantyActive: true,
    jurisdiction: 'IN'
  })

  // Append full compliance audit event to PostgreSQL append-only store
  events.push({
    type: 'commerce_rule.evaluated',
    ruleId: commerceRule.ruleId,
    ruleVersion: commerceRule.ruleVersion,
    decision: commerceRule.decision,
    eligible: commerceRule.eligible,
    requiresHumanApproval: commerceRule.requiresHumanApproval,
    evidence: commerceRule.evidence,
    timestamp: new Date().toLocaleTimeString()
  })

  if (commerceRule.complaintRequired && commerceRule.ticketNumber) {
    events.push({
      type: 'complaint.created',
      ticketNumber: commerceRule.ticketNumber,
      orderId: matchedOrderId,
      timestamp: new Date().toLocaleTimeString()
    })
  }

  // Enforce Human Approval Gate if mandated by Commerce Rules
  if (commerceRule.requiresHumanApproval && !events.some(e => e.type === 'approval.created')) {
    const approval = await createApprovalRequest({
      caseId,
      orderId: matchedOrderId,
      amount: orderAmount,
      reason: commerceRule.approvalReason || 'HIGH_VALUE_REFUND',
      policyId: commerceRule.ruleId
    })

    events.push({
      type: 'approval.created',
      actionId: approval.approval.id,
      amount: orderAmount,
      riskTier: orderAmount > 5000 ? 'HIGH' : 'MEDIUM',
      policyId: commerceRule.ruleId,
      reason: commerceRule.approvalReason || 'HIGH_VALUE_REFUND',
      timestamp: new Date().toLocaleTimeString()
    })
  }

  // ── 7. Dynamic Response Synthesis Grounded in Context ────────────────────
  let agentResponseText = geminiAgentResponse
  let agentTranslation = geminiAgentTranslation

  if (!agentResponseText) {
    if (activeLanguage === 'en-IN') {
      switch (detectedIntent) {
        case 'greeting':
          agentResponseText = `Hello ${customerName}! I'm RELAY. How can I assist you today? Are you inquiring about an existing order or requesting a refund?`
          break

        case 'delivery_issue':
          agentResponseText = `${customerName}, I am checking order #${matchedOrderId} (${orderItemName}). It has a delivery exception with ${orderCarrier} and is delayed by ${orderDelay} days. Would you like me to expedite the shipment, or would you prefer an instant refund of ₹${orderAmount}?`
          break

        case 'refund_request':
          agentResponseText = `Under Refund Policy v3.2, order #${matchedOrderId} is eligible for an instant ₹${orderAmount} refund due to the delivery delay. I have initiated the approval request. Would you like the refund dispatched via instant UPI or to your original payment method?`
          break

        case 'refund_payment_method':
          agentResponseText = `Understood ${customerName}, your ₹${orderAmount} refund for order #${matchedOrderId} is queued for instant UPI settlement. Funds will credit within 120 seconds upon supervisor approval. Should I send you an SMS confirmation?`
          break

        case 'order_cancellation':
          agentResponseText = `I have initiated the cancellation for order #${matchedOrderId} and halted carrier dispatch. Do you need assistance with anything else?`
          break

        case 'address_change':
          agentResponseText = `We can update your delivery address for order #${matchedOrderId} while the shipment is at the transit hub. Please provide your new PIN code and delivery address.`
          break

        case 'payment_failure_issue':
          agentResponseText = `If funds were deducted without an order confirmation, our payment gateway auto-reverses within 24 hours under NPCI guidelines. I have logged this payment trace for you.`
          break

        case 'policy_inquiry':
          agentResponseText = `Under our Policy v3.2, carrier delays exceeding 3 days or damaged shipments are eligible for 100% instant refunds with a 7-day hassle-free replacement window. Would you like me to check an order for you?`
          break

        case 'escalation_requested':
          agentResponseText = `Certainly ${customerName}, I am transferring you directly to senior operator Maya Sharma right away. Please stay on the line.`
          break

        case 'confirmation_affirm':
          agentResponseText = `Perfect ${customerName}, I have confirmed your request and forwarded it for instant processing. Is there anything else I can help you with?`
          break

        case 'gratitude_closing':
          agentResponseText = `It was a pleasure assisting you, ${customerName}! Have a wonderful day and thank you for calling RELAY. Goodbye!`
          break

        default:
          agentResponseText = `Yes ${customerName}, I verified order #${matchedOrderId}. It is delayed by ${orderDelay} days with ${orderCarrier}. Under Policy POL-REFUND-3.2, an instant ₹${orderAmount} refund is eligible and currently requires operator sign-off.`
          break
      }
    } else {
      // Hindi / Hinglish Responses with strict Gender Agreement
      switch (detectedIntent) {
        case 'greeting':
          agentResponseText = isMale
            ? `Namaste ${customerName} ji! Main RELAY hoon. Main aapki kya madad kar sakta hoon? Kya aap order status dekhna chahte hain ya refund ke baare mein jaankari chahte hain?`
            : `Namaste ${customerName} ji! Main RELAY hoon. Main aapki kya madad kar sakti hoon? Kya aap order status dekhna chahte hain ya refund ke baare mein jaankari chahte hain?`
          agentTranslation = `Namaste ${customerName}! How can I help you today? Would you like to check an order status or inquire about a refund?`
          break

        case 'delivery_issue':
          agentResponseText = isMale
            ? `${customerName} ji, main aapka order #${matchedOrderId} check kar raha hoon. Isme ${orderCarrier} ke sath delay exception hai aur yeh ${orderDelay} din late chal raha hai. Kya aap chahte hain ki main courier ko expedite request bhejoon, ya fir aap ₹${orderAmount} ka instant refund initiate karwana chahenge?`
            : `${customerName} ji, main aapka order #${matchedOrderId} check kar rahi hoon. Isme ${orderCarrier} ke sath delay exception hai aur yeh ${orderDelay} din late chal raha hai. Kya aap chahte hain ki main courier ko expedite request bhejoon, ya fir aap ₹${orderAmount} ka instant refund initiate karwana chahenge?`
          agentTranslation = `${customerName}, I am checking order #${matchedOrderId}... there is a delay exception with ${orderCarrier}. Would you like me to expedite the shipment or initiate an instant ₹${orderAmount} refund?`
          break

        case 'refund_request':
          agentResponseText = isMale
            ? `Ji, maine order #${matchedOrderId} check kar liya hai. ${orderCarrier} ke sath ${orderDelay} din delay confirm hai. Policy POL-REFUND-3.2 ke tahat ₹${orderAmount} ka refund eligible hai, lekin isse pehle operator approval required hai.`
            : `Ji, maine order #${matchedOrderId} check kar liya hai. ${orderCarrier} ke sath ${orderDelay} din delay confirm hai. Policy POL-REFUND-3.2 ke tahat ₹${orderAmount} ka refund eligible hai, lekin isse pehle operator approval required hai.`
          agentTranslation = `Yes, I verified order #${matchedOrderId}. Delivery delay with ${orderCarrier} is confirmed. Under Policy POL-REFUND-3.2, a refund of ₹${orderAmount} is eligible, but operator approval is required.`
          break

        case 'refund_payment_method':
          agentResponseText = isMale
            ? `Theek hai ${customerName} ji, aapka ₹${orderAmount} refund UPI VPA par schedule kar diya gaya hai. Supervisor approval milte hi 120 seconds mein credit ho jayega. Kya main aapko iska SMS confirmation bhej doon?`
            : `Theek hai ${customerName} ji, aapka ₹${orderAmount} refund UPI VPA par schedule kar diya gaya hai. Supervisor approval milte hi 120 seconds mein credit ho jayegi. Kya main aapko iska SMS confirmation bhej doon?`
          agentTranslation = `Understood ${customerName}, your ₹${orderAmount} refund is queued for UPI settlement within 120 seconds of approval. Should I send an SMS confirmation?`
          break

        case 'order_cancellation':
          agentResponseText = isMale
            ? `Maine order #${matchedOrderId} ke liye cancellation request file kar diya hai aur courier stop trigger kar diya hai. Kya aapko kisi aur cheez mein sahayata chahiye?`
            : `Maine order #${matchedOrderId} ke liye cancellation request file kar di hai aur courier stop trigger kar diya hai. Kya aapko kisi aur cheez mein sahayata chahiye?`
          agentTranslation = `I have filed the cancellation request for order #${matchedOrderId}. Do you need help with anything else?`
          break

        case 'address_change':
          agentResponseText = isMale
            ? `${customerName} ji, order #${matchedOrderId} ke liye transit hub mein parcel hold karke naya delivery address update kiya ja sakta hai. Kripya apna naya PIN code aur address batayein.`
            : `${customerName} ji, order #${matchedOrderId} ke liye transit hub mein parcel hold karke naya delivery address update kiya ja sakta hai. Kripya apna naya PIN code aur address batayein.`
          agentTranslation = `${customerName}, we can update your delivery address for order #${matchedOrderId} while the shipment is at the hub. Please provide your new PIN code and address.`
          break

        case 'payment_failure_issue':
          agentResponseText = isMale
            ? `Agar aapke account se paise cut gaye hain aur order create nahi hua, toh NPCI guidelines ke tahat 24 hours mein paise auto-refund ho jate hain. Maine reference note kar liya hai.`
            : `Agar aapke account se paise cut gaye hain aur order create nahi hua, toh NPCI guidelines ke tahat 24 hours mein paise auto-refund ho jate hain. Maine reference note kar liya hai.`
          agentTranslation = `If money was deducted without order confirmation, NPCI auto-reversal credits it within 24 hours. I have logged this trace.`
          break

        case 'policy_inquiry':
          agentResponseText = isMale
            ? `Hamari Refund Policy v3.2 ke anusaar, delivery delay (>3 din) ya damaged parcel par 100% instant refund milta hai aur 7 days replacement window available hai. Kya aap kisi specific order ke baare mein pooch rahe hain?`
            : `Hamari Refund Policy v3.2 ke anusaar, delivery delay (>3 din) ya damaged parcel par 100% instant refund milta hai aur 7 days replacement window available hai. Kya aap kisi specific order ke baare mein pooch rahe hain?`
          agentTranslation = `Under Policy v3.2, delivery delays (>3 days) or damages qualify for 100% instant refunds with 7-day replacement. Are you inquiring about a specific order?`
          break

        case 'escalation_requested':
          agentResponseText = isMale
            ? `Zaroor ${customerName} ji, main aapko turant senior operator Maya Sharma se connect kar raha hoon. Kripya line par bane rahein.`
            : `Zaroor ${customerName} ji, main aapko turant senior operator Maya Sharma se connect kar rahi hoon. Kripya line par bane rahein.`
          agentTranslation = `Certainly ${customerName}, I am connecting you to senior operator Maya Sharma. Please stay on the line.`
          break

        case 'confirmation_affirm':
          agentResponseText = isMale
            ? `Bahut accha ${customerName} ji, maine aapki request note karke execute kar diya hai. Kya main aapki kisi aur cheez mein sahayata kar sakta hoon?`
            : `Bahut accha ${customerName} ji, maine aapki request note karke execute kar diya hai. Kya main aapki kisi aur cheez mein sahayata kar sakti hoon?`
          agentTranslation = `Great ${customerName}, I have processed your request. Is there anything else I can help you with?`
          break

        case 'gratitude_closing':
          agentResponseText = isMale
            ? `Aapki sahayata karke bahut khushi hui ${customerName} ji! Aapka din shubh ho aur RELAY ko call karne ke liye dhanyawad. Namaste!`
            : `Aapki sahayata karke bahut khushi hui ${customerName} ji! Aapka din shubh ho aur RELAY ko call karne ke liye dhanyawad. Namaste!`
          agentTranslation = `It was my pleasure helping you, ${customerName}! Have a great day and thank you for calling RELAY. Namaste!`
          break

        default:
          agentResponseText = isMale
            ? `Ji ${customerName} ji, maine aapka order #${matchedOrderId} verify kar liya hai. Yeh ${orderCarrier} ke sath ${orderDelay} din delayed hai. Policy POL-REFUND-3.2 ke tahat ₹${orderAmount} ka refund eligible hai, jiske liye operator approval process kiya ja raha hai.`
            : `Ji ${customerName} ji, maine aapka order #${matchedOrderId} verify kar liya hai. Yeh ${orderCarrier} ke sath ${orderDelay} din delayed hai. Policy POL-REFUND-3.2 ke tahat ₹${orderAmount} ka refund eligible hai, jiske liye operator approval process kiya ja raha hai.`
          agentTranslation = `Yes ${customerName}, I verified order #${matchedOrderId}. It is delayed by ${orderDelay} days with ${orderCarrier}. Under Policy POL-REFUND-3.2, ₹${orderAmount} is eligible for refund pending operator sign-off.`
          break
      }
    }
  }

  events.push({
    type: 'speech.transcript',
    speaker: 'agent',
    text: agentResponseText,
    translation: agentTranslation || undefined,
    language: activeLanguage === 'en-IN' ? 'English (India)' : 'Hindi / Hinglish',
    timestamp: new Date().toLocaleTimeString(),
  })

  // Append all events to authoritative PostgreSQL append-only store
  try {
    for (const ev of events) {
      db.appendRelayEvent({
        caseId,
        type: ev.type,
        payload: ev,
      })
    }
  } catch (err) {
    console.warn('[DB Event Sourcing] Event store append non-fatal:', err)
  }

  // ── 7.5 Commerce Rules Overrule Protection ──────────────────────────────
  // The Rule Engine determines legality and eligibility. Gemini LLM cannot override it.
  if (!commerceRule.eligible) {
    if (commerceRule.decision === 'DUPLICATE_REFUND_BLOCKED') {
      agentResponseText = isMale
        ? `Ji ${customerName} ji, order #${matchedOrderId} par pehle se refund record maujood hai. Duplicate refund allow nahi kiya ja sakta.`
        : `Ji ${customerName} ji, order #${matchedOrderId} par pehle se refund record maujood hai. Duplicate refund allow nahi kiya ja sakta.`
      agentTranslation = `Yes ${customerName}, order #${matchedOrderId} already has a recorded refund. Duplicate refund requests cannot be processed.`
    } else if (commerceRule.decision === 'FORCE_MAJEURE_EXEMPTION') {
      agentResponseText = isMale
        ? `Ji ${customerName} ji, order #${matchedOrderId} ka delivery delay force majeure ya natural calamity ke karan standard late-delivery refund policy se exempt hai.`
        : `Ji ${customerName} ji, order #${matchedOrderId} ka delivery delay force majeure ya natural calamity ke karan standard late-delivery refund policy se exempt hai.`
      agentTranslation = `Yes ${customerName}, the delivery delay for order #${matchedOrderId} is exempt from standard late-delivery refund policy due to force majeure.`
    } else if (commerceRule.decision === 'INSUFFICIENT_EVIDENCE') {
      agentResponseText = `Order #${matchedOrderId} ke liye carrier telemetry data uplabdh nahi hai. Verification ke bina claim process nahi kiya ja sakta.`
      agentTranslation = `Carrier telemetry data is unavailable for order #${matchedOrderId}. The claim cannot be processed without verification.`
    }
  } else if (detectedIntent === 'refund_request' || lowerUtterance.includes('refund')) {
    if (commerceRule.requiresHumanApproval) {
      agentResponseText = isMale
        ? `Ji, maine order ${matchedOrderId} verify kar liya hai. Delivery ${orderDelay} din late hai aur refund ke liye applicable rule pass ho raha hai. ₹${orderAmount} ka refund process karne se pehle operator approval zaroori hai.`
        : `Ji, maine order ${matchedOrderId} verify kar liya hai. Delivery ${orderDelay} din late hai aur refund ke liye applicable rule pass ho raha hai. ₹${orderAmount} ka refund process karne se pehle operator approval zaroori hai.`
      agentTranslation = `Yes, I have verified order ${matchedOrderId}. Delivery is ${orderDelay} days late and passes the applicable refund rule. Operator approval is required before the ₹${orderAmount} refund can be processed.`
    }
  } else if (commerceRule.complaintRequired && commerceRule.ticketNumber) {
    agentResponseText = `Aapki complaint record kar li gayi hai. Consumer Protection Rules ke anusaar aapka tracking ticket number ${commerceRule.ticketNumber} hai.`
    agentTranslation = `Your complaint has been recorded. As per Consumer Protection Rules, your tracking ticket number is ${commerceRule.ticketNumber}.`
  }

  // Compute authoritative TTS-normalized speechText representation
  const speechText = normalizeForTts(geminiAgentSpeechText || agentResponseText, {
    orderId: matchedOrderId,
    amount: orderAmount,
    carrier: orderCarrier
  })

  console.log(`[Turn Engine] 🤖 Gemini Status: ${geminiAgentResponse ? 'SUCCESS' : 'FALLBACK'}`)
  console.log(`[Turn Engine] 🛠️  Tools Executed: [${toolsToCall.map(t => t.tool).join(', ')}]`)
  console.log(`[Turn Engine] 📢 Final Response Source: ${geminiAgentResponse ? 'GEMINI' : 'DETERMINISTIC'}`)
  console.log(`[Turn Engine] 🖥️  UI Response Text: "${agentResponseText}"`)
  console.log(`[Turn Engine] 🔊 Spoken SpeechText: "${speechText}"`)
  console.log(`======================================================\n`)

  return {
    success: true,
    languageShift: shiftResult,
    activeLanguage,
    intent: detectedIntent,
    toolsCalled: toolsToCall.map((t) => t.tool),
    toolResults,
    agentResponse: agentResponseText,
    speechText,
    agentTranslation,
    policyEvidence,
    commerceRule,
    events,
    orderData: orderRecord,
    totalLatencyMs: Date.now() - turnStartTime,
  }
}

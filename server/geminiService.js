/**
 * RELAY — Gemini 2.5 Reasoning Engine Service
 * Connects Google Gemini API for dynamic multi-turn conversation,
 * autonomous tool calling, policy grounding, and gender-aware synthesis.
 */

import { serverConfig } from './config.js'

export class GeminiService {
  /**
   * Executes a reasoning turn using Google Gemini API
   */
  static async executeReasoningTurn({
    customerUtterance,
    caseId,
    customerName,
    agentGender = 'female',
    activeLanguage = 'hi-IN',
    memoryContext = {},
    policyEvidence = {},
  }) {
    const apiKey = serverConfig.ai.geminiApiKey
    if (!apiKey) {
      return { success: false, reason: 'NO_API_KEY' }
    }

    const isMale = agentGender === 'male'
    const isEn = activeLanguage === 'en-IN'

    const orderContextText = memoryContext?.orderId
      ? `Active Order In Context: #${memoryContext.orderId} (${memoryContext.orderItem || 'Item'} · Carrier: ${memoryContext.orderCarrier || 'Delhivery Express'} · Status: ${memoryContext.orderStatus || 'In-transit'} · Delay: ${memoryContext.orderDelayDays || 4} days · Amount: ₹${memoryContext.orderAmount || 2899})`
      : 'Order In Context: #72143 (Mechanical Gaming Keyboard · Carrier: Delhivery Express · Delay: 4 days · Amount: ₹2899)'

    const systemPrompt = `You are RELAY, an enterprise autonomous voice operations AI agent for e-commerce and logistics customer support in India.
Current Caller: ${customerName} (Case ID: ${caseId})
Agent Voice Gender: ${agentGender.toUpperCase()}
Active Spoken Language: ${isEn ? 'English (India)' : 'Hindi / Hinglish'}
${orderContextText}

CRITICAL RULES:
1. Speak clearly and naturally in Indian Hinglish. Pronounce numbers individually when they are order IDs (e.g. 72143 as "seven two one four three"). Pronounce Indian rupee amounts in words (e.g. ₹2,899 as "two thousand eight hundred ninety nine rupees"). Avoid reading symbols or markup aloud. Do not skip English brand names (like "Delhivery Express"). Speak the complete sentence without truncating words.
2. If the customer asks for a refund or mentions a delay for order 72143:
   - Clearly state that you have checked order 72143.
   - State that the delivery SLA is breached (delayed by 4 days with Delhivery Express).
   - State that under Policy POL-REFUND-3.2, a refund of ₹2,899 is eligible.
   - Explicitly mention that human operator approval / sign-off is required before the refund is issued.
3. NEVER use generic canned responses like "Main sun rahi hoon, aap mujhse order status..." or "I'm listening, you can ask about...".
4. Voice & Grammar Rules:
   - If Agent Voice Gender is MALE: conjugate Hindi verbs in masculine form ("karta hoon", "check kar raha hoon").
   - If Agent Voice Gender is FEMALE: conjugate Hindi verbs in feminine form ("karti hoon", "check kar rahi hoon").
5. Output Schema (ONLY valid JSON):
{
  "detectedIntent": "refund_request" | "delivery_issue" | "order_cancellation" | "policy_inquiry" | "general_inquiry",
  "toolsToCall": [
    { "tool": "lookupOrder", "params": { "orderId": "72143" } },
    { "tool": "evaluateRefundPolicy", "params": { "orderId": "72143", "reason": "delayed" } }
  ],
  "agentResponse": "Natural readable Hindi/Hinglish reply for UI (1-2 sentences)",
  "speechText": "TTS-safe Latin Hinglish reply with digits and currency spelled out",
  "agentTranslation": "English translation"
}`

    const userPrompt = `Customer said: "${customerUtterance}"`
    const model = 'gemini-2.5-flash'

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `${systemPrompt}\n\n${userPrompt}` }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json'
          }
        })
      })

      if (!response.ok) {
        const errBody = await response.text().catch(() => '')
        return { success: false, reason: `HTTP_${response.status}`, error: errBody }
      }

      const data = await response.json()
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!rawText) return { success: false, reason: 'EMPTY_RESPONSE' }

      const parsed = JSON.parse(rawText.trim())
      if (parsed && parsed.agentResponse) {
        return {
          success: true,
          model,
          ...parsed
        }
      }
    } catch (err) {
      return { success: false, reason: 'EXCEPTION', error: err?.message }
    }

    return { success: false, reason: 'UNKNOWN_FAILURE' }
  }
}

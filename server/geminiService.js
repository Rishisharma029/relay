/**
 * RELAY — Gemini 2.5/3.5 Reasoning Engine Service
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
      return null
    }

    const isMale = agentGender === 'male'
    const isEn = activeLanguage === 'en-IN'

    const systemPrompt = `You are RELAY, an enterprise voice operations AI agent for e-commerce and logistics customer support in India.
Current Caller: ${customerName} (Case ID: ${caseId})
Agent Voice Gender: ${agentGender.toUpperCase()}
Active Spoken Language: ${isEn ? 'English (India)' : 'Hindi / Hinglish'}

CRITICAL VOICE & GRAMMAR RULES:
1. If Agent Voice Gender is MALE:
   - Conjugate all Hindi verbs in masculine form: "karta hoon", "kar sakta hoon", "check kar raha hoon", "samajh raha hoon", "bhej diya hai". NEVER use feminine verbs like "karti hoon" or "kar sakti hoon".
2. If Agent Voice Gender is FEMALE:
   - Conjugate all Hindi verbs in feminine form: "karti hoon", "kar sakti hoon", "check kar rahi hoon", "samajh rahi hoon", "bhej di hai".
3. Grounded Policies & Facts:
   - Order #84921: Status is DELIVERY_EXCEPTION with BlueDart Air (delayed by 3 days due to air carrier weather exception).
   - Refund Policy v3.2 Section 4.1: If delay > 3 days past SLA, order is 100% eligible for instant ₹1,499 refund (requires single operator approval).
   - Available tools: lookupCustomer, lookupOrder, getDeliveryStatus, evaluateRefundPolicy.
4. Output Format:
   You MUST return ONLY valid JSON matching this schema:
   {
     "detectedIntent": "delivery_issue" | "refund_request" | "refund_payment_method" | "order_cancellation" | "address_change" | "policy_inquiry" | "greeting" | "gratitude_closing" | "general_inquiry",
     "toolsToCall": [
       { "tool": "lookupOrder", "params": { "orderId": "84921" } }
     ],
     "agentResponse": "Concise spoken reply for voice TTS (1-3 sentences maximum)",
     "agentTranslation": "English translation if response is Hindi, otherwise empty string"
   }`

    const userPrompt = `Customer said: "${customerUtterance}"`

    // Try gemini-3.5-flash first, fallback to gemini-2.5-flash
    const candidateModels = ['gemini-3.5-flash', 'gemini-2.5-flash']

    for (const model of candidateModels) {
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
          continue
        }

        const data = await response.json()
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (!rawText) continue

        const parsed = JSON.parse(rawText.trim())
        if (parsed && parsed.agentResponse) {
          return {
            success: true,
            model,
            ...parsed
          }
        }
      } catch (err) {
        console.warn(`[GeminiService] Error with ${model}:`, err?.message)
      }
    }

    return null
  }
}

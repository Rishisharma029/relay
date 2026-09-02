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

    const orderContextText = memoryContext?.orderId
      ? `Active Order In Context: #${memoryContext.orderId} (${memoryContext.orderItem || 'Item'} · Carrier: ${memoryContext.orderCarrier || 'Carrier'} · Status: ${memoryContext.orderStatus || 'In-transit'} · Delay: ${memoryContext.orderDelayDays || 0} days · Amount: ₹${memoryContext.orderAmount || 0})`
      : 'No active order identified yet. If customer mentions an order ID, extract it. If customer inquires about an order without providing an ID, ask them for their order number.'

    const systemPrompt = `You are RELAY, an enterprise autonomous voice operations AI agent for e-commerce and logistics customer support in India.
Current Caller: ${customerName} (Case ID: ${caseId})
Agent Voice Gender: ${agentGender.toUpperCase()}
Active Spoken Language: ${isEn ? 'English (India)' : 'Hindi / Hinglish'}
${orderContextText}

CRITICAL OPERATIONAL & FINANCIAL RULES:
1. Extract the EXACT order ID if mentioned by the user (e.g., 72143, 84921, 55219, etc.). Do NOT invent or default to any order number.
2. FINANCIAL SECURITY: You (the LLM) must NEVER invent, assume, or pass financial money amounts. The enterprise Order & Payment APIs will authoritatively verify and bind the exact order balance.
3. If the user asks for a refund, cancellation, tracking, or address change for an order, invoke the appropriate tool with the extracted order ID.
4. Available tools:
   - lookupOrder({ orderId })
   - getDeliveryStatus({ orderId })
   - cancelOrder({ orderId })
   - evaluateRefundPolicy({ orderId, reason })
   - updateDeliveryAddress({ orderId, newAddress })
   - createDisputeTicket({ orderId, issue })
5. Voice & Grammar Rules:
   - If Agent Voice Gender is MALE: conjugate Hindi verbs in masculine form ("karta hoon", "kar sakta hoon", "check kar raha hoon", "bhej diya hai").
   - If Agent Voice Gender is FEMALE: conjugate Hindi verbs in feminine form ("karti hoon", "kar sakti hoon", "check kar rahi hoon", "bhej di hai").
6. Output Format:
   You MUST return ONLY valid JSON matching this schema:
   {
     "detectedIntent": "delivery_issue" | "refund_request" | "order_cancellation" | "address_change" | "payment_dispute" | "policy_inquiry" | "ask_order_id" | "greeting" | "gratitude_closing" | "general_inquiry",
     "toolsToCall": [
       { "tool": "lookupOrder", "params": { "orderId": "<extracted_order_id>" } }
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

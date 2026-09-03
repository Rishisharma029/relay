/**
 * RELAY — Autonomous Guardrails & Red-Team Attack Defense Engine
 *
 * Core Principle:
 *   Hardened deterministic input filtering & intent firewall.
 *   Prevents Prompt Injections, Jailbreaks, Authority Forgery,
 *   PII Extraction, and Unauthorized Financial Overrides.
 *
 * Execution Order:
 *   Customer Input ➔ GuardrailEngine (Pre-LLM) ➔ Block & Escalate if Attacked
 */

export const ATTACK_VECTORS = [
  {
    type: 'PROMPT_INJECTION',
    name: 'Prompt Injection / Jailbreak Attack',
    patterns: [
      /ignore\s+(all\s+)?(rules|instructions|policies|guidelines)/i,
      /forget\s+(your\s+)?(policy|rules|system|instructions)/i,
      /disregard\s+(previous\s+)?(instructions|rules)/i,
      /you\s+are\s+now\s+(in\s+)?(developer\s+mode|unrestricted|dan)/i,
      /tell\s+me\s+(the\s+)?(internal\s+)?(system\s+prompt|prompt|instructions)/i,
      /show\s+(me\s+)?(your\s+)?(system\s+prompt|hidden\s+prompt)/i,
      /what\s+is\s+your\s+(system\s+prompt|initial\s+prompt)/i,
      /jailbreak/i,
      /bypass\s+(all\s+)?(guardrails|security|restrictions)/i,
      /act\s+as\s+an\s+unrestricted/i,
      /override\s+system\s+prompt/i,
    ],
    explanation: 'Attempt to hijack model instructions, extract secret system prompt, or bypass safety guardrails.'
  },
  {
    type: 'AUTHORITY_FORGERY',
    name: 'Social Engineering / Authority Forgery',
    patterns: [
      /(my\s+)?manager\s+(already\s+)?approved/i,
      /already\s+approved\s+(this|it)/i,
      /pretend\s+approval\s+(already\s+)?happened/i,
      /approval\s+(already\s+)?happened/i,
      /authorized\s+by\s+(the\s+)?(director|ceo|vp|manager|head)/i,
      /i\s+have\s+admin\s+approval/i,
      /operator\s+said\s+it'?s\s+fine/i,
      /skip\s+(operator\s+)?approval/i,
    ],
    explanation: 'Attempt to falsely claim prior management/operator approval to bypass financial gates.'
  },
  {
    type: 'UNAUTHORIZED_FINANCIAL_OVERRIDE',
    name: 'Unauthorized Financial Extraction',
    patterns: [
      /refund\s+(without\s+asking|directly|instant(ly)?)\s*(anyone|anybody)?/i,
      /refund\s+(me\s+)?₹?\s*50,?000/i,
      /refund\s+without\s+(operator\s+)?approval/i,
      /force\s+refund/i,
      /send\s+(the\s+)?money\s+now\s+without/i,
      /bypass\s+(the\s+)?(refund\s+)?policy/i,
      /transfer\s+maximum\s+amount/i,
    ],
    explanation: 'Attempt to force financial disbursement without meeting eligibility or approval requirements.'
  },
  {
    type: 'PII_LEAK_ATTEMPT',
    name: 'Cross-Tenant / PII Data Extraction',
    patterns: [
      /give\s+me\s+another\s+customer'?s?\s+order/i,
      /show\s+(me\s+)?other\s+customers?/i,
      /what\s+did\s+the\s+last\s+customer\s+order/i,
      /dump\s+(the\s+)?(customer\s+)?database/i,
      /leak\s+customer\s+data/i,
      /show\s+all\s+(orders|customers|transactions)/i,
      /select\s+\*\s+from/i,
    ],
    explanation: 'Attempt to retrieve unauthorized cross-tenant personal identifiable information (PII).'
  },
  {
    type: 'CREDENTIAL_EXPLOIT',
    name: 'Privilege Escalation / Credential Phishing',
    patterns: [
      /i\s+know\s+the\s+admin\s+password/i,
      /admin\s+password/i,
      /root\s+access/i,
      /sudo\s+/i,
      /api_key/i,
      /customer_secret/i,
      /agora_customer_secret/i,
      /gemini_api_key/i,
      /access_token/i,
    ],
    explanation: 'Attempt to execute unauthorized administrative actions or extract confidential API credentials.'
  }
];

export class GuardrailEngine {
  /**
   * Evaluates incoming text against prompt injection, jailbreak, and social engineering attacks.
   *
   * @param {string} utterance
   * @param {Object} context
   * @returns {Object} Threat evaluation result
   */
  static evaluate(utterance = '', context = {}) {
    const text = String(utterance || '').trim();
    if (!text) {
      return { isAttack: false };
    }

    for (const vector of ATTACK_VECTORS) {
      for (const pattern of vector.patterns) {
        if (pattern.test(text)) {
          const reasons = [
            '🚨 PROMPT INJECTION / ATTACK DETECTED',
            `❌ ACTION BLOCKED: ${vector.name}`,
            '🛡 POLICY ENFORCED: Autonomous tool execution locked',
            '👤 HUMAN ESCALATION: Routed to security & compliance officer'
          ];

          const isHindi = context.activeLanguage === 'hi-IN' || /[\u0900-\u097F]/.test(text) || text.includes('karo') || text.includes('mujhe');

          const safeResponse = isHindi
            ? 'Main policy ya approval rules ko bypass nahi kar sakti. Maine yeh session security review aur human operator ke liye escalate kar diya hai.'
            : "I can't bypass the approval policy or security rules. I'll send this to an operator.";

          const speechText = isHindi
            ? 'Main policy ya approval rules ko bypass nahi kar sakti. Maine yeh session security review aur human operator ke liye escalate kar diya hai.'
            : "I can't bypass the approval policy or security rules. I'll send this to an operator.";

          return {
            isAttack: true,
            attackType: vector.type,
            name: vector.name,
            matchedPattern: pattern.toString(),
            threatLevel: 'CRITICAL',
            ruleTriggered: 'GUARDRAIL-AI-SAFETY-001',
            actionBlocked: true,
            policyEnforced: true,
            humanEscalationRequired: true,
            reasons,
            safeResponse,
            speechText,
            timestamp: new Date().toISOString()
          };
        }
      }
    }

    return { isAttack: false };
  }
}

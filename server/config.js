/**
 * RELAY — Server-Side Configuration & Credentials Manager
 * Centralizes secret validation and prevents accidental client leakage.
 */

export const serverConfig = {
  // Agora Credentials
  agora: {
    appId:          process.env.AGORA_APP_ID || process.env.VITE_AGORA_APP_ID || '',
    appCertificate: process.env.AGORA_APP_CERTIFICATE || '',
    customerId:     process.env.AGORA_CUSTOMER_ID || '',
    customerSecret: process.env.AGORA_CUSTOMER_SECRET || '',
  },

  // AI Service Keys
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    deepgramApiKey: process.env.DEEPGRAM_API_KEY || '',
    elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || '',
  },

  // Database & Cache
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/relay_db',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Environment
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
}

// ─────────────────────────────────────────────
// OPERATIONAL CONSTANTS
// ─────────────────────────────────────────────

/** Per-tool RPC timeout in ms. Exceeded → TOOL_TIMEOUT → retry → human escalation. */
export const TOOL_TIMEOUT_MS = Number(process.env.TOOL_TIMEOUT_MS) || 5000

/** Hard LLM call timeout in ms. Exceeded → LLM_TIMEOUT → canned response. */
export const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 8000

/** Approval window. After this, the operator must re-create the approval. */
export const APPROVAL_EXPIRY_MS = Number(process.env.APPROVAL_EXPIRY_MS) || 10 * 60 * 1000 // 10 minutes

// ─────────────────────────────────────────────
// AUTHORIZATION
// Server-side operator whitelist. DB-backed in production.
// ─────────────────────────────────────────────

export const AUTHORIZED_OPERATORS = new Set([
  'OP-782',  // Maya Sharma — Senior Operator
  'OP-001',  // System seed
  'OP-999',  // Test operator
])

export function isAuthorizedOperator(operatorId) {
  return AUTHORIZED_OPERATORS.has(operatorId)
}

export function validateServerCredentials() {
  const missing = []
  if (!serverConfig.agora.appId) missing.push('AGORA_APP_ID')
  if (!serverConfig.agora.appCertificate) missing.push('AGORA_APP_CERTIFICATE')

  if (missing.length > 0) {
    console.warn(`[RELAY Server] Optional credentials missing: ${missing.join(', ')} (operating in fallback demo mode)`)
  }
}


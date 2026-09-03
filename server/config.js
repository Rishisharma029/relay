/**
 * RELAY — Server-Side Configuration & Credentials Manager
 * Centralizes secret validation and prevents accidental client leakage.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Auto-load .env from root if process.env is missing values
try {
  const envPath = path.resolve(__dirname, '../.env')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...rest] = trimmed.split('=')
        const val = rest.join('=').replace(/^["']|["']$/g, '').trim()
        if (key && !process.env[key]) {
          process.env[key] = val
        }
      }
    }
  }
} catch (e) {}

export const serverConfig = {
  // Agora Credentials
  agora: {
    appId:          process.env.AGORA_APP_ID || process.env.VITE_AGORA_APP_ID || '',
    appCertificate: process.env.AGORA_APP_CERTIFICATE || '',
    customerId:     process.env.AGORA_CUSTOMER_ID || '',
    customerSecret: process.env.AGORA_CUSTOMER_SECRET || '',
    pipelineId:     process.env.AGORA_PIPELINE_ID || 'beec10e4de9a41edbb686f47e677756a',
  },

  // AI Service Keys
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    deepgramApiKey: process.env.DEEPGRAM_API_KEY || '',
    elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || '',
    minimaxApiKey:    process.env.MINIMAX_API_KEY || '',
    minimaxGroupId:   process.env.MINIMAX_GROUP_ID || '',
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

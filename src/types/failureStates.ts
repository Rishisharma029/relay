/**
 * RELAY — Failure State Types
 * TypeScript constants and types for all 12 failure states and their recovery plans.
 * Mirrors server/failureEngine.js for full-stack type safety.
 */

export const FAILURE_STATES = {
  AGORA_DISCONNECT:    'AGORA_DISCONNECT',
  AGENT_DISCONNECT:    'AGENT_DISCONNECT',
  ASR_FAILURE:         'ASR_FAILURE',
  TTS_FAILURE:         'TTS_FAILURE',
  LLM_TIMEOUT:         'LLM_TIMEOUT',
  TOOL_TIMEOUT:        'TOOL_TIMEOUT',
  TOOL_ERROR:          'TOOL_ERROR',
  DB_UNAVAILABLE:      'DB_UNAVAILABLE',
  APPROVAL_EXPIRED:    'APPROVAL_EXPIRED',
  APPROVAL_DUPLICATE:  'APPROVAL_DUPLICATE',
  CUSTOMER_DISCONNECT: 'CUSTOMER_DISCONNECT',
  HUMAN_DISCONNECT:    'HUMAN_DISCONNECT',
  TOKEN_EXPIRED:       'TOKEN_EXPIRED',
} as const

export type FailureState = typeof FAILURE_STATES[keyof typeof FAILURE_STATES]

export interface RecoveryPlan {
  autoRetry:   boolean
  maxAttempts: number
  backoffMs?:  number[]
  fallback:    string
  userMessage: string
  critical?:   string
}

export const RECOVERY_PLANS: Record<FailureState, RecoveryPlan> = {
  AGORA_DISCONNECT: {
    autoRetry: true, maxAttempts: 3, backoffMs: [500, 1500, 4000],
    fallback: 'human.escalation',
    userMessage: 'Audio connection lost. Reconnecting...',
  },
  AGENT_DISCONNECT: {
    autoRetry: true, maxAttempts: 2, backoffMs: [1000, 3000],
    fallback: 'human.escalation',
    userMessage: 'AI agent disconnected. Attempting to restart...',
  },
  ASR_FAILURE: {
    autoRetry: true, maxAttempts: 2, backoffMs: [200, 500],
    fallback: 'ask_repeat',
    userMessage: "Sorry, I didn't catch that. Could you repeat?",
  },
  TTS_FAILURE: {
    autoRetry: true, maxAttempts: 2, backoffMs: [300, 800],
    fallback: 'text_only_mode',
    userMessage: 'Voice synthesis unavailable. Switching to text mode.',
  },
  LLM_TIMEOUT: {
    autoRetry: true, maxAttempts: 2, backoffMs: [1000, 3000],
    fallback: 'canned_response',
    userMessage: 'Processing your request — please hold a moment.',
  },
  TOOL_TIMEOUT: {
    autoRetry: true, maxAttempts: 3, backoffMs: [500, 1500, 4000],
    fallback: 'human.escalation',
    userMessage: 'Data lookup is taking longer than expected. Retrying...',
    critical: 'No action executed until lookup succeeds.',
  },
  TOOL_ERROR: {
    autoRetry: true, maxAttempts: 2, backoffMs: [500, 1500],
    fallback: 'human.escalation',
    userMessage: 'Tool execution failed. Retrying...',
  },
  DB_UNAVAILABLE: {
    autoRetry: true, maxAttempts: 3, backoffMs: [1000, 3000, 8000],
    fallback: 'read_only_mode',
    userMessage: 'Database temporarily unavailable. Operating in read-only mode.',
  },
  APPROVAL_EXPIRED: {
    autoRetry: false, maxAttempts: 0,
    fallback: 'recreate_approval',
    userMessage: 'Approval window expired. A new authorization request has been created.',
  },
  APPROVAL_DUPLICATE: {
    autoRetry: false, maxAttempts: 0,
    fallback: 'return_existing',
    userMessage: 'This action was already completed. No duplicate charge.',
  },
  CUSTOMER_DISCONNECT: {
    autoRetry: false, maxAttempts: 0,
    fallback: 'hold_preserve_case',
    userMessage: 'Customer disconnected. Case preserved for callback.',
  },
  HUMAN_DISCONNECT: {
    autoRetry: false, maxAttempts: 0,
    fallback: 'return_to_ai',
    userMessage: 'Operator disconnected. Returning control to AI agent.',
  },
  TOKEN_EXPIRED: {
    autoRetry: true, maxAttempts: 1, backoffMs: [0],
    fallback: 'hot_swap_token',
    userMessage: 'Session token refreshing. Call will not be interrupted.',
  },
}

export interface ActiveFailure {
  state:      FailureState
  message:    string
  attempt?:   number
  maxAttempts?: number
  escalate?:  boolean
  timestamp:  string
  recovery:   RecoveryPlan
}

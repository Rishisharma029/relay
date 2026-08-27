/**
 * RELAY — Failure Engine
 * Deterministic failure state classification, event building, and recovery plans.
 * Every failure has a name. No silent "something went wrong".
 */

// ─────────────────────────────────────────────
// 1. NAMED FAILURE STATES
// ─────────────────────────────────────────────

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
}

// ─────────────────────────────────────────────
// 2. RECOVERY PLANS
// ─────────────────────────────────────────────

const RECOVERY_PLANS = {
  [FAILURE_STATES.AGORA_DISCONNECT]: {
    autoRetry:   true,
    maxAttempts: 3,
    backoffMs:   [500, 1500, 4000],
    fallback:    'human.escalation',
    userMessage: 'Audio connection lost. Reconnecting...',
  },
  [FAILURE_STATES.AGENT_DISCONNECT]: {
    autoRetry:   true,
    maxAttempts: 2,
    backoffMs:   [1000, 3000],
    fallback:    'human.escalation',
    userMessage: 'AI agent disconnected. Attempting to restart...',
  },
  [FAILURE_STATES.ASR_FAILURE]: {
    autoRetry:   true,
    maxAttempts: 2,
    backoffMs:   [200, 500],
    fallback:    'ask_repeat',
    userMessage: "Sorry, I didn't catch that. Could you repeat?",
  },
  [FAILURE_STATES.TTS_FAILURE]: {
    autoRetry:   true,
    maxAttempts: 2,
    backoffMs:   [300, 800],
    fallback:    'text_only_mode',
    userMessage: 'Voice synthesis unavailable. Switching to text mode.',
  },
  [FAILURE_STATES.LLM_TIMEOUT]: {
    autoRetry:   true,
    maxAttempts: 2,
    backoffMs:   [1000, 3000],
    fallback:    'canned_response',
    userMessage: 'Processing your request — please hold a moment.',
  },
  [FAILURE_STATES.TOOL_TIMEOUT]: {
    autoRetry:   true,
    maxAttempts: 3,
    backoffMs:   [500, 1500, 4000],
    fallback:    'human.escalation',
    userMessage: 'Data lookup is taking longer than expected. Retrying...',
    critical:    'No action executed until lookup succeeds.',
  },
  [FAILURE_STATES.TOOL_ERROR]: {
    autoRetry:   true,
    maxAttempts: 2,
    backoffMs:   [500, 1500],
    fallback:    'human.escalation',
    userMessage: 'Tool execution failed. Retrying...',
  },
  [FAILURE_STATES.DB_UNAVAILABLE]: {
    autoRetry:   true,
    maxAttempts: 3,
    backoffMs:   [1000, 3000, 8000],
    fallback:    'read_only_mode',
    userMessage: 'Database temporarily unavailable. Operating in read-only mode.',
  },
  [FAILURE_STATES.APPROVAL_EXPIRED]: {
    autoRetry:   false,
    maxAttempts: 0,
    fallback:    'recreate_approval',
    userMessage: 'Approval window expired. A new authorization request has been created.',
  },
  [FAILURE_STATES.APPROVAL_DUPLICATE]: {
    autoRetry:   false,
    maxAttempts: 0,
    fallback:    'return_existing',
    userMessage: 'This action was already completed. No duplicate charge.',
  },
  [FAILURE_STATES.CUSTOMER_DISCONNECT]: {
    autoRetry:   false,
    maxAttempts: 0,
    fallback:    'hold_preserve_case',
    userMessage: 'Customer disconnected. Case preserved for callback.',
  },
  [FAILURE_STATES.HUMAN_DISCONNECT]: {
    autoRetry:   false,
    maxAttempts: 0,
    fallback:    'return_to_ai',
    userMessage: 'Operator disconnected. Returning control to AI agent.',
  },
  [FAILURE_STATES.TOKEN_EXPIRED]: {
    autoRetry:   true,
    maxAttempts: 1,
    backoffMs:   [0],
    fallback:    'hot_swap_token',
    userMessage: 'Session token refreshing. Call will not be interrupted.',
  },
}

// ─────────────────────────────────────────────
// 3. FAILURE CLASSIFICATION
// ─────────────────────────────────────────────

/**
 * Given an error and context, returns the appropriate failure state name.
 * Deterministic — one error maps to exactly one state.
 */
export function classifyFailure(error, context = {}) {
  const msg = (error?.message || '').toLowerCase()
  const code = error?.code || ''

  if (context.type === 'token' || msg.includes('token') || msg.includes('privilege')) {
    return FAILURE_STATES.TOKEN_EXPIRED
  }
  if (context.type === 'agora' || code === 'AGORA_DISCONNECT' || msg.includes('rtc') || msg.includes('channel left')) {
    return FAILURE_STATES.AGORA_DISCONNECT
  }
  if (context.type === 'agent' || msg.includes('agent') || msg.includes('conversational ai')) {
    return FAILURE_STATES.AGENT_DISCONNECT
  }
  if (context.type === 'asr' || msg.includes('asr') || msg.includes('speech recognition')) {
    return FAILURE_STATES.ASR_FAILURE
  }
  if (context.type === 'tts' || msg.includes('tts') || msg.includes('synthesis')) {
    return FAILURE_STATES.TTS_FAILURE
  }
  if (context.type === 'llm_timeout' || msg.includes('llm timeout') || msg.includes('openai timeout')) {
    return FAILURE_STATES.LLM_TIMEOUT
  }
  if (context.type === 'tool_timeout' || msg.includes('tool timeout') || msg.includes('timed out')) {
    return FAILURE_STATES.TOOL_TIMEOUT
  }
  if (context.type === 'tool_error' || msg.includes('tool') || msg.includes('gateway')) {
    return FAILURE_STATES.TOOL_ERROR
  }
  if (context.type === 'db' || msg.includes('database') || msg.includes('connection refused') || msg.includes('pg')) {
    return FAILURE_STATES.DB_UNAVAILABLE
  }
  if (context.type === 'approval_expired' || msg.includes('expired') || msg.includes('approval window')) {
    return FAILURE_STATES.APPROVAL_EXPIRED
  }
  if (context.type === 'approval_duplicate' || msg.includes('duplicate') || msg.includes('already completed')) {
    return FAILURE_STATES.APPROVAL_DUPLICATE
  }
  if (context.type === 'customer_disconnect') {
    return FAILURE_STATES.CUSTOMER_DISCONNECT
  }
  if (context.type === 'human_disconnect') {
    return FAILURE_STATES.HUMAN_DISCONNECT
  }

  // Default: treat unknown errors as tool errors so they get retried
  return FAILURE_STATES.TOOL_ERROR
}

// ─────────────────────────────────────────────
// 4. FAILURE EVENT BUILDER
// ─────────────────────────────────────────────

/**
 * Builds a typed RelayEvent for the given failure state.
 */
export function buildFailureEvent(failureState, context = {}) {
  const base = {
    id:        `fail-${Date.now()}`,
    state:     failureState,
    timestamp: new Date().toISOString(),
    recovery:  getRecoveryPlan(failureState),
  }

  switch (failureState) {
    case FAILURE_STATES.TOOL_TIMEOUT:
    case FAILURE_STATES.TOOL_ERROR:
      return {
        ...base,
        type:        'failure.tool_timeout',
        tool:        context.tool || 'unknown',
        attempt:     context.attempt || 1,
        maxAttempts: getRecoveryPlan(failureState).maxAttempts,
        params:      context.params || {},
      }
    case FAILURE_STATES.LLM_TIMEOUT:
      return {
        ...base,
        type:      'failure.llm_timeout',
        attemptMs: context.attemptMs || 0,
      }
    case FAILURE_STATES.AGORA_DISCONNECT:
      return {
        ...base,
        type:             'failure.agora_disconnect',
        reconnectAttempt: context.attempt || 1,
      }
    case FAILURE_STATES.ASR_FAILURE:
      return { ...base, type: 'failure.asr_failure', reason: context.reason || 'recognition_error' }
    case FAILURE_STATES.TTS_FAILURE:
      return { ...base, type: 'failure.tts_failure', reason: context.reason || 'synthesis_error' }
    case FAILURE_STATES.DB_UNAVAILABLE:
      return { ...base, type: 'failure.db_unavailable' }
    case FAILURE_STATES.APPROVAL_EXPIRED:
      return {
        ...base,
        type:       'failure.approval_expired',
        approvalId: context.approvalId || '',
        expiredAt:  context.expiredAt || new Date().toISOString(),
      }
    case FAILURE_STATES.APPROVAL_DUPLICATE:
      return {
        ...base,
        type:           'failure.approval_duplicate',
        approvalId:     context.approvalId || '',
        existingResult: context.existingResult || null,
      }
    case FAILURE_STATES.TOKEN_EXPIRED:
      return { ...base, type: 'failure.token_expired' }
    case FAILURE_STATES.CUSTOMER_DISCONNECT:
      return { ...base, type: 'failure.customer_disconnect' }
    case FAILURE_STATES.HUMAN_DISCONNECT:
      return { ...base, type: 'failure.human_disconnect' }
    default:
      return {
        ...base,
        type:         'failure.escalation_required',
        reason:       context.reason || 'Unclassified failure',
        failureState,
      }
  }
}

// ─────────────────────────────────────────────
// 5. RECOVERY PLAN LOOKUP
// ─────────────────────────────────────────────

export function getRecoveryPlan(failureState) {
  return RECOVERY_PLANS[failureState] || {
    autoRetry:   false,
    maxAttempts: 0,
    fallback:    'human.escalation',
    userMessage: 'An unexpected error occurred. Escalating to a human operator.',
  }
}

// ─────────────────────────────────────────────
// 6. RETRY EXECUTOR
// Wraps any async fn with timeout + backoff retry.
// On exhausted retries, returns failure result — never throws.
// ─────────────────────────────────────────────

/**
 * @param {Function} fn - Async function to execute
 * @param {Object} opts
 * @param {number}  opts.timeoutMs    - Per-attempt timeout in ms
 * @param {string}  opts.failureState - FAILURE_STATES constant
 * @param {Object}  opts.context      - Passed to buildFailureEvent
 */
export async function withRetry(fn, { timeoutMs = 5000, failureState = FAILURE_STATES.TOOL_ERROR, context = {} } = {}) {
  const plan = getRecoveryPlan(failureState)
  const maxAttempts = plan.autoRetry ? plan.maxAttempts : 1
  const backoffs = plan.backoffMs || []

  let lastError = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await Promise.race([
        fn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs)
        ),
      ])
      return { success: true, result, attempts: attempt }
    } catch (err) {
      lastError = err

      // Classify if it's actually a timeout vs. execution error
      const actualState = err.message.includes('Timed out')
        ? FAILURE_STATES.TOOL_TIMEOUT
        : failureState

      const event = buildFailureEvent(actualState, { ...context, attempt, error: err.message })

      if (attempt < maxAttempts) {
        const delay = backoffs[attempt - 1] ?? 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        // All retries exhausted
        return {
          success:      false,
          failureState: actualState,
          failureEvent: event,
          error:        lastError.message,
          attempts:     attempt,
          escalate:     plan.fallback === 'human.escalation',
          userMessage:  getRecoveryPlan(actualState).userMessage,
        }
      }
    }
  }
}

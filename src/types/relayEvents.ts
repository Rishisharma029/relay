/**
 * RELAY — Standard Event Architecture
 * Unified Discriminated Union for all Realtime Voice & Operational Events.
 */

export type TakeoverStateMachineState =
  | 'AI_ACTIVE'
  | 'TAKEOVER_REQUESTED'
  | 'HUMAN_ACTIVE'
  | 'RETURN_REQUESTED'

export type RelayEvent =
  | {
      id?: string
      type: 'call.started'
      caseId: string
      timestamp: string
    }
  | {
      id?: string
      type: 'speech.started'
      speaker: 'customer' | 'agent' | 'human'
      timestamp: string
    }
  | {
      id?: string
      type: 'speech.transcript'
      speaker: string
      text: string
      language: string
      translation?: string
      timestamp: string
    }
  | {
      id?: string
      type: 'language.changed'
      from: string
      to: string
      timestamp: string
    }
  | {
      id?: string
      type: 'tool.started'
      tool: string
      params?: Record<string, any>
      timestamp: string
    }
  | {
      id?: string
      type: 'tool.completed'
      tool: string
      durationMs: number
      result?: any
      attempts?: number
      timestamp: string
    }
  | {
      id?: string
      type: 'approval.created'
      actionId: string
      amount?: number
      riskTier?: string
      timestamp: string
    }
  | {
      id?: string
      type: 'approval.approved'
      actionId: string
      operatorId: string
      amount?: number
      timestamp: string
    }
  | {
      id?: string
      type: 'human.takeover'
      operatorId: string
      state?: TakeoverStateMachineState
      reason?: string
      timestamp: string
    }
  | {
      id?: string
      type: 'call.ended'
      caseId?: string
      durationSeconds?: number
      timestamp: string
    }
  // ── Failure Events ────────────────────────────────────────────────────────
  | {
      id?: string
      type: 'failure.tool_timeout'
      tool: string
      attempt: number
      maxAttempts: number
      state: string
      recovery?: any
      timestamp: string
    }
  | {
      id?: string
      type: 'failure.llm_timeout'
      attemptMs: number
      state: string
      recovery?: any
      timestamp: string
    }
  | {
      id?: string
      type: 'failure.agora_disconnect'
      reconnectAttempt: number
      state: string
      recovery?: any
      timestamp: string
    }
  | {
      id?: string
      type: 'failure.asr_failure'
      reason: string
      state: string
      recovery?: any
      timestamp: string
    }
  | {
      id?: string
      type: 'failure.tts_failure'
      reason: string
      state: string
      recovery?: any
      timestamp: string
    }
  | {
      id?: string
      type: 'failure.db_unavailable'
      state: string
      recovery?: any
      timestamp: string
    }
  | {
      id?: string
      type: 'failure.approval_expired'
      approvalId: string
      expiredAt: string
      state: string
      recovery?: any
      timestamp: string
    }
  | {
      id?: string
      type: 'failure.approval_duplicate'
      approvalId: string
      existingResult: any
      state: string
      recovery?: any
      timestamp: string
    }
  | {
      id?: string
      type: 'failure.token_expired'
      state: string
      recovery?: any
      timestamp: string
    }
  | {
      id?: string
      type: 'failure.customer_disconnect'
      state: string
      recovery?: any
      timestamp: string
    }
  | {
      id?: string
      type: 'failure.human_disconnect'
      state: string
      recovery?: any
      timestamp: string
    }
  | {
      id?: string
      type: 'failure.escalation_required'
      reason: string
      failureState: string
      state?: string
      recovery?: any
      timestamp: string
    }

export type RelayEventType = RelayEvent['type']
export type RelayEventHandler = (event: RelayEvent) => void

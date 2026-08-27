export type CallState =
  | 'CONNECTING'
  | 'CONNECTED'
  | 'CUSTOMER_SPEAKING'
  | 'RELAY_SPEAKING'
  | 'RELAY_LISTENING'
  | 'CUSTOMER_INTERRUPTED'
  | 'TOOL_EXECUTING'
  | 'WAITING_FOR_APPROVAL'
  | 'HUMAN_TAKEOVER'
  | 'HUMAN_ACTIVE'
  | 'CALL_ENDING'
  | 'CALL_ENDED'
  | 'RECONNECTING'
  | 'CONNECTION_RESTORED'
  | 'CONNECTION_LOST'
  | 'AI_ERROR'
  | 'TOOL_ERROR'

export interface CallStateMeta {
  id: CallState
  label: string
  category: 'connection' | 'speech' | 'reasoning' | 'supervision' | 'teardown' | 'failure'
  badgeVariant: 'live' | 'warning' | 'critical' | 'standby' | 'accent' | 'default'
  topBarBadge: string
  participantStatus: {
    customer: 'SPEAKING' | 'LISTENING' | 'IDLE' | 'INTERRUPTING' | 'DISCONNECTED' | 'RECONNECTING'
    agent: 'SPEAKING' | 'LISTENING' | 'PROCESSING' | 'MUTED' | 'OPERATOR_ACTIVE' | 'ERROR' | 'RECONNECTING'
  }
  description: string
  bannerMessage?: {
    type: 'info' | 'warning' | 'critical' | 'live'
    text: string
    code?: string
  }
}

export const CALL_STATES_META: Record<CallState, CallStateMeta> = {
  CONNECTING: {
    id: 'CONNECTING',
    label: 'Connecting',
    category: 'connection',
    badgeVariant: 'warning',
    topBarBadge: '● CONNECTING...',
    participantStatus: { customer: 'IDLE', agent: 'PROCESSING' },
    description: 'Agora SIP Trunk handshake in progress with Mumbai Hub gateway (RTT ~18ms)',
    bannerMessage: {
      type: 'info',
      text: 'SIP TRUNK HANDSHAKE IN PROGRESS • Establishing 48kHz Opus stream with gateway...',
      code: 'AGORA_HANDSHAKE_INIT',
    },
  },
  CONNECTED: {
    id: 'CONNECTED',
    label: 'Connected',
    category: 'connection',
    badgeVariant: 'live',
    topBarBadge: '● CONNECTED',
    participantStatus: { customer: 'IDLE', agent: 'LISTENING' },
    description: 'Agora voice channel relay-case-1042 locked with 0 packet loss',
  },
  CUSTOMER_SPEAKING: {
    id: 'CUSTOMER_SPEAKING',
    label: 'Customer Speaking',
    category: 'speech',
    badgeVariant: 'accent',
    topBarBadge: '● CALLER ACTIVE',
    participantStatus: { customer: 'SPEAKING', agent: 'LISTENING' },
    description: 'Caller speaking • Deepgram Multilingual ASR streaming partial tokens',
  },
  RELAY_SPEAKING: {
    id: 'RELAY_SPEAKING',
    label: 'RELAY Speaking',
    category: 'speech',
    badgeVariant: 'live',
    topBarBadge: '● RELAY SYNTHESIS',
    participantStatus: { customer: 'LISTENING', agent: 'SPEAKING' },
    description: 'Cartesia 24ms streaming TTS synthesizer dispatching response',
  },
  RELAY_LISTENING: {
    id: 'RELAY_LISTENING',
    label: 'RELAY Listening',
    category: 'speech',
    badgeVariant: 'standby',
    topBarBadge: '● RELAY LISTENING',
    participantStatus: { customer: 'IDLE', agent: 'LISTENING' },
    description: 'Voice Activity Detection (VAD) armed with 280ms threshold',
  },
  CUSTOMER_INTERRUPTED: {
    id: 'CUSTOMER_INTERRUPTED',
    label: 'Customer Interrupted',
    category: 'speech',
    badgeVariant: 'critical',
    topBarBadge: '● BARGE-IN DETECTED',
    participantStatus: { customer: 'INTERRUPTING', agent: 'LISTENING' },
    description: 'Preemption event triggered: Audio playback truncated in 12ms',
    bannerMessage: {
      type: 'critical',
      text: 'CUSTOMER INTERRUPTED • RELAY RESPONSE CANCELLED • Immediate VAD preemption active',
      code: 'BARGE_IN_PREEMPTION_12MS',
    },
  },
  TOOL_EXECUTING: {
    id: 'TOOL_EXECUTING',
    label: 'Tool Executing',
    category: 'reasoning',
    badgeVariant: 'warning',
    topBarBadge: '⚡ TOOL EXECUTING',
    participantStatus: { customer: 'LISTENING', agent: 'PROCESSING' },
    description: 'lookupOrder(orderId="84921") in flight (Latency: 62ms)',
    bannerMessage: {
      type: 'warning',
      text: 'TOOL STEP: lookupOrder(orderId="84921") • Querying database replica...',
      code: 'TOOL_RPC_EXEC_84921',
    },
  },
  WAITING_FOR_APPROVAL: {
    id: 'WAITING_FOR_APPROVAL',
    label: 'Waiting for Approval',
    category: 'supervision',
    badgeVariant: 'warning',
    topBarBadge: '⚠ APPROVAL REQUIRED',
    participantStatus: { customer: 'LISTENING', agent: 'PROCESSING' },
    description: 'Proposed ₹1,499 refund exceeds autonomous threshold (Risk: Medium)',
    bannerMessage: {
      type: 'warning',
      text: 'AUTHORIZATION GATE: Proposed ₹1,499 refund awaiting human operator sign-off',
      code: 'ACTION_POLICY_GATE_PENDING',
    },
  },
  HUMAN_TAKEOVER: {
    id: 'HUMAN_TAKEOVER',
    label: 'Human Takeover',
    category: 'supervision',
    badgeVariant: 'warning',
    topBarBadge: '● BRIDGING OPERATOR...',
    participantStatus: { customer: 'LISTENING', agent: 'OPERATOR_ACTIVE' },
    description: 'Bridging operator Maya Sharma into Agora channel relay-case-1042 (0ms latency)',
    bannerMessage: {
      type: 'warning',
      text: 'TAKEOVER TRANSITION: Bridging Maya Sharma to live Agora duplex audio line (0ms)...',
      code: 'OPERATOR_BRIDGE_SYNC_OK',
    },
  },
  HUMAN_ACTIVE: {
    id: 'HUMAN_ACTIVE',
    label: 'Human Active',
    category: 'supervision',
    badgeVariant: 'warning',
    topBarBadge: '● MAYA ACTIVE',
    participantStatus: { customer: 'SPEAKING', agent: 'OPERATOR_ACTIVE' },
    description: 'Senior Operator Maya Sharma is live on line • AI in silent shadow mode',
  },
  CALL_ENDING: {
    id: 'CALL_ENDING',
    label: 'Call Ending',
    category: 'teardown',
    badgeVariant: 'standby',
    topBarBadge: '● CALL ENDING...',
    participantStatus: { customer: 'IDLE', agent: 'PROCESSING' },
    description: 'Graceful teardown initiated • Generating transcript summary and syncing CRM',
    bannerMessage: {
      type: 'info',
      text: 'TEARDOWN IN PROGRESS • Committing transcript archive and syncing ticket #TCK-89241...',
      code: 'CALL_TEARDOWN_CLEANUP',
    },
  },
  CALL_ENDED: {
    id: 'CALL_ENDED',
    label: 'Call Ended',
    category: 'teardown',
    badgeVariant: 'standby',
    topBarBadge: '● CALL ENDED',
    participantStatus: { customer: 'DISCONNECTED', agent: 'MUTED' },
    description: 'Call terminated gracefully • Duration: 04:18 • All actions and transcript archived',
    bannerMessage: {
      type: 'info',
      text: 'CALL CONCLUDED • Duration 04:18 • ₹1,499 Refund Initiated (Txn #RF-92817)',
      code: 'SESSION_ARCHIVED',
    },
  },
  RECONNECTING: {
    id: 'RECONNECTING',
    label: 'Reconnecting',
    category: 'connection',
    badgeVariant: 'warning',
    topBarBadge: '● RECONNECTING...',
    participantStatus: { customer: 'RECONNECTING', agent: 'RECONNECTING' },
    description: 'Agora connection interrupted • Auto-reconnecting attempt 2 / 5',
    bannerMessage: {
      type: 'warning',
      text: 'RECONNECTING: Agora connection interrupted • Attempt 2 / 5',
      code: 'AGORA_ICE_RECONNECTING',
    },
  },
  CONNECTION_RESTORED: {
    id: 'CONNECTION_RESTORED',
    label: 'Restored',
    category: 'connection',
    badgeVariant: 'live',
    topBarBadge: '✓ CONNECTION RESTORED',
    participantStatus: { customer: 'IDLE', agent: 'LISTENING' },
    description: 'Stable audio stream re-locked on channel relay-case-1042',
    bannerMessage: {
      type: 'live',
      text: '✓ CONNECTION RESTORED • WebRTC channel re-established with edge gateway',
      code: 'AGORA_ICE_RECONNECTED_OK',
    },
  },
  CONNECTION_LOST: {
    id: 'CONNECTION_LOST',
    label: 'Connection Lost',
    category: 'failure',
    badgeVariant: 'critical',
    topBarBadge: '✕ CONNECTION LOST',
    participantStatus: { customer: 'DISCONNECTED', agent: 'ERROR' },
    description: 'Agora RTC carrier connection dropped • Auto-reconnection attempt 1 of 5',
    bannerMessage: {
      type: 'critical',
      text: 'AGORA RTC DISCONNECTED • SIP Carrier Signal Dropped • Auto-reconnecting...',
      code: 'ERR_AGORA_ICE_DISCONNECTED',
    },
  },
  AI_ERROR: {
    id: 'AI_ERROR',
    label: 'AI Error',
    category: 'failure',
    badgeVariant: 'critical',
    topBarBadge: '✕ ASR ENGINE ERROR',
    participantStatus: { customer: 'SPEAKING', agent: 'ERROR' },
    description: 'Deepgram streaming ASR socket timeout • Falling back to Whisper Hindi local replica',
    bannerMessage: {
      type: 'critical',
      text: 'ASR SOCKET TIMEOUT • Falling back to secondary Hindi ASR pipeline (140ms)...',
      code: 'ERR_ASR_TIMEOUT_FALLBACK',
    },
  },
  TOOL_ERROR: {
    id: 'TOOL_ERROR',
    label: 'Tool Error',
    category: 'failure',
    badgeVariant: 'critical',
    topBarBadge: '✕ TOOL RPC TIMEOUT',
    participantStatus: { customer: 'LISTENING', agent: 'ERROR' },
    description: '504 Gateway Timeout from Logistics Inventory Service • Retrying via read-only replica',
    bannerMessage: {
      type: 'critical',
      text: 'TOOL RPC EXCEPTION • 504 Gateway Timeout on Order Service (Retrying via replica)...',
      code: 'ERR_TOOL_GATEWAY_504',
    },
  },
}

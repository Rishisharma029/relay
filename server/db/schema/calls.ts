/**
 * Database Entity Schema: calls & participants
 */

export interface CallEntity {
  id: string
  caseId: string
  rtcChannel: string
  audioSampleRate: string
  startedAt: string
  endedAt?: string
  durationSeconds: number
}

export interface ParticipantEntity {
  id: string
  callId: string
  uid: string
  role: 'CUSTOMER' | 'AI_AGENT' | 'OPERATOR'
  name: string
  isMuted: boolean
  joinedAt: string
  leftAt?: string
}

/**
 * Database Entity Schema: transcript_messages
 */

export interface TranscriptMessageEntity {
  id: string
  callId: string
  speaker: 'CUSTOMER' | 'RELAY' | 'OPERATOR'
  text: string
  translation?: string
  language: string
  isTool: boolean
  toolName?: string
  confidence: number
  createdAt: string
}

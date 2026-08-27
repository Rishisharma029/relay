/**
 * Database Entity Schema: cases
 */

export interface CaseEntity {
  id: string
  customerId: string
  channelName: string
  status: 'connecting' | 'active' | 'awaiting_approval' | 'human_takeover' | 'resolved' | 'failed'
  language: string
  intent: string
  sentiment: string
  createdAt: string
  resolvedAt?: string
}

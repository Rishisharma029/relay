/**
 * RELAY — 3-Level Explicit AI Memory Types
 */

export interface TurnMemory {
  timestamp: string
  utterance: string
  detectedLanguage: string
  slotExtractions: {
    orderId?: string
    isRefundRequested?: boolean
    isDeliveryInquiry?: boolean
  }
}

export interface CaseMemory {
  caseId: string
  customerId: string
  channel: string
  activeOrderId?: string
  orderAmount?: number
  deliveryStatus?: string
  carrier?: string
  carrierExceptionCode?: string
  slaDelayDays?: number
  factsDiscovered: string[]
  activeActionProposed?: string
  approvalStatus?: string
}

export interface CustomerHistoryEntry {
  date: string
  issue: string
  resolution: string
  satisfactionRating: number
}

export interface CustomerMemory {
  customerId: string
  name: string
  tier: 'PLATINUM' | 'GOLD' | 'STANDARD'
  preferredLanguage: string
  preferredChannel: string
  disputeRate: string
  accountCreated: string
  totalLifetimeOrders: number
  totalLifetimeSpend: string
  history: CustomerHistoryEntry[]
  aiPersonalizationNotes: string[]
}

export interface FullMemoryHierarchy {
  turnMemory: TurnMemory
  caseMemory: CaseMemory
  customerMemory: CustomerMemory
}

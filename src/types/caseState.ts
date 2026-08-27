/**
 * RELAY — Authoritative Case State Definition
 * Single unified state model shared across all views and components.
 */

import { TakeoverStateMachineState } from './relayEvents'
import { ActiveFailure } from './failureStates'

export interface Fact {
  id: string
  label: string
  verified: boolean
  source?: string
}

export interface ActionRequest {
  id: string
  type: 'REFUND' | 'ESCALATION' | 'REROUTE'
  title: string
  amount?: number
  currency?: string
  riskTier: 'LOW' | 'MEDIUM' | 'HIGH'
  policyId: string
  policyUsed?: {
    policyId: string
    name: string
    section: string
  }
  evidence?: string[]
  justification: string[]
  status: 'PENDING' | 'APPROVED' | 'DECLINED'
  approvedAt?: string
  approvedBy?: string
}

export interface Participant {
  id: string
  role: 'CUSTOMER' | 'AI_AGENT' | 'OPERATOR'
  name: string
  joinedAt: string
  audioLevel?: number
  isMuted?: boolean
}

export interface CaseState {
  id: string
  customerId: string
  customerName?: string
  customerPhone?: string
  customerTier?: string
  channelName: string

  language: string
  intent?: string
  sentiment?: string

  facts: Fact[]
  unknowns: string[]

  activeAction?: ActionRequest

  participants: Participant[]

  takeoverState: TakeoverStateMachineState

  /** Set when a recoverable failure is in progress. Cleared when resolved. */
  activeFailure?: ActiveFailure

  assignedOperator?: string
  assignmentStatus?: 'UNASSIGNED' | 'ASSIGNED' | 'ESCALATED'

  status:
    | 'connecting'
    | 'active'
    | 'awaiting_approval'
    | 'executing_action'
    | 'resolved'
    | 'human_takeover'
    | 'human_active'
    | 'ai_resumed'
    | 'degraded'
    | 'recovering'
    | 'failed'
}

export const INITIAL_CASE_STATE: CaseState = {
  id: 'RLY-1042',
  customerId: 'CUST-AARAV-01',
  customerName: 'Aarav Sharma',
  customerPhone: '+91 98201 44102',
  customerTier: 'Platinum',
  channelName: 'relay-case-1042',

  language: 'Hindi',
  intent: 'refund_request',
  sentiment: 'Frustrated ➔ Neutral',

  facts: [
    { id: 'f-1', label: 'Order #84921', verified: true, source: 'Order Gateway' },
    { id: 'f-2', label: '₹1,499', verified: true, source: 'Payment Ledger' },
    { id: 'f-3', label: 'Expected Aug 24', verified: true, source: 'Logistics SLA' },
    { id: 'f-4', label: 'Delivery exception', verified: true, source: 'BlueDart Tracking' },
  ],

  unknowns: [
    'Customer received failed-delivery notice',
    'Customer preference after refund',
  ],

  activeAction: {
    id: 'appr-1042-99042',
    type: 'REFUND',
    title: 'Refund ₹1,499',
    amount: 1499,
    currency: 'INR',
    riskTier: 'MEDIUM',
    policyId: 'POL-DELIVERY-DELAY-01',
    justification: [
      'Delivery exception confirmed',
      'Customer explicitly requested refund',
    ],
    status: 'PENDING',
  },

  participants: [
    { id: 'p-1', role: 'CUSTOMER', name: 'Aarav Mehta', joinedAt: '21:33:40', isMuted: false },
    { id: 'p-2', role: 'AI_AGENT', name: 'RELAY AI', joinedAt: '21:33:40', isMuted: false },
    { id: 'p-3', role: 'OPERATOR', name: 'Maya Sharma', joinedAt: '21:33:41', isMuted: false },
  ],

  takeoverState: 'AI_ACTIVE',
  status: 'active',
}

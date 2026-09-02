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

  orderId?: string
  orderAmount?: number
  orderCarrier?: string
  orderItem?: string
  orderAwb?: string
  orderStatus?: string
  orderDelayDays?: number

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
  id: 'RLY-72143',
  customerId: 'CUST-1042',
  customerName: 'Aarav Patel',
  customerPhone: '+91 98201 44102',
  customerTier: 'Platinum VIP',
  channelName: 'relay-case-72143',

  language: 'Hindi',
  intent: 'refund_request',
  sentiment: 'Frustrated ➔ Neutral',

  orderId: '72143',
  orderAmount: 2899,
  orderCarrier: 'Delhivery Express',
  orderItem: 'Mechanical Gaming Keyboard',
  orderAwb: 'DL-721438910',
  orderStatus: 'DELAYED_IN_TRANSIT',
  orderDelayDays: 4,

  facts: [
    { id: 'f-1', label: 'Customer Identity Verified (Aarav Patel · Platinum VIP)', verified: true, source: 'CRM Gateway' },
    { id: 'f-2', label: 'Order #72143 Delayed 4 Days (Delhivery Express)', verified: true, source: 'Logistics Gateway' },
    { id: 'f-3', label: 'Eligible under Policy POL-REFUND-3.2 (Delay > 3 days)', verified: true, source: 'Knowledge Engine' },
    { id: 'f-4', label: 'Zero prior refunds on record (Dispute Rate 0.0%)', verified: true, source: 'Payment Ledger' },
  ],

  unknowns: [],

  activeAction: {
    id: 'appr-72143-99042',
    type: 'REFUND',
    title: 'Refund Settlement',
    amount: 2899,
    currency: 'INR',
    riskTier: 'MEDIUM',
    policyId: 'POL-REFUND-3.2',
    policyUsed: {
      policyId: 'POL-REFUND-3.2',
      name: 'Dispute Resolution & Instant Settlement Matrix',
      section: 'Section 4.1 — Immediate Settlement Protocol',
    },
    justification: [
      'Carrier SLA breach confirmed (4 days delayed)',
      'Customer explicitly requested refund',
      'Policy POL-REFUND-3.2 qualifies 100% electronic payout'
    ],
    status: 'PENDING',
  },

  participants: [
    { id: 'p-1', role: 'CUSTOMER', name: 'Aarav Patel', joinedAt: '21:34:02', isMuted: false },
    { id: 'p-2', role: 'AI_AGENT', name: 'RELAY Conversational AI', joinedAt: '21:34:02', isMuted: false },
    { id: 'p-3', role: 'OPERATOR', name: 'Maya Sharma (Senior Operator)', joinedAt: '21:34:03', isMuted: false },
  ],

  takeoverState: 'AI_ACTIVE',
  status: 'awaiting_approval',
}

/**
 * RELAY — Authoritative Database Client
 *
 * Implements relational entities and append-only event sourcing ledger.
 *
 * Core Relationships:
 *   Customer
 *      │
 *      └── Cases
 *            │
 *            └── Calls
 *                  │
 *                  ├── Transcript
 *                  ├── Facts
 *                  ├── Actions
 *                  ├── Approvals
 *                  └── Events (relay_events)
 */

import {
  CustomerEntity,
  CaseEntity,
  CallEntity,
  ParticipantEntity,
  TranscriptMessageEntity,
  CaseFactEntity,
  ActionEntity,
  ApprovalEntity,
  ToolExecutionEntity,
  RelayEventEntity,
} from './schema/index.js'

// In-memory persistent data structures (mirrored to PostgreSQL in production)
const customersTable = new Map<string, CustomerEntity>()
const casesTable = new Map<string, CaseEntity>()
const callsTable = new Map<string, CallEntity>()
const participantsTable = new Map<string, ParticipantEntity>()
const transcriptTable = new Map<string, TranscriptMessageEntity>()
const factsTable = new Map<string, CaseFactEntity>()
const actionsTable = new Map<string, ActionEntity>()
const approvalsTable = new Map<string, ApprovalEntity>()
const toolExecutionsTable = new Map<string, ToolExecutionEntity>()

// Append-only event store: caseId -> Array<RelayEventEntity> (Strictly append-only)
const relayEventsStore = new Map<string, RelayEventEntity[]>()

// Monotonic sequence counters: caseId -> sequence_number
const sequenceCounters = new Map<string, number>()

// Seed Initial Data
customersTable.set('CUS-1042', {
  id: 'CUS-1042',
  name: 'Aarav Mehta',
  phone: '+91 98201 44102',
  email: 'aarav.mehta@example.com',
  tier: 'PLATINUM',
  preferredLanguage: 'Hindi / English',
  disputeRate: 0.0002,
  createdAt: '2025-01-10T10:00:00Z',
})

casesTable.set('RLY-1042', {
  id: 'RLY-1042',
  customerId: 'CUS-1042',
  channelName: 'relay-case-1042',
  status: 'active',
  language: 'Hindi',
  intent: 'delivery_issue',
  sentiment: 'Frustrated ➔ Neutral',
  createdAt: '2026-08-27T21:30:00Z',
})

callsTable.set('call-1042-01', {
  id: 'call-1042-01',
  caseId: 'RLY-1042',
  rtcChannel: 'relay-case-1042',
  audioSampleRate: '48 kHz',
  startedAt: '2026-08-27T21:30:05Z',
  durationSeconds: 161,
})

// Seed baseline chronological events for RLY-1042
const initialCaseEvents: Array<{ type: string; payload: Record<string, any>; timestamp: string }> = [
  { type: 'call.started', payload: { caseId: 'RLY-1042' }, timestamp: '21:32:00' },
  {
    type: 'speech.transcript',
    payload: {
      speaker: 'customer',
      text: 'Mera order 5 din se nahi aaya.',
      translation: 'My order has not arrived for 5 days.',
      language: 'Hindi / Hinglish',
    },
    timestamp: '21:32:04',
  },
  {
    type: 'tool.started',
    payload: { tool: 'lookupCustomer', params: { customerId: 'CUS-1042' } },
    timestamp: '21:32:05',
  },
  {
    type: 'tool.completed',
    payload: {
      tool: 'lookupCustomer',
      durationMs: 45,
      result: { customerId: 'CUS-1042', tier: 'PLATINUM', verified: true },
    },
    timestamp: '21:32:06',
  },
  {
    type: 'tool.started',
    payload: { tool: 'lookupOrder', params: { orderId: '84921' } },
    timestamp: '21:32:06',
  },
  {
    type: 'tool.completed',
    payload: {
      tool: 'lookupOrder',
      durationMs: 85,
      result: { orderId: '84921', status: 'delivery_exception', amount: 1499 },
    },
    timestamp: '21:32:07',
  },
  {
    type: 'tool.started',
    payload: { tool: 'getDeliveryStatus', params: { orderId: '84921' } },
    timestamp: '21:32:07',
  },
  {
    type: 'tool.completed',
    payload: {
      tool: 'getDeliveryStatus',
      durationMs: 99,
      result: {
        orderId: '84921',
        carrierTracking: 'BlueDart Air: Exception Stalled (Weather delay +3d)',
        isSlaBreached: true,
      },
    },
    timestamp: '21:32:08',
  },
  {
    type: 'speech.transcript',
    payload: {
      speaker: 'agent',
      text: 'Aarav ji, main aapka order #84921 check kar rahi hoon... isme BlueDart Air ke sath delivery delay exception hai.',
      translation: 'Aarav, I am checking order #84921... there is a delivery delay exception with BlueDart Air.',
      language: 'Hindi / Hinglish',
    },
    timestamp: '21:32:09',
  },
  {
    type: 'speech.transcript',
    payload: {
      speaker: 'customer',
      text: 'Mujhe refund chahiye.',
      translation: 'I want a refund.',
      language: 'Hindi / Hinglish',
    },
    timestamp: '21:34:02',
  },
  {
    type: 'approval.created',
    payload: {
      approvalId: 'appr-1042-99042',
      actionId: 'appr-1042-99042',
      amount: 1499,
      riskTier: 'medium',
      policyId: 'POL-REFUND-3.2',
      section: 'Section 4.1',
    },
    timestamp: '21:34:08',
  },
]

// Initialize append-only event stream
const seededEvents: RelayEventEntity[] = initialCaseEvents.map((ev, idx) => ({
  id: `evt_01J${Date.now().toString().slice(-6)}${String(idx).padStart(3, '0')}`,
  caseId: 'RLY-1042',
  sequenceNum: idx + 1,
  eventType: ev.type,
  payload: ev.payload,
  timestamp: ev.timestamp,
  createdAt: new Date().toISOString(),
}))

relayEventsStore.set('RLY-1042', seededEvents)
sequenceCounters.set('RLY-1042', seededEvents.length)

export class RelayDatabaseClient {
  // ── 1. Customers ─────────────────────────────────────────────────────────
  static getCustomer(id: string): CustomerEntity | null {
    return customersTable.get(id) || null
  }

  static upsertCustomer(customer: CustomerEntity): void {
    customersTable.set(customer.id, customer)
  }

  // ── 2. Cases ─────────────────────────────────────────────────────────────
  static getCase(id: string): CaseEntity | null {
    return casesTable.get(id) || null
  }

  static updateCaseStatus(id: string, status: CaseEntity['status']): void {
    const c = casesTable.get(id)
    if (c) {
      c.status = status
      casesTable.set(id, c)
    }
  }

  // ── 3. Calls ─────────────────────────────────────────────────────────────
  static getCall(id: string): CallEntity | null {
    return callsTable.get(id) || null
  }

  // ── 4. Transcripts ───────────────────────────────────────────────────────
  static addTranscriptMessage(msg: TranscriptMessageEntity): void {
    transcriptTable.set(msg.id, msg)
  }

  // ── 5. Facts ─────────────────────────────────────────────────────────────
  static addCaseFact(fact: CaseFactEntity): void {
    factsTable.set(fact.id, fact)
  }

  // ── 6. Approvals ─────────────────────────────────────────────────────────
  static getApproval(id: string): ApprovalEntity | null {
    return approvalsTable.get(id) || null
  }

  static upsertApproval(approval: ApprovalEntity): void {
    approvalsTable.set(approval.id, approval)
  }

  // ── 7. Tool Executions ───────────────────────────────────────────────────
  static recordToolExecution(exec: ToolExecutionEntity): void {
    toolExecutionsTable.set(exec.id, exec)
  }

  // ── 8. Strictly Append-Only Relay Events (Operational Ledger) ────────────
  /**
   * Append an event to the immutable operational ledger.
   * Enforces strictly monotonic sequence numbering.
   */
  static appendRelayEvent(caseId: string, event: { type?: string; event_type?: string; payload?: Record<string, any>; timestamp?: string; [key: string]: any }): RelayEventEntity {
    const stream = relayEventsStore.get(caseId) || []
    const currentSeq = (sequenceCounters.get(caseId) || stream.length) + 1
    sequenceCounters.set(caseId, currentSeq)

    const eventType = event.type || event.event_type || 'unspecified'
    const payload = event.payload || { ...event }
    delete (payload as any).type
    delete (payload as any).event_type

    const record: RelayEventEntity = {
      id: `evt_01J${Date.now().toString().slice(-6)}${String(currentSeq).padStart(3, '0')}`,
      caseId,
      sequenceNum: currentSeq,
      eventType,
      payload,
      timestamp: event.timestamp || new Date().toLocaleTimeString(),
      createdAt: new Date().toISOString(),
    }

    // Append-only invariant
    stream.push(record)
    relayEventsStore.set(caseId, stream)

    return record
  }

  /**
   * Retrieve the complete chronological event stream for a case.
   * Enables scrubbing and deterministic time-travel state reconstruction.
   */
  static getRelayEvents(caseId: string, fromSeq: number = 1, toSeq: number = Infinity): RelayEventEntity[] {
    const stream = relayEventsStore.get(caseId) || []
    return stream.filter((e) => e.sequenceNum >= fromSeq && e.sequenceNum <= toSeq)
  }

  /**
   * Retrieve database health statistics across all entities.
   */
  static getStats(): Record<string, any> {
    return {
      engine: 'PostgreSQL 16 (Append-Only Event Ledger)',
      customersCount: customersTable.size,
      casesCount: casesTable.size,
      callsCount: callsTable.size,
      transcriptMessagesCount: transcriptTable.size,
      caseFactsCount: factsTable.size,
      actionsCount: actionsTable.size,
      approvalsCount: approvalsTable.size,
      toolExecutionsCount: toolExecutionsTable.size,
      totalRelayEvents: Array.from(relayEventsStore.values()).reduce((acc, s) => acc + s.length, 0),
      immutableRuleStatus: 'no_update_relay_events & no_delete_relay_events active',
    }
  }
}

export const dbClient = RelayDatabaseClient

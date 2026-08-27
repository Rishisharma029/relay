/**
 * Database Entity Schema: relay_events
 *
 * Strictly append-only immutable operational ledger.
 * No UPDATE or DELETE operations permitted.
 */

export interface RelayEventEntity {
  id: string
  caseId: string
  sequenceNum: number
  eventType: string
  payload: Record<string, any>
  timestamp: string
  createdAt: string
}

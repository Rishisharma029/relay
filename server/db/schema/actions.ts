/**
 * Database Entity Schema: actions
 */

export interface ActionEntity {
  id: string
  caseId: string
  type: 'REFUND' | 'ESCALATION' | 'REROUTE' | 'COURIER_HOLD'
  title: string
  amount?: number
  currency: string
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'EXECUTED'
  createdAt: string
}

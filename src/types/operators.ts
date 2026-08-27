/**
 * RELAY — Operator Roster & Permission Types
 */

export type OperatorRole = 'AGENT' | 'SUPERVISOR' | 'ADMIN'
export type OperatorStatus = 'Available' | 'On call' | 'Offline'

export interface Operator {
  id: string
  name: string
  role: OperatorRole
  status: OperatorStatus
  activeCases: number
  desk: string
}

export type CaseAssignmentStatus = 'UNASSIGNED' | 'ASSIGNED' | 'ESCALATED'

export interface CaseAssignment {
  caseId: string
  assignedTo: string | null
  assignedName: string
  assignmentStatus: CaseAssignmentStatus
  assignedAt?: string
}

/**
 * Database Entity Schema: approvals
 */

export interface ApprovalEntity {
  id: string
  actionId: string
  caseId: string
  riskTier: 'LOW' | 'MEDIUM' | 'HIGH'
  policyId: string
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'EXPIRED'
  operatorId?: string
  operatorName?: string
  declineReason?: string
  approvedAt?: string
  createdAt: string
}

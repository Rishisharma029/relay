/**
 * Database Entity Schema: case_facts
 */

export interface CaseFactEntity {
  id: string
  caseId: string
  label: string
  source: string
  verified: boolean
  createdAt: string
}

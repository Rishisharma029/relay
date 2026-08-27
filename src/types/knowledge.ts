/**
 * RELAY — Knowledge Retrieval & Auditable Policy Types
 */

export interface PolicyClause {
  clauseId: string
  title: string
  text: string
}

export interface PolicyDocument {
  policyId: string
  title: string
  version: string
  section: string
  lastUpdated: string
  effectiveDate?: string
  summary: string
  clauses: PolicyClause[]
  mandatoryChecks: string[]
}

export interface PolicyCitation {
  policyId: string
  title: string
  version: string
  section: string
  clauseId: string
  clauseText: string
  document?: PolicyDocument
}

/**
 * Knowledge Base Document: Escalation Policy
 * Escalation Policy v1.8, Section 6.2
 */

export const EscalationPolicyDoc = {
  policyId: 'POL-ESCALATION-1.8',
  title: 'Escalation Policy v1.8',
  version: 'v1.8',
  section: 'Section 6.2',
  sectionTitle: 'Human Takeover & Priority Escalation Matrix',
  clauses: [
    {
      id: '6.2.A',
      title: 'Human Takeover Triggers',
      text: 'Human takeover is mandatory when: (1) Tool execution retry exhausts, (2) High risk financial actions > ₹2,500, (3) Explicit customer request for supervisor.',
    },
  ],
  requiredEvidence: [
    'takeover_trigger_matched',
    'operator_authorized',
  ],
}

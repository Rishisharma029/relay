/**
 * Knowledge Base Document: Refund Policy
 * Refund Policy v3.2, Section 4.1
 */

export const RefundPolicyDoc = {
  policyId: 'POL-REFUND-3.2',
  title: 'Refund Policy v3.2',
  version: 'v3.2',
  section: 'Section 4.1',
  sectionTitle: 'Courier SLA Delays & Carrier Exceptions',
  clauses: [
    {
      id: '4.1.A',
      title: 'Courier SLA Breach Eligibility',
      text: 'An order delayed beyond 3 business days past the promised delivery SLA with a verified courier exception code is eligible for an instant 100% refund.',
    },
    {
      id: '4.1.B',
      title: 'Operator Governance Gate',
      text: 'Refund amounts up to ₹2,500 for Platinum and Gold tier customers require single human operator approval with zero reverse-pickup prerequisite.',
    },
    {
      id: '4.1.C',
      title: 'Instant UPI Settlement',
      text: 'Approved refunds must be routed via NPCI Instant UPI disbursement directly to the customer source account within 120 seconds.',
    },
  ],
  requiredEvidence: [
    'order_delayed',
    'customer_requested_refund',
    'policy_eligible',
  ],
}

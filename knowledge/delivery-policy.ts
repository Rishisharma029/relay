/**
 * Knowledge Base Document: Delivery Policy
 * Delivery Policy v2.1, Section 2.4
 */

export const DeliveryPolicyDoc = {
  policyId: 'POL-DELIVERY-2.1',
  title: 'Delivery Policy v2.1',
  version: 'v2.1',
  section: 'Section 2.4',
  sectionTitle: 'Express Logistics Transit Guarantees',
  clauses: [
    {
      id: '2.4.A',
      title: 'Transit SLA Breach Threshold',
      text: 'Air Express shipments exceeding 72 hours transit delay auto-trigger carrier exception tokens and priority customer assistance.',
    },
  ],
  requiredEvidence: [
    'carrier_checkpoint_verified',
    'transit_sla_breached',
  ],
}

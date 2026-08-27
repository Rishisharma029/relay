/**
 * RELAY — Knowledge Retrieval & Auditable Policy Evidence Layer
 *
 * Provides citation-grounded policy lookups so AI actions and decisions are 100% auditable.
 */

export const POLICY_KNOWLEDGE_BASE = [
  {
    policyId: 'POL-REFUND-3.2',
    title: 'E-Commerce Dispute & Instant Refund Protocol',
    version: 'v3.2',
    section: 'Section 4.1 — Courier SLA Delays & Carrier Exceptions',
    lastUpdated: '2026-06-15',
    effectiveDate: '2026-07-01',
    summary: 'Rules for instant electronic refund issuance on delayed or lost shipments.',
    clauses: [
      {
        clauseId: '4.1.A',
        title: 'Eligibility Criteria',
        text: 'An order delayed beyond 3 business days past the promised delivery SLA with a verified courier exception code (e.g. DELAY_WEATHER_AIR_CARRIER, IN_TRANSIT_STALL) is eligible for an instant 100% refund.',
      },
      {
        clauseId: '4.1.B',
        title: 'Operator Sign-off Matrix',
        text: 'Refund amounts up to ₹2,500 for Platinum and Gold tier customers require single human operator approval with zero reverse-pickup prerequisite.',
      },
      {
        clauseId: '4.1.C',
        title: 'Settlement Speed',
        text: 'Approved refunds must be routed via NPCI Instant UPI disbursement directly to the source VPA/bank account within 120 seconds.',
      },
    ],
    mandatoryChecks: [
      'Customer identity verified in CRM',
      'Order exists and status is DELIVERY_EXCEPTION',
      'Refund amount matches transaction capture value',
      'Zero prior refund settled on same order identifier',
    ],
  },
  {
    policyId: 'POL-DELIVERY-2.1',
    title: 'Logistics SLA & Carrier Performance Standard',
    version: 'v2.1',
    section: 'Section 2.4 — BlueDart Air Express SLA Commitments',
    lastUpdated: '2026-04-10',
    summary: 'Transit timeline standards and breach notification rules.',
    clauses: [
      {
        clauseId: '2.4.A',
        title: 'Guaranteed Delivery Windows',
        text: 'Express Air parcels have a guaranteed delivery window of 48 hours for Tier-1 metros. When weather or logistical bottlenecks cause delays >72 hours, carrier auto-generates exception token.',
      },
    ],
    mandatoryChecks: ['Carrier API checkpoint check', 'Exception code validation'],
  },
  {
    policyId: 'POL-ESCALATION-1.8',
    title: 'Human Takeover & Priority Escalation Matrix',
    version: 'v1.8',
    section: 'Section 6.2 — Autonomous AI Preemption & Operator Handoff',
    lastUpdated: '2026-05-20',
    summary: 'Deterministic criteria for transitioning calls from AI to human operators.',
    clauses: [
      {
        clauseId: '6.2.A',
        title: 'Operator Takeover Triggers',
        text: 'A human takeover shall be triggered when: (1) Tool execution encounters retry exhaustion, (2) High risk financial action > ₹2,500, (3) Explicit customer request for supervisor, or (4) Operator clicks TAKE OVER on the workstation.',
      },
    ],
    mandatoryChecks: ['Operator ID in AUTHORIZED_OPERATORS set', 'Case state snapshot stored'],
  },
]

export class KnowledgeService {
  /**
   * Retrieve relevant policies matching customer query or active intent
   */
  static retrievePolicyEvidence(query = '', intent = 'refund_request') {
    const q = query.toLowerCase()

    if (intent === 'refund_request' || q.includes('refund') || q.includes('paisa') || q.includes('chahiye')) {
      const policy = POLICY_KNOWLEDGE_BASE.find((p) => p.policyId === 'POL-REFUND-3.2')
      return {
        hasMatch: true,
        relevanceScore: 0.98,
        policyCitation: {
          policyId: policy.policyId,
          title: policy.title,
          version: policy.version,
          section: policy.section,
          clauseId: '4.1.A',
          clauseText: policy.clauses[0].text,
          document: policy,
        },
      }
    }

    if (intent === 'delivery_issue' || q.includes('order') || q.includes('aaya') || q.includes('delay')) {
      const policy = POLICY_KNOWLEDGE_BASE.find((p) => p.policyId === 'POL-DELIVERY-2.1')
      return {
        hasMatch: true,
        relevanceScore: 0.94,
        policyCitation: {
          policyId: policy.policyId,
          title: policy.title,
          version: policy.version,
          section: policy.section,
          clauseId: '2.4.A',
          clauseText: policy.clauses[0].text,
          document: policy,
        },
      }
    }

    const defaultPolicy = POLICY_KNOWLEDGE_BASE[0]
    return {
      hasMatch: true,
      relevanceScore: 0.85,
      policyCitation: {
        policyId: defaultPolicy.policyId,
        title: defaultPolicy.title,
        version: defaultPolicy.version,
        section: defaultPolicy.section,
        clauseId: '4.1.A',
        clauseText: defaultPolicy.clauses[0].text,
        document: defaultPolicy,
      },
    }
  }

  static getPolicyById(policyId) {
    return POLICY_KNOWLEDGE_BASE.find((p) => p.policyId === policyId) || null
  }
}

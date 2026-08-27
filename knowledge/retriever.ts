/**
 * RELAY — Knowledge & Policy Retriever
 *
 * Pipeline:
 *   Customer question ──► Retriever ──► Relevant policy ──► Agent Context
 */

import { RefundPolicyDoc } from './refund-policy.js'
import { DeliveryPolicyDoc } from './delivery-policy.js'
import { EscalationPolicyDoc } from './escalation-policy.js'
import { SupportGuidelinesDoc } from './support-guidelines.js'

export const ALL_POLICIES = [
  RefundPolicyDoc,
  DeliveryPolicyDoc,
  EscalationPolicyDoc,
  SupportGuidelinesDoc,
]

export class PolicyRetriever {
  /**
   * Semantically match customer question or intent to the authoritative policy
   */
  static retrievePolicy(query: string = '', intent: string = 'refund_request') {
    const q = query.toLowerCase()

    if (intent === 'refund_request' || q.includes('refund') || q.includes('paisa') || q.includes('chahiye')) {
      return {
        matched: true,
        relevance: 0.98,
        policy: RefundPolicyDoc,
        displayUsed: {
          title: RefundPolicyDoc.title,
          section: RefundPolicyDoc.section,
        },
      }
    }

    if (intent === 'delivery_issue' || q.includes('order') || q.includes('aaya') || q.includes('delay')) {
      return {
        matched: true,
        relevance: 0.95,
        policy: DeliveryPolicyDoc,
        displayUsed: {
          title: DeliveryPolicyDoc.title,
          section: DeliveryPolicyDoc.section,
        },
      }
    }

    return {
      matched: true,
      relevance: 0.85,
      policy: RefundPolicyDoc,
      displayUsed: {
        title: RefundPolicyDoc.title,
        section: RefundPolicyDoc.section,
      },
    }
  }
}

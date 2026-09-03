/**
 * RELAY — Official Commerce Ruleset: India (IN)
 *
 * Source:
 *   Ministry of Consumer Affairs, Food & Public Distribution,
 *   Department of Consumer Affairs, Government of India.
 *   The Gazette of India: Extraordinary, Part II, Section 3, Sub-section (i),
 *   Notification G.S.R. 464(E), dated 23rd July, 2020.
 *   Consumer Protection (E-Commerce) Rules, 2020.
 *
 * Notice:
 *   Selected requirements implemented as deterministic, auditable rules for demonstration.
 *   Relay does not claim legal compliance; this represents an executable compliance rule model.
 */

export const INDIA_COMMERCE_RULES = [
  {
    ruleId: 'COM-IN-ECOM-2020-RETURN-001',
    code: 'IN_LATE_DELIVERY_RETURN_REFUND',
    name: 'Mandatory Return/Refund for Delayed Delivery',
    jurisdiction: 'IN',
    category: 'SOURCE_BASED_RULE',
    source: {
      authority: 'Ministry of Consumer Affairs, Government of India',
      instrument: 'Consumer Protection (E-Commerce) Rules, 2020',
      section: 'Rule 4(11) & Rule 6(3)',
      gazetteNotification: 'G.S.R. 464(E), July 23, 2020',
      text: 'No e-commerce entity or seller shall refuse to take back goods, or discontinue the services, or refuse to refund consideration paid if such goods or services are delivered late from the stated delivery schedule: Provided that nothing contained in this sub-rule shall apply in cases of force majeure.'
    },
    effectiveDate: '2020-07-23',
    version: '2020.1-v1',
    description: 'Guarantees refund/return consideration if carrier delivery schedule is breached, unless force majeure applies.'
  },
  {
    ruleId: 'COM-IN-ECOM-2020-RETURN-002',
    code: 'IN_DEFECTIVE_GOODS_RETURN_REFUND',
    name: 'Return and Refund for Defective Goods',
    jurisdiction: 'IN',
    category: 'SOURCE_BASED_RULE',
    source: {
      authority: 'Ministry of Consumer Affairs, Government of India',
      instrument: 'Consumer Protection (E-Commerce) Rules, 2020',
      section: 'Rule 4(11) & Rule 6(3)',
      gazetteNotification: 'G.S.R. 464(E), July 23, 2020',
      text: 'No e-commerce entity or seller shall refuse to take back goods, or refuse to refund consideration paid if such goods or services are defective.'
    },
    effectiveDate: '2020-07-23',
    version: '2020.1-v1'
  },
  {
    ruleId: 'COM-IN-ECOM-2020-RETURN-003',
    code: 'IN_DEFICIENT_GOODS_RETURN_REFUND',
    name: 'Return and Refund for Deficient Goods or Services',
    jurisdiction: 'IN',
    category: 'SOURCE_BASED_RULE',
    source: {
      authority: 'Ministry of Consumer Affairs, Government of India',
      instrument: 'Consumer Protection (E-Commerce) Rules, 2020',
      section: 'Rule 4(11) & Rule 6(3)',
      gazetteNotification: 'G.S.R. 464(E), July 23, 2020',
      text: 'No e-commerce entity or seller shall refuse to take back goods, or refuse to refund consideration paid if goods or services are deficient.'
    },
    effectiveDate: '2020-07-23',
    version: '2020.1-v1'
  },
  {
    ruleId: 'COM-IN-ECOM-2020-RETURN-004',
    code: 'IN_SPURIOUS_GOODS_RETURN_REFUND',
    name: 'Immediate Return and Refund for Spurious / Counterfeit Goods',
    jurisdiction: 'IN',
    category: 'SOURCE_BASED_RULE',
    source: {
      authority: 'Ministry of Consumer Affairs, Government of India',
      instrument: 'Consumer Protection (E-Commerce) Rules, 2020',
      section: 'Rule 4(11) & Rule 6(3)',
      gazetteNotification: 'G.S.R. 464(E), July 23, 2020',
      text: 'No e-commerce entity or seller shall refuse to take back goods, or refuse to refund consideration paid if goods are spurious.'
    },
    effectiveDate: '2020-07-23',
    version: '2020.1-v1'
  },
  {
    ruleId: 'COM-IN-ECOM-2020-RETURN-005',
    code: 'IN_RETURN_NOT_AS_ADVERTISED',
    name: 'Goods Not Matching Advertised or Agreed Characteristics',
    jurisdiction: 'IN',
    category: 'SOURCE_BASED_RULE',
    source: {
      authority: 'Ministry of Consumer Affairs, Government of India',
      instrument: 'Consumer Protection (E-Commerce) Rules, 2020',
      section: 'Rule 4(11) & Rule 6(3)',
      gazetteNotification: 'G.S.R. 464(E), July 23, 2020',
      text: 'No e-commerce entity shall refuse refund if goods are not of the characteristics or features as advertised or as agreed to.'
    },
    effectiveDate: '2020-07-23',
    version: '2020.1-v1'
  },
  {
    ruleId: 'COM-IN-ECOM-2020-GRIEVANCE-001',
    code: 'IN_GRIEVANCE_TICKET_TRACKING',
    name: 'Consumer Grievance Ticket Generation & Redressal',
    jurisdiction: 'IN',
    category: 'SOURCE_BASED_RULE',
    source: {
      authority: 'Ministry of Consumer Affairs, Government of India',
      instrument: 'Consumer Protection (E-Commerce) Rules, 2020',
      section: 'Rule 4(4) & Rule 4(5)',
      gazetteNotification: 'G.S.R. 464(E), July 23, 2020',
      text: 'Every e-commerce entity shall establish an adequate grievance redressal mechanism, appoint a grievance officer, and provide a ticket number for each complaint lodged through which the consumer may track the status of the complaint.'
    },
    effectiveDate: '2020-07-23',
    version: '2020.1-v1'
  },
  {
    ruleId: 'COM-IN-ECOM-2020-CANCEL-001',
    code: 'IN_CANCELLATION_FAIRNESS',
    name: 'Fair Cancellation & Unilateral Cancellation Fee Restrictions',
    jurisdiction: 'IN',
    category: 'SOURCE_BASED_RULE',
    source: {
      authority: 'Ministry of Consumer Affairs, Government of India',
      instrument: 'Consumer Protection (E-Commerce) Rules, 2020',
      section: 'Rule 6(4)',
      gazetteNotification: 'G.S.R. 464(E), July 23, 2020',
      text: 'No seller shall impose cancellation charges on consumers seeking to cancel after confirming purchase unless similar charges are also borne by the seller if they cancel unilaterally.'
    },
    effectiveDate: '2020-07-23',
    version: '2020.1-v1'
  }
];

export const SAFETY_AND_BUSINESS_RULES = [
  {
    ruleId: 'SAFETY-REFUND-001',
    code: 'REFUND_DUPLICATE_BLOCK',
    name: 'Duplicate Refund Ledger & Idempotency Protection',
    category: 'SAFETY_RULE',
    description: 'Strictly blocks multiple refunds for the same orderId or transaction to prevent double disbursement.'
  },
  {
    ruleId: 'SAFETY-PAYMENT-001',
    code: 'PAYMENT_STATE_CONSISTENCY',
    name: 'Payment & Settlement State Verification',
    category: 'SAFETY_RULE',
    description: 'Ensures refunds are only issued when payment was genuinely captured and not already reversed.'
  },
  {
    ruleId: 'TECH-CARRIER-001',
    code: 'INSUFFICIENT_CARRIER_EVIDENCE',
    name: 'Carrier Logistics Data Verification',
    category: 'TECHNICAL_VALIDATION',
    description: 'Refuses to fabricate carrier, tracking number, or delay days when telemetry is unavailable.'
  },
  {
    ruleId: 'BUS-POLICY-REFUND-3.2',
    code: 'POL_REFUND_3_2_GATE',
    name: 'Relay Enterprise Logistics SLA Policy v3.2',
    category: 'BUSINESS_POLICY',
    description: 'Requires human approval for refunds >= ₹1,000 or customer tier < PLATINUM; grants 100% refund for SLA breach > 3 days.'
  },
  {
    ruleId: 'BUS-WARRANTY-001',
    code: 'WARRANTY_VALIDATION',
    name: 'Product Warranty & Extended Guarantee Verification',
    category: 'BUSINESS_POLICY',
    description: 'Requires verified active warranty dates; never assumes warranty coverage without record.'
  }
];

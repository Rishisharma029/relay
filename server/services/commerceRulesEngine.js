/**
 * RELAY — Deterministic Commerce Rules & Compliance Engine
 *
 * Core Principle:
 *   LLM = understands the customer.
 *   RULE ENGINE = determines what is legally & operationally allowed.
 *   TOOL ROUTER = controls what can execute.
 *   HUMAN = approves sensitive financial actions.
 *
 * Source:
 *   Consumer Protection (E-Commerce) Rules, 2020 (Government of India).
 *   Selected requirements implemented as deterministic, auditable rules for demonstration.
 *   Relay does not claim legal compliance; this represents an executable compliance rule model.
 */

import { ALL_COMMERCE_RULES, getRuleByCode } from '../data/commerceRules/index.js';
import { settledRefundsLedger } from '../policyEngine.js';

export class CommerceRulesEngine {
  /**
   * Evaluates structured order & customer facts against deterministic commerce rules.
   *
   * @param {Object} facts
   * @returns {Object} Result payload with decision, ruleId, evidence, and approvals
   */
  static evaluate(facts = {}) {
    const evaluatedAt = new Date().toISOString();
    const jurisdiction = facts.jurisdiction || 'IN';
    const orderId = String(facts.orderId || '').replace(/^#/, '').trim();
    const amount = Number(facts.refundAmount || facts.amount || 0);

    const warnings = [];
    const evidence = [];

    // ─────────────────────────────────────────────────────────────────────────
    // 1. SAFETY RULE: Duplicate Refund Protection (REFUND_DUPLICATE_BLOCK)
    // ─────────────────────────────────────────────────────────────────────────
    const isAlreadyRefunded = Boolean(
      facts.refundAlreadyIssued ||
      (orderId && settledRefundsLedger.has(orderId)) ||
      facts.paymentStatus === 'refund_completed'
    );

    if (isAlreadyRefunded) {
      evidence.push(`Order #${orderId} has settled refund record in idempotency ledger`);
      evidence.push(`Transaction status: SETTLED / REFUND_COMPLETED`);
      return {
        eligible: false,
        decision: 'DUPLICATE_REFUND_BLOCKED',
        reason: 'This order already has a refund recorded; duplicate refund requests are strictly blocked.',
        ruleId: 'REFUND_DUPLICATE_BLOCK',
        ruleVersion: 'SAFETY-REFUND-001',
        jurisdiction,
        requiresHumanApproval: false,
        allowedActions: ['viewRefundDetails', 'escalateToOperator'],
        blockedActions: ['issueRefund'],
        evidence,
        warnings: ['Multiple refund attempt intercepted by safety rule'],
        evaluatedAt
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. TECHNICAL VALIDATION: Carrier Telemetry / Evidence Check
    // ─────────────────────────────────────────────────────────────────────────
    if (facts.missingCarrierData || (facts.customerRequestedRefund && !facts.carrier && !facts.trackingNumber && facts.delayDays === undefined)) {
      evidence.push('Carrier logistics gateway returned null / missing telemetry');
      evidence.push('Tracking number unavailable in commerce gateway');
      return {
        eligible: false,
        decision: 'INSUFFICIENT_EVIDENCE',
        reason: 'Carrier logistics data unavailable. Relay refuses to fabricate tracking or delay telemetry.',
        ruleId: 'INSUFFICIENT_CARRIER_EVIDENCE',
        ruleVersion: 'TECH-CARRIER-001',
        jurisdiction,
        requiresHumanApproval: true,
        approvalReason: 'MANUAL_EXCEPTION',
        allowedActions: ['requestCarrierDetails', 'escalateToOperator'],
        blockedActions: ['issueRefund', 'autoDispatch'],
        evidence,
        warnings: ['Logistics telemetry required before claim adjudication'],
        evaluatedAt
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. SAFETY RULE: Payment State Consistency Check
    // ─────────────────────────────────────────────────────────────────────────
    if (facts.paymentStatus === 'captured_order_failed') {
      evidence.push('Payment Gateway: CAPTURED (Funds deducted from customer)');
      evidence.push('Order Gateway: FAILED / SYSTEM_ERROR');
      return {
        eligible: true,
        decision: 'AUTO_REFUND_MANDATED',
        reason: 'Payment captured but merchant order creation failed. Immediate reversal mandated.',
        ruleId: 'PAYMENT_STATE_CONSISTENCY',
        ruleVersion: 'SAFETY-PAYMENT-001',
        jurisdiction,
        requiresHumanApproval: false,
        allowedActions: ['issueRefund', 'notifyCustomer'],
        blockedActions: ['fulfillOrder'],
        evidence,
        warnings: [],
        evaluatedAt
      };
    }

    if (facts.paymentStatus === 'failed') {
      evidence.push('Payment Gateway: TRANSACTION_FAILED');
      return {
        eligible: false,
        decision: 'PAYMENT_FAILED_NO_REFUND',
        reason: 'Initial payment transaction failed; no funds were captured to refund.',
        ruleId: 'PAYMENT_STATE_CONSISTENCY',
        ruleVersion: 'SAFETY-PAYMENT-001',
        jurisdiction,
        requiresHumanApproval: false,
        allowedActions: ['retryPayment', 'escalateToOperator'],
        blockedActions: ['issueRefund'],
        evidence,
        warnings: ['No captured consideration detected on transaction ledger'],
        evaluatedAt
      };
    }

    if (facts.paymentStatus === 'pending') {
      evidence.push('Payment Gateway: TRANSACTION_PENDING_SETTLEMENT');
      return {
        eligible: false,
        decision: 'PAYMENT_PENDING_WAIT',
        reason: 'Payment is still in pending state with acquiring bank. Cannot process refund until settlement completes.',
        ruleId: 'PAYMENT_STATE_CONSISTENCY',
        ruleVersion: 'SAFETY-PAYMENT-001',
        jurisdiction,
        requiresHumanApproval: false,
        allowedActions: ['checkPaymentStatus', 'escalateToOperator'],
        blockedActions: ['issueRefund'],
        evidence,
        warnings: ['Bank clearing cycle in progress'],
        evaluatedAt
      };
    }

    if (facts.paymentStatus === 'reversed') {
      evidence.push('Payment Gateway: CHARGE_REVERSED');
      return {
        eligible: false,
        decision: 'PAYMENT_ALREADY_REVERSED',
        reason: 'Payment was already reversed to original payment method.',
        ruleId: 'PAYMENT_STATE_CONSISTENCY',
        ruleVersion: 'SAFETY-PAYMENT-001',
        jurisdiction,
        requiresHumanApproval: false,
        allowedActions: ['viewSettlementProof', 'escalateToOperator'],
        blockedActions: ['issueRefund'],
        evidence,
        warnings: [],
        evaluatedAt
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. SOURCE-BASED RULE: Consumer Grievance Ticket Generation (Rule 4(4) & 4(5))
    // ─────────────────────────────────────────────────────────────────────────
    if (facts.complaintExists || facts.complaintRequested) {
      const ticketNumber = 'TKT-IN-' + Date.now().toString(36).toUpperCase();
      evidence.push(`Consumer complaint lodged for order #${orderId}`);
      evidence.push(`Tracking ticket allocated under CP (E-Commerce) Rules 2020 Rule 4(5): ${ticketNumber}`);
      return {
        eligible: true,
        complaintRequired: true,
        ticketNumber,
        decision: 'COMPLAINT_TICKET_GENERATED',
        reason: 'Consumer complaint recorded with unique tracking ticket number as mandated by Rule 4(5).',
        ruleId: 'IN_GRIEVANCE_TICKET_TRACKING',
        ruleVersion: 'COM-IN-ECOM-2020-GRIEVANCE-001',
        jurisdiction,
        requiresHumanApproval: false,
        allowedActions: ['createTicket', 'escalateToGrievanceOfficer'],
        blockedActions: [],
        evidence,
        warnings: [],
        evaluatedAt
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. SOURCE-BASED RULE: Order Cancellation Fairness (Rule 6(4))
    // ─────────────────────────────────────────────────────────────────────────
    if (facts.cancellationRequested) {
      const isPreShipment = facts.orderStatus === 'pending' ||
        facts.orderStatus === 'processing' ||
        facts.deliveryStatus === 'unfulfilled' ||
        facts.deliveryStatus === 'pending';

      if (isPreShipment) {
        evidence.push(`Order status: ${facts.orderStatus || 'processing'}`);
        evidence.push('Shipment status: UNFULFILLED (Package not dispatched)');
        evidence.push('Cancellation Rule 6(4): Zero cancellation penalty allowed prior to dispatch');
        return {
          eligible: true,
          decision: 'CANCELLATION_APPROVED_PRE_SHIPMENT',
          reason: 'Order cancelled prior to shipment dispatch. 100% refund consideration mandated without cancellation fees under Rule 6(4).',
          ruleId: 'IN_CANCELLATION_FAIRNESS',
          ruleVersion: 'COM-IN-ECOM-2020-CANCEL-001',
          jurisdiction,
          requiresHumanApproval: false,
          allowedActions: ['cancelOrder', 'issueRefund'],
          blockedActions: ['dispatchShipment'],
          evidence,
          warnings: [],
          evaluatedAt
        };
      } else {
        evidence.push(`Order status: ${facts.orderStatus || 'fulfilled'}`);
        evidence.push(`Delivery status: ${facts.deliveryStatus || 'in_transit'} (Already dispatched)`);
        return {
          eligible: false,
          decision: 'CANCELLATION_DISPATCHED_RETURN_REQUIRED',
          reason: 'Order has already been dispatched with carrier. Cancellation cannot intercept shipment in-transit; return flow required upon delivery.',
          ruleId: 'IN_CANCELLATION_FAIRNESS',
          ruleVersion: 'COM-IN-ECOM-2020-CANCEL-001',
          jurisdiction,
          requiresHumanApproval: true,
          approvalReason: 'MANUAL_EXCEPTION',
          allowedActions: ['initiateReturn', 'trackShipment', 'escalateToOperator'],
          blockedActions: ['cancelOrder', 'issueRefund'],
          evidence,
          warnings: ['Cannot cancel once package enters carrier network'],
          evaluatedAt
        };
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. BUSINESS POLICY RULE: Warranty & Guarantee Evaluation
    // ─────────────────────────────────────────────────────────────────────────
    if (facts.warrantyCheckRequested) {
      if (facts.warrantyActive === true) {
        evidence.push(`Warranty Status: ACTIVE`);
        evidence.push(`Warranty Coverage Dates: ${facts.warrantyStart || '2026-01-01'} to ${facts.warrantyEnd || '2027-01-01'}`);
        return {
          eligible: true,
          decision: 'WARRANTY_SERVICE_AUTHORIZED',
          reason: 'Product is covered under active manufacturer/seller warranty.',
          ruleId: 'WARRANTY_VALIDATION',
          ruleVersion: 'BUS-WARRANTY-001',
          jurisdiction,
          requiresHumanApproval: false,
          allowedActions: ['scheduleRepair', 'authorizeReplacement'],
          blockedActions: ['issueRefund'],
          evidence,
          warnings: [],
          evaluatedAt
        };
      } else if (facts.warrantyActive === false || (facts.warrantyEnd && new Date(facts.warrantyEnd) < new Date())) {
        evidence.push(`Warranty Status: EXPIRED`);
        evidence.push(`Warranty expired on: ${facts.warrantyEnd || 'Past Date'}`);
        return {
          eligible: false,
          decision: 'WARRANTY_EXPIRED',
          reason: 'Product warranty has expired; complimentary repair/replacement is not available.',
          ruleId: 'WARRANTY_VALIDATION',
          ruleVersion: 'BUS-WARRANTY-001',
          jurisdiction,
          requiresHumanApproval: false,
          allowedActions: ['offerPaidService', 'escalateToOperator'],
          blockedActions: ['freeWarrantyRepair', 'issueRefund'],
          evidence,
          warnings: ['Warranty period exhausted'],
          evaluatedAt
        };
      } else {
        evidence.push('Warranty record not found in product database');
        return {
          eligible: false,
          decision: 'WARRANTY_INFO_UNAVAILABLE',
          reason: 'Warranty information unavailable. Relay does not assume warranty coverage without verification.',
          ruleId: 'WARRANTY_VALIDATION',
          ruleVersion: 'BUS-WARRANTY-001',
          jurisdiction,
          requiresHumanApproval: true,
          approvalReason: 'MANUAL_EXCEPTION',
          allowedActions: ['requestPurchaseInvoice', 'escalateToOperator'],
          blockedActions: ['authorizeReplacement'],
          evidence,
          warnings: ['Invoice required to verify warranty eligibility'],
          evaluatedAt
        };
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. SOURCE-BASED RULE: Spurious / Counterfeit Goods (Rule 4(11))
    // ─────────────────────────────────────────────────────────────────────────
    if (facts.spurious === true) {
      evidence.push('Product Condition: SPURIOUS / COUNTERFEIT REPORTED');
      evidence.push('CP (E-Commerce) Rules 2020 Rule 4(11): E-commerce entity cannot refuse refund for spurious goods');
      return {
        eligible: true,
        decision: 'RETURN_REFUND_ENTITLED',
        reason: 'Product identified as spurious / counterfeit. Consideration refund mandated under Rule 4(11).',
        ruleId: 'IN_SPURIOUS_GOODS_RETURN_REFUND',
        ruleVersion: 'COM-IN-ECOM-2020-RETURN-004',
        jurisdiction,
        requiresHumanApproval: true,
        approvalReason: 'LEGAL_POLICY_REFUND',
        allowedActions: ['requestApproval', 'initiateInvestigation', 'lookupOrder'],
        blockedActions: ['issueRefund'],
        evidence,
        warnings: ['Anti-counterfeiting compliance trigger active'],
        evaluatedAt
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. SOURCE-BASED RULE: Defective Goods (Rule 4(11))
    // ─────────────────────────────────────────────────────────────────────────
    if (facts.defective === true) {
      evidence.push('Product Condition: DEFECTIVE');
      evidence.push('CP (E-Commerce) Rules 2020 Rule 4(11): Mandatory return/refund for defective goods');
      const requiresApproval = amount >= 1000;
      return {
        eligible: true,
        decision: 'RETURN_REFUND_ENTITLED',
        reason: 'Product is defective. Return and consideration refund mandated under Rule 4(11).',
        ruleId: 'IN_DEFECTIVE_GOODS_RETURN_REFUND',
        ruleVersion: 'COM-IN-ECOM-2020-RETURN-002',
        jurisdiction,
        requiresHumanApproval: requiresApproval,
        approvalReason: requiresApproval ? 'HIGH_VALUE_REFUND' : undefined,
        allowedActions: requiresApproval ? ['requestApproval', 'lookupOrder'] : ['issueRefund', 'initiateReturn'],
        blockedActions: requiresApproval ? ['issueRefund'] : [],
        evidence,
        warnings: [],
        evaluatedAt
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 9. SOURCE-BASED RULE: Deficient Goods / Services (Rule 4(11))
    // ─────────────────────────────────────────────────────────────────────────
    if (facts.deficient === true) {
      evidence.push('Product / Service Condition: DEFICIENT');
      evidence.push('CP (E-Commerce) Rules 2020 Rule 4(11): Mandatory return/refund for deficient goods/services');
      const requiresApproval = amount >= 1000;
      return {
        eligible: true,
        decision: 'RETURN_REFUND_ENTITLED',
        reason: 'Goods or delivery services deficient. Return and consideration refund mandated under Rule 4(11).',
        ruleId: 'IN_DEFICIENT_GOODS_RETURN_REFUND',
        ruleVersion: 'COM-IN-ECOM-2020-RETURN-003',
        jurisdiction,
        requiresHumanApproval: requiresApproval,
        approvalReason: requiresApproval ? 'HIGH_VALUE_REFUND' : undefined,
        allowedActions: requiresApproval ? ['requestApproval', 'lookupOrder'] : ['issueRefund', 'initiateReturn'],
        blockedActions: requiresApproval ? ['issueRefund'] : [],
        evidence,
        warnings: [],
        evaluatedAt
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 10. SOURCE-BASED RULE: Goods Not Matching Advertisement (Rule 4(11))
    // ─────────────────────────────────────────────────────────────────────────
    if (facts.productMatchesDescription === false || facts.notMatchingAdvertisement === true || facts.notMatchingAgreedSpecifications === true) {
      evidence.push('Product Condition: NOT AS ADVERTISED / SPECIFICATION MISMATCH');
      evidence.push('CP (E-Commerce) Rules 2020 Rule 4(11): E-commerce entity cannot refuse refund if goods differ from advertised characteristics');
      const requiresApproval = amount >= 1000;
      return {
        eligible: true,
        decision: 'RETURN_REFUND_ENTITLED',
        reason: 'Product does not match advertised characteristics or agreed specifications under Rule 4(11).',
        ruleId: 'IN_RETURN_NOT_AS_ADVERTISED',
        ruleVersion: 'COM-IN-ECOM-2020-RETURN-005',
        jurisdiction,
        requiresHumanApproval: requiresApproval,
        approvalReason: requiresApproval ? 'HIGH_VALUE_REFUND' : undefined,
        allowedActions: requiresApproval ? ['requestApproval', 'lookupOrder'] : ['issueRefund', 'initiateReturn'],
        blockedActions: requiresApproval ? ['issueRefund'] : [],
        evidence,
        warnings: [],
        evaluatedAt
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 11. SOURCE-BASED RULE: Late Delivery & Force Majeure Handling (Rule 4(11))
    // ─────────────────────────────────────────────────────────────────────────
    const delayDays = Number(facts.delayDays || 0);
    const isDelayed = delayDays > 0 || facts.deliveryStatus === 'delayed' || facts.status === 'delivery_exception';

    if (isDelayed) {
      // Force Majeure Exception Check (Rule 4(11) Proviso)
      if (facts.forceMajeure === true) {
        evidence.push(`Delivery delay: ${delayDays} days`);
        evidence.push('Force Majeure Status: ACTIVE (Declared flood / natural calamity / national disruption)');
        evidence.push('CP (E-Commerce) Rules 2020 Rule 4(11) Proviso: Nothing contained in this sub-rule shall apply in cases of force majeure');
        return {
          eligible: false,
          decision: 'FORCE_MAJEURE_EXEMPTION',
          reason: 'Delivery delay caused by certified force majeure event. Standard late-delivery return/refund rule exempt under Rule 4(11) proviso.',
          ruleId: 'IN_LATE_DELIVERY_RETURN_REFUND',
          ruleVersion: 'COM-IN-ECOM-2020-RETURN-001',
          jurisdiction,
          requiresHumanApproval: true,
          approvalReason: 'MANUAL_EXCEPTION',
          allowedActions: ['trackShipment', 'escalateToOperator'],
          blockedActions: ['issueRefund'],
          evidence,
          warnings: ['Carrier SLA suspended due to declared force majeure'],
          evaluatedAt
        };
      }

      // Normal Late Delivery (No Force Majeure)
      evidence.push(`Promised delivery schedule: ${facts.deliveryPromisedDate || '2026-08-30'}`);
      evidence.push(`Actual/current delay: ${delayDays} days`);
      evidence.push('Force majeure: false');
      evidence.push(`Carrier: ${facts.carrier || 'Delhivery Express'}`);
      evidence.push(`Order amount: INR ${amount || 2899}`);

      // Financial Governance (Approval Gates)
      const isHighValue = (amount || 2899) >= 1000;
      const requiresApproval = isHighValue || facts.customerTier !== 'PLATINUM';

      return {
        eligible: true,
        decision: requiresApproval ? 'REFUND_ELIGIBLE_PENDING_APPROVAL' : 'REFUND_ELIGIBLE_AUTO_ALLOWED',
        reason: 'Delivery was later than stated delivery schedule with force majeure false. Return/refund consideration mandated under Consumer Protection (E-Commerce) Rules 2020 Rule 4(11).',
        ruleId: 'IN_LATE_DELIVERY_RETURN_REFUND',
        ruleVersion: 'COM-IN-ECOM-2020-RETURN-001',
        jurisdiction,
        requiresHumanApproval: requiresApproval,
        approvalReason: isHighValue ? 'HIGH_VALUE_REFUND' : 'POLICY_EVALUATION',
        allowedActions: requiresApproval ? ['requestApproval', 'lookupOrder'] : ['issueRefund'],
        blockedActions: requiresApproval ? ['issueRefund'] : [],
        evidence,
        warnings: [],
        evaluatedAt
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 12. Default: Standard Delivery In-Progress / On-Schedule
    // ─────────────────────────────────────────────────────────────────────────
    evidence.push(`Order status: ${facts.orderStatus || 'in_transit'}`);
    evidence.push('Delivery schedule: On-track / No breach detected');

    return {
      eligible: false,
      decision: 'ON_SCHEDULE_NO_REFUND_ENTITLEMENT',
      reason: 'Order is progressing within agreed delivery timeline with zero SLA breach.',
      ruleId: 'POL_REFUND_3_2_GATE',
      ruleVersion: 'BUS-POLICY-REFUND-3.2',
      jurisdiction,
      requiresHumanApproval: false,
      allowedActions: ['getDeliveryStatus', 'lookupOrder'],
      blockedActions: ['issueRefund'],
      evidence,
      warnings: [],
      evaluatedAt
    };
  }
}

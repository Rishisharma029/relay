import { CommerceRulesEngine } from '../server/services/commerceRulesEngine.js';
import { registerSettledRefund, clearSettledRefunds } from '../server/policyEngine.js';

console.log('=== RUNNING COMMERCE RULES ENGINE 14-POINT TEST SUITE ===\n');

let passed = 0;
let failed = 0;

function assert(condition, name, details = '') {
  if (condition) {
    console.log(`✅ PASS: ${name}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${name} -> ${details}`);
    failed++;
  }
}

// Clear any state
clearSettledRefunds();

// 1. Late delivery, no force majeure
const res1 = CommerceRulesEngine.evaluate({
  orderId: '72143',
  delayDays: 4,
  forceMajeure: false,
  carrier: 'Delhivery Express',
  trackingNumber: 'DL-7214301',
  refundAmount: 2899,
  jurisdiction: 'IN'
});
assert(
  res1.eligible === true &&
  res1.ruleId === 'IN_LATE_DELIVERY_RETURN_REFUND' &&
  res1.requiresHumanApproval === true &&
  res1.blockedActions.includes('issueRefund'),
  '1. Late delivery (no force majeure) -> Eligible, Human Approval Required',
  JSON.stringify(res1)
);

// 2. Late delivery, force majeure = true
const res2 = CommerceRulesEngine.evaluate({
  orderId: '72143',
  delayDays: 4,
  forceMajeure: true,
  carrier: 'Delhivery Express',
  trackingNumber: 'DL-7214301',
  refundAmount: 2899,
  jurisdiction: 'IN'
});
assert(
  res2.eligible === false &&
  res2.decision === 'FORCE_MAJEURE_EXEMPTION' &&
  res2.blockedActions.includes('issueRefund'),
  '2. Late delivery (with force majeure) -> Exemption applied, refund blocked',
  JSON.stringify(res2)
);

// 3. Defective product
const res3 = CommerceRulesEngine.evaluate({
  orderId: '72143',
  defective: true,
  refundAmount: 2899,
  jurisdiction: 'IN'
});
assert(
  res3.eligible === true &&
  res3.ruleId === 'IN_DEFECTIVE_GOODS_RETURN_REFUND' &&
  res3.requiresHumanApproval === true,
  '3. Defective product -> Evaluated under Rule 4(11)',
  JSON.stringify(res3)
);

// 4. Product not as advertised
const res4 = CommerceRulesEngine.evaluate({
  orderId: '72143',
  productMatchesDescription: false,
  refundAmount: 2899,
  jurisdiction: 'IN'
});
assert(
  res4.eligible === true &&
  res4.ruleId === 'IN_RETURN_NOT_AS_ADVERTISED' &&
  res4.requiresHumanApproval === true,
  '4. Product not as advertised -> Evaluated under Rule 4(11)',
  JSON.stringify(res4)
);

// 5. Already refunded
registerSettledRefund('72143');
const res5 = CommerceRulesEngine.evaluate({
  orderId: '72143',
  customerRequestedRefund: true,
  delayDays: 4,
  carrier: 'Delhivery Express',
  trackingNumber: 'DL-7214301'
});
assert(
  res5.eligible === false &&
  res5.decision === 'DUPLICATE_REFUND_BLOCKED' &&
  res5.ruleId === 'REFUND_DUPLICATE_BLOCK' &&
  res5.blockedActions.includes('issueRefund'),
  '5. Already refunded -> Blocked by REFUND_DUPLICATE_BLOCK',
  JSON.stringify(res5)
);
clearSettledRefunds();

// 6. Payment captured but order failed
const res6 = CommerceRulesEngine.evaluate({
  orderId: '72143',
  paymentStatus: 'captured_order_failed'
});
assert(
  res6.eligible === true &&
  res6.decision === 'AUTO_REFUND_MANDATED' &&
  res6.ruleId === 'PAYMENT_STATE_CONSISTENCY',
  '6. Payment captured + order failed -> Auto-refund mandated',
  JSON.stringify(res6)
);

// 7. Complaint ticket generation
const res7 = CommerceRulesEngine.evaluate({
  orderId: '72143',
  complaintExists: true
});
assert(
  res7.complaintRequired === true &&
  typeof res7.ticketNumber === 'string' &&
  res7.ticketNumber.startsWith('TKT-IN-') &&
  res7.ruleId === 'IN_GRIEVANCE_TICKET_TRACKING',
  '7. Complaint lodged -> Tracking ticket generated under Rule 4(5)',
  JSON.stringify(res7)
);

// 8. Missing carrier information
const res8 = CommerceRulesEngine.evaluate({
  orderId: '72143',
  missingCarrierData: true,
  customerRequestedRefund: true
});
assert(
  res8.eligible === false &&
  res8.decision === 'INSUFFICIENT_EVIDENCE' &&
  res8.ruleId === 'INSUFFICIENT_CARRIER_EVIDENCE',
  '8. Missing carrier information -> Refuses to fabricate, insufficient evidence',
  JSON.stringify(res8)
);

// 9. Cancellation before shipment
const res9 = CommerceRulesEngine.evaluate({
  orderId: '72143',
  cancellationRequested: true,
  orderStatus: 'processing',
  deliveryStatus: 'unfulfilled'
});
assert(
  res9.eligible === true &&
  res9.decision === 'CANCELLATION_APPROVED_PRE_SHIPMENT' &&
  res9.allowedActions.includes('cancelOrder'),
  '9. Cancellation before shipment -> Cancellation approved under Rule 6(4)',
  JSON.stringify(res9)
);

// 10. Cancellation after fulfillment
const res10 = CommerceRulesEngine.evaluate({
  orderId: '72143',
  cancellationRequested: true,
  orderStatus: 'shipped',
  deliveryStatus: 'in_transit'
});
assert(
  res10.eligible === false &&
  res10.decision === 'CANCELLATION_DISPATCHED_RETURN_REQUIRED' &&
  res10.blockedActions.includes('cancelOrder'),
  '10. Cancellation after fulfillment -> Intercept blocked, return required',
  JSON.stringify(res10)
);

// 11. Warranty active
const res11 = CommerceRulesEngine.evaluate({
  orderId: '72143',
  warrantyCheckRequested: true,
  warrantyActive: true,
  warrantyStart: '2026-01-01',
  warrantyEnd: '2027-01-01'
});
assert(
  res11.eligible === true &&
  res11.decision === 'WARRANTY_SERVICE_AUTHORIZED' &&
  res11.allowedActions.includes('scheduleRepair'),
  '11. Warranty active -> Service authorized',
  JSON.stringify(res11)
);

// 12. Warranty expired
const res12 = CommerceRulesEngine.evaluate({
  orderId: '72143',
  warrantyCheckRequested: true,
  warrantyActive: false,
  warrantyEnd: '2025-01-01'
});
assert(
  res12.eligible === false &&
  res12.decision === 'WARRANTY_EXPIRED' &&
  res12.blockedActions.includes('freeWarrantyRepair'),
  '12. Warranty expired -> Free service blocked, paid service offered',
  JSON.stringify(res12)
);

// 13. ₹2,899 refund (High Value) -> Human approval required
const res13 = CommerceRulesEngine.evaluate({
  orderId: '72143',
  delayDays: 4,
  forceMajeure: false,
  carrier: 'Delhivery Express',
  trackingNumber: 'DL-7214301',
  refundAmount: 2899,
  customerTier: 'PLATINUM'
});
assert(
  res13.requiresHumanApproval === true &&
  res13.approvalReason === 'HIGH_VALUE_REFUND',
  '13. ₹2,899 refund -> Human approval required (High-value threshold)',
  JSON.stringify(res13)
);

// 14. Small refund under approval threshold (< ₹1000, Platinum VIP)
const res14 = CommerceRulesEngine.evaluate({
  orderId: '72143',
  delayDays: 4,
  forceMajeure: false,
  carrier: 'Delhivery Express',
  trackingNumber: 'DL-7214301',
  refundAmount: 499,
  customerTier: 'PLATINUM'
});
assert(
  res14.requiresHumanApproval === false &&
  res14.allowedActions.includes('issueRefund'),
  '14. Small refund under threshold (< ₹1000 Platinum) -> Auto allowed',
  JSON.stringify(res14)
);

console.log(`\n======================================================`);
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`======================================================\n`);

if (failed > 0) {
  process.exit(1);
}

/**
 * RELAY — Commerce Rules Index & Registry
 */

import { INDIA_COMMERCE_RULES, SAFETY_AND_BUSINESS_RULES } from './indiaRules.js';

export const ALL_COMMERCE_RULES = [
  ...INDIA_COMMERCE_RULES,
  ...SAFETY_AND_BUSINESS_RULES
];

export function getRuleByCode(code) {
  return ALL_COMMERCE_RULES.find(r => r.code === code || r.ruleId === code);
}

export function getRulesByJurisdiction(jurisdiction = 'IN') {
  return ALL_COMMERCE_RULES.filter(r => !r.jurisdiction || r.jurisdiction === jurisdiction);
}

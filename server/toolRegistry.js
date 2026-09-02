/**
 * RELAY — Controlled Tool Registry
 *
 * Defines the authoritative set of approved tools, their input schemas,
 * execution policies, risk tiers, and OpenAI function calling definitions.
 *
 * The AI MUST NEVER call arbitrary backend functions directly.
 * It must request execution exclusively through the approved Tool Registry.
 */

import { lookupCustomer } from './tools/customer.js'
import { lookupOrder, getDeliveryStatus, extractOrderId } from './tools/orders.js'
import { evaluateRefundPolicy, issueRefund } from './tools/refunds.js'
import { createTicket } from './tools/tickets.js'
import { escalateCase } from './tools/escalation.js'

export const TOOL_REGISTRY = {
  lookupCustomer: {
    name: 'lookupCustomer',
    description: 'Lookup customer identity, account tier, language preference, dispute rate, and lifetime orders.',
    riskLevel: 'LOW',
    requiresApproval: false,
    handler: lookupCustomer,
    parameters: {
      type: 'object',
      properties: {
        customerId: {
          type: 'string',
          description: 'The unique customer identifier, e.g. CUST-1042',
        },
        orderId: {
          type: 'string',
          description: 'Optional associated order ID to resolve customer profile',
        },
      },
      required: [],
    },
    validate: (params = {}) => {
      return { valid: true }
    },
  },

  lookupOrder: {
    name: 'lookupOrder',
    description: 'Lookup e-commerce order details, logistics status, carrier tracking, items, and delay exceptions.',
    riskLevel: 'LOW',
    requiresApproval: false,
    handler: lookupOrder,
    parameters: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'The 5-digit order identifier, e.g. 72143 or 84921',
        },
      },
      required: ['orderId'],
    },
    validate: (params = {}) => {
      const id = extractOrderId(params)
      if (!id) {
        return { valid: false, error: 'Missing required parameter: orderId' }
      }
      return { valid: true }
    },
  },

  getDeliveryStatus: {
    name: 'getDeliveryStatus',
    description: 'Query real-time delivery checkpoints, SLA status, carrier tracking, and courier exception codes.',
    riskLevel: 'LOW',
    requiresApproval: false,
    handler: getDeliveryStatus,
    parameters: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'The 5-digit order identifier',
        },
      },
      required: ['orderId'],
    },
    validate: (params = {}) => {
      const id = extractOrderId(params)
      if (!id) {
        return { valid: false, error: 'Missing required parameter: orderId' }
      }
      return { valid: true }
    },
  },

  createTicket: {
    name: 'createTicket',
    description: 'Create a formal CRM dispute or escalation ticket assigned to the appropriate desk.',
    riskLevel: 'LOW',
    requiresApproval: false,
    handler: (params) => createTicket(params?.caseId || 'RLY-72143', params?.summary || 'Customer escalation', params?.priority || 'HIGH'),
    parameters: {
      type: 'object',
      properties: {
        caseId: {
          type: 'string',
          description: 'The unique case identifier, e.g. RLY-72143',
        },
        summary: {
          type: 'string',
          description: 'Concise summary of the dispute or carrier issue',
        },
        priority: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
          description: 'Ticket urgency level based on SLA delay',
        },
      },
      required: ['caseId', 'summary'],
    },
    validate: (params = {}) => {
      if (!params || typeof params !== 'object') {
        return { valid: false, error: 'Parameters must be an object' }
      }
      return { valid: true }
    },
  },

  evaluateRefundPolicy: {
    name: 'evaluateRefundPolicy',
    description: 'Evaluate customer refund eligibility against enterprise SLA policies and compute risk tier.',
    riskLevel: 'LOW',
    requiresApproval: false,
    handler: evaluateRefundPolicy,
    parameters: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'The order identifier being evaluated for refund eligibility',
        },
        amount: {
          type: 'number',
          description: 'Optional refund amount requested by customer',
        },
      },
      required: ['orderId'],
    },
    validate: (params = {}) => {
      const id = extractOrderId(params)
      if (!id) {
        return { valid: false, error: 'Missing required parameter: orderId' }
      }
      return { valid: true }
    },
  },

  issueRefund: {
    name: 'issueRefund',
    description: 'Execute an electronic refund payout for a qualified SLA breach.',
    riskLevel: 'HIGH',
    requiresApproval: true,
    handler: issueRefund,
    parameters: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'The order identifier to be refunded',
        },
        amount: {
          type: 'number',
          description: 'The exact amount in INR to refund, bounded by policy',
        },
        reason: {
          type: 'string',
          description: 'Audit explanation justifying the refund under policy',
        },
      },
      required: ['orderId'],
    },
    validate: (params = {}) => {
      const id = extractOrderId(params)
      if (!id) {
        return { valid: false, error: 'Missing required parameter: orderId' }
      }
      return { valid: true }
    },
  },

  escalateCase: {
    name: 'escalateCase',
    description: 'Trigger immediate human operator duplex takeover when tool execution fails or user requests human.',
    riskLevel: 'LOW',
    requiresApproval: false,
    handler: (params) => escalateCase(params?.reason || 'Operator takeover requested', params?.priority || 'URGENT'),
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'The technical or customer rationale for human handoff',
        },
        priority: {
          type: 'string',
          enum: ['STANDARD', 'URGENT', 'CRITICAL'],
          description: 'Handoff queue priority level',
        },
      },
      required: ['reason'],
    },
    validate: (params = {}) => {
      return { valid: true }
    },
  },
}

export function isToolApproved(toolName) {
  return Boolean(TOOL_REGISTRY[toolName])
}

export function getToolDescriptor(toolName) {
  return TOOL_REGISTRY[toolName] || null
}

export function getApprovedToolDefinitions() {
  return Object.values(TOOL_REGISTRY).map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }))
}

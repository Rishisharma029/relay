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
import { lookupOrder, getDeliveryStatus } from './tools/orders.js'
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
          description: 'The unique customer identifier, e.g. CUST-AARAV-01',
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
          description: 'The 5-digit order identifier, e.g. 84921',
        },
      },
      required: ['orderId'],
    },
    validate: (params = {}) => {
      if (!params.orderId && typeof params !== 'string') {
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
      if (!params.orderId && typeof params !== 'string') {
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
    handler: (params) => createTicket(params.caseId, params.summary, params.priority),
    parameters: {
      type: 'object',
      properties: {
        caseId: {
          type: 'string',
          description: 'The active case identifier, e.g. RLY-1042',
        },
        summary: {
          type: 'string',
          description: 'Concise summary of the dispute or issue',
        },
        priority: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
          description: 'Ticket severity priority level',
        },
      },
      required: ['caseId', 'summary'],
    },
    validate: (params = {}) => {
      if (!params.summary && !params.caseId) {
        return { valid: false, error: 'Missing required parameters for createTicket' }
      }
      return { valid: true }
    },
  },

  evaluateRefundPolicy: {
    name: 'evaluateRefundPolicy',
    description: 'Evaluate if an order is eligible for refund under current policy rules and whether human operator approval is required.',
    riskLevel: 'MEDIUM',
    requiresApproval: false,
    handler: (params) => evaluateRefundPolicy(params.orderId, params.amount),
    parameters: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'The 5-digit order identifier',
        },
        amount: {
          type: 'number',
          description: 'The refund amount in INR to evaluate',
        },
      },
      required: ['orderId'],
    },
    validate: (params = {}) => {
      if (!params.orderId) {
        return { valid: false, error: 'Missing required parameter: orderId' }
      }
      return { valid: true }
    },
  },

  issueRefund: {
    name: 'issueRefund',
    description: 'Issue an atomic instant UPI refund for an order. High financial risk action requiring verified operator approval.',
    riskLevel: 'HIGH',
    requiresApproval: true,
    handler: (params) => issueRefund(params.orderId, params.amount),
    parameters: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'The 5-digit order identifier',
        },
        amount: {
          type: 'number',
          description: 'The refund amount in INR',
        },
      },
      required: ['orderId', 'amount'],
    },
    validate: (params = {}) => {
      if (!params.orderId || !params.amount) {
        return { valid: false, error: 'Missing required parameters: orderId and amount' }
      }
      return { valid: true }
    },
  },

  escalateCase: {
    name: 'escalateCase',
    description: 'Escalate the active case and dispatch to human supervisor workstation with full context snapshot.',
    riskLevel: 'MEDIUM',
    requiresApproval: false,
    handler: (params) => escalateCase(params.caseId, params.reason, params.targetDesk),
    parameters: {
      type: 'object',
      properties: {
        caseId: {
          type: 'string',
          description: 'The active case identifier, e.g. RLY-1042',
        },
        reason: {
          type: 'string',
          description: 'Reason for human operator escalation',
        },
        targetDesk: {
          type: 'string',
          description: 'Target supervisor queue or desk',
        },
      },
      required: ['caseId'],
    },
    validate: (params = {}) => {
      return { valid: true }
    },
  },
}

/**
 * Returns list of approved tool definitions formatted for LLM Function Calling.
 */
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

/**
 * Check if a tool name is approved in the registry.
 */
export function isToolApproved(toolName) {
  return Boolean(TOOL_REGISTRY[toolName])
}

/**
 * Get metadata and schema for an approved tool.
 */
export function getToolDescriptor(toolName) {
  return TOOL_REGISTRY[toolName] || null
}

/**
 * RELAY — Multi-Operator Governance & Server-Side RBAC Service
 *
 * Roles & Permission Matrix:
 *   AGENT:
 *     ✓ view case
 *     ✓ talk to customer
 *     ✓ request approval
 *
 *   SUPERVISOR:
 *     ✓ approve refund
 *     ✓ takeover call
 *     ✓ reassign case
 *
 *   ADMIN:
 *     ✓ policy configuration
 *     ✓ system configuration
 *     ✓ audit access
 *
 * Server-side enforcement only.
 */

import { db } from './db/database.js'

export const ROLES = {
  AGENT: 'AGENT',
  SUPERVISOR: 'SUPERVISOR',
  ADMIN: 'ADMIN',
}

export const PERMISSIONS = {
  VIEW_CASE: 'VIEW_CASE',
  TALK_TO_CUSTOMER: 'TALK_TO_CUSTOMER',
  REQUEST_APPROVAL: 'REQUEST_APPROVAL',
  APPROVE_REFUND: 'APPROVE_REFUND',
  TAKEOVER_CALL: 'TAKEOVER_CALL',
  REASSIGN_CASE: 'REASSIGN_CASE',
  POLICY_CONFIGURATION: 'POLICY_CONFIGURATION',
  SYSTEM_CONFIGURATION: 'SYSTEM_CONFIGURATION',
  AUDIT_ACCESS: 'AUDIT_ACCESS',
}

const ROLE_PERMISSIONS = {
  AGENT: [
    PERMISSIONS.VIEW_CASE,
    PERMISSIONS.TALK_TO_CUSTOMER,
    PERMISSIONS.REQUEST_APPROVAL,
  ],
  SUPERVISOR: [
    PERMISSIONS.VIEW_CASE,
    PERMISSIONS.TALK_TO_CUSTOMER,
    PERMISSIONS.REQUEST_APPROVAL,
    PERMISSIONS.APPROVE_REFUND,
    PERMISSIONS.TAKEOVER_CALL,
    PERMISSIONS.REASSIGN_CASE,
  ],
  ADMIN: [
    PERMISSIONS.VIEW_CASE,
    PERMISSIONS.TALK_TO_CUSTOMER,
    PERMISSIONS.REQUEST_APPROVAL,
    PERMISSIONS.APPROVE_REFUND,
    PERMISSIONS.TAKEOVER_CALL,
    PERMISSIONS.REASSIGN_CASE,
    PERMISSIONS.POLICY_CONFIGURATION,
    PERMISSIONS.SYSTEM_CONFIGURATION,
    PERMISSIONS.AUDIT_ACCESS,
  ],
}

export const OPERATOR_ROSTER = [
  {
    id: 'OP-782',
    name: 'Maya Sharma',
    role: ROLES.SUPERVISOR,
    status: 'Available',
    activeCases: 1,
    desk: 'Logistics SLA & Tier-1 Escalations',
  },
  {
    id: 'OP-783',
    name: 'Arjun Nair',
    role: ROLES.AGENT,
    status: 'On call',
    activeCases: 2,
    desk: 'General Inquiries',
  },
  {
    id: 'OP-784',
    name: 'Neha Patel',
    role: ROLES.AGENT,
    status: 'Available',
    activeCases: 0,
    desk: 'Order Tracking & Returns',
  },
  {
    id: 'OP-785',
    name: 'Vikram Singhania',
    role: ROLES.ADMIN,
    status: 'Available',
    activeCases: 0,
    desk: 'Operations Command',
  },
]

// Case Assignment Ledger
const caseAssignments = new Map([
  ['RLY-1042', { caseId: 'RLY-1042', assignedTo: 'OP-782', assignedName: 'Maya Sharma', assignmentStatus: 'ASSIGNED' }],
])

export class OperatorService {
  static getOperators() {
    return OPERATOR_ROSTER
  }

  static getOperatorById(id) {
    return OPERATOR_ROSTER.find((op) => op.id === id) || null
  }

  static hasPermission(operatorId, permission) {
    const operator = this.getOperatorById(operatorId)
    if (!operator) return false
    const allowed = ROLE_PERMISSIONS[operator.role] || []
    return allowed.includes(permission)
  }

  static checkPermissionOrThrow(operatorId, permission) {
    if (!this.hasPermission(operatorId, permission)) {
      const op = this.getOperatorById(operatorId)
      const roleName = op?.role || 'UNKNOWN'
      throw Object.assign(
        new Error(`Access Denied: Role '${roleName}' does not have permission '${permission}'`),
        { code: 'PERMISSION_DENIED', httpStatus: 403 }
      )
    }
  }

  static assignCase(caseId, targetOperatorId, assigningOperatorId = 'OP-782') {
    // Check permission to reassign
    this.checkPermissionOrThrow(assigningOperatorId, PERMISSIONS.REASSIGN_CASE)

    const targetOp = this.getOperatorById(targetOperatorId)
    if (!targetOp) {
      throw new Error(`Target operator ${targetOperatorId} not found`)
    }

    const assignment = {
      caseId,
      assignedTo: targetOp.id,
      assignedName: targetOp.name,
      assignmentStatus: 'ASSIGNED',
      assignedAt: new Date().toISOString(),
    }

    caseAssignments.set(caseId, assignment)

    // Emit authoritative RelayEvent
    db.appendRelayEvent(caseId, {
      type: 'case.updated',
      payload: {
        assignmentStatus: 'ASSIGNED',
        assignedTo: targetOp.id,
        assignedName: targetOp.name,
      },
      timestamp: new Date().toLocaleTimeString(),
    })

    return assignment
  }

  static getCaseAssignment(caseId) {
    return caseAssignments.get(caseId) || {
      caseId,
      assignedTo: null,
      assignedName: 'Unassigned',
      assignmentStatus: 'UNASSIGNED',
    }
  }
}

/**
 * RELAY — Standalone Production Backend Server
 * Can be deployed on Render, Railway, Google Cloud Run, Fly.io, or Heroku.
 *
 * Runs all RELAY REST APIs, Event Bus (SSE), Tool Engine, Policy Gate,
 * and Agora RTC/Conversational AI Agent Token Dispatcher.
 */

import http from 'node:http'
import { URL } from 'node:url'
import { serverConfig } from './config.js'
import { generateRtcToken } from './tokenServer.js'
import { startConversationalAgent, stopConversationalAgent } from './agentService.js'
import { executeTool, TOOL_REGISTRY, getApprovedToolDefinitions, normalizeToolPayload } from './tools/index.js'
import { createApprovalRequest, processApproval, processDecline } from './approvalService.js'
import { db } from './db/database.js'
import { processAgentTurn } from './agentOrchestrator.js'
import { listIdempotencyKeys } from './idempotencyStore.js'
import { OperatorService } from './operatorService.js'
import { recoverCaseState } from './stateEngine.js'
import { trackOrderAcrossPlatforms } from './services/logisticsAggregator.js'
import { processRefundTransaction } from './services/paymentGateway.js'
import { customerDatabase } from './tools/customer.js'

const PORT = Number(process.env.PORT) || serverConfig.port || 3000

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

function sendJson(res, statusCode, data) {
  setCorsHeaders(res)
  res.setHeader('Content-Type', 'application/json')
  res.statusCode = statusCode
  res.end(JSON.stringify(data))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (err) {
        resolve({})
      }
    })
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res)

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  const host = req.headers.host || 'localhost:3000'
  const reqUrl = new URL(req.url || '/', `http://${host}`)
  const pathname = reqUrl.pathname

  try {
    // 0. HEALTH CHECK
    if (pathname === '/' || pathname === '/health') {
      return sendJson(res, 200, {
        status: 'ONLINE',
        service: 'RELAY AI Voice Operations Engine',
        version: '0.1.0',
        timestamp: new Date().toISOString(),
      })
    }

    // 1. AGORA RTC TOKEN: /api/agora/token
    if (pathname === '/api/agora/token') {
      if (req.method === 'POST') {
        const data = await readBody(req)
        const channel = data.channel || 'relay-case-1042'
        const uid = data.uid || 1042
        const tokenResponse = generateRtcToken(channel, uid)
        return sendJson(res, 200, tokenResponse)
      } else {
        const channel = reqUrl.searchParams.get('channel') || 'relay-case-1042'
        const uid = reqUrl.searchParams.get('uid') || 1042
        const tokenResponse = generateRtcToken(channel, uid)
        return sendJson(res, 200, tokenResponse)
      }
    }

    // 2. CONVERSATIONAL AI AGENT START: /api/agent/start
    if (pathname === '/api/agent/start' && req.method === 'POST') {
      const data = await readBody(req)
      const result = await startConversationalAgent(data)
      return sendJson(res, 200, result)
    }

    // 3. CONVERSATIONAL AI AGENT STOP: /api/agent/stop
    if (pathname === '/api/agent/stop' && req.method === 'POST') {
      const data = await readBody(req)
      const result = await stopConversationalAgent(data.taskId, data.channel)
      return sendJson(res, 200, result)
    }

    // 4. AUTONOMOUS AGENT TURN: /api/agent/turn
    if (pathname === '/api/agent/turn' && req.method === 'POST') {
      const data = await readBody(req)
      const utterance = data.utterance || data.text || 'Mera order 5 din se nahi aaya.'
      const caseId = data.caseId || 'RLY-1042'
      const customerName = data.customerName || null
      const agentGender = data.agentGender || 'female'
      const result = await processAgentTurn(utterance, caseId, customerName, agentGender)
      return sendJson(res, 200, result)
    }

        // 5. BACKEND TOOL ENGINE: /api/tools/execute (Agora Custom Tool & Internal Gateway)
    if (pathname === '/api/tools/execute' && req.method === 'POST') {
      const data = await readBody(req)
      const normalized = normalizeToolPayload(data)

      if (!normalized.valid) {
        return sendJson(res, 400, {
          success: false,
          error: normalized.error,
          code: 'INVALID_TOOL_PAYLOAD',
          received: data,
        })
      }

      const result = await executeTool(normalized.tool, normalized.params)
      const statusCode = result.success ? 200 : (result.failureState === 'TOOL_ERROR' ? 400 : 200)
      return sendJson(res, statusCode, result)
    }

    // 5.1 TOOL REGISTRY: /api/tools/registry
    if (pathname === '/api/tools/registry' && req.method === 'GET') {
      const tools = Object.keys(TOOL_REGISTRY).map((k) => ({
        name: TOOL_REGISTRY[k].name,
        description: TOOL_REGISTRY[k].description,
        riskLevel: TOOL_REGISTRY[k].riskLevel,
        requiresApproval: TOOL_REGISTRY[k].requiresApproval,
        parameters: TOOL_REGISTRY[k].parameters,
      }))
      return sendJson(res, 200, {
        totalApprovedTools: tools.length,
        tools,
        functionDefinitions: getApprovedToolDefinitions(),
      })
    }

    // 6. APPROVAL SERVICE: /api/approvals/*
    if (pathname.startsWith('/api/approvals')) {
      if (req.method === 'POST') {
        const data = await readBody(req)
        if (pathname.includes('/approve') || data.action === 'APPROVE') {
          const approvalId = data.approvalId || data.id || 'appr-1042-99042'
          const operator = data.operator || { id: 'OP-782', name: 'Maya Sharma' }
          const requestedCaseId = data.caseId || null
          const result = await processApproval(approvalId, operator, requestedCaseId)
          return sendJson(res, 200, result)
        } else if (pathname.includes('/decline') || data.action === 'DECLINE') {
          const approvalId = data.approvalId || data.id || 'appr-1042-99042'
          const operator = data.operator || { id: 'OP-782', name: 'Maya Sharma' }
          const reason = data.reason || 'Operator declined exception'
          const result = await processDecline(approvalId, operator, reason)
          return sendJson(res, 200, result)
        } else {
          const result = await createApprovalRequest(data)
          return sendJson(res, 200, result)
        }
      }
    }

    // 7. DATABASE STATS: /api/db/stats
    if (pathname === '/api/db/stats' && req.method === 'GET') {
      return sendJson(res, 200, db.getStats())
    }

    // 8. IDEMPOTENCY INSPECTION: /api/idempotency/keys
    if (pathname === '/api/idempotency/keys' && req.method === 'GET') {
      return sendJson(res, 200, { keys: listIdempotencyKeys() })
    }

    // 9. RELAY EVENTS LOG: /api/events
    if (pathname === '/api/events') {
      const caseId = reqUrl.searchParams.get('caseId') || 'RLY-1042'
      if (req.method === 'GET') {
        const events = db.getRelayEvents(caseId)
        return sendJson(res, 200, { caseId, count: events.length, events })
      }
      if (req.method === 'POST') {
        const data = await readBody(req)
        const eventRecord = db.appendRelayEvent(data.caseId || caseId, data.event || data)
        return sendJson(res, 201, { success: true, event: eventRecord })
      }
    }

    // 9.1 SSE EVENT STREAM: /api/events/stream
    if (pathname === '/api/events/stream') {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache, no-transform')
      res.setHeader('Connection', 'keep-alive')
      res.write('data: {"type":"connected","message":"RELAY Realtime SSE Stream Active"}\n\n')

      const unsubscribe = db.subscribe((eventRecord) => {
        try {
          res.write(`data: ${JSON.stringify(eventRecord)}\n\n`)
        } catch (e) {}
      })

      req.on('close', () => unsubscribe())
      return
    }

    // 10. CASE REPLAY & MANAGEMENT: /api/cases/*
    if (pathname.startsWith('/api/cases')) {
      const match = pathname.replace('/api/cases', '').match(/\/([A-Za-z0-9_-]+)/)
      const caseId = match ? match[1] : 'RLY-1042'
      const isEvents = pathname.includes('/events')
      const isAssign = pathname.includes('/assign')
      const isRecover = pathname.includes('/recover')

      if (req.method === 'POST') {
        const data = await readBody(req)
        if (isAssign) {
          const targetOperatorId = data.operatorId || data.targetOperatorId || 'OP-782'
          const assigningOperatorId = data.assigningOperatorId || 'OP-782'
          const assignment = OperatorService.assignCase(caseId, targetOperatorId, assigningOperatorId)
          return sendJson(res, 200, { success: true, assignment })
        }
        if (isRecover) {
          const recoveryResult = await recoverCaseState(caseId)
          return sendJson(res, 200, { success: true, recovery: recoveryResult })
        }
        return sendJson(res, 400, { error: 'Unknown case action' })
      }

      if (req.method === 'GET') {
        if (isEvents) {
          const events = db.getRelayEvents(caseId)
          return sendJson(res, 200, { caseId, eventCount: events.length, events, replayReady: true })
        } else {
          const caseData = db.getCase(caseId)
          const customer = db.getCustomer('CUST-AARAV-01')
          const events = db.getRelayEvents(caseId)
          const assignment = OperatorService.getCaseAssignment(caseId)
          return sendJson(res, 200, { case: caseData, customer, assignment, events })
        }
      }
    }

    // 11. OPERATORS ROSTER: /api/operators
    if (pathname === '/api/operators' && req.method === 'GET') {
      return sendJson(res, 200, {
        totalOperators: OperatorService.getOperators().length,
        operators: OperatorService.getOperators(),
      })
    }

    // 12. MOCK ENTERPRISE ORDER SERVICE: /api/enterprise/orders/*
    if (pathname.startsWith('/api/enterprise/orders')) {
      const orderIdMatch = pathname.match(/\/api\/enterprise\/orders\/([A-Za-z0-9_-]+)/)
      const orderId = orderIdMatch ? orderIdMatch[1] : (reqUrl.searchParams.get('orderId') || '72143')
      const orderData = await trackOrderAcrossPlatforms(orderId)
      return sendJson(res, 200, {
        success: true,
        service: 'MOCK_ORDER_SERVICE_REST_V2',
        orderId,
        order: orderData,
        financialStatus: 'PAID',
        currency: orderData.currency || 'INR',
        amount: orderData.amount || 2899,
        placedAt: orderData.placedAt || new Date(Date.now() - 4 * 86400000).toISOString(),
        items: orderData.items || []
      })
    }

    // 13. MOCK ENTERPRISE LOGISTICS & TRACKING SERVICE: /api/enterprise/tracking/*
    if (pathname.startsWith('/api/enterprise/tracking')) {
      const orderIdMatch = pathname.match(/\/api\/enterprise\/tracking\/([A-Za-z0-9_-]+)/)
      const orderId = orderIdMatch ? orderIdMatch[1] : (reqUrl.searchParams.get('orderId') || '72143')
      const trackData = await trackOrderAcrossPlatforms(orderId)
      return sendJson(res, 200, {
        success: true,
        service: 'MOCK_LOGISTICS_CARRIER_REST_V2',
        orderId,
        carrier: trackData.carrier,
        trackingNumber: trackData.trackingNumber,
        status: trackData.status,
        lastLocation: trackData.lastLocation,
        delayDays: trackData.delayDays,
        isSlaBreached: trackData.isSlaBreached,
        checkpoints: trackData.checkpoints || []
      })
    }

    // 14. MOCK ENTERPRISE PAYMENT & NPCI REFUND SERVICE: /api/enterprise/payments/refund
    if (pathname === '/api/enterprise/payments/refund' && req.method === 'POST') {
      const data = await readBody(req)
      const orderId = data.orderId || '72143'
      const orderData = await trackOrderAcrossPlatforms(orderId)
      const amount = data.amount || orderData.amount || 2899
      const result = await processRefundTransaction({
        orderId,
        amount,
        currency: 'INR',
        reason: data.reason || 'SLA delay exception approved under Policy POL-REFUND-3.2'
      })
      return sendJson(res, 200, {
        success: true,
        service: 'MOCK_PAYMENT_GATEWAY_NPCI_V2',
        ...result
      })
    }

    // 15. MOCK ENTERPRISE CRM CUSTOMER SERVICE: /api/enterprise/crm/customers/*
    if (pathname.startsWith('/api/enterprise/crm/customers')) {
      const custMatch = pathname.match(/\/api\/enterprise\/crm\/customers\/([A-Za-z0-9_-]+)/)
      const customerId = custMatch ? custMatch[1] : 'CUS-1042'
      const customer = customerDatabase[customerId] || customerDatabase['CUS-1042']
      return sendJson(res, 200, {
        success: true,
        service: 'MOCK_CRM_REST_V2',
        customer
      })
    }

    // 16. MOCK ENTERPRISE CRM TICKET SERVICE: /api/enterprise/crm/tickets
    if (pathname === '/api/enterprise/crm/tickets' && req.method === 'POST') {
      const data = await readBody(req)
      const ticketId = `TCK-${Math.floor(Math.random() * 90000 + 10000)}`
      return sendJson(res, 201, {
        success: true,
        service: 'MOCK_CRM_TICKET_REST_V2',
        ticketId,
        caseId: data.caseId || 'RLY-72143',
        orderId: data.orderId || '72143',
        status: 'OPEN',
        priority: data.priority || 'HIGH',
        summary: data.summary || 'Delayed delivery SLA exception',
        assignedDesk: 'LOGISTICS_EXCEPTIONS',
        createdAt: new Date().toISOString()
      })
    }

    // 404 NOT FOUND
    return sendJson(res, 404, { error: 'Route not found', pathname })
  } catch (err) {
    console.error('[RELAY Server Error]', err)
    return sendJson(res, 500, { error: err.message || 'Internal Server Error' })
  }
})

server.listen(PORT, () => {
  console.log(`\n🚀 RELAY Backend Server listening on http://localhost:${PORT}`)
  console.log(`📡 Ready for Agora RTC, AI Turn Orchestration & Tool Execution.\n`)
})

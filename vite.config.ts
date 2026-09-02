import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { generateRtcToken } from './server/tokenServer.js'
import { startConversationalAgent, stopConversationalAgent } from './server/agentService.js'
import { executeTool, TOOL_REGISTRY, getApprovedToolDefinitions } from './server/tools/index.js'
import { createApprovalRequest, processApproval, processDecline } from './server/approvalService.js'
import { db } from './server/db/database.js'
import { processAgentTurn } from './server/agentOrchestrator.js'
import { listIdempotencyKeys } from './server/idempotencyStore.js'
import { OperatorService } from './server/operatorService.js'
import { recoverCaseState } from './server/stateEngine.js'
import { trackOrderAcrossPlatforms } from './server/services/logisticsAggregator.js'
import { processRefundTransaction } from './server/services/paymentGateway.js'
import { customerDatabase } from './server/tools/customer.js'

function agoraApiPlugin(): Plugin {
  return {
    name: 'agora-api-service',
    configureServer(server) {
      // 1. TOKEN ENDPOINT: /api/agora/token
      server.middlewares.use('/api/agora/token', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}')
              const channel = data.channel || 'relay-case-1042'
              const uid = data.uid || 1042
              const tokenResponse = generateRtcToken(channel, uid)
              res.statusCode = 200
              res.end(JSON.stringify(tokenResponse))
            } catch (err) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Invalid JSON payload' }))
            }
          })
          return
        }

        const url = new URL(req.url || '', `http://${req.headers.host}`)
        const channel = url.searchParams.get('channel') || 'relay-case-1042'
        const uid = url.searchParams.get('uid') || 1042
        const tokenResponse = generateRtcToken(channel, uid)
        res.statusCode = 200
        res.end(JSON.stringify(tokenResponse))
      })

      // 2. CONVERSATIONAL AI AGENT START: /api/agent/start
      server.middlewares.use('/api/agent/start', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}')
              const result = await startConversationalAgent(data)
              res.statusCode = 200
              res.end(JSON.stringify(result))
            } catch (err: any) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err?.message || 'Agent startup failed' }))
            }
          })
          return
        }

        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Method not allowed' }))
      })

      // 3. CONVERSATIONAL AI AGENT STOP: /api/agent/stop
      server.middlewares.use('/api/agent/stop', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}')
              const result = await stopConversationalAgent(data.taskId, data.channel)
              res.statusCode = 200
              res.end(JSON.stringify(result))
            } catch (err: any) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err?.message || 'Agent stop failed' }))
            }
          })
          return
        }

        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Method not allowed' }))
      })

      // 4. AUTONOMOUS AGENT TURN (INTENT -> TOOL CALLING -> TTS RESPONSE): /api/agent/turn
      server.middlewares.use('/api/agent/turn', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}')
              const utterance = data.utterance || data.text || 'Mera order 5 din se nahi aaya.'
              const caseId = data.caseId || 'RLY-1042'
              const customerName = data.customerName || null
              const agentGender = data.agentGender || 'female'
              const result = await processAgentTurn(utterance, caseId, customerName, agentGender)
              res.statusCode = 200
              res.end(JSON.stringify(result))
            } catch (err: any) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err?.message || 'Turn execution failed' }))
            }
          })
          return
        }

        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Method not allowed' }))
      })

      // 5. BACKEND TOOL ENGINE DISPATCH: /api/tools/execute
      server.middlewares.use('/api/tools/execute', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}')
              const toolName = data.tool || data.toolName || 'getOrderStatus'
              const params = data.params || data.parameters || {}
              const result = await executeTool(toolName, params)
              res.statusCode = 200
              res.end(JSON.stringify(result))
            } catch (err: any) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err?.message || 'Tool execution failed' }))
            }
          })
          return
        }

        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Method not allowed' }))
      })

      // 5.1 CONTROLLED TOOL REGISTRY INSPECTOR: /api/tools/registry
      server.middlewares.use('/api/tools/registry', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method === 'GET') {
          const tools = Object.keys(TOOL_REGISTRY).map((k) => ({
            name: TOOL_REGISTRY[k].name,
            description: TOOL_REGISTRY[k].description,
            riskLevel: TOOL_REGISTRY[k].riskLevel,
            requiresApproval: TOOL_REGISTRY[k].requiresApproval,
            parameters: TOOL_REGISTRY[k].parameters,
          }))

          res.statusCode = 200
          res.end(JSON.stringify({
            totalApprovedTools: tools.length,
            tools,
            functionDefinitions: getApprovedToolDefinitions(),
          }))
          return
        }

        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Method not allowed' }))
      })

      // 6. HUMAN APPROVAL SERVICE: /api/approvals/
      server.middlewares.use('/api/approvals', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        const url = req.url || ''

        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}')
              if (url.includes('/approve') || data.action === 'APPROVE') {
                const approvalId = data.approvalId || data.id || 'appr-1042-99042'
                const operator = data.operator || { id: 'OP-782', name: 'Maya Sharma' }
                const requestedCaseId = data.caseId || null
                const result = await processApproval(approvalId, operator, requestedCaseId)
                res.statusCode = 200
                res.end(JSON.stringify(result))
              } else if (url.includes('/decline') || data.action === 'DECLINE') {
                const approvalId = data.approvalId || data.id || 'appr-1042-99042'
                const operator = data.operator || { id: 'OP-782', name: 'Maya Sharma' }
                const reason = data.reason || 'Operator declined exception'
                const result = await processDecline(approvalId, operator, reason)
                res.statusCode = 200
                res.end(JSON.stringify(result))
              } else {
                const result = await createApprovalRequest(data)
                res.statusCode = 200
                res.end(JSON.stringify(result))
              }
            } catch (err: any) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err?.message || 'Approval processing failed' }))
            }
          })
          return
        }

        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Method not allowed' }))
      })

      // 7. DATABASE STATS & INSPECTION: /api/db/stats
      server.middlewares.use('/api/db/stats', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.statusCode = 200
        res.end(JSON.stringify(db.getStats()))
      })

      // 8. IDEMPOTENCY INSPECTION: /api/idempotency/keys
      server.middlewares.use('/api/idempotency/keys', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.statusCode = 200
        res.end(JSON.stringify({ keys: listIdempotencyKeys() }))
      })

      // 9. APPEND-ONLY RELAY EVENTS LOG: /api/events
      server.middlewares.use('/api/events', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 200
          res.end()
          return
        }

        const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)
        const caseId = url.searchParams.get('caseId') || 'RLY-1042'

        if (req.method === 'GET') {
          const events = db.getRelayEvents(caseId)
          res.statusCode = 200
          res.end(JSON.stringify({ caseId, count: events.length, events }))
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => (body += chunk))
          req.on('end', () => {
            try {
              const data = body ? JSON.parse(body) : {}
              const eventRecord = db.appendRelayEvent(data.caseId || caseId, data.event || data)
              res.statusCode = 201
              res.end(JSON.stringify({ success: true, event: eventRecord }))
            } catch (err: any) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: err.message }))
            }
          })
          return
        }
      })

      // 9.1 REAL-TIME EVENT STREAM (SSE): /api/events/stream
      server.middlewares.use('/api/events/stream', (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache, no-transform')
        res.setHeader('Connection', 'keep-alive')
        res.setHeader('Access-Control-Allow-Origin', '*')

        res.write('data: {"type":"connected","message":"RELAY Realtime SSE Stream Active"}\n\n')

        const unsubscribe = db.subscribe((eventRecord: any) => {
          try {
            res.write(`data: ${JSON.stringify(eventRecord)}\n\n`)
          } catch (e) {}
        })

        req.on('close', () => {
          unsubscribe()
        })
      })

      // 10. CASE REPLAY & EVENT STREAM API: /api/cases/
      server.middlewares.use('/api/cases', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        const url = req.url || ''
        const match = url.match(/\/([A-Za-z0-9_-]+)/)
        const caseId = match ? match[1] : 'RLY-1042'
        const isEvents = url.includes('/events')
        const isAssign = url.includes('/assign')
        const isRecover = url.includes('/recover')

        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => (body += chunk))
          req.on('end', async () => {
            try {
              const data = body ? JSON.parse(body) : {}
              if (isAssign) {
                const targetOperatorId = data.operatorId || data.targetOperatorId || 'OP-782'
                const assigningOperatorId = data.assigningOperatorId || 'OP-782'
                const assignment = OperatorService.assignCase(caseId, targetOperatorId, assigningOperatorId)
                res.statusCode = 200
                res.end(JSON.stringify({ success: true, assignment }))
                return
              }

              if (isRecover) {
                const recoveryResult = await recoverCaseState(caseId)
                res.statusCode = 200
                res.end(JSON.stringify({ success: true, recovery: recoveryResult }))
                return
              }

              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Unknown action' }))
            } catch (err: any) {
              res.statusCode = err?.httpStatus || 400
              res.end(JSON.stringify({ error: err?.message || 'Operation failed' }))
            }
          })
          return
        }

        if (req.method === 'GET') {
          if (isEvents) {
            const events = db.getRelayEvents(caseId)
            res.statusCode = 200
            res.end(JSON.stringify({
              caseId,
              eventCount: events.length,
              events,
              replayReady: true,
            }))
            return
          } else {
            const caseData = db.getCase(caseId)
            const customer = db.getCustomer('CUST-AARAV-01')
            const events = db.getRelayEvents(caseId)
            const assignment = OperatorService.getCaseAssignment(caseId)
            res.statusCode = 200
            res.end(JSON.stringify({
              case: caseData,
              customer,
              assignment,
              events,
            }))
            return
          }
        }

        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Method not allowed' }))
      })

      // 11. MULTI-OPERATOR ROSTER & PERMISSIONS: /api/operators
      server.middlewares.use('/api/operators', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method === 'GET') {
          res.statusCode = 200
          res.end(JSON.stringify({
            totalOperators: OperatorService.getOperators().length,
            operators: OperatorService.getOperators(),
          }))
          return
        }

        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Method not allowed' }))
      })

      // 12. MOCK ENTERPRISE ORDER SERVICE: /api/enterprise/orders/*
      server.middlewares.use('/api/enterprise/orders', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Relay-Client')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        const url = new URL(req.url || '', `http://${req.headers.host}`)
        const orderIdMatch = (req.url || '').match(/\/([A-Za-z0-9_-]+)/)
        const orderId = orderIdMatch ? orderIdMatch[1] : (url.searchParams.get('orderId') || '84921')
        const orderData = await trackOrderAcrossPlatforms(orderId)

        res.statusCode = 200
        res.end(JSON.stringify({
          success: true,
          service: 'MOCK_ORDER_SERVICE_REST_V2',
          orderId,
          order: orderData,
          financialStatus: 'PAID',
          currency: orderData.currency || 'INR',
          amount: orderData.amount || 1499,
          placedAt: orderData.placedAt || new Date(Date.now() - 4 * 86400000).toISOString(),
          items: orderData.items || []
        }))
      })

      // 13. MOCK ENTERPRISE LOGISTICS & TRACKING SERVICE: /api/enterprise/tracking/*
      server.middlewares.use('/api/enterprise/tracking', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Relay-Client')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        const url = new URL(req.url || '', `http://${req.headers.host}`)
        const orderIdMatch = (req.url || '').match(/\/([A-Za-z0-9_-]+)/)
        const orderId = orderIdMatch ? orderIdMatch[1] : (url.searchParams.get('orderId') || '84921')
        const trackData = await trackOrderAcrossPlatforms(orderId)

        res.statusCode = 200
        res.end(JSON.stringify({
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
        }))
      })

      // 14. MOCK ENTERPRISE PAYMENT & NPCI REFUND SERVICE: /api/enterprise/payments/refund
      server.middlewares.use('/api/enterprise/payments/refund', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Relay-Client')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}')
              const orderId = data.orderId || '84921'
              const amount = data.amount || 1499
              const result = await processRefundTransaction({
                orderId,
                amount,
                currency: 'INR',
                reason: data.reason || 'SLA delay exception approved under Policy POL-REFUND-3.2'
              })
              res.statusCode = 200
              res.end(JSON.stringify({
                success: true,
                service: 'MOCK_PAYMENT_GATEWAY_NPCI_V2',
                ...result
              }))
            } catch (err: any) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err?.message || 'Refund processing error' }))
            }
          })
          return
        }

        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Method not allowed' }))
      })

      // 15. MOCK ENTERPRISE CRM CUSTOMER SERVICE: /api/enterprise/crm/customers
      server.middlewares.use('/api/enterprise/crm/customers', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Relay-Client')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        const custMatch = (req.url || '').match(/\/([A-Za-z0-9_-]+)/)
        const customerId = custMatch ? custMatch[1] : 'CUS-1042'
        const customer = (customerDatabase as any)[customerId] || (customerDatabase as any)['CUS-1042']

        res.statusCode = 200
        res.end(JSON.stringify({
          success: true,
          service: 'MOCK_CRM_REST_V2',
          customer
        }))
      })

      // 16. MOCK ENTERPRISE CRM TICKET SERVICE: /api/enterprise/crm/tickets
      server.middlewares.use('/api/enterprise/crm/tickets', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Relay-Client')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}')
              const ticketId = `TCK-${Math.floor(Math.random() * 90000 + 10000)}`
              res.statusCode = 201
              res.end(JSON.stringify({
                success: true,
                service: 'MOCK_CRM_TICKET_REST_V2',
                ticketId,
                caseId: data.caseId || 'RLY-1042',
                orderId: data.orderId || '84921',
                status: 'OPEN',
                priority: data.priority || 'HIGH',
                summary: data.summary || 'Delayed delivery SLA exception',
                assignedDesk: 'LOGISTICS_EXCEPTIONS',
                createdAt: new Date().toISOString()
              }))
            } catch (err: any) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err?.message || 'Ticket creation error' }))
            }
          })
          return
        }

        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Method not allowed' }))
      })
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), agoraApiPlugin()],
  server: {
    port: 3000,
    open: false
  }
})

/**
 * RELAY — Agora Conversational AI Agent v2 Service
 *
 * Implements the exact Agora Conversational AI Studio v2 published pipeline join format:
 * POST https://api.agora.io/api/conversational-ai-agent/v2/projects/{APP_ID}/join
 *
 * Schema:
 * {
 *   "name": "YOUR_CHANNEL_NAME",
 *   "pipeline_id": "beec10e4de9a41edbb686f47e677756a",
 *   "properties": {
 *     "token": "<dynamic_rtc_token>",
 *     "agent_rtc_uid": "9999",
 *     "remote_rtc_uids": ["1042"]
 *   }
 * }
 */

import { generateRtcToken } from './tokenServer.js'
import { serverConfig } from './config.js'

const AGORA_REST_API_BASE = 'https://api.agora.io/api/conversational-ai-agent/v2'
const AGORA_APP_ID = serverConfig.agora.appId
const AGORA_CUSTOMER_ID = serverConfig.agora.customerId
const AGORA_CUSTOMER_SECRET = serverConfig.agora.customerSecret
const AGORA_PIPELINE_ID = serverConfig.agora.pipelineId || process.env.AGORA_PIPELINE_ID

/**
 * Validates whether Agora Cloud API credentials and pipeline ID are configured.
 */
export function checkAgoraCloudConfig() {
  const hasAppId = Boolean(AGORA_APP_ID && !AGORA_APP_ID.includes('your_'))
  const hasCustomerId = Boolean(AGORA_CUSTOMER_ID && !AGORA_CUSTOMER_ID.includes('your_') && !AGORA_CUSTOMER_ID.includes('sandbox_'))
  const hasCustomerSecret = Boolean(AGORA_CUSTOMER_SECRET && !AGORA_CUSTOMER_SECRET.includes('your_') && !AGORA_CUSTOMER_SECRET.includes('sandbox_'))
  const hasPipelineId = Boolean(AGORA_PIPELINE_ID)

  return {
    isFullyConfigured: hasAppId && hasCustomerId && hasCustomerSecret,
    hasAppId,
    hasCustomerId,
    hasCustomerSecret,
    hasPipelineId,
    pipelineId: AGORA_PIPELINE_ID || null,
  }
}

/**
 * Starts an Agora Conversational AI Agent session on the requested WebRTC channel.
 *
 * @param {Object} [options]
 * @param {string} [options.channelName]
 * @param {number|string} [options.userUid]
 * @param {number|string} [options.agentUid]
 * @param {string} [options.pipelineId]
 */
export async function startConversationalAgent(options = {}) {
  const channelName = options.channelName || options.name || 'relay-case-72143'
  const userUid = typeof options.userUid === 'number' ? options.userUid : 1042
  const agentUid = typeof options.agentUid === 'number' ? options.agentUid : 9999
  const pipelineId = options.pipelineId || AGORA_PIPELINE_ID || 'beec10e4de9a41edbb686f47e677756a'

  // Generate dynamic RTC token for the agent UID
  const agentTokenData = generateRtcToken(channelName, agentUid)

  // EXACT AGORA STUDIO V2 PUBLISHED PIPELINE REQUEST BODY
  const requestBody = {
    name: channelName,
    pipeline_id: pipelineId,
    properties: {
      token: agentTokenData.token || '',
      agent_rtc_uid: String(agentUid),
      remote_rtc_uids: [String(userUid)],
    },
  }

  const endpoint = `${AGORA_REST_API_BASE}/projects/${AGORA_APP_ID}/join`
  const cloudConfig = checkAgoraCloudConfig()

  console.log(`[Agora Agent Service] Preparing join request for channel='${channelName}', pipeline='${pipelineId}'`)

  if (cloudConfig.isFullyConfigured) {
    try {
      const authHeader = `Basic ${Buffer.from(`${AGORA_CUSTOMER_ID}:${AGORA_CUSTOMER_SECRET}`).toString('base64')}`

      console.log(`[Agora Agent Service] POST ${endpoint}`)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json().catch(() => ({}))
      console.log(`[Agora Agent Service] Upstream HTTP ${response.status} ${response.statusText}`)

      if (response.ok) {
        const taskId = data.task_id || data.taskId || data.id || `task-${Date.now()}`
        console.log(`[Agora Agent Service] Cloud agent joined channel '${channelName}'. Task ID: ${taskId}`)

        return {
          success: true,
          status: 'SUCCESS',
          mode: 'AGORA_CLOUD_AGENT_V2',
          taskId,
          channel: channelName,
          agentUid,
          appId: AGORA_APP_ID,
          pipelineId,
          agoraResponse: data,
        }
      } else {
        console.warn(`[Agora Agent Service] Upstream error response:`, data)
        return {
          success: false,
          status: 'AGORA_API_ERROR',
          statusCode: response.status,
          channel: channelName,
          agentUid,
          error: data.message || data.error || `Agora API error ${response.status}`,
          details: data,
          fallbackMode: 'ACTIVE_LOCAL_BRIDGE',
        }
      }
    } catch (err) {
      console.error('[Agora Agent Service] Network exception calling Agora API:', err.message)
      return {
        success: false,
        status: 'NETWORK_ERROR',
        error: err.message,
        fallbackMode: 'ACTIVE_LOCAL_BRIDGE',
      }
    }
  }

  console.log(`[Agora Agent Service] Cloud credentials not configured. Operating in local bridge mode for channel '${channelName}'.`)
  return {
    success: true,
    status: 'ACTIVE_LOCAL_BRIDGE',
    mode: 'LOCAL_BROWSER_ASR_TTS',
    taskId: `task-relay-local-${Date.now()}`,
    channel: channelName,
    agentUid,
    appId: AGORA_APP_ID,
    pipelineId,
    config: requestBody,
    note: 'To activate Agora Cloud Agent directly on WebRTC track, add AGORA_CUSTOMER_ID, AGORA_CUSTOMER_SECRET, and AGORA_PIPELINE_ID to server environment.',
  }
}

/**
 * Stops an active Agora Conversational AI Agent task.
 */
export async function stopConversationalAgent(taskId, channelName = 'relay-case-72143') {
  const cloudConfig = checkAgoraCloudConfig()

  if (cloudConfig.isFullyConfigured && taskId && !taskId.startsWith('task-relay-local')) {
    try {
      const endpoint = `${AGORA_REST_API_BASE}/projects/${AGORA_APP_ID}/tasks/${taskId}/stop`
      const authHeader = `Basic ${Buffer.from(`${AGORA_CUSTOMER_ID}:${AGORA_CUSTOMER_SECRET}`).toString('base64')}`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
      })

      const data = await response.json().catch(() => ({}))
      return {
        status: 'STOPPED',
        taskId,
        channel: channelName,
        stoppedAt: new Date().toISOString(),
        agoraResponse: data,
      }
    } catch (err) {
      console.warn('[Agora Agent Service] Error stopping cloud agent task:', err.message)
    }
  }

  return {
    status: 'STOPPED',
    taskId: taskId || 'task-relay-current',
    channel: channelName,
    stoppedAt: new Date().toISOString(),
  }
}

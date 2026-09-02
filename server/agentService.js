/**
 * RELAY — Agora Conversational AI Agent v2 Service
 * Dispatches agent joins to https://api.agora.io/api/conversational-ai-agent/v2/projects/{APP_ID}/join
 *
 * Supports Agora Conversational AI Studio v2 published pipelines (pipeline_id)
 * as well as direct custom parameter orchestration.
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
  const hasAppId = Boolean(AGORA_APP_ID && AGORA_APP_ID !== 'your_agora_app_id_here')
  const hasCustomerId = Boolean(AGORA_CUSTOMER_ID && AGORA_CUSTOMER_ID !== 'sandbox_customer_id' && AGORA_CUSTOMER_ID !== 'your_agora_customer_id_here')
  const hasCustomerSecret = Boolean(AGORA_CUSTOMER_SECRET && AGORA_CUSTOMER_SECRET !== 'sandbox_customer_secret' && AGORA_CUSTOMER_SECRET !== 'your_agora_customer_secret_here')
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
 * @param {string} [options.systemPrompt]
 * @param {string} [options.greeting]
 * @param {string} [options.language]
 * @param {string} [options.pipelineId]
 */
export async function startConversationalAgent(options = {}) {
  const channelName = options.channelName || 'relay-case-72143'
  const userUid = typeof options.userUid === 'number' ? options.userUid : 1042
  const agentUid = typeof options.agentUid === 'number' ? options.agentUid : 9999
  const pipelineId = options.pipelineId || AGORA_PIPELINE_ID

  // Generate dynamic RTC token for the agent UID
  const agentTokenData = generateRtcToken(channelName, agentUid)

  const systemPrompt =
    options.systemPrompt ||
    `You are RELAY, an enterprise voice operations AI for logistics and commerce in India. 
You speak fluently in English, Hindi, and Hinglish. 
Listen actively, extract customer order numbers, verify delivery exceptions, and propose standard resolutions with human supervisor sign-off.`

  const greeting =
    options.greeting ||
    'Namaste! Welcome to RELAY support. How can I assist you with your delivery today?'

  // Request payload formatted for Agora Conversational AI v2 /join API
  const requestBody = {
    request_id: `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    channel_name: channelName,
    user_uid: String(userUid),
    agent_uid: String(agentUid),
    rtc: {
      channel_name: channelName,
      uid: String(agentUid),
      token: agentTokenData.token,
    },
    advanced_features: {
      enable_vad: true,
      enable_bargein: true,
      session_data_retention: {
        retention_mode: 'TRANSIENT_AUDIT_LOGS_ONLY',
        auto_purge_after_hours: 24,
        encryption_standard: 'AES_GCM_256',
      },
      token_lifecycle_manager: {
        auto_token_refresh: true,
        expiration_notify_threshold_sec: 300,
        enable_zero_drop_rollover: true,
      },
    },
  }

  // Attach published Agora Studio Pipeline ID if available
  if (pipelineId) {
    requestBody.pipeline_id = pipelineId
  } else {
    // Fallback to manual parameters configuration
    requestBody.parameters = {
      system_prompt: systemPrompt,
      greeting: greeting,
      asr: {
        provider: serverConfig.ai.deepgramApiKey ? 'deepgram' : 'agora',
        language: options.language || 'hi-IN',
        model: 'nova-2',
        multilingual: true,
      },
      llm: {
        provider: serverConfig.ai.geminiApiKey ? 'google' : 'openai',
        model: serverConfig.ai.geminiApiKey ? 'gemini-2.5-flash' : 'gpt-4o-mini',
        temperature: 0.3,
        api_key: serverConfig.ai.geminiApiKey || serverConfig.ai.openaiApiKey || undefined,
      },
      tts: {
        provider: serverConfig.ai.elevenLabsApiKey ? 'elevenlabs' : 'microsoft',
        voice_id: 'relay-voice-in',
        model: 'eleven_multilingual_v2',
      },
      vad: {
        threshold: 0.5,
        speech_duration_ms: 120,
        silence_duration_ms: 350,
      },
    }
  }

  const endpoint = `${AGORA_REST_API_BASE}/projects/${AGORA_APP_ID}/join`
  const cloudConfig = checkAgoraCloudConfig()

  if (cloudConfig.isFullyConfigured) {
    try {
      const authHeader = `Basic ${Buffer.from(`${AGORA_CUSTOMER_ID}:${AGORA_CUSTOMER_SECRET}`).toString('base64')}`

      console.log(`[Agora Agent Service] Dispatching cloud agent join for channel '${channelName}' (pipeline: ${pipelineId || 'custom_params'})...`)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        console.log(`[Agora Agent Service] Cloud agent joined successfully! Task ID: ${data.task_id || data.taskId}`)
        return {
          success: true,
          status: 'SUCCESS',
          mode: 'AGORA_CLOUD_AGENT_V2',
          taskId: data.task_id || data.taskId || `task-${Date.now()}`,
          channel: channelName,
          agentUid: agentUid,
          appId: AGORA_APP_ID,
          pipelineId: pipelineId || null,
          agoraResponse: data,
        }
      } else {
        console.warn(`[Agora Agent Service] Agora API returned HTTP ${response.status}:`, data)
        return {
          success: false,
          status: 'AGORA_API_ERROR',
          statusCode: response.status,
          channel: channelName,
          agentUid: agentUid,
          error: data.message || data.error || 'Failed to start Agora cloud agent',
          details: data,
          fallbackMode: 'ACTIVE_LOCAL_BRIDGE',
        }
      }
    } catch (err) {
      console.error('[Agora Agent Service] Network failure connecting to Agora API:', err.message)
      return {
        success: false,
        status: 'NETWORK_ERROR',
        error: err.message,
        fallbackMode: 'ACTIVE_LOCAL_BRIDGE',
      }
    }
  }

  // Informative status when credentials are not yet entered
  console.log(`[Agora Agent Service] Cloud credentials not configured. Operating in local bridge mode for channel '${channelName}'.`)
  return {
    success: true,
    status: 'ACTIVE_LOCAL_BRIDGE',
    mode: 'LOCAL_BROWSER_ASR_TTS',
    taskId: `task-relay-local-${Date.now()}`,
    channel: channelName,
    agentUid: agentUid,
    appId: AGORA_APP_ID,
    pipelineId: pipelineId || null,
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

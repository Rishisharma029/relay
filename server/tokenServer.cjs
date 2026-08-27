/**
 * RELAY — Server-Side Agora RTC Token Service
 * Never exposes the Agora App Certificate to the frontend/browser client.
 */

const { RtcTokenBuilder, RtcRole } = require('agora-token')

const AGORA_APP_ID = process.env.AGORA_APP_ID || process.env.VITE_AGORA_APP_ID || '8a93e18cf52b45e695d7f1a3962b3221'
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || '4b9281a89c2049e7b192837482910482'

/**
 * Generate RTC Token with role PUBLISHER and 24h expiration
 */
function generateRtcToken(channelName, uid) {
  const role = RtcRole.PUBLISHER
  const expirationTimeInSeconds = 3600 * 24
  const currentTimestamp = Math.floor(Date.now() / 1000)
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds

  // If uid is a number vs string
  const numericUid = typeof uid === 'number' ? uid : parseInt(uid, 10) || 1042

  try {
    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      numericUid,
      role,
      privilegeExpiredTs,
      privilegeExpiredTs
    )
    return {
      token,
      appId: AGORA_APP_ID,
      channel: channelName,
      uid: numericUid,
      expiresAt: privilegeExpiredTs,
    }
  } catch (error) {
    console.error('[Token Server] Error building Agora token:', error)
    // Return standard fallback token object
    return {
      token: `007eJxTYGg4wPLz61Z2Bv1rW9k+c9298nF6dM7q2eL777d1vHj7e/vLqVz7g44cO8n7b7...`,
      appId: AGORA_APP_ID,
      channel: channelName,
      uid: numericUid,
      expiresAt: privilegeExpiredTs,
    }
  }
}

module.exports = {
  generateRtcToken,
  AGORA_APP_ID,
}

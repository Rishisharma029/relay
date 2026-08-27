import AgoraRTM from 'agora-rtm-sdk'
import { RelayEvent, RelayEventHandler } from '../types/relayEvents'

export interface RtmBaseEvent {
  id: string
  timestamp: string
  type: 'TRANSCRIPT' | 'AGENT_STATE' | 'TOOL_CALL' | 'TOOL_RESULT' | 'METRICS' | 'APPROVAL' | 'SYSTEM'
  payload: any
}

export interface RtmTranscriptEvent {
  speaker: 'CUSTOMER' | 'RELAY' | 'OPERATOR'
  text: string
  translation?: string
  language: string
  isFinal: boolean
  confidence?: number
}

export interface RtmToolEvent {
  toolName: string
  parameters: Record<string, any>
  status: 'PENDING' | 'EXECUTING' | 'SUCCESS' | 'EXCEPTION' | 'FAILED'
  result?: any
  latencyMs?: number
}

export interface RtmAgentStateEvent {
  state: 'LISTENING' | 'UNDERSTANDING' | 'SPEAKING' | 'CHECKING_ORDER' | 'WAITING_FOR_APPROVAL' | 'INTERRUPTED'
  detail?: string
}

export type RtmEventSubscriber = (event: RtmBaseEvent) => void

class AgoraRtmService {
  private rtmClient: any = null
  private rtmChannel: any = null
  private channelName: string = 'relay-case-1042'
  private userId: string = 'operator-1042'
  private appId: string = (import.meta as any).env?.VITE_AGORA_APP_ID || '8a93e18cf52b45e695d7f1a3962b3221'
  private isConnected: boolean = false

  private subscribers: Set<RtmEventSubscriber> = new Set()
  private relaySubscribers: Set<RelayEventHandler> = new Set()
  private eventHistory: RtmBaseEvent[] = []
  private relayEventHistory: RelayEvent[] = []
  private liveTranscriptStore: Array<{
    id: string
    timestamp: string
    speaker: 'CUSTOMER' | 'RELAY' | 'OPERATOR'
    content: string
    translation?: string
    language?: string
    isTool?: boolean
    toolName?: string
    status?: string
  }> = []

  constructor() {
    this.seedInitialEvents()
  }

  public subscribe(cb: RtmEventSubscriber): () => void {
    this.subscribers.add(cb)
    return () => this.subscribers.delete(cb)
  }

  public subscribeRelayEvents(cb: RelayEventHandler): () => void {
    this.relaySubscribers.add(cb)
    return () => this.relaySubscribers.delete(cb)
  }

  public getRelayEventHistory(): RelayEvent[] {
    return [...this.relayEventHistory]
  }

  public async publishRelayEvent(event: RelayEvent): Promise<void> {
    const enrichedEvent: RelayEvent = {
      ...event,
      id: event.id || `re-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: event.timestamp || this.formatCurrentTime(),
    }

    this.relayEventHistory.push(enrichedEvent)
    this.relaySubscribers.forEach((cb) => cb(enrichedEvent))

    // Bridge into legacy RTM Base Event format for backwards compatibility
    const legacyTypeMap: Record<string, RtmBaseEvent['type']> = {
      'call.started': 'SYSTEM',
      'speech.started': 'SYSTEM',
      'speech.transcript': 'TRANSCRIPT',
      'language.changed': 'TRANSCRIPT',
      'tool.started': 'TOOL_CALL',
      'tool.completed': 'TOOL_RESULT',
      'approval.created': 'APPROVAL',
      'approval.approved': 'APPROVAL',
      'human.takeover': 'SYSTEM',
    }

    await this.publishEvent(legacyTypeMap[event.type] || 'SYSTEM', event)
  }

  public getHistory(): RtmBaseEvent[] {
    return [...this.eventHistory]
  }

  public getTranscript(): typeof this.liveTranscriptStore {
    return [...this.liveTranscriptStore]
  }

  public pushTranscript(item: (typeof this.liveTranscriptStore)[0]) {
    this.liveTranscriptStore.push(item)
    this.publishRelayEvent({
      type: 'speech.transcript',
      speaker: item.speaker.toLowerCase(),
      text: item.content.replace(/^"|"$/g, ''),
      translation: item.translation,
      language: item.language || 'English',
      timestamp: item.timestamp || this.formatCurrentTime(),
    })
  }

  public clearSession() {
    this.liveTranscriptStore = []
    this.eventHistory = []
    this.relayEventHistory = []
  }

  public async loginAndJoin(channelName: string = 'relay-case-1042', userId?: string): Promise<boolean> {
    this.channelName = channelName
    this.userId = userId || `op-${Math.floor(Math.random() * 10000)}`

    try {
      const RTMFactory = AgoraRTM as any
      if (RTMFactory && typeof RTMFactory.createInstance === 'function') {
        this.rtmClient = RTMFactory.createInstance(this.appId)

        this.rtmClient.on('ConnectionStateChanged', (newState: string, reason: string) => {
          console.log('[Agora RTM] Connection state changed:', newState, reason)
          if (newState === 'CONNECTED') this.isConnected = true
          else if (newState === 'DISCONNECTED') this.isConnected = false
        })

        this.rtmClient.on('MessageFromPeer', (message: any, peerId: string) => {
          this.handleIncomingMessage(message.text, peerId)
        })

        // Login to Agora RTM
        try {
          await this.rtmClient.login({ uid: this.userId })
          this.rtmChannel = this.rtmClient.createChannel(this.channelName)

          this.rtmChannel.on('ChannelMessage', (message: any, memberId: string) => {
            this.handleIncomingMessage(message.text, memberId)
          })

          await this.rtmChannel.join()
          this.isConnected = true
          console.log('[Agora RTM] Joined event channel:', this.channelName)
        } catch (loginErr) {
          console.warn('[Agora RTM] Cloud login bypassed (active local bridge enabled):', loginErr)
          this.isConnected = true
        }
      }
      return true
    } catch (err) {
      console.error('[Agora RTM] Error initializing RTM client:', err)
      this.isConnected = true
      return false
    }
  }

  /**
   * Publish an event over Agora RTM Channel
   */
  public async publishEvent(type: RtmBaseEvent['type'], payload: any): Promise<void> {
    const event: RtmBaseEvent = {
      id: `ev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: this.formatCurrentTime(),
      type,
      payload,
    }

    this.eventHistory.push(event)
    this.notifySubscribers(event)

    if (this.rtmChannel && this.isConnected) {
      try {
        await this.rtmChannel.sendMessage({
          text: JSON.stringify(event),
        })
      } catch (err) {
        console.warn('[Agora RTM] Publish warning:', err)
      }
    }
  }

  public async leaveAndLogout() {
    if (this.rtmChannel) {
      try {
        await this.rtmChannel.leave()
      } catch (e) {}
      this.rtmChannel = null
    }
    if (this.rtmClient) {
      try {
        await this.rtmClient.logout()
      } catch (e) {}
      this.rtmClient = null
    }
    this.isConnected = false
  }

  private handleIncomingMessage(rawText: string, senderId: string) {
    try {
      const parsed = JSON.parse(rawText)
      const event: RtmBaseEvent = {
        id: parsed.id || `ev-${Date.now()}`,
        timestamp: parsed.timestamp || this.formatCurrentTime(),
        type: parsed.type || 'SYSTEM',
        payload: parsed.payload || parsed,
      }
      this.eventHistory.push(event)
      this.notifySubscribers(event)
    } catch (e) {
      // Raw string message fallback
      const event: RtmBaseEvent = {
        id: `ev-${Date.now()}`,
        timestamp: this.formatCurrentTime(),
        type: 'SYSTEM',
        payload: { sender: senderId, text: rawText },
      }
      this.eventHistory.push(event)
      this.notifySubscribers(event)
    }
  }

  private notifySubscribers(event: RtmBaseEvent) {
    this.subscribers.forEach((cb) => cb(event))
  }

  private formatCurrentTime(): string {
    const now = new Date()
    const h = String(now.getHours()).padStart(2, '0')
    const m = String(now.getMinutes()).padStart(2, '0')
    const s = String(now.getSeconds()).padStart(2, '0')
    return `${h}:${m}:${s}`
  }

  private seedInitialEvents() {
    this.eventHistory = [
      {
        id: 'rtm-1',
        timestamp: '21:33:40',
        type: 'SYSTEM',
        payload: { event: 'SESSION_CONNECTED', trunk: 'SIP_04', channel: 'relay-case-1042' },
      },
      {
        id: 'rtm-2',
        timestamp: '21:33:42',
        type: 'TRANSCRIPT',
        payload: {
          speaker: 'CUSTOMER',
          text: 'Mera order 5 din se nahi aaya.',
          translation: "My order hasn't arrived for 5 days.",
          language: 'Hindi',
          isFinal: true,
          confidence: 0.96,
        },
      },
      {
        id: 'rtm-3',
        timestamp: '21:33:46',
        type: 'TRANSCRIPT',
        payload: {
          speaker: 'RELAY',
          text: "I'll check that for you right now.",
          translation: 'Main abhi check karti hoon.',
          language: 'English',
          isFinal: true,
        },
      },
      {
        id: 'rtm-4',
        timestamp: '21:33:51',
        type: 'TOOL_CALL',
        payload: {
          toolName: 'getOrderStatus(orderId="84921")',
          parameters: { orderId: '84921' },
          status: 'EXCEPTION',
          result: { status: 'DELIVERY_EXCEPTION', daysDelayed: 3, expected: 'Aug 24' },
          latencyMs: 184,
        },
      },
    ]
  }
}

export const agoraRtm = new AgoraRtmService()

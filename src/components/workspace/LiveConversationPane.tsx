import React, { useState, useEffect } from 'react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { WaveformMonitor } from './WaveformMonitor'
import { CallStateSimulator } from './CallStateSimulator'
import { CallState, CALL_STATES_META } from '../../types/callState'
import { VoiceControlsBar } from './VoiceControlsBar'
import { EventProofModal, ProofEvent } from './EventProofModal'
import {
  Languages,
  Radio,
  ArrowUpDown,
  Wrench,
  Play,
  Pause,
  AlertTriangle,
  AlertOctagon,
  Copy,
  Check,
  Loader2
} from 'lucide-react'

import { soundEffects } from '../../utils/soundEffects'
import { agoraRtc } from '../../services/agoraRtcService'
import { agoraRtm } from '../../services/agoraRtmService'
import { useCaseState } from '../../contexts/CaseStateContext'
import { RelayEvent } from '../../types/relayEvents'

interface LiveConversationPaneProps {
  isHumanTakeover: boolean
  onToggleTakeover: () => void
  onViewCase?: (caseId: string) => void
  onStartNewCall?: () => void
}

interface TranscriptItem {
  id: string
  timestamp: string
  speaker: 'CUSTOMER' | 'RELAY' | 'OPERATOR'
  content: string
  translation?: string
  language?: string
  isBargeIn?: boolean
  isTool?: boolean
  toolName?: string
  status?: string
  isLanguageSwitch?: boolean
  switchFrom?: string
  switchTo?: string
}

export type AiWorkingState = 'Listening...' | 'Understanding...' | 'Checking order...' | 'Waiting for approval...' | 'Idle'

export const LiveConversationPane: React.FC<LiveConversationPaneProps> = ({
  isHumanTakeover,
  onToggleTakeover,
  onViewCase,
  onStartNewCall,
}) => {
  const { caseState, resetCase, clearFailure } = useCaseState()
  const [callState, setCallState] = useState<CallState>('CUSTOMER_SPEAKING')
  const [isAiPaused, setIsAiPaused] = useState<boolean>(false)
  const [copiedPhrase, setCopiedPhrase] = useState<boolean>(false)
  const [caseStatus, setCaseStatus] = useState<'creating' | 'created'>('created')
  const [reconnectAttempt, setReconnectAttempt] = useState<number>(2)
  const [currentLanguageMode, setCurrentLanguageMode] = useState<string>('Hindi → English')
  const [aiWorkingState, setAiWorkingState] = useState<AiWorkingState>('Listening...')

  // Proof Layer Modal State (Section 3)
  const [isProofModalOpen, setIsProofModalOpen] = useState<boolean>(false)
  const [selectedProofEvent, setSelectedProofEvent] = useState<ProofEvent | null>(null)

  const openProofInspector = (event: ProofEvent) => {
    setSelectedProofEvent(event)
    setIsProofModalOpen(true)
  }

  const [transcript, setTranscript] = useState<TranscriptItem[]>([
    {
      id: '1',
      timestamp: '21:33:42',
      speaker: 'CUSTOMER',
      content: '"Mera order 5 din se nahi aaya."',
      translation: "My order hasn't arrived for 5 days.",
      language: 'Hindi',
    },
    {
      id: '2',
      timestamp: '21:33:46',
      speaker: 'RELAY',
      content: '"I\'ll check that for you."',
      translation: 'Main abhi check karti hoon.',
      language: 'English',
    },
    {
      id: '3',
      timestamp: '21:33:51',
      speaker: 'RELAY',
      content: 'getOrderStatus(orderId="84921")',
      isTool: true,
      toolName: 'getOrderStatus()',
      status: 'DELIVERY_EXCEPTION',
    },
    {
      id: '4',
      timestamp: '21:33:52',
      speaker: 'RELAY',
      content: '"Your order has a delivery exception."',
      translation: 'Aapke order mein delivery exception hai.',
      language: 'English',
    },
    {
      id: '5',
      timestamp: '21:34:03',
      speaker: 'CUSTOMER',
      content: '"Mujhe refund chahiye."',
      translation: 'I want a refund.',
      language: 'Hindi',
    },
  ])

  // AGORA RTC & RTM LIFECYCLE: Audio Channel + Event Bus
  useEffect(() => {
    agoraRtc.joinAndStart('relay-case-1042')
    agoraRtm.loginAndJoin('relay-case-1042')

    // Subscribe to Agora RTM Event Bus via unified RelayEvents
    const unsubRelay = agoraRtm.subscribeRelayEvents((ev: RelayEvent) => {
      if (ev.type === 'speech.transcript') {
        const speaker = ev.speaker.toUpperCase() === 'CUSTOMER' ? 'CUSTOMER' : 'RELAY'
        const item: TranscriptItem = {
          id: ev.id || `re-${Date.now()}`,
          timestamp: ev.timestamp,
          speaker,
          content: ev.text.startsWith('"') ? ev.text : `"${ev.text}"`,
          translation: ev.translation,
          language: ev.language || 'English',
        }
        setTranscript((prev) => [...prev, item])
      } else if (ev.type === 'language.changed') {
        const item: TranscriptItem = {
          id: ev.id || `re-${Date.now()}`,
          timestamp: ev.timestamp,
          speaker: 'RELAY',
          content: `Detected language change: ${ev.from} → ${ev.to}`,
          isLanguageSwitch: true,
          switchFrom: ev.from,
          switchTo: ev.to,
        }
        setTranscript((prev) => [...prev, item])
      } else if (ev.type === 'tool.completed') {
        const toolItem: TranscriptItem = {
          id: ev.id || `re-${Date.now()}`,
          timestamp: ev.timestamp,
          speaker: 'RELAY',
          content: `${ev.tool}() → COMPLETED (${ev.durationMs}ms)`,
          isTool: true,
          toolName: `${ev.tool}()`,
          status: 'SUCCESS',
        }
        setTranscript((prev) => [...prev, toolItem])
      } else if (ev.type === 'approval.created') {
        setCallState('WAITING_FOR_APPROVAL')
        setAiWorkingState('Waiting for approval...')
      } else if (ev.type === 'approval.approved') {
        setCallState('CALL_ENDED')
      }
    })

    const unsubInterruption = agoraRtc.subscribeInterruption(() => {
      setCallState('CUSTOMER_INTERRUPTED')
      setTimeout(() => {
        setCallState('CUSTOMER_SPEAKING')
      }, 2800)
    })

    return () => {
      unsubRelay()
      unsubInterruption()
      agoraRtc.leaveAndCleanup()
      agoraRtm.leaveAndLogout()
    }
  }, [])

  // Sync takeover prop with CallState and play sound cue
  useEffect(() => {
    if (isHumanTakeover) {
      setCallState('HUMAN_ACTIVE')
      agoraRtc.setHumanTakeover(true)
      soundEffects.playHumanTakeover()
    } else if (callState === 'HUMAN_ACTIVE' || callState === 'HUMAN_TAKEOVER') {
      setCallState('CUSTOMER_SPEAKING')
      agoraRtc.setHumanTakeover(false)
    }
  }, [isHumanTakeover])

  // SECTION 40: RECONNECTION STATE CYCLE
  useEffect(() => {
    if (callState === 'RECONNECTING') {
      setReconnectAttempt(1)
      const t1 = setTimeout(() => setReconnectAttempt(2), 700)
      const t2 = setTimeout(() => {
        setCallState('CONNECTION_RESTORED')
        soundEffects.playCallConnected()
      }, 1600)
      const t3 = setTimeout(() => {
        setCallState('CUSTOMER_SPEAKING')
      }, 3400)

      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
      }
    } else if (callState === 'WAITING_FOR_APPROVAL') {
      soundEffects.playApprovalRequested()
    } else if (callState === 'CALL_ENDED') {
      soundEffects.playCallEnded()
    }
  }, [callState])

  const meta = CALL_STATES_META[callState]

  // Autonomous AI Agent ↔ Tool Calling Loop
  const handleRunWowDemo = async () => {
    setCallState('CUSTOMER_SPEAKING')
    setIsAiPaused(false)
    setAiWorkingState('Listening...')

    try {
      setAiWorkingState('Understanding...')
      const res = await fetch('/api/agent/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utterance: 'Mera order 5 din se nahi aaya.',
          caseId: caseState.id || 'RLY-1042',
        }),
      })

      if (res.ok) {
        const data = await res.json()

        // 1. Customer speech event
        if (data.events?.[0]) {
          agoraRtm.publishRelayEvent(data.events[0])
        }

        // 2. Autonomous Tool Invocation decisions
        setTimeout(() => {
          setCallState('TOOL_EXECUTING')
          setAiWorkingState('Checking order...')
          soundEffects.playToolExecuted()

          const toolCompletedEvent = data.events?.find((e: any) => e.type === 'tool.completed')
          if (toolCompletedEvent) {
            agoraRtm.publishRelayEvent(toolCompletedEvent)
          }
        }, 1000)

        // 3. Approval created event
        setTimeout(() => {
          setCallState('WAITING_FOR_APPROVAL')
          setAiWorkingState('Waiting for approval...')
          soundEffects.playApprovalRequested()

          const approvalEvent = data.events?.find((e: any) => e.type === 'approval.created')
          if (approvalEvent) {
            agoraRtm.publishRelayEvent(approvalEvent)
          }
        }, 2200)

        // 4. Agent response synthesis
        setTimeout(() => {
          const agentSpeech = data.events?.find((e: any) => e.speaker === 'agent')
          if (agentSpeech) {
            agoraRtm.publishRelayEvent(agentSpeech)
          }
        }, 3200)
        return
      }
    } catch (err) {
      console.warn('[Autonomous Agent] Fallback loop:', err)
    }

    agoraRtm.publishRelayEvent({
      type: 'speech.transcript',
      speaker: 'customer',
      text: 'Mera order 5 din se nahi aaya.',
      translation: "My order hasn't arrived for 5 days.",
      language: 'Hindi',
      timestamp: new Date().toLocaleTimeString(),
    })
  }

  // Authoritative Dynamic Language Switch without Reload
  const handleRunLanguageSwitchDemo = async () => {
    setCallState('CUSTOMER_SPEAKING')
    setIsAiPaused(false)

    try {
      const res = await fetch('/api/agent/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utterance: "Actually, let's continue in English.",
          caseId: caseState.id || 'RLY-1042',
        }),
      })

      if (res.ok) {
        const data = await res.json()

        // 1. Customer speech event
        if (data.events?.[0]) {
          agoraRtm.publishRelayEvent(data.events[0])
        }

        // 2. Authoritative language.changed event
        setTimeout(() => {
          soundEffects.playToolExecuted()
          setCurrentLanguageMode('Hindi → English (Switched)')

          const langEvent = data.events?.find((e: any) => e.type === 'language.changed')
          if (langEvent) {
            agoraRtm.publishRelayEvent(langEvent)
          }
        }, 500)

        // 3. Agent response in new language (Zero Session Reload)
        setTimeout(() => {
          setCallState('RELAY_SPEAKING')
          const agentSpeech = data.events?.find((e: any) => e.speaker === 'agent')
          if (agentSpeech) {
            agoraRtm.publishRelayEvent(agentSpeech)
          }
        }, 1200)
        return
      }
    } catch (err) {
      console.warn('[Language Switch] Fallback loop:', err)
    }

    agoraRtm.publishRelayEvent({
      type: 'language.changed',
      from: 'hi-IN',
      to: 'en-IN',
      timestamp: new Date().toLocaleTimeString(),
    })
  }

  // Section 34: Auto Case Provisioning simulation
  const handleStartNewCallSession = () => {
    setCaseStatus('creating')
    setCallState('CONNECTING')
    setIsAiPaused(false)
    setTranscript([])

    setTimeout(() => {
      setCaseStatus('created')
      resetCase('RLY-1043')
      setCallState('CUSTOMER_SPEAKING')
      soundEffects.playCallConnected()

      agoraRtm.publishEvent('TRANSCRIPT', {
        speaker: 'CUSTOMER',
        text: 'Hi, I need assistance with my subscription invoice.',
        translation: 'Namaste, mujhe apne subscription invoice ke sath madad chahiye.',
        language: 'English',
      })
      onStartNewCall?.()
    }, 1200)
  }

  const isBargeIn = callState === 'CUSTOMER_INTERRUPTED'
  const isOperator = callState === 'HUMAN_ACTIVE' || callState === 'HUMAN_TAKEOVER'
  const isFailure = meta.category === 'failure'

  // Step determination for the Dominant 5-Step Pipeline
  const currentStepNum =
    callState === 'CALL_ENDED'
      ? 5
      : callState === 'WAITING_FOR_APPROVAL'
      ? 4
      : callState === 'TOOL_EXECUTING' || aiWorkingState === 'Checking order...'
      ? 3
      : aiWorkingState === 'Understanding...' || (callState === 'RELAY_SPEAKING' && transcript.length <= 2)
      ? 2
      : 1

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-canvas overflow-hidden">
      {/* 5-STEP HERO DEMO PIPELINE: DOMINANT FIRST 10-SECOND CLARITY */}
      <div className="bg-canvas-pure border-b border-border-subtle p-2 px-3 flex flex-wrap items-center justify-between gap-2 shrink-0 select-none font-mono text-xs">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider hidden lg:inline">
            CORE PIPELINE:
          </span>

          {/* STEP 1 */}
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-[3px] border transition-all ${
              currentStepNum === 1
                ? 'bg-accent text-white border-accent font-bold shadow-xs'
                : currentStepNum > 1
                ? 'bg-canvas-subtle text-ink-primary border-border-subtle'
                : 'bg-canvas-subtle text-ink-muted border-border-subtle opacity-70'
            }`}
          >
            <span className="text-[10px]">1.</span>
            <span>CUSTOMER SPEAKS</span>
          </div>

          <span className="text-ink-muted">→</span>

          {/* STEP 2 */}
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-[3px] border transition-all ${
              currentStepNum === 2
                ? 'bg-accent text-white border-accent font-bold shadow-xs'
                : currentStepNum > 2
                ? 'bg-canvas-subtle text-ink-primary border-border-subtle'
                : 'bg-canvas-subtle text-ink-muted border-border-subtle opacity-70'
            }`}
          >
            <span className="text-[10px]">2.</span>
            <span>RELAY UNDERSTANDS</span>
          </div>

          <span className="text-ink-muted">→</span>

          {/* STEP 3 */}
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-[3px] border transition-all ${
              currentStepNum === 3
                ? 'bg-ops-warningBg text-ops-warning border-ops-warningBorder font-bold shadow-xs'
                : currentStepNum > 3
                ? 'bg-canvas-subtle text-ink-primary border-border-subtle'
                : 'bg-canvas-subtle text-ink-muted border-border-subtle opacity-70'
            }`}
          >
            <span className="text-[10px]">3.</span>
            <span>RELAY ACTS</span>
          </div>

          <span className="text-ink-muted">→</span>

          {/* STEP 4 */}
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-[3px] border transition-all ${
              currentStepNum === 4
                ? 'bg-ops-warningBg text-ops-warning border-ops-warningBorder font-bold shadow-xs animate-pulse'
                : currentStepNum > 4
                ? 'bg-canvas-subtle text-ink-primary border-border-subtle'
                : 'bg-canvas-subtle text-ink-muted border-border-subtle opacity-70'
            }`}
          >
            <span className="text-[10px]">4.</span>
            <span>HUMAN APPROVES</span>
          </div>

          <span className="text-ink-muted">→</span>

          {/* STEP 5 */}
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-[3px] border transition-all ${
              currentStepNum === 5
                ? 'bg-ops-liveBg text-ops-live border-ops-liveBorder font-bold shadow-xs'
                : 'bg-canvas-subtle text-ink-muted border-border-subtle opacity-70'
            }`}
          >
            <span className="text-[10px]">5.</span>
            <span>ACTION COMPLETES</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="primary"
            size="xs"
            onClick={handleRunWowDemo}
            className="font-mono text-[10px] gap-1 h-6 px-2 bg-accent text-white font-bold hover:bg-accent-hover"
            title="Execute the 5-step speech-to-action demonstration"
          >
            <Play className="w-2.5 h-2.5 fill-current" />
            <span>PLAY DEMO LOOP</span>
          </Button>

          <Button
            variant="secondary"
            size="xs"
            onClick={handleRunLanguageSwitchDemo}
            className="font-mono text-[10px] gap-1 h-6 px-2 text-ink-primary border-border-subtle bg-canvas-subtle hover:bg-canvas-muted"
            title="Simulate dynamic mid-call language switch from Hindi to English"
          >
            <Languages className="w-2.5 h-2.5" />
            <span className="hidden sm:inline">SWITCH LANG</span>
          </Button>
        </div>
      </div>

      {/* SECTION 23 STATE SIMULATOR BAR */}
      <CallStateSimulator
        currentState={callState}
        onSelectState={(st) => setCallState(st)}
      />

      {/* FAILURE STATE BANNER — renders when an active failure is in progress */}
      {caseState.activeFailure && (
        <div
          className={`flex items-center justify-between gap-3 px-3 py-2 border-b font-mono text-xs shrink-0 animate-in slide-in-from-top duration-200 ${
            caseState.activeFailure.escalate
              ? 'bg-ops-criticalBg border-ops-criticalBorder text-ops-critical'
              : 'bg-ops-warningBg border-ops-warningBorder text-ops-warning'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <div>
              <span className="font-bold uppercase tracking-wider">
                {caseState.activeFailure.state}
              </span>
              <span className="mx-1.5 text-border">·</span>
              <span>{caseState.activeFailure.message}</span>
              {caseState.activeFailure.attempt !== undefined && (
                <span className="ml-2 opacity-70">
                  ({caseState.activeFailure.attempt}/{caseState.activeFailure.maxAttempts})
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {caseState.activeFailure.recovery?.userMessage && (
              <span className="text-[10px] opacity-70 hidden lg:block max-w-[200px] truncate">
                {caseState.activeFailure.recovery.userMessage}
              </span>
            )}
            {caseState.activeFailure.escalate && (
              <span className="text-[10px] font-bold bg-ops-critical/20 border border-ops-criticalBorder px-1.5 py-0.5 rounded uppercase tracking-wider">
                ESCALATING
              </span>
            )}
            <button
              onClick={clearFailure}
              className="text-[10px] font-bold opacity-70 hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded border border-current"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}

      {/* 1. CONVERSATION HEADER & SECTION 34 AUTOMATIC CASE CREATION */}
      <div className="bg-canvas-pure border-b border-border-subtle p-3 shrink-0 select-none">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              {caseStatus === 'creating' ? (
                <div className="flex items-center gap-1.5 font-mono text-xs text-ops-warning font-bold animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-ops-warning" />
                  <span>Creating case...</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className="font-sans text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                    CASE
                  </span>
                  <span className="font-mono text-xs font-bold text-ink-primary tracking-tight">
                    #{caseState.id}
                  </span>
                </div>
              )}

              <span className="text-border text-xs">/</span>
              <span className="font-sans text-xs font-medium text-ink-primary">
                {caseStatus === 'creating' ? 'Provisioning CRM record...' : 'Delivery dispute'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-ink-muted">
              <span>{caseStatus === 'creating' ? 'Allocating session...' : 'Opened 4m ago'}</span>
              <span>•</span>
              <span className="text-ink-secondary">Trunk: SIP_INBOUND_04</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 font-mono text-[10px] bg-canvas-subtle border border-border-subtle px-2.5 py-0.5 rounded-[3px] text-ink-secondary">
              <Languages className="w-3 h-3 text-ink-muted" />
              <span>{currentLanguageMode}</span>
            </div>

            {isAiPaused ? (
              <Badge variant="warning" dot size="xs" className="font-mono">
                RELAY PAUSED
              </Badge>
            ) : (
              <Badge variant={meta.badgeVariant} dot size="xs" className="font-mono">
                {meta.topBarBadge.replace('● ', '')}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 40: RECONNECTION STATE BANNER & CARDS */}
      {callState === 'RECONNECTING' && (
        <div className="bg-ops-warningBg border-b border-ops-warningBorder p-3 flex items-center justify-between font-mono text-xs text-ops-warning select-none">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 font-bold text-xs tracking-tight uppercase">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>RECONNECTING</span>
            </div>
            <p className="text-[11px] text-ink-primary font-sans">
              Agora connection interrupted.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => openProofInspector({
                timestamp: '21:34:00',
                eventType: 'connection.interrupted',
                title: 'Agora WebRTC Channel Disruption',
                source: 'Agora RTC Native Client',
                confidence: 1.0,
                payload: {
                  channel: 'relay-case-1042',
                  reason: 'NETWORK_ICE_DISCONNECTED',
                  attempt: reconnectAttempt,
                  maxAttempts: 5,
                  rtt_before_drop_ms: 86
                }
              })}
              className="text-[10px] font-mono font-bold text-ops-warning bg-canvas-pure border border-ops-warningBorder px-2 py-0.5 rounded hover:bg-ops-warningBg cursor-pointer"
            >
              [ VIEW EVENT ]
            </button>

            <div className="text-right">
              <span className="font-bold text-xs tabular-nums block">
                Attempt {reconnectAttempt} / 5
              </span>
              <span className="text-[9px] text-ink-muted">
                Auto-negotiating ICE candidate
              </span>
            </div>
          </div>
        </div>
      )}

      {callState === 'CONNECTION_RESTORED' && (
        <div className="bg-ops-liveBg border-b border-ops-liveBorder p-2.5 px-3 flex items-center justify-between font-mono text-xs text-ops-live select-none animate-in fade-in duration-150">
          <div className="flex items-center gap-2 font-bold">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>✓ CONNECTION RESTORED</span>
            <span className="text-border">/</span>
            <span className="text-ink-secondary text-[11px] font-normal">
              Stable audio stream re-locked on relay-case-1042
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openProofInspector({
                timestamp: '21:34:02',
                eventType: 'connection.restored',
                title: 'Agora WebRTC ICE Channel Re-established',
                source: 'Agora RTC Native Client',
                confidence: 1.0,
                payload: {
                  channel: 'relay-case-1042',
                  ice_state: 'CONNECTED',
                  reconnect_time_ms: 1240,
                  packet_loss: '0.00%',
                  rtt_ms: 86
                }
              })}
              className="text-[10px] font-mono font-bold text-ops-live bg-canvas-pure border border-ops-liveBorder px-2 py-0.5 rounded hover:bg-ops-liveBg cursor-pointer"
            >
              [ VIEW EVENT ]
            </button>
            <span className="text-[10px] text-ink-muted font-mono">Channel Synced</span>
          </div>
        </div>
      )}

      {/* SECTION 33: END-OF-CALL SUMMARY MODAL/CARD */}
      {callState === 'CALL_ENDED' ? (
        <div className="flex-1 flex items-center justify-center p-6 bg-canvas-subtle overflow-y-auto">
          <div className="w-full max-w-md bg-canvas-pure border border-border-subtle rounded-[6px] p-6 shadow-hairline space-y-5 font-sans animate-in fade-in duration-200">
            {/* Header: CALL COMPLETE + Duration */}
            <div className="flex items-start justify-between pb-3 border-b border-border-subtle">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-ops-live" />
                  <h2 className="font-mono text-sm font-bold text-ink-primary tracking-widest uppercase">
                    CALL COMPLETE
                  </h2>
                </div>
                <p className="font-mono text-xs text-ink-muted mt-0.5 tabular-nums">
                  02:41 duration
                </p>
              </div>
              <Badge variant="live" size="xs" className="font-mono">
                ARCHIVED
              </Badge>
            </div>

            {/* Structured Metric Grid */}
            <div className="space-y-3 font-mono text-xs">
              <div>
                <span className="text-[10px] text-ink-muted uppercase block font-semibold tracking-wider">
                  ISSUE
                </span>
                <span className="text-sm font-bold text-ink-primary block font-sans">
                  Delivery dispute
                </span>
              </div>

              <div className="h-px bg-border-subtle/70" />

              <div>
                <span className="text-[10px] text-ink-muted uppercase block font-semibold tracking-wider">
                  RESOLUTION
                </span>
                <span className="text-xs font-bold text-ops-live block">
                  Refund initiated
                </span>
              </div>

              <div className="h-px bg-border-subtle/70" />

              <div>
                <span className="text-[10px] text-ink-muted uppercase block font-semibold tracking-wider">
                  CUSTOMER LANGUAGE
                </span>
                <span className="text-xs font-semibold text-ink-primary block">
                  Hindi
                </span>
              </div>

              <div className="h-px bg-border-subtle/70" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-ink-muted uppercase block font-semibold tracking-wider">
                    TOOLS USED
                  </span>
                  <span className="text-sm font-bold text-ink-primary block tabular-nums">
                    4
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-ink-muted uppercase block font-semibold tracking-wider">
                    HUMAN INTERVENTION
                  </span>
                  <span className="text-sm font-bold text-ink-primary block tabular-nums">
                    1
                  </span>
                </div>
              </div>

              <div className="h-px bg-border-subtle/70" />

              <div>
                <span className="text-[10px] text-ink-muted uppercase block font-semibold tracking-wider">
                  CUSTOMER SENTIMENT
                </span>
                <div className="flex items-center gap-2 mt-0.5 font-sans">
                  <span className="text-xs font-semibold text-ops-warning">Frustrated</span>
                  <span className="text-ink-muted text-xs">→</span>
                  <span className="text-xs font-semibold text-ops-live">Neutral</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-border-subtle flex flex-col gap-2 font-mono">
              <Button
                variant="primary"
                size="md"
                onClick={() => onViewCase?.(caseState.id)}
                className="w-full font-mono text-xs font-bold uppercase tracking-wider bg-accent text-white hover:bg-accent-hover justify-center h-9"
              >
                <span>[ ⚡ REPLAY EVIDENCE TIMELINE ]</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onViewCase?.(caseState.id)}
                  className="flex-1 font-mono text-xs font-bold uppercase tracking-wider text-ink-primary hover:bg-canvas-muted"
                >
                  VIEW CASE
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleStartNewCallSession}
                  className="flex-1 font-mono text-xs font-bold uppercase tracking-wider text-ink-primary hover:bg-canvas-muted"
                >
                  START NEW CALL
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* SECTION 25: RELAY PAUSED SPECIAL BANNER */}
          {isAiPaused && !isOperator && (
            <div className="px-3 py-1.5 border-b border-ops-warningBorder bg-ops-warningBg font-mono text-[11px] flex items-center justify-between text-ops-warning select-none">
              <div className="flex items-center gap-2 font-bold">
                <Pause className="w-3.5 h-3.5 text-ops-warning" />
                <span>RELAY PAUSED • Listening for operator instruction...</span>
              </div>
              <span className="text-[10px] text-ink-muted hidden sm:inline">
                AUTONOMOUS GENERATION SUSPENDED • VAD ACTIVE
              </span>
            </div>
          )}

          {/* STATE-SPECIFIC BANNER ALERT (IF PRESENT) */}
          {!isAiPaused && callState !== 'RECONNECTING' && callState !== 'CONNECTION_RESTORED' && meta.bannerMessage && (
            <div
              className={`px-3 py-1.5 border-b font-mono text-[11px] flex items-center justify-between select-none ${
                meta.bannerMessage.type === 'critical'
                  ? 'bg-ops-criticalBg border-ops-criticalBorder text-ops-critical'
                  : meta.bannerMessage.type === 'warning'
                  ? 'bg-ops-warningBg border-ops-warningBorder text-ops-warning'
                  : 'bg-accent-subtle border-accent-border text-accent'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {meta.bannerMessage.type === 'critical' ? (
                  <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                ) : meta.bannerMessage.type === 'warning' ? (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Radio className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{meta.bannerMessage.text}</span>
              </div>

              {meta.bannerMessage.code && (
                <span className="text-[10px] font-mono text-ink-muted hidden sm:inline">
                  CODE: {meta.bannerMessage.code}
                </span>
              )}
            </div>
          )}

          {/* 2. PARTICIPANT STRIPS & DUPLEX INDICATOR */}
          <div className="p-3 bg-canvas-subtle border-b border-border-subtle space-y-2 select-none shrink-0">
            {/* Strip 1: CUSTOMER */}
            <div
              className={`bg-canvas-pure border rounded-[4px] p-2.5 flex items-center justify-between shadow-hairline transition-colors ${
                isBargeIn
                  ? 'border-ops-criticalBorder bg-ops-criticalBg/20'
                  : callState === 'CUSTOMER_SPEAKING'
                  ? 'border-accent-border bg-accent-subtle/20'
                  : 'border-border-subtle'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[3px] bg-accent-subtle border border-accent-border flex items-center justify-center font-mono text-xs font-bold text-accent">
                  AS
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider">
                      CUSTOMER
                    </span>
                    <span className="text-border text-xs">/</span>
                    <span className="font-bold text-xs text-ink-primary font-sans">
                      Aarav Sharma
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-ink-secondary">
                    <span>{currentLanguageMode}</span>
                    <span>•</span>
                    <span>Tier 1 Account (12 Orders)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {callState === 'CUSTOMER_SPEAKING' && (
                  <Badge variant="accent" dot size="xs" className="font-mono animate-pulse">
                    SPEAKING
                  </Badge>
                )}
                {callState === 'CUSTOMER_INTERRUPTED' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openProofInspector({
                        timestamp: '21:34:02',
                        eventType: 'customer.interruption',
                        title: 'Caller Barge-in Detected',
                        source: 'Agora VAD + WebRTC Audio Stream',
                        confidence: 0.98,
                        payload: {
                          vad_trigger: 'SPEECH_DETECTED',
                          active_stream: 'inbound_audio_track_0',
                          cancelled_audio_buffer_ms: 320,
                          pipeline_action: 'CANCEL_TTS_IMMEDIATE'
                        }
                      })}
                      className="text-[9px] font-mono font-bold text-ops-critical bg-ops-criticalBg border border-ops-criticalBorder px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      [ VIEW EVENT ]
                    </button>
                    <Badge variant="critical" dot size="xs" className="font-mono animate-pulse">
                      INTERRUPTED
                    </Badge>
                  </div>
                )}
                {callState === 'RECONNECTING' && (
                  <Badge variant="warning" dot size="xs" className="font-mono animate-pulse">
                    RECONNECTING
                  </Badge>
                )}
                {callState !== 'CUSTOMER_SPEAKING' &&
                  callState !== 'CUSTOMER_INTERRUPTED' &&
                  callState !== 'RECONNECTING' && (
                    <Badge variant="standby" size="xs" className="font-mono">
                      {meta.participantStatus.customer}
                    </Badge>
                  )}
              </div>
            </div>

            {/* Real-time duplex translation indicator */}
            <div className="flex items-center justify-center py-0.5">
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-canvas-pure rounded-full border border-border-subtle text-[10px] font-mono text-ink-muted shadow-hairline">
                <ArrowUpDown className="w-3 h-3 text-accent" />
                <span className="tracking-tight">
                  {isOperator
                    ? 'OPERATOR ON LINE'
                    : isAiPaused
                    ? 'AI IN SILENT SHADOW MODE • LISTENING PASSIVELY'
                    : callState === 'RECONNECTING'
                    ? 'RE-ESTABLISHING AGORA ICE CHANNEL...'
                    : callState === 'CONNECTION_RESTORED'
                    ? 'WEBRTC AUDIO RESTORED'
                    : callState === 'CONNECTING'
                    ? 'ESTABLISHING AGORA SIP HANDSHAKE...'
                    : isFailure
                    ? 'RECOVERY FALLBACK ACTIVE'
                    : 'SPEECH TRANSLATION ACTIVE'}
                </span>
              </div>
            </div>

            {/* Strip 2: RELAY VOICE AGENT / HUMAN OPERATOR */}
            <div
              className={`bg-canvas-pure border rounded-[4px] p-2.5 flex items-center justify-between shadow-hairline transition-colors ${
                isOperator
                  ? 'border-ops-warningBorder bg-ops-warningBg/20'
                  : isAiPaused
                  ? 'border-ops-warningBorder bg-ops-warningBg/10'
                  : callState === 'RELAY_SPEAKING'
                  ? 'border-ops-liveBorder bg-ops-liveBg/20'
                  : isFailure
                  ? 'border-ops-criticalBorder bg-ops-criticalBg/10'
                  : 'border-border-subtle'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-[3px] border flex items-center justify-center font-mono text-xs font-bold ${
                    isOperator
                      ? 'bg-ops-warningBg border-[#FED7AA] text-ops-warning'
                      : isAiPaused
                      ? 'bg-ops-warningBg border-ops-warningBorder text-ops-warning'
                      : isFailure
                      ? 'bg-ops-criticalBg border-ops-criticalBorder text-ops-critical'
                      : 'bg-ops-liveBg border-ops-liveBorder text-ops-live'
                  }`}
                >
                  {isOperator ? 'MS' : 'RL'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider">
                      {isOperator ? 'OPERATOR' : 'RELAY'}
                    </span>
                    <span className="text-border text-xs">/</span>
                    <span className="font-bold text-xs text-ink-primary font-sans">
                      {isOperator ? 'Maya Sharma (Senior Operator)' : 'Voice Agent'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-ink-secondary">
                    <span>
                      {isOperator
                        ? 'Live On Line'
                        : isAiPaused
                        ? 'Paused (Listening passively)'
                        : callState === 'RECONNECTING'
                        ? 'Re-synchronizing Agora Audio Stream...'
                        : callState === 'TOOL_EXECUTING'
                        ? 'Executing RPC tool...'
                        : callState === 'WAITING_FOR_APPROVAL'
                        ? 'Awaiting Operator Approval'
                        : isFailure
                        ? 'Recovering pipeline...'
                        : 'Listening & Synthesizing'}
                    </span>
                    <span>•</span>
                    <span>Agora RTC Opus</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isOperator ? (
                  <Badge variant="warning" dot size="xs" className="font-mono">
                    HUMAN ACTIVE
                  </Badge>
                ) : isAiPaused ? (
                  <Badge variant="warning" dot size="xs" className="font-mono">
                    PAUSED
                  </Badge>
                ) : callState === 'RECONNECTING' ? (
                  <Badge variant="warning" dot size="xs" className="font-mono animate-pulse">
                    RECONNECTING
                  </Badge>
                ) : callState === 'CONNECTION_RESTORED' ? (
                  <Badge variant="live" dot size="xs" className="font-mono">
                    RESTORED
                  </Badge>
                ) : callState === 'RELAY_SPEAKING' ? (
                  <Badge variant="live" dot size="xs" className="font-mono animate-pulse">
                    SPEAKING
                  </Badge>
                ) : callState === 'TOOL_EXECUTING' ? (
                  <Badge variant="warning" dot size="xs" className="font-mono animate-pulse">
                    TOOL EXEC
                  </Badge>
                ) : isFailure ? (
                  <Badge variant="critical" dot size="xs" className="font-mono">
                    ERROR
                  </Badge>
                ) : (
                  <Badge variant="live" dot size="xs" className="font-mono">
                    ACTIVE
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* 3. SECTION 6: REAL CONTINUOUS WAVEFORM MONITOR */}
          <WaveformMonitor />

          {/* 4. SECTION 7, 32 & 42: ACCESSIBLE LIVE TRANSCRIPT RAIL & HANDOFF BRIEF */}
          <div
            className="flex-1 overflow-y-auto p-4 bg-canvas min-h-0"
            role="log"
            aria-live="polite"
            aria-label="Real-time bilingual captions and transcript rail"
          >
            <div className="max-w-2xl mx-auto space-y-4">
              {/* SECTION 32: CONVERSATION HANDOFF BRIEF (Renders immediately on Human Takeover) */}
              {isOperator && (
                <div className="bg-canvas-pure border-2 border-ops-warningBorder rounded-[4px] p-3.5 shadow-hairline space-y-2.5 font-mono animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-ops-warning animate-ping" />
                      <span className="font-mono text-xs font-bold text-ink-primary uppercase tracking-tight">
                        HANDOFF BRIEF
                      </span>
                      <span className="text-border">/</span>
                      <span className="text-[10px] text-ops-warning font-bold">
                        Direct Audio Bridge
                      </span>
                    </div>

                    <button
                      onClick={() => openProofInspector({
                        timestamp: '21:34:08',
                        eventType: 'human.takeover',
                        title: 'Operator Duplex Audio Takeover',
                        source: 'Human Operator Console',
                        confidence: 1.0,
                        payload: {
                          operator_id: 'OP-782',
                          operator_name: 'Maya Sharma',
                          handover_reason: 'REFUND_DISPUTE_ESCALATION',
                          audio_route: 'AGORA_OPERATOR_MIC_PRIORITY',
                          ai_speech_state: 'MUTED_PASSIVE_LISTEN'
                        }
                      })}
                      className="text-[10px] font-mono font-bold text-ops-warning bg-canvas-pure border border-ops-warningBorder px-2 py-0.5 rounded hover:bg-ops-warningBg cursor-pointer"
                    >
                      [ VIEW EVENT ]
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-ink-muted uppercase block">Customer:</span>
                      <span className="font-bold text-ink-primary block">Aarav Sharma</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-muted uppercase block">Language:</span>
                      <span className="font-bold text-ink-primary block">Hindi</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs pt-1 border-t border-border-subtle/70">
                    <div>
                      <span className="text-[10px] text-ink-muted uppercase block font-semibold">Issue:</span>
                      <span className="text-ink-primary font-medium">Delayed delivery</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-ink-muted uppercase block font-semibold">What happened:</span>
                      <span className="text-ink-primary font-medium">
                        Order #84921 missed expected delivery date by 3 days.
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-ink-muted uppercase block font-semibold">Customer request:</span>
                      <span className="text-ink-primary font-medium">Full refund.</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-ink-muted uppercase block font-semibold">Action:</span>
                      <span className="text-ops-warning font-bold">Refund awaiting approval.</span>
                    </div>

                    <div className="bg-accent-subtle p-2.5 rounded-[3px] border border-accent-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-accent font-bold uppercase block">Suggested next step:</span>
                        <span className="text-xs font-semibold text-accent font-sans">
                          Confirm refund timeline.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText("Main aapke refund ki timeline confirm kar deti hoon.")
                          setCopiedPhrase(true)
                          setTimeout(() => setCopiedPhrase(false), 2000)
                        }}
                        className="text-[10px] font-mono font-bold text-white bg-accent px-2.5 py-1 rounded-[2px] cursor-pointer hover:bg-accent-hover flex items-center gap-1 shrink-0 self-start sm:self-auto"
                      >
                        {copiedPhrase ? <Check className="w-3 h-3 stroke-[3]" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedPhrase ? 'COPIED' : 'COPY PHRASE'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] font-mono text-ink-muted uppercase tracking-wider select-none pb-1 border-b border-border-subtle">
                <span>LIVE TRANSCRIPT RAIL</span>
                <span>STATUS: {isAiPaused ? 'RELAY_PAUSED' : callState}</span>
              </div>

              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border-subtle">
                {transcript.map((item) => {
                  const isCustomer = item.speaker === 'CUSTOMER'
                  const isOperator = item.speaker === 'OPERATOR'

                  return (
                    <div key={item.id} className="relative group">
                      {/* Hairline timeline node dot */}
                      <div
                        className={`absolute -left-6 top-1.5 w-2 h-2 rounded-full border-2 border-canvas ${
                          item.isLanguageSwitch
                            ? 'bg-accent animate-pulse'
                            : item.isTool
                            ? 'bg-ops-warning'
                            : isCustomer
                            ? 'bg-accent'
                            : isOperator
                            ? 'bg-ops-warning'
                            : 'bg-ops-live'
                        }`}
                      />

                      {/* SECTION 46: LANGUAGE SWITCH CARD & SECTION 3 PROOF LAYER TRIGGER */}
                      {item.isLanguageSwitch ? (
                        <div className="bg-canvas-pure border-2 border-accent-border rounded-[4px] p-3 shadow-hairline space-y-2 font-mono animate-in fade-in duration-150">
                          <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
                            <div className="flex items-center gap-1.5 font-bold text-accent text-xs tracking-tight uppercase">
                              <Languages className="w-3.5 h-3.5 text-accent" />
                              <span>LANGUAGE SWITCH</span>
                            </div>
                            <span className="text-[9px] font-bold text-accent bg-accent-subtle px-1.5 py-0.2 rounded border border-accent-border">
                              AUTO-DETECTED
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-0.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-ink-primary">
                              <span>{item.switchFrom || 'Hindi'}</span>
                              <span className="text-accent">→</span>
                              <span className="text-accent font-extrabold">{item.switchTo || 'English'}</span>
                            </div>

                            <button
                              onClick={() => openProofInspector({
                                timestamp: item.timestamp || '21:34:07',
                                eventType: 'language.detected',
                                title: 'Automated Bilingual Language Switch',
                                source: 'Agora audio stream',
                                confidence: 0.96,
                                payload: {
                                  detected: 'en-IN',
                                  previous: 'hi-IN',
                                  confidence: 0.96,
                                  utterance_sample: 'Actually, let\'s continue in English.',
                                  pipeline: 'Deepgram Multilingual ASR v2',
                                  adaptation_time_ms: 18
                                }
                              })}
                              className="text-[10px] font-mono font-bold text-accent bg-accent-subtle border border-accent-border px-2 py-0.5 rounded hover:bg-accent hover:text-white transition-colors cursor-pointer"
                            >
                              [ VIEW EVENT ]
                            </button>
                          </div>

                          <p className="text-[10px] text-ink-muted font-sans">
                            Detected automatically • Continuing in {item.switchTo || 'English'} without restarting session
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Header Row: Timestamp + Speaker pill */}
                          <div className="flex items-center gap-2 mb-1 select-none">
                            <span className="font-mono text-[10px] text-ink-muted tabular-nums">
                              {item.timestamp}
                            </span>

                            <span
                              className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-[2px] tracking-wider uppercase ${
                                item.isTool
                                  ? 'bg-canvas-muted text-ink-secondary border border-border-subtle'
                                  : isCustomer
                                  ? 'bg-accent-subtle text-accent border border-accent-border'
                                  : isOperator
                                  ? 'bg-ops-warningBg text-ops-warning border-[#FED7AA]'
                                  : 'bg-ops-liveBg text-ops-live border-ops-liveBorder'
                              }`}
                            >
                              {item.isTool ? 'TOOL' : item.speaker}
                            </span>

                            {item.language && (
                              <span className="text-[10px] font-mono text-ink-muted">
                                • {item.language}
                              </span>
                            )}

                            {item.status && (
                              <span className="text-[9px] font-mono text-ops-warning bg-ops-warningBg px-1 rounded border border-[#FED7AA]">
                                {item.status}
                              </span>
                            )}
                          </div>

                          {/* Body Content */}
                          <div className="space-y-1">
                            {item.isTool ? (
                              <div className="font-mono text-xs text-ops-warning bg-canvas-pure border border-border-subtle p-2 rounded-[3px] shadow-hairline flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Wrench className="w-3.5 h-3.5 text-ops-warning shrink-0" />
                                  <span className="font-semibold">{item.content}</span>
                                </div>
                                <button
                                  onClick={() => openProofInspector({
                                    timestamp: item.timestamp,
                                    eventType: 'tool.executed',
                                    title: 'RPC Tool Execution Telemetry',
                                    source: 'Internal Order/CRM Gateway',
                                    confidence: 1.0,
                                    payload: {
                                      tool_name: item.toolName || 'getOrderStatus',
                                      request_params: { orderId: '84921' },
                                      response_status: '200 OK',
                                      execution_latency_ms: 184,
                                      delivery_status: 'EXCEPTION_DELAYED_3_DAYS'
                                    }
                                  })}
                                  className="text-[9px] font-mono font-bold text-ops-warning bg-ops-warningBg border border-ops-warningBorder px-1.5 py-0.5 rounded hover:bg-ops-warning hover:text-white transition-colors cursor-pointer"
                                >
                                  [ VIEW EVENT ]
                                </button>
                              </div>
                            ) : (
                              <div className="bg-canvas-pure border border-border-subtle rounded-[3px] p-2.5 shadow-hairline space-y-1">
                                <p className="font-sans text-xs text-ink-primary leading-relaxed select-text font-medium">
                                  {item.content}
                                </p>
                                {item.translation && (
                                  <p className="font-sans text-[11px] text-ink-secondary leading-normal select-text italic border-t border-border-subtle/50 pt-1">
                                    {item.translation}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* SECTION 48: CONTEXTUAL LIVE AI WORKING STATE PILL */}
              <div className="flex items-center justify-center pt-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-canvas-pure border border-border-subtle rounded-full text-xs font-mono shadow-hairline">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <span className="font-semibold text-ink-primary">{aiWorkingState}</span>
                </div>
              </div>

              <div className="text-center py-1">
                <span className="font-mono text-[10px] text-ink-muted uppercase tracking-wider animate-pulse">
                  {isAiPaused
                    ? 'RELAY is paused and listening passively for operator instructions...'
                    : meta.description}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 5. SECTION 24 & 25: COMPACT OPERATIONAL VOICE CONTROLS */}
      <VoiceControlsBar
        isHumanTakeover={isOperator}
        isAiPaused={isAiPaused}
        onToggleTakeover={onToggleTakeover}
        onTogglePauseAi={() => setIsAiPaused(!isAiPaused)}
        onEndCall={() => setCallState('CALL_ENDED')}
      />

      {/* SECTION 3: PROOF LAYER TELEMETRY INSPECTOR MODAL */}
      <EventProofModal
        isOpen={isProofModalOpen}
        onClose={() => setIsProofModalOpen(false)}
        event={selectedProofEvent}
      />
    </div>
  )
}

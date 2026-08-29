import React, { useState, useEffect } from 'react'
import {
  Play,
  Pause,
  RotateCcw
} from 'lucide-react'
import { soundEffects } from '../../utils/soundEffects'
import { EventProofModal, ProofEvent } from './EventProofModal'

export interface EvidenceTimelineEvent {
  id: string
  time: string
  seconds: number
  title: string
  detail: string
  category: 'audio' | 'asr' | 'bargein' | 'intent' | 'tool' | 'policy' | 'human' | 'action'
  proof: ProofEvent
}

export const EVIDENCE_TIMELINE_EVENTS: EvidenceTimelineEvent[] = [
  {
    id: 'ev-1',
    time: '00:00',
    seconds: 0,
    title: 'Customer joined',
    detail: 'Agora WebRTC SIP gateway connected trunk 04',
    category: 'audio',
    proof: {
      timestamp: '21:33:40',
      eventType: 'session.joined',
      title: 'Caller Joined Audio Stream',
      source: 'Agora RTC Native Gateway',
      confidence: 1.0,
      payload: { channel: 'relay-case-1042', codec: 'opus_48k', rtt_ms: 86 }
    }
  },
  {
    id: 'ev-2',
    time: '00:06',
    seconds: 6,
    title: 'Hindi detected',
    detail: 'Multilingual ASR identified hi-IN dialect (conf 0.96)',
    category: 'asr',
    proof: {
      timestamp: '21:33:46',
      eventType: 'language.detected',
      title: 'Language Model Adaptation',
      source: 'Deepgram Multilingual ASR',
      confidence: 0.96,
      payload: { detected: 'hi-IN', sample: 'Mera order 5 din se nahi aaya.' }
    }
  },
  {
    id: 'ev-3',
    time: '00:21',
    seconds: 21,
    title: 'Customer interrupted RELAY',
    detail: 'VAD speech detection preempted AI speech synthesis in 12ms',
    category: 'bargein',
    proof: {
      timestamp: '21:34:01',
      eventType: 'customer.interrupted',
      title: 'Barge-In Preemption Event',
      source: 'Agora WebRTC VAD',
      confidence: 0.98,
      payload: { frames_truncated: 14, audio_route: 'active_inbound' }
    }
  },
  {
    id: 'ev-4',
    time: '00:24',
    seconds: 24,
    title: 'Intent → refund_request',
    detail: 'Semantic extraction classified refund intent with 94% confidence',
    category: 'intent',
    proof: {
      timestamp: '21:34:04',
      eventType: 'intent.classified',
      title: 'Customer Intent Classification',
      source: 'RELAY NLU Engine',
      confidence: 0.94,
      payload: { primary_intent: 'refund_request', entity_order: '84921' }
    }
  },
  {
    id: 'ev-5',
    time: '00:31',
    seconds: 31,
    title: 'Order lookup',
    detail: 'gRPC call getOrderStatus(orderId="84921") dispatched',
    category: 'tool',
    proof: {
      timestamp: '21:34:11',
      eventType: 'tool.dispatch',
      title: 'RPC Tool Dispatch',
      source: 'Order Gateway Proxy',
      confidence: 1.0,
      payload: { rpc: 'lookupOrder', latency_ms: 184, response_code: 200 }
    }
  },
  {
    id: 'ev-6',
    time: '00:37',
    seconds: 37,
    title: 'Delivery exception confirmed',
    detail: 'Order #84921 marked delayed past SLA (+3 days)',
    category: 'tool',
    proof: {
      timestamp: '21:34:17',
      eventType: 'tool.resolved',
      title: 'Logistics SLA Exception',
      source: 'BlueDart Tracking API',
      confidence: 1.0,
      payload: { status: 'DELIVERY_EXCEPTION', expected: 'Aug 24', delay_days: 3 }
    }
  },
  {
    id: 'ev-7',
    time: '00:52',
    seconds: 52,
    title: 'Refund proposed',
    detail: 'Refund ₹1,499 drafted per Delayed Logistics policy',
    category: 'policy',
    proof: {
      timestamp: '21:34:32',
      eventType: 'policy.draft',
      title: 'Action Staging',
      source: 'RELAY Policy Engine',
      confidence: 1.0,
      payload: { amount_inr: 1499, policy_id: 'POL-DELIVERY-DELAY-01' }
    }
  },
  {
    id: 'ev-8',
    time: '01:04',
    seconds: 64,
    title: 'Human approval requested',
    detail: 'Risk tier MEDIUM requires operator sign-off (policy threshold ₹1,000)',
    category: 'policy',
    proof: {
      timestamp: '21:34:44',
      eventType: 'approval.required',
      title: 'Operator Governance Gate',
      source: 'Approval Gateway',
      confidence: 1.0,
      payload: { risk_rating: 'MEDIUM', required_role: 'OPERATOR' }
    }
  },
  {
    id: 'ev-9',
    time: '01:11',
    seconds: 71,
    title: 'Maya approved',
    detail: 'Operator Maya Sharma approved ₹1,499 via console hotkey (A)',
    category: 'human',
    proof: {
      timestamp: '21:34:51',
      eventType: 'operator.approval',
      title: 'Human Authorization',
      source: 'Operator Console',
      confidence: 1.0,
      payload: { operator_id: 'OP-782', operator_name: 'Maya Sharma', action: 'APPROVE' }
    }
  },
  {
    id: 'ev-10',
    time: '01:15',
    seconds: 75,
    title: 'refundOrder()',
    detail: 'Executing atomic UPI payout transfer #RF-92817',
    category: 'action',
    proof: {
      timestamp: '21:34:55',
      eventType: 'action.execute',
      title: 'Payment Gateway Dispatch',
      source: 'Razorpay Instant UPI',
      confidence: 1.0,
      payload: { txn_id: 'RF-92817', amount_inr: 1499, method: 'UPI_INSTANT' }
    }
  },
  {
    id: 'ev-11',
    time: '01:17',
    seconds: 77,
    title: 'Refund Sandbox Dispatched',
    detail: 'Demo Sandbox ACK received. Reference #sbx_rf_84921 committed (Simulated)',
    category: 'action',
    proof: {
      timestamp: '21:34:57',
      eventType: 'action.confirmed',
      title: 'Demo Payment Sandbox Settlement',
      source: 'RELAY Payment Sandbox (Simulated)',
      confidence: 1.0,
      payload: { ack: 'SANDBOX_SETTLED_OK', mode: 'DEMO_SANDBOX', isSimulated: true, disclaimer: 'Simulated financial transaction — No real fiat moved', rrn: 'SBX948192841029' }
    }
  },
  {
    id: 'ev-12',
    time: '01:22',
    seconds: 82,
    title: 'Customer notified',
    detail: 'TTS confirmation spoken and SMS receipt dispatched to +91 98201 44102',
    category: 'action',
    proof: {
      timestamp: '21:35:02',
      eventType: 'customer.notified',
      title: 'Multichannel Notification',
      source: 'RELAY Notification Service',
      confidence: 1.0,
      payload: { sms_id: 'SMS-8910', recipient: '+91 98201 44102', tts_spoken: true }
    }
  }
]

interface ReplayableEvidenceTimelineProps {
  caseId?: string
  className?: string
}

export const ReplayableEvidenceTimeline: React.FC<ReplayableEvidenceTimelineProps> = ({
  caseId = 'RLY-1042',
  className = '',
}) => {
  const [currentSeconds, setCurrentSeconds] = useState<number>(82)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
  const [selectedProofEvent, setSelectedProofEvent] = useState<ProofEvent | null>(null)
  const [isProofModalOpen, setIsProofModalOpen] = useState<boolean>(false)

  const activeIndex = EVIDENCE_TIMELINE_EVENTS.findIndex((ev, idx) => {
    const next = EVIDENCE_TIMELINE_EVENTS[idx + 1]
    if (!next) return true
    return currentSeconds >= ev.seconds && currentSeconds < next.seconds
  })

  // Timer loop for replay playback
  useEffect(() => {
    let timer: any = null
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentSeconds((prev) => {
          if (prev >= 82) {
            setIsPlaying(false)
            return 82
          }
          return prev + 1
        })
      }, 1000 / playbackSpeed)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isPlaying, playbackSpeed])

  const handleTogglePlay = () => {
    if (currentSeconds >= 82) {
      setCurrentSeconds(0)
      setIsPlaying(true)
      soundEffects.playCallConnected()
    } else {
      setIsPlaying(!isPlaying)
      if (!isPlaying) {
        soundEffects.playToolExecuted()
      }
    }
  }

  const handleReset = () => {
    setIsPlaying(false)
    setCurrentSeconds(0)
  }

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const openProof = (ev: EvidenceTimelineEvent) => {
    setSelectedProofEvent(ev.proof)
    setIsProofModalOpen(true)
  }

  return (
    <div className={`bg-canvas-pure border border-border-subtle rounded-[4px] shadow-hairline flex flex-col font-mono text-xs select-none ${className}`}>
      {/* Header */}
      <div className="p-3 border-b border-border-subtle flex items-center justify-between bg-canvas-subtle">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-ink-primary tracking-tight">
              CASE {caseId}
            </span>
            <span className="text-border">/</span>
            <span className="text-[10px] text-ink-muted uppercase tracking-wider font-semibold">
              EVIDENCE TIMELINE
            </span>
          </div>
          <span className="text-[10px] text-ink-secondary block font-sans">
            End-to-end replayable audit log from caller entry to settlement
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-canvas-pure border border-border-subtle px-2 py-0.5 rounded text-[10px] font-bold text-ink-primary tabular-nums">
            <span className="text-accent">{formatSeconds(currentSeconds)}</span>
            <span className="text-ink-muted">/</span>
            <span className="text-ink-muted">01:22</span>
          </div>
        </div>
      </div>

      {/* Scrub Bar & Controls Toolbar */}
      <div className="p-2.5 px-3 border-b border-border-subtle bg-canvas-pure flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <button
            onClick={handleTogglePlay}
            className={`px-3 py-1 rounded-[3px] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
              isPlaying
                ? 'bg-ops-warningBg text-ops-warning border border-ops-warningBorder'
                : 'bg-accent text-white hover:bg-accent-hover'
            }`}
          >
            {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            <span>{isPlaying ? 'PAUSE' : currentSeconds >= 82 ? 'REPLAY' : 'PLAY'}</span>
          </button>

          <button
            onClick={handleReset}
            className="p-1 text-ink-muted hover:text-ink-primary border border-border-subtle rounded bg-canvas-subtle hover:bg-canvas-muted cursor-pointer"
            title="Restart from 00:00"
          >
            <RotateCcw className="w-3 h-3" />
          </button>

          {/* Scrub Slider */}
          <div className="flex-1 mx-2 relative flex items-center">
            <input
              type="range"
              min={0}
              max={82}
              value={currentSeconds}
              onChange={(e) => setCurrentSeconds(Number(e.target.value))}
              className="w-full h-1.5 bg-border-subtle rounded-lg appearance-none cursor-pointer accent-accent"
            />
          </div>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 text-[10px]">
          <span className="text-ink-muted">SPEED:</span>
          {[1, 2, 4].map((spd) => (
            <button
              key={spd}
              onClick={() => setPlaybackSpeed(spd)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                playbackSpeed === spd
                  ? 'bg-accent-subtle text-accent border border-accent-border'
                  : 'bg-canvas-subtle text-ink-muted hover:text-ink-primary border border-border-subtle'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      {/* LIVE CASE STATE RECONSTRUCTION INSPECTOR */}
      {activeIndex >= 0 && (
        <div className="mx-3 mt-2 p-2.5 bg-canvas-subtle border border-accent/30 rounded-[3px] space-y-1.5 font-mono text-[11px] animate-in fade-in duration-100">
          <div className="flex items-center justify-between border-b border-border-subtle/80 pb-1">
            <div className="flex items-center gap-1.5 text-accent font-bold text-[10px] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span>CASE STATE AT {formatSeconds(currentSeconds)}</span>
            </div>
            <span className="text-[9px] font-bold text-ink-muted bg-canvas-pure px-1.5 py-0.5 rounded border border-border-subtle">
              EVENT #{activeIndex + 1} OF {EVIDENCE_TIMELINE_EVENTS.length}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
            <div>
              <span className="text-ink-muted block uppercase text-[9px]">Status</span>
              <span className="font-bold text-ink-primary">
                {currentSeconds < 6 ? 'CONNECTING' : currentSeconds < 64 ? 'ACTIVE' : currentSeconds < 71 ? 'AWAITING_APPROVAL' : currentSeconds < 77 ? 'EXECUTING' : 'RESOLVED'}
              </span>
            </div>
            <div>
              <span className="text-ink-muted block uppercase text-[9px]">Language</span>
              <span className="font-bold text-ink-primary">
                {currentSeconds < 6 ? 'Detecting...' : 'Hindi / English'}
              </span>
            </div>
            <div>
              <span className="text-ink-muted block uppercase text-[9px]">Verified Facts</span>
              <span className="font-bold text-ink-primary">
                {currentSeconds < 31 ? '0' : currentSeconds < 37 ? '2' : '4 facts verified'}
              </span>
            </div>
            <div>
              <span className="text-ink-muted block uppercase text-[9px]">Active Action</span>
              <span className="font-bold text-accent">
                {currentSeconds < 52 ? 'None' : currentSeconds < 71 ? 'Refund ₹1,499 (Pending)' : 'Refund ₹1,499 (Settled)'}
              </span>
            </div>
          </div>

          <div className="text-[10px] text-ink-secondary pt-0.5 border-t border-border-subtle/60 flex items-center justify-between">
            <span>Milestone: <strong className="text-ink-primary">{EVIDENCE_TIMELINE_EVENTS[activeIndex]?.title}</strong></span>
            <button
              onClick={() => openProof(EVIDENCE_TIMELINE_EVENTS[activeIndex])}
              className="text-[9px] font-bold text-accent hover:underline cursor-pointer"
            >
              Inspect Cryptographic Audit Proof →
            </button>
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 divide-y divide-border-subtle/40 min-h-0">
        {EVIDENCE_TIMELINE_EVENTS.map((ev, idx) => {
          const isPassed = currentSeconds >= ev.seconds
          const isCurrent = activeIndex === idx

          return (
            <div
              key={ev.id}
              onClick={() => setCurrentSeconds(ev.seconds)}
              className={`py-1.5 px-2 rounded-[3px] flex items-start justify-between gap-3 cursor-pointer transition-colors ${
                isCurrent
                  ? 'bg-accent-subtle/50 border border-accent-border'
                  : isPassed
                  ? 'hover:bg-canvas-subtle opacity-100'
                  : 'opacity-40 hover:opacity-75'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className={`tabular-nums text-[11px] font-bold shrink-0 mt-0.5 ${
                  isCurrent ? 'text-accent' : isPassed ? 'text-ink-primary' : 'text-ink-muted'
                }`}>
                  {ev.time}
                </span>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-semibold ${
                      isCurrent ? 'text-accent font-bold' : isPassed ? 'text-ink-primary' : 'text-ink-secondary'
                    }`}>
                      {ev.title}
                    </span>
                    {isCurrent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-ink-muted font-sans line-clamp-1">
                    {ev.detail}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openProof(ev)
                  }}
                  className="text-[9px] font-bold text-ink-secondary bg-canvas-subtle hover:bg-canvas-muted hover:text-ink-primary border border-border-subtle px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                >
                  [ PROOF ]
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer Info */}
      <div className="p-2 px-3 bg-canvas-subtle border-t border-border-subtle flex items-center justify-between text-[10px] text-ink-muted">
        <span>12 Synchronized Evidence Milestones</span>
        <span className="text-ops-live font-semibold">100% Deterministic Audit Trail</span>
      </div>

      {/* Proof Inspector Modal */}
      <EventProofModal
        isOpen={isProofModalOpen}
        onClose={() => setIsProofModalOpen(false)}
        event={selectedProofEvent}
      />
    </div>
  )
}

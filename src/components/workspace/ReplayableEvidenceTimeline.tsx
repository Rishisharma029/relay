import React, { useState, useEffect } from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  FileCode,
  Layers,
  Sparkles
} from 'lucide-react'
import { soundEffects } from '../../utils/soundEffects'
import { EventProofModal, ProofEvent } from './EventProofModal'

export interface RelayStreamEvent {
  sequenceNum: number
  id: string
  time: string
  seconds: number
  type:
    | 'call.started'
    | 'speech.transcript'
    | 'intent.detected'
    | 'tool.started'
    | 'tool.completed'
    | 'policy.evaluated'
    | 'approval.created'
    | 'approval.approved'
    | 'action.completed'
    | 'human.takeover'
    | 'call.ended'
  title: string
  detail: string
  category: 'audio' | 'asr' | 'intent' | 'tool' | 'policy' | 'approval' | 'action' | 'human'
  proof: ProofEvent
  payload: Record<string, any>
}

export const CANONICAL_EVENT_STREAM: RelayStreamEvent[] = [
  {
    sequenceNum: 1,
    id: 'ev-1',
    time: '00:00',
    seconds: 0,
    type: 'call.started',
    title: 'call.started',
    detail: 'Agora WebRTC Native Duplex Channel connected (48 kHz Opus)',
    category: 'audio',
    payload: { channel: 'relay-case-72143', uid: '1042', sampleRate: '48 kHz', caller: 'Aarav Patel' },
    proof: {
      timestamp: '21:34:02',
      eventType: 'call.started',
      title: 'WebRTC Duplex Audio Stream Established',
      source: 'Agora RTC Native Gateway',
      confidence: 1.0,
      payload: { channel: 'relay-case-72143', codec: 'opus_48k', rtt_ms: 72 }
    }
  },
  {
    sequenceNum: 2,
    id: 'ev-2',
    time: '00:04',
    seconds: 4,
    type: 'speech.transcript',
    title: 'speech.transcript',
    detail: 'Customer: "Mera order 72143 4 din se nahi aaya, mujhe refund chahiye."',
    category: 'asr',
    payload: { speaker: 'CUSTOMER', text: 'Mera order 72143 4 din se nahi aaya, mujhe refund chahiye.', language: 'hi-IN' },
    proof: {
      timestamp: '21:34:06',
      eventType: 'speech.transcript',
      title: 'Multilingual Inbound Speech Recognizer',
      source: 'RELAY Continuous ASR Stream',
      confidence: 0.98,
      payload: { language: 'hi-IN', isFinal: true, latencyMs: 118 }
    }
  },
  {
    sequenceNum: 3,
    id: 'ev-3',
    time: '00:08',
    seconds: 8,
    type: 'intent.detected',
    title: 'intent.detected',
    detail: 'Semantic Intent: refund_request (Extracted Order #72143)',
    category: 'intent',
    payload: { intent: 'refund_request', entityOrderId: '72143', confidence: 0.96 },
    proof: {
      timestamp: '21:34:10',
      eventType: 'intent.detected',
      title: 'Neural Intent & Entity Extraction',
      source: 'RELAY Intent Router',
      confidence: 0.96,
      payload: { primary_intent: 'refund_request', entity_order: '72143', policy_trigger: true }
    }
  },
  {
    sequenceNum: 4,
    id: 'ev-4',
    time: '00:10',
    seconds: 10,
    type: 'tool.started',
    title: 'tool.started',
    detail: 'Governed Tool Router executing lookupOrder(#72143)',
    category: 'tool',
    payload: { tool: 'lookupOrder', params: { orderId: '72143' }, router: 'ToolRouter/v2' },
    proof: {
      timestamp: '21:34:12',
      eventType: 'tool.started',
      title: 'Governed Tool Dispatch',
      source: 'ToolRouter/v2',
      confidence: 1.0,
      payload: { tool: 'lookupOrder', orderId: '72143', executionMode: 'SANDBOX_API' }
    }
  },
  {
    sequenceNum: 5,
    id: 'ev-5',
    time: '00:13',
    seconds: 13,
    type: 'tool.completed',
    title: 'tool.completed',
    detail: 'Delhivery Express: Delayed 4 days (AWB DL-721438910 · Captured ₹2,899)',
    category: 'tool',
    payload: { orderId: '72143', carrier: 'Delhivery Express', delayDays: 4, amount: 2899, isSlaBreached: true },
    proof: {
      timestamp: '21:34:15',
      eventType: 'tool.completed',
      title: 'Logistics SLA Exception Verified',
      source: 'Delhivery Logistics Gateway API',
      confidence: 1.0,
      payload: { status: 'DELIVERY_EXCEPTION', delayDays: 4, awb: 'DL-721438910', amount: 2899 }
    }
  },
  {
    sequenceNum: 6,
    id: 'ev-6',
    time: '00:16',
    seconds: 16,
    type: 'policy.evaluated',
    title: 'policy.evaluated',
    detail: 'Policy POL-REFUND-3.2 Section 4.1: 100% Eligible (Delay > 3 days)',
    category: 'policy',
    payload: { policyId: 'POL-REFUND-3.2', eligible: true, eligibleAmount: 2899, riskTier: 'MEDIUM', requiresApproval: true },
    proof: {
      timestamp: '21:34:18',
      eventType: 'policy.evaluated',
      title: '5-Point Server Policy Gate Evaluation',
      source: 'RELAY Policy Engine',
      confidence: 1.0,
      payload: { policy: 'POL-REFUND-3.2', section: '4.1', maxAllowed: 5000, evaluatedRisk: 'MEDIUM' }
    }
  },
  {
    sequenceNum: 7,
    id: 'ev-7',
    time: '00:19',
    seconds: 19,
    type: 'approval.created',
    title: 'approval.created',
    detail: 'Operator sign-off requested for ₹2,899 (Assigned to Maya Sharma)',
    category: 'approval',
    payload: { approvalId: 'appr-72143-01', actionType: 'REFUND', amount: 2899, risk: 'MEDIUM', status: 'PENDING' },
    proof: {
      timestamp: '21:34:21',
      eventType: 'approval.created',
      title: 'Operator Governance Gate Initialized',
      source: 'Approval Gateway',
      confidence: 1.0,
      payload: { action_id: 'act-72143-01', threshold_inr: 1000, target_amount: 2899 }
    }
  },
  {
    sequenceNum: 8,
    id: 'ev-8',
    time: '00:23',
    seconds: 23,
    type: 'approval.approved',
    title: 'approval.approved',
    detail: 'Maya Sharma authorized ₹2,899 refund via operator console (Hotkey A)',
    category: 'approval',
    payload: { operatorId: 'OP-782', operatorName: 'Maya Sharma', decision: 'APPROVED', actionId: 'act-72143-01' },
    proof: {
      timestamp: '21:34:25',
      eventType: 'approval.approved',
      title: 'Human Operator Authorization Commit',
      source: 'Operator Live Desk',
      confidence: 1.0,
      payload: { operator: 'Maya Sharma', authMode: 'HOTKEY_A', timestamp: '21:34:25' }
    }
  },
  {
    sequenceNum: 9,
    id: 'ev-9',
    time: '00:26',
    seconds: 26,
    type: 'action.completed',
    title: 'action.completed',
    detail: 'Atomic UPI Payout TXN-UPI-721438910 Settled (₹2,899 committed)',
    category: 'action',
    payload: { txnId: 'TXN-UPI-721438910', amount: 2899, currency: 'INR', method: 'UPI_INSTANT', status: 'SUCCESS' },
    proof: {
      timestamp: '21:34:28',
      eventType: 'action.completed',
      title: 'Electronic Payment Settlement',
      source: 'Payment Sandbox Gateway (NPCI UPI)',
      confidence: 1.0,
      payload: { rrn: 'TXN-UPI-721438910', amount: 2899, latencyMs: 94 }
    }
  },
  {
    sequenceNum: 10,
    id: 'ev-10',
    time: '00:29',
    seconds: 29,
    type: 'human.takeover',
    title: 'human.takeover',
    detail: 'Duplex handoff active — Operator in full control of caller stream',
    category: 'human',
    payload: { operator: 'Maya Sharma', role: 'OPERATOR', aiMuted: true },
    proof: {
      timestamp: '21:34:31',
      eventType: 'human.takeover',
      title: 'Operator Duplex State Handover',
      source: 'Agora RTC Channel Router',
      confidence: 1.0,
      payload: { activeSpeaker: 'Maya Sharma', aiState: 'MUTED' }
    }
  },
  {
    sequenceNum: 11,
    id: 'ev-11',
    time: '00:32',
    seconds: 32,
    type: 'call.ended',
    title: 'call.ended',
    detail: 'Case RLY-72143 resolved with full customer satisfaction (100% SLA compliance)',
    category: 'audio',
    payload: { resolution: 'REFUND_SETTLED', durationSeconds: 32, totalEvents: 11 },
    proof: {
      timestamp: '21:34:34',
      eventType: 'call.ended',
      title: 'Call Session Teardown & Case Archive',
      source: 'RELAY Core Orchestrator',
      confidence: 1.0,
      payload: { caseId: 'RLY-72143', finalStatus: 'RESOLVED', auditLogged: true }
    }
  }
]

// Pure Event Sourcing State Reducer
export function reduceCaseFromEvents(events: RelayStreamEvent[]) {
  const state = {
    customerName: 'Aarav Patel',
    customerTier: 'Platinum VIP',
    orderId: '72143',
    orderAmount: 2899,
    carrier: 'Delhivery Express',
    delayDays: 0,
    intent: 'None',
    policyQualified: false,
    approvalStatus: 'None',
    payoutSettled: false,
    transcripts: [] as { speaker: string; text: string; time: string }[],
    toolsCalled: [] as string[]
  }

  for (const ev of events) {
    switch (ev.type) {
      case 'call.started':
        break
      case 'speech.transcript':
        state.transcripts.push({ speaker: ev.payload.speaker, text: ev.payload.text, time: ev.time })
        break
      case 'intent.detected':
        state.intent = ev.payload.intent
        state.orderId = ev.payload.entityOrderId || state.orderId
        break
      case 'tool.started':
        state.toolsCalled.push(ev.payload.tool)
        break
      case 'tool.completed':
        state.carrier = ev.payload.carrier || state.carrier
        state.delayDays = ev.payload.delayDays || state.delayDays
        state.orderAmount = ev.payload.amount || state.orderAmount
        break
      case 'policy.evaluated':
        state.policyQualified = ev.payload.eligible
        break
      case 'approval.created':
        state.approvalStatus = 'PENDING'
        break
      case 'approval.approved':
        state.approvalStatus = 'APPROVED'
        break
      case 'action.completed':
        state.payoutSettled = true
        state.transcripts.push({ speaker: 'RELAY', text: 'Aapka ₹2,899 refund process ho gaya hai.', time: ev.time })
        break
      case 'human.takeover':
        break
      case 'call.ended':
        break
    }
  }

  return state
}

interface ReplayableEvidenceTimelineProps {
  caseId?: string
  className?: string
}

export const ReplayableEvidenceTimeline: React.FC<ReplayableEvidenceTimelineProps> = ({
  caseId = 'RLY-72143',
  className = '',
}) => {
  const [currentSeconds, setCurrentSeconds] = useState<number>(32)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
  const [selectedProofEvent, setSelectedProofEvent] = useState<ProofEvent | null>(null)
  const [isProofModalOpen, setIsProofModalOpen] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<'timeline' | 'wal_log'>('timeline')

  const visibleEvents = CANONICAL_EVENT_STREAM.filter((ev) => ev.seconds <= currentSeconds)
  const currentReconstructedState = reduceCaseFromEvents(visibleEvents)

  const activeIndex = CANONICAL_EVENT_STREAM.findIndex((ev, idx) => {
    const next = CANONICAL_EVENT_STREAM[idx + 1]
    if (!next) return true
    return currentSeconds >= ev.seconds && currentSeconds < next.seconds
  })

  // Timer loop for replay playback
  useEffect(() => {
    let timer: any = null
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentSeconds((prev) => {
          if (prev >= 32) {
            setIsPlaying(false)
            return 32
          }
          return prev + 1
        })
      }, 1000 / playbackSpeed)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isPlaying, playbackSpeed])

  const togglePlay = () => {
    if (currentSeconds >= 32) {
      setCurrentSeconds(0)
    }
    soundEffects.playToolExecuted()
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (sec: number) => {
    soundEffects.playToolExecuted()
    setCurrentSeconds(sec)
  }

  const handleReset = () => {
    soundEffects.playToolExecuted()
    setIsPlaying(false)
    setCurrentSeconds(0)
  }

  const handleOpenProof = (proof: ProofEvent) => {
    soundEffects.playApprovalRequested()
    setSelectedProofEvent(proof)
    setIsProofModalOpen(true)
  }

  return (
    <div className={"flex flex-col bg-canvas-pure border border-border-subtle rounded-[6px] shadow-sm overflow-hidden select-none font-sans " + className}>
      {/* 1. TOP HEADER & EVENT SOURCING BADGE */}
      <div className="bg-canvas-subtle border-b border-border-subtle p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-accent" />
          <span className="font-mono text-xs font-bold text-ink-primary uppercase tracking-wider">
            EVENT SOURCING REPLAY ENGINE
          </span>
          <span className="text-[10px] font-mono font-bold bg-ops-liveBg text-ops-live border border-ops-liveBorder px-2 py-0.5 rounded">
            ● 100% Deterministic Replay
          </span>
        </div>

        {/* Tab switch: Visual Timeline vs Raw Append-Only WAL */}
        <div className="flex items-center gap-1 bg-canvas-pure p-0.5 rounded border border-border-subtle">
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={"px-2 py-1 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer " + (
              activeTab === 'timeline' ? 'bg-accent text-white' : 'text-ink-secondary hover:text-ink-primary'
            )}
          >
            Visual Timeline
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('wal_log')}
            className={"px-2 py-1 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer flex items-center gap-1 " + (
              activeTab === 'wal_log' ? 'bg-accent text-white' : 'text-ink-secondary hover:text-ink-primary'
            )}
          >
            <FileCode className="w-3 h-3" />
            <span>PostgreSQL WAL Log ({visibleEvents.length})</span>
          </button>
        </div>
      </div>

      {/* 2. "WHY DID RELAY DO THIS?" 7-STEP PROOF PATH STRIP */}
      <div className="bg-accent/5 border-b border-accent/20 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-accent uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AUDIT PROOF: "WHY DID RELAY DO THIS?"</span>
          </div>
          <span className="text-[10px] font-mono text-ink-secondary">
            Step-by-step verifiable state transitions
          </span>
        </div>

        {/* 7-STEP PROOF PATH */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 font-mono text-[10px]">
          <div className={"p-1.5 rounded border transition-colors " + (currentSeconds >= 4 ? 'bg-ops-liveBg text-ops-live border-ops-liveBorder font-bold' : 'bg-canvas-subtle text-ink-muted border-border-subtle')}>
            1. Refund requested
          </div>
          <div className={"p-1.5 rounded border transition-colors " + (currentSeconds >= 10 ? 'bg-ops-liveBg text-ops-live border-ops-liveBorder font-bold' : 'bg-canvas-subtle text-ink-muted border-border-subtle')}>
            2. Order verified
          </div>
          <div className={"p-1.5 rounded border transition-colors " + (currentSeconds >= 13 ? 'bg-ops-liveBg text-ops-live border-ops-liveBorder font-bold' : 'bg-canvas-subtle text-ink-muted border-border-subtle')}>
            3. Delay verified
          </div>
          <div className={"p-1.5 rounded border transition-colors " + (currentSeconds >= 16 ? 'bg-ops-liveBg text-ops-live border-ops-liveBorder font-bold' : 'bg-canvas-subtle text-ink-muted border-border-subtle')}>
            4. Policy passed
          </div>
          <div className={"p-1.5 rounded border transition-colors " + (currentSeconds >= 19 ? 'bg-ops-liveBg text-ops-live border-ops-liveBorder font-bold' : 'bg-canvas-subtle text-ink-muted border-border-subtle')}>
            5. Approval created
          </div>
          <div className={"p-1.5 rounded border transition-colors " + (currentSeconds >= 23 ? 'bg-ops-liveBg text-ops-live border-ops-liveBorder font-bold' : 'bg-canvas-subtle text-ink-muted border-border-subtle')}>
            6. Human approved
          </div>
          <div className={"p-1.5 rounded border transition-colors " + (currentSeconds >= 26 ? 'bg-ops-liveBg text-ops-live border-ops-liveBorder font-bold' : 'bg-canvas-subtle text-ink-muted border-border-subtle')}>
            7. Refund executed
          </div>
        </div>
      </div>

      {/* 3. DETERMINISTIC STATE RECONSTRUCTION HUD */}
      <div className="bg-canvas border-b border-border-subtle p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
        <div className="bg-canvas-pure p-2 rounded border border-border-subtle">
          <span className="text-[10px] text-ink-muted uppercase block">Reconstructed Order</span>
          <span className="font-bold text-ink-primary">#{currentReconstructedState.orderId} (₹{currentReconstructedState.orderAmount.toLocaleString('en-IN')})</span>
        </div>
        <div className="bg-canvas-pure p-2 rounded border border-border-subtle">
          <span className="text-[10px] text-ink-muted uppercase block">Logistics SLA</span>
          <span className="font-bold text-ink-primary">{currentReconstructedState.delayDays > 0 ? "Delayed +" + currentReconstructedState.delayDays + " days" : "Checking..."}</span>
        </div>
        <div className="bg-canvas-pure p-2 rounded border border-border-subtle">
          <span className="text-[10px] text-ink-muted uppercase block">Policy Matrix</span>
          <span className={"font-bold " + (currentReconstructedState.policyQualified ? 'text-ops-live' : 'text-ink-muted')}>
            {currentReconstructedState.policyQualified ? 'POL-REFUND-3.2 Qualified' : 'Pending Gate 3'}
          </span>
        </div>
        <div className="bg-canvas-pure p-2 rounded border border-border-subtle">
          <span className="text-[10px] text-ink-muted uppercase block">Settlement Status</span>
          <span className={"font-bold " + (currentReconstructedState.payoutSettled ? 'text-ops-live' : currentReconstructedState.approvalStatus === 'APPROVED' ? 'text-accent' : 'text-amber-500')}>
            {currentReconstructedState.payoutSettled ? '₹2,899 Paid (Sandbox)' : currentReconstructedState.approvalStatus === 'APPROVED' ? 'Approved by Maya' : 'Pending Authorization'}
          </span>
        </div>
      </div>

      {/* 4. TIMELINE SCRUBBER & PLAYBACK CONTROLS */}
      <div className="p-3 border-b border-border-subtle bg-canvas-pure flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-accent hover:bg-accent-hover text-white flex items-center justify-center cursor-pointer shadow-xs"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="w-7 h-7 rounded border border-border-subtle hover:bg-canvas-subtle text-ink-secondary flex items-center justify-center cursor-pointer"
            title="Rewind to start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-xs font-bold text-ink-primary tabular-nums">
            00:{(currentSeconds < 10 ? '0' : '') + currentSeconds} / 00:32
          </span>
        </div>

        {/* The Scrubber Bar */}
        <div className="flex-1 relative flex items-center">
          <input
            type="range"
            min={0}
            max={32}
            value={currentSeconds}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="w-full accent-accent cursor-pointer h-1.5 bg-border-subtle rounded-lg"
          />
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 font-mono text-[10px]">
          {[1, 2, 4].map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => setPlaybackSpeed(spd)}
              className={"px-1.5 py-0.5 rounded border transition-colors cursor-pointer " + (
                playbackSpeed === spd ? 'bg-accent text-white border-accent' : 'bg-canvas text-ink-secondary border-border-subtle'
              )}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      {/* 4. MAIN CONTENT VIEW: VISUAL STREAM vs RAW POSTGRES WAL LOG */}
      {activeTab === 'timeline' ? (
        <div className="p-4 max-h-96 overflow-y-auto space-y-3 font-mono text-xs">
          {CANONICAL_EVENT_STREAM.map((ev, idx) => {
            const isPassed = ev.seconds <= currentSeconds
            const isCurrent = activeIndex === idx

            return (
              <div
                key={ev.id}
                onClick={() => handleOpenProof(ev.proof)}
                className={"p-2.5 rounded border transition-all cursor-pointer flex items-start justify-between gap-3 " + (
                  isCurrent
                    ? 'bg-accent/10 border-accent shadow-xs scale-[1.01]'
                    : isPassed
                    ? 'bg-canvas border-border-subtle hover:border-accent/50'
                    : 'bg-canvas-subtle/40 border-dashed border-border-subtle/60 opacity-40'
                )}
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-ink-muted text-[10px] tabular-nums font-bold mt-0.5">{ev.time}</span>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink-primary uppercase text-[11px]">{ev.title}</span>
                      <span className="text-[9px] bg-canvas-pure px-1 py-0.2 rounded border border-border-subtle text-ink-secondary">
                        Seq #{ev.sequenceNum}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-secondary font-sans font-medium">{ev.detail}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-accent font-bold shrink-0">
                  <Sparkles className="w-3 h-3" />
                  <span>Verify Proof</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-4 max-h-96 overflow-y-auto bg-[#0F172A] text-[#E2E8F0] font-mono text-[11px] space-y-2">
          <div className="text-[10px] text-emerald-400 pb-1 border-b border-slate-700">
            // PostgreSQL 16 Append-Only WAL Stream: SELECT * FROM relay_events WHERE case_id = '{caseId}' ORDER BY sequence_num ASC
          </div>
          {visibleEvents.map((ev) => (
            <div key={ev.id} className="p-2 bg-[#1E293B] rounded border border-slate-700 space-y-1">
              <div className="flex items-center justify-between text-sky-400 font-bold">
                <span>[SEQ #{ev.sequenceNum}] {ev.type}</span>
                <span className="text-slate-400 text-[10px]">{ev.proof.timestamp}</span>
              </div>
              <pre className="text-[10px] text-slate-300 overflow-x-auto p-1 bg-black/40 rounded">
                {JSON.stringify(ev.payload, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}

      {/* PROOF MODAL */}
      <EventProofModal
        isOpen={isProofModalOpen}
        onClose={() => setIsProofModalOpen(false)}
        event={selectedProofEvent}
      />
    </div>
  )
}

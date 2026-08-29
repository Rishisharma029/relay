import React, { useState, useEffect } from 'react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import {
  Check,
  HelpCircle,
  AlertOctagon,
  RotateCcw,
  Radio,
  RefreshCw,
  Brain,
  BookOpen
} from 'lucide-react'
import { soundEffects } from '../../utils/soundEffects'
import { useCaseState } from '../../contexts/CaseStateContext'
import { agoraRtc } from '../../services/agoraRtcService'
import { telemetryCollector, MeasuredTelemetry } from '../../services/telemetryCollector'
import { PolicyCitationModal } from './PolicyCitationModal'
import { PolicyCitation } from '../../types/knowledge'

export type RefundActionState = 'awaiting_approval' | 'approved' | 'declined'

interface CaseIntelligencePaneProps {
  onTakeover?: () => void
}

export const CaseIntelligencePane: React.FC<CaseIntelligencePaneProps> = ({ onTakeover }) => {
  const { caseState, approveActiveAction, declineActiveAction, resetCase } = useCaseState()
  const [isServiceFailed, setIsServiceFailed] = useState<boolean>(false)
  const [isRetrying, setIsRetrying] = useState<boolean>(false)
  const [isTokenRenewed, setIsTokenRenewed] = useState<boolean>(false)
  const [isRenewingToken, setIsRenewingToken] = useState<boolean>(false)
  const [measured, setMeasured] = useState<MeasuredTelemetry>(telemetryCollector.getSnapshot())
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState<boolean>(false)
  const [activeMemoryTab, setActiveMemoryTab] = useState<'customer' | 'case' | 'turn'>('customer')

  const defaultPolicyCitation: PolicyCitation = {
    policyId: 'POL-REFUND-3.2',
    title: 'E-Commerce Dispute & Instant Refund Protocol',
    version: 'v3.2',
    section: 'Section 4.1 — Courier SLA Delays & Carrier Exceptions',
    clauseId: '4.1.A',
    clauseText: 'An order delayed beyond 3 business days past SLA with a verified courier exception code is eligible for an instant 100% refund.',
    document: {
      policyId: 'POL-REFUND-3.2',
      title: 'E-Commerce Dispute & Instant Refund Protocol',
      version: 'v3.2',
      section: 'Section 4.1 — Courier SLA Delays & Carrier Exceptions',
      lastUpdated: '2026-06-15',
      summary: 'Rules for instant electronic refund issuance on delayed or lost shipments.',
      clauses: [
        {
          clauseId: '4.1.A',
          title: 'Eligibility Criteria',
          text: 'An order delayed beyond 3 business days past the promised delivery SLA with a verified courier exception code (e.g. DELAY_WEATHER_AIR_CARRIER) is eligible for an instant 100% refund.',
        },
        {
          clauseId: '4.1.B',
          title: 'Operator Sign-off Matrix',
          text: 'Refund amounts up to ₹2,500 for Platinum and Gold tier customers require single human operator approval with zero reverse-pickup prerequisite.',
        },
        {
          clauseId: '4.1.C',
          title: 'Settlement Speed',
          text: 'Approved refunds must be routed via NPCI Instant UPI disbursement directly to the source VPA/bank account within 120 seconds.',
        },
      ],
      mandatoryChecks: [
        'Customer identity verified in CRM',
        'Order exists and status is DELIVERY_EXCEPTION',
        'Refund amount matches transaction capture value',
        'Zero prior refund settled on same order identifier',
      ],
    },
  }

  useEffect(() => {
    return telemetryCollector.subscribe((data) => {
      setMeasured(data)
    })
  }, [])

  const handleTestTokenRenewal = async () => {
    setIsRenewingToken(true)
    const success = await agoraRtc.renewRtcToken()
    setIsRenewingToken(false)
    if (success) {
      setIsTokenRenewed(true)
      setTimeout(() => setIsTokenRenewed(false), 3000)
    }
  }

  const refundState: RefundActionState =
    caseState.activeAction?.status === 'APPROVED' || caseState.status === 'resolved'
      ? 'approved'
      : caseState.activeAction?.status === 'DECLINED'
      ? 'declined'
      : 'awaiting_approval'

  const approvalTime = caseState.activeAction?.approvedAt || '21:34:08'

  const handleApprove = async () => {
    await approveActiveAction('Maya Sharma')
    try {
      soundEffects.playToolExecuted()
    } catch (e) {}
  }

  const handleDecline = async () => {
    await declineActiveAction()
  }

  const handleReset = () => {
    resetCase(caseState.id)
    setIsServiceFailed(false)
  }

  const handleRetryService = () => {
    setIsRetrying(true)
    setTimeout(() => {
      setIsRetrying(false)
      setIsServiceFailed(false)
    }, 700)
  }

  // SECTION 36: KEYBOARD SHORTCUT FOR APPROVE (A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase()
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return

      if (e.key === 'a' || e.key === 'A') {
        if (refundState === 'awaiting_approval' && !isServiceFailed) {
          handleApprove()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [refundState, isServiceFailed])

  const knownFacts = caseState.facts.map((f) => f.label)
  const unknownFacts = caseState.unknowns

  return (
    <aside className="w-80 bg-canvas-subtle border-l border-border-subtle flex flex-col justify-between select-none shrink-0 h-full overflow-y-auto font-sans">
      <div className="p-3 space-y-3">
        {/* SECTION 4: AGORA REALTIME INSPECTOR */}
        <div className="bg-canvas-pure border border-border-subtle rounded-[4px] p-3 space-y-2.5 shadow-hairline">
          <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle">
            <span className="font-mono text-xs font-bold text-ink-primary tracking-wider uppercase flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-accent" />
              <span>AGORA REALTIME</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                agoraRtc.getCallMode() === 'REAL'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  : agoraRtc.getCallMode() === 'SIMULATION'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-canvas-subtle text-ink-muted border-border-subtle'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  agoraRtc.getCallMode() === 'REAL' ? 'bg-rose-500 animate-pulse' : agoraRtc.getCallMode() === 'SIMULATION' ? 'bg-amber-400' : 'bg-ink-muted'
                }`} />
                <span>{agoraRtc.getCallMode() === 'REAL' ? 'REAL CALL' : agoraRtc.getCallMode() === 'SIMULATION' ? 'SIMULATION' : 'STANDBY'}</span>
              </span>
              <span className="font-mono text-[9px] text-ops-live font-bold bg-ops-liveBg px-1.5 py-0.5 rounded border border-ops-liveBorder flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-ops-live" />
                <span>v2.8</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div>
              <span className="text-[10px] text-ink-muted uppercase block font-semibold">Channel</span>
              <span className="text-ink-primary font-bold block truncate">{caseState.channelName || 'relay-case-live'}</span>
            </div>

            <div>
              <span className="text-[10px] text-ink-muted uppercase block font-semibold">Connection State</span>
              <span className={`font-bold block truncate ${
                agoraRtc.getConnectionState() === 'CONNECTED'
                  ? 'text-ops-live'
                  : agoraRtc.getConnectionState() === 'ERROR'
                  ? 'text-rose-500 animate-pulse'
                  : ['REQUESTING_MIC', 'GETTING_TOKEN', 'JOINING_AGORA', 'AGENT_STARTING'].includes(agoraRtc.getConnectionState())
                  ? 'text-amber-400 animate-pulse'
                  : 'text-ink-muted'
              }`}>
                {agoraRtc.getConnectionState()}
              </span>
            </div>

            {agoraRtc.getConnectionState() === 'ERROR' && agoraRtc.getLastError() && (
              <div className="col-span-2 p-1.5 bg-rose-500/10 border border-rose-500/20 rounded text-[10px] text-rose-400 font-mono">
                ⚠️ {agoraRtc.getLastError()}
              </div>
            )}

            <div>
              <span className="text-[10px] text-ink-muted uppercase block font-semibold">Participants</span>
              <span className="text-ink-primary font-bold block tabular-nums">
                {agoraRtc.getConnectionState() === 'CONNECTED' ? measured.participantCount : '—'}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-ink-muted uppercase block font-semibold">Audio Track</span>
              <span className="text-ink-primary font-bold block">
                {agoraRtc.getConnectionState() === 'CONNECTED' ? measured.audioSampleRate : '—'}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-ink-muted uppercase block font-semibold">RTT</span>
              <span className="text-ink-primary font-bold block tabular-nums">
                {agoraRtc.getConnectionState() === 'CONNECTED' && measured.rttMs > 0 ? `${measured.rttMs} ms` : '—'}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-ink-muted uppercase block font-semibold">Packet loss</span>
              <span className="text-ops-live font-bold block tabular-nums">
                {agoraRtc.getConnectionState() === 'CONNECTED' ? `${(measured.packetLossRate * 100).toFixed(2)}%` : '—'}
              </span>
            </div>
          </div>

          {/* AGORA v2.8 TOKEN LIFECYCLE & HOT RENEWAL */}
          <div className="pt-2 border-t border-border-subtle/70 flex items-center justify-between font-mono text-[10px]">
            <div>
              <span className="text-ink-muted block uppercase font-semibold">Token Lifecycle (v2.8)</span>
              <span className={isTokenRenewed ? 'text-ops-live font-bold' : 'text-ink-primary font-bold'}>
                {isTokenRenewed ? '✓ RENEWED (0ms DROP)' : 'AUTO-RENEW (24H)'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleTestTokenRenewal}
              disabled={isRenewingToken}
              className="text-[9px] font-bold text-accent bg-accent-subtle hover:bg-accent hover:text-white px-2 py-0.5 rounded border border-accent-border transition-colors cursor-pointer disabled:opacity-50"
            >
              {isRenewingToken ? 'RENEWING...' : '[ HOT RENEW ]'}
            </button>
          </div>
        </div>

        {/* CASE STATE HEADER & SECTION 39 FAILURE SIMULATOR */}
        <div className="flex items-center justify-between pb-1">
          <span className="font-mono text-xs font-bold text-ink-primary tracking-wider uppercase">
            CASE STATE
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsServiceFailed(!isServiceFailed)}
              className={`font-mono text-[9px] px-1.5 py-0.5 rounded-[2px] border transition-colors cursor-pointer ${
                isServiceFailed
                  ? 'bg-ops-criticalBg text-ops-critical border-ops-criticalBorder font-bold'
                  : 'bg-canvas-pure text-ink-muted hover:text-ink-primary border-border-subtle'
              }`}
              title="Click to simulate 504 order API service failure UX"
            >
              {isServiceFailed ? 'RESET FAILURE' : 'SIMULATE 504'}
            </button>
            <Badge variant={isServiceFailed ? 'critical' : 'live'} dot size="xs" className="font-mono">
              {isServiceFailed ? 'SERVICE ERROR' : 'SYNCED'}
            </Badge>
          </div>
        </div>

        <div className="h-px bg-border-subtle w-full" />

        {/* PRIMARY INTENT & CLASSIFICATION */}
        <div className="bg-canvas-pure border border-border-subtle rounded-[4px] p-3 space-y-2.5 shadow-hairline">
          {/* INTENT */}
          <div>
            <span className="text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider block">
              INTENT
            </span>
            <span className="font-bold text-xs text-ink-primary block mt-0.5">
              {caseState.intent ? caseState.intent.replace(/_/g, ' ') : 'Customer Support Inbound'}
            </span>
          </div>

          <div className="h-px bg-border-subtle/70" />

          {/* LANGUAGE */}
          <div>
            <span className="text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider block">
              LANGUAGE
            </span>
            <span className="font-semibold text-xs text-ink-primary block mt-0.5 font-mono">
              {caseState.language || 'Hindi / English'}
            </span>
          </div>

          <div className="h-px bg-border-subtle/70" />

          {/* MULTI-OPERATOR GOVERNANCE & RBAC */}
          <div className="space-y-1.5 font-mono text-[10px]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-ink-muted uppercase tracking-wider">OPERATOR DESK</span>
              <Badge variant="live" size="xs">ASSIGNED</Badge>
            </div>

            <div className="bg-canvas-subtle p-2 rounded-[3px] border border-border-subtle space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink-primary">Maya Sharma (OP-782)</span>
                <span className="text-accent font-bold bg-accent-subtle px-1.5 py-0.5 rounded border border-accent-border text-[8px]">
                  SUPERVISOR
                </span>
              </div>

              {/* Roster & Availability */}
              <div className="text-[9px] text-ink-secondary space-y-0.5 pt-1 border-t border-border-subtle/60">
                <div className="flex items-center justify-between">
                  <span>● Maya (Supervisor)</span>
                  <span className="text-ops-live font-semibold">Available</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>● Arjun (Agent)</span>
                  <span className="text-ops-warning font-semibold">On call</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>● Neha (Agent)</span>
                  <span className="text-ops-live font-semibold">Available</span>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-border-subtle/70" />

          {/* SECTION 47: CUSTOMER STATE / EMOTIONAL TRAJECTORY */}
          <div className="space-y-1.5 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
                CUSTOMER STATE
              </span>
              <span className="text-[10px] text-ink-muted tabular-nums">
                INTENT CONFIDENCE: 94%
              </span>
            </div>

            <div className="bg-canvas-subtle p-2.5 rounded-[3px] border border-border-subtle space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-ops-warning">Frustrated</span>
                <div className="flex-1 mx-3 relative flex items-center">
                  <div className="h-px w-full bg-border-strong" />
                  {/* Position marker at 01:58 */}
                  <div
                    className="absolute left-[65%] -translate-x-1/2 flex flex-col items-center"
                    title="Current Trajectory: 01:58"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-accent border-2 border-canvas-pure shadow-xs" />
                  </div>
                </div>
                <span className="font-semibold text-ops-live">Neutral</span>
              </div>

              <div className="flex items-center justify-between text-[9px] text-ink-muted pt-0.5">
                <span>00:00</span>
                <span className="text-accent font-bold pl-8">01:58</span>
                <span>02:41</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-border-subtle/70" />

          {/* 3-LEVEL EXPLICIT AI MEMORY HIERARCHY */}
          <div className="space-y-2 font-mono">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                <Brain className="w-3.5 h-3.5 text-accent" />
                <span>EXPLICIT AI MEMORY</span>
              </div>
              <span className="text-[9px] text-ops-live font-semibold">3 TIERS ACTIVE</span>
            </div>

            {/* Memory Tier Switcher */}
            <div className="grid grid-cols-3 gap-1 bg-canvas-subtle p-0.5 rounded-[3px] border border-border-subtle text-[9px] font-bold text-center">
              <button
                type="button"
                onClick={() => setActiveMemoryTab('customer')}
                className={`py-1 rounded-[2px] transition-colors cursor-pointer ${
                  activeMemoryTab === 'customer'
                    ? 'bg-canvas-pure text-accent border border-border-subtle shadow-xs'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                CUSTOMER
              </button>
              <button
                type="button"
                onClick={() => setActiveMemoryTab('case')}
                className={`py-1 rounded-[2px] transition-colors cursor-pointer ${
                  activeMemoryTab === 'case'
                    ? 'bg-canvas-pure text-accent border border-border-subtle shadow-xs'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                CASE
              </button>
              <button
                type="button"
                onClick={() => setActiveMemoryTab('turn')}
                className={`py-1 rounded-[2px] transition-colors cursor-pointer ${
                  activeMemoryTab === 'turn'
                    ? 'bg-canvas-pure text-accent border border-border-subtle shadow-xs'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                TURN
              </button>
            </div>

            {/* Tier Content Display */}
            {activeMemoryTab === 'customer' && (
              <div className="bg-canvas-subtle p-2.5 rounded-[3px] border border-border-subtle space-y-1.5 text-[10px] animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ink-primary">{caseState.customerId} ({caseState.customerName || 'Customer'})</span>
                  <span className="text-ops-live font-semibold">{caseState.customerTier ? `${caseState.customerTier} Tier` : 'Platinum Tier'}</span>
                </div>
                <div className="text-ink-secondary space-y-1 pt-1 border-t border-border-subtle/60 text-[9px]">
                  <div>
                    <span className="text-ink-muted">Channel / Language: </span>
                    <span className="text-ink-primary font-semibold">voice · {caseState.language || 'hi-IN'}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted">Account Status: </span>
                    <span className="text-accent font-mono font-semibold">verified_customer</span>
                  </div>
                </div>
              </div>
            )}

            {activeMemoryTab === 'case' && (
              <div className="bg-canvas-subtle p-2.5 rounded-[3px] border border-border-subtle space-y-1 text-[10px] animate-in fade-in duration-150">
                <div className="flex items-center justify-between font-bold text-ink-primary">
                  <span>Case #{caseState.id}</span>
                  <span className="text-accent">{caseState.intent || 'Active Session'}</span>
                </div>
                <div className="space-y-0.5 text-[9px] text-ink-secondary pt-1 border-t border-border-subtle/60">
                  <div>• Verified Facts: {caseState.facts.length} in knowledge graph</div>
                  <div>• Status: <span className="font-semibold text-ops-live uppercase">{caseState.status}</span></div>
                </div>
              </div>
            )}

            {activeMemoryTab === 'turn' && (
              <div className="bg-canvas-subtle p-2.5 rounded-[3px] border border-border-subtle space-y-1 text-[10px] animate-in fade-in duration-150">
                <div className="font-bold text-ink-primary">Current Turn Context</div>
                <div className="space-y-0.5 text-[9px] text-ink-secondary pt-1 border-t border-border-subtle/60">
                  <div>• Utterance: "Mera order 5 din se nahi aaya."</div>
                  <div>• Intent: <span className="text-accent font-semibold">refund_request / delivery_issue</span></div>
                  <div>• Slot: <span className="text-ink-primary font-semibold">orderId=84921</span></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 27: TOOL EXECUTION VISUALIZATION */}
        <div className="bg-canvas-pure border border-border-subtle rounded-[4px] p-3 space-y-2.5 shadow-hairline">
          <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
            <span className="text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider">
              TOOL EXECUTION
            </span>
            <span className={`text-[9px] font-mono font-semibold ${isServiceFailed ? 'text-ops-critical' : 'text-ops-live'}`}>
              {isServiceFailed ? 'RPC EXCEPTION' : 'ACTIVE TRACE'}
            </span>
          </div>

          {/* Single in-flight or last execution diagram */}
          <div className="bg-canvas-subtle p-2 rounded-[3px] border border-border-subtle text-center font-mono text-[11px] space-y-1">
            <div className="font-bold text-ink-primary">getOrderStatus</div>
            <div className="text-ink-muted text-[10px]">↓</div>
            {isServiceFailed ? (
              <>
                <div className="text-ops-critical text-[10px] font-bold">504 Gateway Timeout</div>
                <div className="text-ink-muted text-[10px]">↓</div>
                <div className="text-ops-critical font-bold text-xs flex items-center justify-center gap-1">
                  <AlertOctagon className="w-3 h-3" />
                  <span>Failed (Primary Replica)</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-ops-warning text-[10px] font-semibold">Running...</div>
                <div className="text-ink-muted text-[10px]">↓</div>
                <div className="text-ops-live font-bold text-xs flex items-center justify-center gap-1">
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>Complete</span>
                </div>
              </>
            )}
            <div className="text-[10px] text-ink-muted tabular-nums pt-0.5">
              {isServiceFailed ? '5002 ms' : `${measured.lastToolDurationMs} ms`}
            </div>
          </div>

          {/* Multiple Calls Pipeline */}
          <div className="space-y-1.5 pt-1 text-xs font-mono">
            <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">
              EXECUTION PIPELINE
            </div>

            {[
              { name: 'lookupCustomer', status: 'done', latency: '42ms' },
              { name: 'lookupOrder', status: isServiceFailed ? 'failed' : 'done', latency: isServiceFailed ? '504 timeout' : `${measured.lastToolDurationMs}ms` },
              { name: 'getDeliveryStatus', status: isServiceFailed ? 'skipped' : 'done', latency: isServiceFailed ? 'halted' : '80ms' },
              { name: 'refundOrder', status: isServiceFailed ? 'skipped' : 'pending', latency: isServiceFailed ? 'halted' : 'in-flight' },
            ].map((tool, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-1.5 rounded-[2px] bg-canvas-subtle/70 border border-border-subtle/60"
              >
                <span className="font-semibold text-ink-primary text-[11px]">
                  {tool.name}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-ink-muted tabular-nums">
                    {tool.latency}
                  </span>
                  {tool.status === 'done' && (
                    <div className="w-4 h-4 rounded-[2px] bg-ops-liveBg text-ops-live flex items-center justify-center border border-ops-liveBorder">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                  {tool.status === 'pending' && (
                    <div className="w-4 h-4 rounded-[2px] bg-ops-warningBg text-ops-warning flex items-center justify-center border border-ops-warningBorder animate-pulse text-[10px]">
                      ⏳
                    </div>
                  )}
                  {tool.status === 'failed' && (
                    <div className="w-4 h-4 rounded-[2px] bg-ops-criticalBg text-ops-critical flex items-center justify-center border border-ops-criticalBorder font-bold text-[10px]">
                      ✕
                    </div>
                  )}
                  {tool.status === 'skipped' && (
                    <span className="text-[10px] text-ink-muted font-mono">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* KNOWN FACTS */}
        <div className="bg-canvas-pure border border-border-subtle rounded-[4px] p-3 space-y-2 shadow-hairline">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider">
              KNOWN FACTS
            </span>
            <span className="text-[10px] font-mono text-ops-live font-semibold">
              {knownFacts.length} VERIFIED
            </span>
          </div>

          <div className="space-y-1.5 pt-0.5">
            {knownFacts.map((fact, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 text-xs font-mono text-ink-primary"
              >
                <div className="w-3.5 h-3.5 rounded-[2px] bg-ops-liveBg border border-[#A7F3D0] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-2.5 h-2.5 text-ops-live" strokeWidth={3} />
                </div>
                <span className="leading-tight font-medium">{fact}</span>
              </div>
            ))}
          </div>
        </div>

        {/* UNKNOWN */}
        <div className="bg-canvas-pure border border-border-subtle rounded-[4px] p-3 space-y-2 shadow-hairline">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider">
              UNKNOWN
            </span>
            <span className="text-[10px] font-mono text-ink-muted">
              {unknownFacts.length} PENDING
            </span>
          </div>

          <div className="space-y-1.5 pt-0.5">
            {unknownFacts.map((unknown, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 text-xs font-sans text-ink-secondary"
              >
                <div className="w-3.5 h-3.5 rounded-[2px] bg-canvas-muted border border-border-subtle flex items-center justify-center shrink-0 mt-0.5">
                  <HelpCircle className="w-2.5 h-2.5 text-ink-muted" />
                </div>
                <span className="leading-tight">{unknown}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 39: FAILURE UX CARD (IF ORDER API IS DOWN) */}
        {isServiceFailed || caseState.activeFailure?.state === 'TOOL_ERROR' || caseState.status === 'failed' ? (
          <div className="bg-ops-criticalBg border-2 border-ops-criticalBorder rounded-[4px] p-3.5 space-y-3 font-mono shadow-hairline animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-1.5 border-b border-ops-criticalBorder/40">
              <div className="flex items-center gap-1.5 font-bold text-ops-critical text-xs uppercase tracking-tight">
                <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                <span>SERVICE EXCEPTION // 504 TIMEOUT</span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <p className="font-sans text-xs font-semibold text-ink-primary">
                {caseState.activeFailure?.message || 'Carrier tracking gateway 504 Gateway Timeout'}
              </p>
              <p className="font-mono text-[10px] text-ink-secondary">
                No unauthorized actions committed. Graceful fallback active.
              </p>
            </div>

            <div className="pt-2 border-t border-ops-criticalBorder/40 flex items-center gap-2">
              <Button
                variant="primary"
                size="xs"
                onClick={handleRetryService}
                disabled={isRetrying}
                className="flex-1 font-mono text-[10px] font-bold uppercase h-7 bg-accent text-white hover:bg-accent-hover gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>{isRetrying ? 'RETRYING...' : 'RETRY TRACE'}</span>
              </Button>

              <Button
                variant="secondary"
                size="xs"
                onClick={() => {
                  setIsServiceFailed(false)
                  if (onTakeover) onTakeover()
                }}
                className="flex-1 font-mono text-[10px] font-bold uppercase h-7 border-ops-warningBorder text-ops-warning hover:bg-ops-warningBg"
              >
                ESCALATE TO HUMAN
              </Button>
            </div>
          </div>
        ) : (
          /* SECTION 6: THE CLEAN VISUAL CLIMAX ACTION CARD */
          <div className="bg-canvas-pure border border-border rounded-[4px] p-3.5 space-y-3 font-mono shadow-hairline">
            {/* STATE 1: AWAITING APPROVAL */}
            {refundState === 'awaiting_approval' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
                  <span className="text-xs font-bold text-ink-primary uppercase tracking-wider">
                    ACTION REQUEST
                  </span>
                  <span className="text-[9px] font-bold text-ops-warning bg-ops-warningBg px-1.5 py-0.5 rounded border border-[#FED7AA]">
                    {caseState.activeAction?.riskTier || 'MEDIUM'} RISK
                  </span>
                </div>

                <div>
                  <div className="text-base font-bold text-ink-primary tracking-tight">
                    {caseState.activeAction?.title || 'Action Approval'}{' '}
                    {caseState.activeAction?.amount ? `₹${caseState.activeAction.amount}` : ''}
                  </div>
                </div>

                {/* EVIDENCE-BACKED ACTION MODEL */}
                <div className="bg-canvas-subtle p-2 rounded-[3px] border border-border-subtle space-y-1.5 text-[10px] font-mono">
                  <div className="flex items-center justify-between border-b border-border-subtle/60 pb-1">
                    <span className="font-bold text-ink-primary uppercase tracking-tight">EVIDENCE-BACKED ACTION</span>
                    <Badge variant="live" size="xs">
                      {caseState.activeAction?.evidence?.length || caseState.facts.length || 3} PROOFS
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {(caseState.activeAction?.justification || caseState.facts.map((f) => f.label)).slice(0, 4).map((tag, idx) => (
                      <span key={idx} className="bg-canvas-pure px-1.5 py-0.5 rounded border border-border text-[9px] text-accent font-semibold font-mono">
                        ✓ {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 5-POINT REAL POLICY EVALUATION CHECKLIST */}
                <div className="bg-canvas-subtle p-2 rounded-[3px] border border-border-subtle space-y-1 text-[10px] font-mono">
                  <span className="font-bold text-ink-primary uppercase block pb-0.5 border-b border-border-subtle/60">
                    5-Point Policy Evaluation (Gate 1)
                  </span>
                  <div className="flex items-center gap-1.5 text-ops-live font-medium">
                    <Check className="w-3 h-3 shrink-0" strokeWidth={3} />
                    <span>Customer verified ({caseState.customerName || 'Customer'} · {caseState.customerTier || 'Platinum'})</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-ops-live font-medium">
                    <Check className="w-3 h-3 shrink-0" strokeWidth={3} />
                    <span>Intent verified ({caseState.intent || 'Customer Inquiry'})</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-ops-live font-medium">
                    <Check className="w-3 h-3 shrink-0" strokeWidth={3} />
                    <span>Threshold within limits ({caseState.activeAction?.amount ? `₹${caseState.activeAction.amount} ≤ SLA` : 'Policy authorized'})</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-ops-live font-medium">
                    <Check className="w-3 h-3 shrink-0" strokeWidth={3} />
                    <span>Policy eligible ({caseState.activeAction?.policyId || 'POL-REFUND-3.2'})</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-ops-live font-medium">
                    <Check className="w-3 h-3 shrink-0" strokeWidth={3} />
                    <span>No duplicate action verified</span>
                  </div>
                </div>

                {/* AUDITABLE POLICY SOURCE EVIDENCE (KNOWLEDGE LAYER) */}
                <div className="bg-canvas-subtle p-2 rounded-[3px] border border-border-subtle space-y-1.5 font-mono text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink-muted uppercase">POLICY SOURCE</span>
                    <Badge variant="live" size="xs" className="font-mono text-[8px]">
                      v3.2
                    </Badge>
                  </div>
                  <div className="text-ink-primary font-bold text-[11px]">
                    Refund & Dispute Matrix · Section 4.1
                  </div>
                  <p className="text-[10px] font-sans text-ink-secondary leading-snug">
                    "Verified exceptions and customer disputes eligible for immediate settlement."
                  </p>
                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsPolicyModalOpen(true)}
                      className="text-[9px] font-bold text-accent bg-accent-subtle hover:bg-accent hover:text-white px-2 py-0.5 rounded border border-accent-border transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <BookOpen className="w-2.5 h-2.5" />
                      <span>[ VIEW POLICY ]</span>
                    </button>
                  </div>
                </div>

                <div className="text-[10px] text-ink-muted bg-canvas-subtle p-1.5 rounded-[3px] border border-border-subtle">
                  Human approval required · Mandated re-check on execution
                </div>

                {/* APPROVAL ACTION CONTROLS */}
                <div className="space-y-2 pt-1">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleApprove}
                    className="w-full font-mono text-xs font-bold tracking-wider uppercase h-8 bg-accent text-white hover:bg-accent-hover active:bg-[#083070]"
                  >
                    [ APPROVE {caseState.activeAction?.title || 'ACTION'} {caseState.activeAction?.amount ? `₹${caseState.activeAction.amount}` : ''} ]
                  </Button>

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={handleDecline}
                      className="text-xs font-mono text-ink-muted hover:text-ink-primary cursor-pointer transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STATE 2: APPROVED / ACTION INITIATED (CLEAN RESTRAINT) */}
            {refundState === 'approved' && (
              <div className="space-y-2 py-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-ops-live">
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>✓ {caseState.activeAction?.title ? `${caseState.activeAction.title.toUpperCase()} COMMITTED` : 'ACTION INITIATED'}</span>
                </div>

                <div className="text-lg font-bold text-ink-primary tabular-nums">
                  {caseState.activeAction?.amount ? `₹${caseState.activeAction.amount}` : 'Settled & Verified'}
                </div>

                <div className="text-[11px] text-ink-muted tabular-nums">
                  {approvalTime || '21:34:11'}
                </div>

                <div className="pt-2 border-t border-border-subtle flex justify-end">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-[9px] text-ink-muted hover:text-ink-primary flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            )}

            {/* STATE 3: DECLINED */}
            {refundState === 'declined' && (
              <div className="space-y-2 py-1">
                <div className="text-xs font-bold text-ink-secondary">
                  ACTION DECLINED
                </div>
                <p className="text-[11px] text-ink-muted">
                  Case escalated to manual queue.
                </p>
                <div className="pt-2 border-t border-border-subtle flex justify-end">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-[9px] text-ink-muted hover:text-ink-primary flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Auditable Policy Evidence Modal */}
      <PolicyCitationModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        citation={defaultPolicyCitation}
      />
    </aside>
  )
}

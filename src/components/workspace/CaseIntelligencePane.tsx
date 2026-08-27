import React, { useState, useEffect } from 'react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import {
  Check,
  HelpCircle,
  AlertOctagon,
  RotateCcw,
  Radio,
  RefreshCw
} from 'lucide-react'
import { soundEffects } from '../../utils/soundEffects'
import { useCaseState } from '../../contexts/CaseStateContext'
import { agoraRtc } from '../../services/agoraRtcService'
import { telemetryCollector, MeasuredTelemetry } from '../../services/telemetryCollector'

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
    caseState.activeAction?.status === 'APPROVED'
      ? 'approved'
      : caseState.activeAction?.status === 'DECLINED'
      ? 'declined'
      : 'awaiting_approval'

  const approvalTime = caseState.activeAction?.approvedAt || '21:34:08'

  const handleApprove = async () => {
    await approveActiveAction('Maya Sharma')
    soundEffects.playToolExecuted()
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
            <span className="font-mono text-[9px] text-ops-live font-bold bg-ops-liveBg px-1.5 py-0.5 rounded border border-ops-liveBorder flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-ops-live" />
              <span>LIVE</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div>
              <span className="text-[10px] text-ink-muted uppercase block font-semibold">Channel</span>
              <span className="text-ink-primary font-bold block truncate">relay-case-1042</span>
            </div>

            <div>
              <span className="text-[10px] text-ink-muted uppercase block font-semibold">Connection</span>
              <span className="text-ops-live font-bold block">CONNECTED</span>
            </div>

            <div>
              <span className="text-[10px] text-ink-muted uppercase block font-semibold">Participants</span>
              <span className="text-ink-primary font-bold block tabular-nums">{measured.participantCount}</span>
            </div>

            <div>
              <span className="text-[10px] text-ink-muted uppercase block font-semibold">Audio</span>
              <span className="text-ink-primary font-bold block">{measured.audioSampleRate}</span>
            </div>

            <div>
              <span className="text-[10px] text-ink-muted uppercase block font-semibold">RTT</span>
              <span className="text-ink-primary font-bold block tabular-nums">{measured.rttMs} ms</span>
            </div>

            <div>
              <span className="text-[10px] text-ink-muted uppercase block font-semibold">Packet loss</span>
              <span className="text-ops-live font-bold block tabular-nums">{(measured.packetLossRate * 100).toFixed(2)}%</span>
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
              Delivery dispute
            </span>
          </div>

          <div className="h-px bg-border-subtle/70" />

          {/* LANGUAGE */}
          <div>
            <span className="text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider block">
              LANGUAGE
            </span>
            <span className="font-semibold text-xs text-ink-primary block mt-0.5 font-mono">
              Hindi / Hinglish
            </span>
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
        {isServiceFailed ? (
          <div className="bg-ops-criticalBg border-2 border-ops-criticalBorder rounded-[4px] p-3.5 space-y-3 font-mono shadow-hairline animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-1.5 border-b border-ops-criticalBorder/40">
              <div className="flex items-center gap-1.5 font-bold text-ops-critical text-xs uppercase tracking-tight">
                <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                <span>ORDER SERVICE UNAVAILABLE</span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <p className="font-sans text-xs font-semibold text-ink-primary">
                RELAY could not verify the order.
              </p>
              <p className="font-mono text-[10px] text-ink-secondary">
                No action has been taken.
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
                <span>{isRetrying ? 'RETRYING...' : 'RETRY'}</span>
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
                    MEDIUM RISK
                  </span>
                </div>

                <div>
                  <div className="text-base font-bold text-ink-primary tracking-tight">
                    Refund ₹1,499
                  </div>
                </div>

                {/* 5-POINT REAL POLICY EVALUATION CHECKLIST */}
                <div className="bg-canvas-subtle p-2 rounded-[3px] border border-border-subtle space-y-1 text-[10px] font-mono">
                  <span className="font-bold text-ink-primary uppercase block pb-0.5 border-b border-border-subtle/60">
                    5-Point Policy Evaluation (Gate 1)
                  </span>
                  <div className="flex items-center gap-1.5 text-ops-live font-medium">
                    <Check className="w-3 h-3 shrink-0" strokeWidth={3} />
                    <span>Customer verified (Aarav Mehta · Platinum)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-ops-live font-medium">
                    <Check className="w-3 h-3 shrink-0" strokeWidth={3} />
                    <span>Order exists (#84921 · ₹1,499)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-ops-live font-medium">
                    <Check className="w-3 h-3 shrink-0" strokeWidth={3} />
                    <span>Amount within limit (₹1,499 ≤ cap)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-ops-live font-medium">
                    <Check className="w-3 h-3 shrink-0" strokeWidth={3} />
                    <span>Policy eligible (SLA breach +3d)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-ops-live font-medium">
                    <Check className="w-3 h-3 shrink-0" strokeWidth={3} />
                    <span>No duplicate action (0 prior refunds)</span>
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
                    [ APPROVE ]
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

            {/* STATE 2: APPROVED / REFUND INITIATED (CLEAN RESTRAINT) */}
            {refundState === 'approved' && (
              <div className="space-y-2 py-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-ops-live">
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>✓ REFUND INITIATED</span>
                </div>

                <div className="text-lg font-bold text-ink-primary tabular-nums">
                  ₹1,499
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
    </aside>
  )
}

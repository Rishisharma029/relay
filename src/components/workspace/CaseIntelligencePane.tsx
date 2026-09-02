import React, { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import {
  Check,
  RotateCcw,
  Sparkles,
  Wrench,
  BookOpen,
  Headphones,
  HelpCircle,
  AlertTriangle,
  ShieldCheck,
  Clock
} from 'lucide-react'
import { soundEffects } from '../../utils/soundEffects'
import { useCaseState } from '../../contexts/CaseStateContext'
import { useDevMode } from '../../contexts/DevModeContext'
import { agoraRtc } from '../../services/agoraRtcService'
import { telemetryCollector, MeasuredTelemetry } from '../../services/telemetryCollector'
import { speechService } from '../../services/speechRecognitionService'
import { PolicyCitationModal } from './PolicyCitationModal'
import { PolicyCitation } from '../../types/knowledge'

export type RefundActionState = 'awaiting_approval' | 'approved' | 'declined'

interface CaseIntelligencePaneProps {
  isHumanTakeover?: boolean
  onToggleTakeover?: () => void
}

export const CaseIntelligencePane: React.FC<CaseIntelligencePaneProps> = ({
  isHumanTakeover = false,
  onToggleTakeover: _onToggleTakeover
}) => {
  const { caseState, setCaseState } = useCaseState()
  const { isDevMode } = useDevMode()
  const [refundState, setRefundState] = useState<RefundActionState>('awaiting_approval')
  const [approvalTime, setApprovalTime] = useState<string>('')
  const [measured] = useState<MeasuredTelemetry>(telemetryCollector.getSnapshot())
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState<boolean>(false)

  const activeCitation: PolicyCitation = {
    policyId: 'POL-REFUND-3.2',
    title: 'Standard Logistics Refund Policy v3.2',
    version: '3.2.0',
    section: 'Section 4.1',
    clauseId: 'CLAUSE-4.1-SLA',
    clauseText:
      'Where an enterprise order has been retained by a primary logistics aggregator in excess of 3 calendar days beyond the committed estimated time of arrival (ETA), the customer is entitled to an immediate 100% electronic refund or store credit token upon verbal request, subject to single operator sign-off for amounts exceeding ₹1,000.',
  }

  const handleApprove = () => {
    soundEffects.playApprovalRequested()
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setApprovalTime(timeStr)
    setRefundState('approved')

    const approvedAmount = caseState.orderAmount || caseState.activeAction?.amount || 2899

    setCaseState((prev) => ({
      ...prev,
      activeAction: prev.activeAction
        ? {
            ...prev.activeAction,
            status: 'APPROVED',
            amount: approvedAmount,
            justification: [...(prev.activeAction.justification || []), 'Approved by operator Maya Sharma via Governance Card'],
          }
        : undefined,
    }))

    speechService.speak(
      'Aapka ₹' + approvedAmount + ' ka refund approve ho gaya hai aur sandbox payment ledger mein successfully process ho chuka hai.',
      'hi-IN'
    )
  }

  const handleDecline = () => {
    soundEffects.playToolExecuted()
    setRefundState('declined')
    setCaseState((prev) => ({
      ...prev,
      activeAction: prev.activeAction
        ? {
            ...prev.activeAction,
            status: 'DECLINED',
            justification: [...(prev.activeAction.justification || []), 'Declined by operator Maya Sharma'],
          }
        : undefined,
    }))
  }

  const handleReset = () => {
    soundEffects.playToolExecuted()
    setRefundState('awaiting_approval')
    setApprovalTime('')
  }

  // Keyboard shortcut: Press 'A' to Approve
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'a' || e.key === 'A') &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        refundState === 'awaiting_approval' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault()
        handleApprove()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [refundState, caseState])

  return (
    <div className="w-80 border-l border-border-subtle bg-canvas-pure flex flex-col min-h-0 font-sans select-none overflow-hidden shrink-0 shadow-hairline">
      {/* 1. TOP HEADER & OPERATOR CONSOLE BADGE */}
      <div className="p-3.5 bg-canvas-subtle border-b border-border-subtle flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-accent" />
          <span className="font-mono text-xs font-bold text-ink-primary tracking-tight uppercase">
            OPERATOR GOVERNANCE GATE
          </span>
        </div>
        <span className="font-mono text-[9px] font-bold text-accent bg-accent-subtle px-1.5 py-0.5 rounded border border-accent-border">
          HOTKEY: [A]
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 text-xs">
        {/* 2. DUPLEX TAKEOVER BANNER (IF ACTIVE) */}
        {isHumanTakeover && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-[6px] p-2.5 space-y-2 animate-in fade-in duration-100">
            <div className="flex items-center justify-between font-mono text-[11px] font-bold text-amber-500">
              <span className="flex items-center gap-1.5">
                <Headphones className="w-3.5 h-3.5" />
                <span>HUMAN TAKEOVER ACTIVE</span>
              </span>
              <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.2 rounded">DUPLEX ON</span>
            </div>
            <p className="text-[11px] text-ink-secondary leading-tight">
              Maya Sharma is speaking directly with the caller. AI is muted.
            </p>
          </div>
        )}

        {/* 3. SIMPLIFIED 6-POINT OPERATOR SUMMARY */}
        <div className="space-y-3.5 font-sans">
          {/* CUSTOMER */}
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider block">
              CUSTOMER
            </span>
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-ink-primary">
                {caseState.customerName || 'Aarav Patel'}
              </span>
              <span className="text-[10px] font-mono font-bold text-accent bg-accent-subtle px-1.5 py-0.2 rounded border border-accent-border">
                {caseState.customerTier || 'Platinum VIP'}
              </span>
            </div>
          </div>

          <div className="h-px bg-border-subtle/70" />

          {/* PROBLEM */}
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider block">
              PROBLEM
            </span>
            <div className="font-bold text-ink-primary text-xs flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>Order delayed {caseState.orderDelayDays || 4} days in transit</span>
            </div>
          </div>

          <div className="h-px bg-border-subtle/70" />

          {/* AI UNDERSTANDS */}
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider block">
              AI UNDERSTANDS
            </span>
            <div className="font-medium text-ink-primary text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>Refund requested under SLA breach</span>
            </div>
          </div>

          <div className="h-px bg-border-subtle/70" />

          {/* VERIFIED */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider block">
              VERIFIED
            </span>
            <div className="space-y-1 font-mono text-[11px] text-ink-primary bg-canvas-subtle p-2.5 rounded border border-border-subtle">
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Order:</span>
                <span className="font-bold text-ink-primary">#{caseState.orderId || '72143'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Amount:</span>
                <span className="font-bold text-ink-primary">₹{(caseState.orderAmount || caseState.activeAction?.amount || 2899).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Carrier Status:</span>
                <span className="font-bold text-rose-500">SLA Exceeded ({caseState.orderCarrier || 'Delhivery Express'})</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-border-subtle/70" />

          {/* RECOMMENDED ACTION */}
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-wider block">
              RECOMMENDED ACTION
            </span>
            <div className="text-sm font-bold text-ink-primary flex items-center justify-between">
              <span>Refund ₹{(caseState.orderAmount || caseState.activeAction?.amount || 2899).toLocaleString('en-IN')}</span>
              <span className="text-[9px] font-mono font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                RISK: MEDIUM
              </span>
            </div>
          </div>

          <div className="h-px bg-border-subtle/70" />

          {/* WHY? EVIDENCE MATRIX */}
          <div className="space-y-1 font-mono text-[11px] bg-canvas-subtle p-2.5 rounded border border-border-subtle">
            <div className="flex items-center justify-between pb-1 border-b border-border-subtle/60">
              <span className="font-bold text-ink-primary uppercase text-[10px] tracking-wider text-accent flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>WHY?</span>
              </span>
              <button
                type="button"
                onClick={() => setIsPolicyModalOpen(true)}
                className="text-[10px] text-accent font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>POL-REFUND-3.2</span>
                <BookOpen className="w-2.5 h-2.5" />
              </button>
            </div>
            <div className="space-y-1 text-ink-primary text-[11px] pt-1">
              <div className="flex items-center gap-1.5 text-ops-live font-medium">
                <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                <span>Eligible (POL-REFUND-3.2 Qualified)</span>
              </div>
              <div className="flex items-center gap-1.5 text-ops-live font-medium">
                <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                <span>No duplicate refund detected</span>
              </div>
              <div className="flex items-center gap-1.5 text-ops-live font-medium">
                <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                <span>Policy passed (Carrier SLA breached)</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-500 font-bold pt-1 border-t border-border-subtle/50">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Human approval required (Amount &gt; ₹1,000)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. APPROVE / DECLINE BUTTONS */}
        {refundState === 'awaiting_approval' && (
          <div className="pt-2 flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={handleDecline}
              className="flex-1 font-mono text-xs font-bold uppercase tracking-wider h-9 text-rose-500 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer"
            >
              [ DECLINE ]
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleApprove}
              className="flex-1 font-mono text-xs font-bold uppercase tracking-wider h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer"
            >
              [ APPROVE (A) ]
            </Button>
          </div>
        )}

        {/* 5. APPROVED STATE CARD */}
        {refundState === 'approved' && (
          <div className="bg-canvas-pure border-2 border-emerald-500/50 rounded-[8px] p-3.5 space-y-2.5 shadow-sm animate-in fade-in duration-150 font-sans mt-2">
            <div className="flex items-center justify-between text-emerald-600 font-bold text-xs">
              <span className="flex items-center gap-1.5 font-mono">
                <Check className="w-4 h-4 stroke-[3]" />
                <span>PAYMENT · Demo Payment Sandbox</span>
              </span>
              <span className="text-[9px] font-mono text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold">
                SETTLED IN SANDBOX
              </span>
            </div>

            <div className="space-y-1 font-mono text-[11px] bg-canvas-subtle p-2.5 rounded border border-border-subtle">
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Amount:</span>
                <span className="text-sm font-bold text-ink-primary">₹{(caseState.orderAmount || caseState.activeAction?.amount || 2899).toLocaleString('en-IN')} (Refund approved)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Transaction ID:</span>
                <span className="font-bold text-ink-primary font-mono">DEMO-RF-721438910</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Status:</span>
                <span className="font-bold text-ops-live">SETTLED IN SANDBOX</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border-subtle/60 text-[10px]">
                <span className="text-ink-muted">Production connector:</span>
                <span className="font-bold text-amber-500">AVAILABLE / NOT CONNECTED</span>
              </div>
            </div>

            <div className="font-mono text-[10px] space-y-0.5 text-ink-secondary">
              <div>Authorized By: <strong className="text-ink-primary">Maya Sharma ({approvalTime})</strong></div>
            </div>

            <p className="text-ink-muted text-[10px] italic border-t border-border-subtle/60 pt-1.5">
              🔊 Caller heard: "Your ₹{(caseState.orderAmount || 2899).toLocaleString('en-IN')} refund has been approved and processed."
            </p>
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="text-ink-muted hover:text-ink-primary text-[10px] font-mono flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset Demo</span>
              </button>
            </div>
          </div>
        )}

        {/* 6. AI SAFETY & GOVERNANCE BOUNDARY */}
        <div className="bg-canvas-subtle p-3 rounded-[6px] border border-border-subtle space-y-2 font-mono text-[10px] mt-2">
          <div className="flex items-center gap-1.5 font-bold text-ink-primary uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-accent" />
            <span>AI SAFETY &amp; GOVERNANCE BOUNDARY</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded space-y-0.5">
              <span className="font-bold text-emerald-600 block pb-0.5 border-b border-emerald-500/20">AI CAN:</span>
              <div className="text-ink-primary">• listen</div>
              <div className="text-ink-primary">• understand</div>
              <div className="text-ink-primary">• retrieve</div>
              <div className="text-ink-primary">• recommend</div>
              <div className="text-ink-primary">• create low-risk actions</div>
              <div className="text-ink-primary">• prepare approvals</div>
            </div>
            <div className="p-1.5 bg-rose-500/10 border border-rose-500/20 rounded space-y-0.5">
              <span className="font-bold text-rose-600 block pb-0.5 border-b border-rose-500/20">AI CANNOT:</span>
              <div className="text-ink-primary">• bypass policy</div>
              <div className="text-ink-primary">• access arbitrary tools</div>
              <div className="text-ink-primary">• execute financial actions</div>
              <div className="text-ink-primary">• override human approval</div>
            </div>
          </div>
        </div>

        {/* 7. DEVELOPER & RTC METRICS */}
        {isDevMode && (
          <div className="bg-canvas-pure border border-accent/40 rounded-[6px] p-3 space-y-2 font-mono text-[10px] animate-in fade-in duration-150 mt-2">
            <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
              <span className="font-bold text-accent uppercase flex items-center gap-1">
                <Wrench className="w-3 h-3 text-accent" />
                <span>DEV DIAGNOSTICS</span>
              </span>
              <span className="text-ops-live font-bold">{agoraRtc.getConnectionState()}</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-ink-secondary">
              <div>RTT: <strong className="text-ink-primary">{measured.rttMs} ms</strong></div>
              <div>Packet Loss: <strong className="text-ink-primary">{(measured.packetLossRate * 100).toFixed(1)}%</strong></div>
              <div>Jitter: <strong className="text-ink-primary">{measured.jitterMs} ms</strong></div>
              <div>Audio Track: <strong className="text-ink-primary">{agoraRtc.getCallMode()}</strong></div>
            </div>
          </div>
        )}
      </div>

      {/* POLICY CITATION MODAL */}
      <PolicyCitationModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        citation={activeCitation}
      />
    </div>
  )
}

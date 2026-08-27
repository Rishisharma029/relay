import React, { useState } from 'react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import {
  ArrowLeft,
  CreditCard,
  Ticket,
  PhoneForwarded,
  PhoneCall,
  Download,
  Share2,
  Radio,
  FileText,
  Wrench
} from 'lucide-react'
import { ReplayableEvidenceTimeline } from '../components/workspace/ReplayableEvidenceTimeline'

interface CaseDetailViewProps {
  caseId?: string
  onBack: () => void
  onOpenLiveCall: () => void
}

export const CaseDetailView: React.FC<CaseDetailViewProps> = ({
  caseId = 'RLY-1042',
  onBack,
  onOpenLiveCall,
}) => {
  const [activeTab, setActiveTab] = useState<'conversation' | 'transcript'>('conversation')

  const transcriptDialogue = [
    {
      time: '21:30:12',
      speaker: 'CUSTOMER',
      hindi: 'Mera order 5 din se nahi aaya, delivery boy phone bhi nahi utha raha.',
      english: "My order hasn't arrived for 5 days, and the delivery driver isn't picking up.",
    },
    {
      time: '21:30:15',
      speaker: 'RELAY',
      english: "I'll check that for you right away, Aarav. Pulling up your order manifest.",
    },
    {
      time: '21:31:02',
      speaker: 'TOOL',
      isTool: true,
      content: 'getOrderStatus(orderId="84921") → DELIVERY_EXCEPTION',
    },
    {
      time: '21:31:05',
      speaker: 'RELAY',
      english: "Your order has a delivery exception due to transit hub rerouting.",
    },
    {
      time: '21:33:42',
      speaker: 'CUSTOMER',
      hindi: 'Mujhe refund chahiye.',
      english: 'I want a refund.',
    },
    {
      time: '21:34:06',
      speaker: 'TOOL',
      isTool: true,
      content: 'evaluateRefundPolicy(amount=1499, reason="delivery_exception") → APPROVAL_REQUIRED',
    },
    {
      time: '21:34:11',
      speaker: 'OPERATOR',
      english: 'Operator Maya Sharma approved instant refund of ₹1,499 under Case #RLY-1042.',
    },
    {
      time: '21:34:12',
      speaker: 'RELAY',
      english: 'Your refund of ₹1,499 has been initiated and will credit to your account within 2 hours.',
    },
  ]

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-canvas overflow-hidden p-3 gap-3">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="bg-canvas-pure border border-border-subtle rounded-[4px] p-3 flex items-center justify-between shrink-0 shadow-hairline">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="xs"
            onClick={onBack}
            className="gap-1 font-mono text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>CASES</span>
          </Button>

          <div className="h-4 w-px bg-border-subtle" />

          <div>
            <div className="flex items-center gap-2">
              <div className="flex items-baseline gap-1">
                <span className="font-sans text-xs font-semibold text-ink-muted uppercase tracking-wider">
                  CASE
                </span>
                <span className="font-mono text-sm font-bold text-ink-primary tracking-tight">
                  {caseId}
                </span>
              </div>
              <span className="text-border">/</span>
              <span className="font-sans text-xs font-medium text-ink-primary">
                Delivery dispute
              </span>
              <Badge variant="live" size="xs" dot>
                REFUND INITIATED
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-mono text-[10px] bg-accent-subtle text-accent border border-accent-border px-2 py-1 rounded-[3px] font-semibold">
            <Radio className="w-3 h-3 text-accent" />
            <span>AGORA: relay-case-1042</span>
          </div>

          <Button
            variant="primary"
            size="xs"
            onClick={onOpenLiveCall}
            className="gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider h-7 bg-accent text-white hover:bg-accent-hover active:bg-[#083070] cursor-pointer"
          >
            <PhoneCall className="w-3 h-3" />
            <span>[ RESUME LIVE CALL ]</span>
          </Button>
        </div>
      </div>

      {/* Main 3-Column Case Detail Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        {/* LEFT COLUMN (4 Cols): Metadata & Timeline */}
        <div className="lg:col-span-4 flex flex-col gap-3 overflow-y-auto min-h-0">
          {/* CUSTOMER & CASE INFO */}
          <div className="bg-canvas-pure border border-border-subtle rounded-[4px] p-3 space-y-2.5 shadow-hairline">
            <div>
              <span className="text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider block">
                CUSTOMER
              </span>
              <div className="flex items-center justify-between mt-0.5">
                <span className="font-bold text-xs text-ink-primary">
                  Aarav Sharma
                </span>
                <span className="font-mono text-[11px] text-ink-secondary">
                  +91 98201 44102
                </span>
              </div>
            </div>

            <div className="h-px bg-border-subtle/70" />

            <div>
              <span className="text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider block">
                LANGUAGE
              </span>
              <span className="font-semibold text-xs text-ink-primary block mt-0.5 font-mono">
                Hindi
              </span>
            </div>

            <div className="h-px bg-border-subtle/70" />

            <div>
              <span className="text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider block">
                OPENED
              </span>
              <span className="font-semibold text-xs text-ink-primary block mt-0.5 font-mono">
                21:30
              </span>
            </div>

            {/* SECTION 47: CUSTOMER STATE AT CASE END */}
            <div className="pt-2 border-t border-border-subtle/70 space-y-1">
              <span className="text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider block">
                CUSTOMER STATE
              </span>
              <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                <span className="text-ops-warning">Frustrated</span>
                <span className="text-ink-muted">→</span>
                <span className="text-ops-live font-bold">Neutral</span>
              </div>
            </div>
          </div>

          {/* REPLAYABLE EVIDENCE TIMELINE */}
          <div className="flex-1 min-h-0 flex flex-col">
            <ReplayableEvidenceTimeline caseId={caseId} className="flex-1 min-h-0" />
          </div>
        </div>

        {/* CENTER COLUMN (5 Cols): Conversation & Full Transcript */}
        <div className="lg:col-span-5 bg-canvas-pure border border-border-subtle rounded-[4px] flex flex-col min-h-0 shadow-hairline overflow-hidden">
          <div className="p-2.5 border-b border-border-subtle flex items-center justify-between bg-canvas-subtle shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-accent" />
              <span className="font-mono text-xs font-bold text-ink-primary uppercase tracking-tight">
                CONVERSATION // FULL TRANSCRIPT
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('conversation')}
                className={`px-2 py-0.5 rounded-[2px] font-mono text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                  activeTab === 'conversation'
                    ? 'bg-accent text-white'
                    : 'text-ink-secondary hover:text-ink-primary hover:bg-canvas-muted'
                }`}
              >
                Conversation
              </button>
              <button
                onClick={() => setActiveTab('transcript')}
                className={`px-2 py-0.5 rounded-[2px] font-mono text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                  activeTab === 'transcript'
                    ? 'bg-accent text-white'
                    : 'text-ink-secondary hover:text-ink-primary hover:bg-canvas-muted'
                }`}
              >
                Raw Text
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3.5 font-sans min-h-0">
            {activeTab === 'conversation' ? (
              transcriptDialogue.map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="text-ink-muted tabular-nums">{item.time}</span>
                    <span
                      className={`font-bold px-1.5 py-0.2 rounded-[2px] uppercase ${
                        item.speaker === 'CUSTOMER'
                          ? 'bg-accent-subtle text-accent border border-accent-border'
                          : item.speaker === 'RELAY'
                          ? 'bg-ops-liveBg text-ops-live border border-[#A7F3D0]'
                          : item.speaker === 'OPERATOR'
                          ? 'bg-ops-warningBg text-ops-warning border-[#FDE68A]'
                          : 'bg-canvas-muted text-ink-secondary border border-border-subtle'
                      }`}
                    >
                      {item.speaker}
                    </span>
                  </div>

                  <div className="pl-2 border-l-2 border-border-subtle">
                    {item.isTool ? (
                      <div className="bg-canvas-subtle p-1.5 rounded border border-border-subtle font-mono text-[11px] text-ops-warning flex items-center gap-1.5">
                        <Wrench className="w-3 h-3" />
                        <span>⚡ {item.content}</span>
                      </div>
                    ) : (
                      <>
                        {item.hindi && (
                          <p className="text-[11px] text-ink-secondary italic font-sans">
                            "{item.hindi}"
                          </p>
                        )}
                        <p className="text-xs text-ink-primary font-medium">
                          {item.english}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="font-mono text-[11px] text-ink-primary space-y-2 select-text leading-relaxed">
                <p><span className="text-accent font-bold">[21:30:12 CUSTOMER]:</span> Mera order 5 din se nahi aaya...</p>
                <p><span className="text-ops-live font-bold">[21:30:15 RELAY]:</span> I'll check that for you right away...</p>
                <p><span className="text-ops-warning font-bold">[21:31:02 TOOL]:</span> ⚡ getOrderStatus() → DELIVERY_EXCEPTION</p>
                <p><span className="text-ops-live font-bold">[21:31:05 RELAY]:</span> Your order has a delivery exception...</p>
                <p><span className="text-accent font-bold">[21:33:42 CUSTOMER]:</span> Mujhe refund chahiye.</p>
                <p><span className="text-ops-warning font-bold">[21:34:11 OPERATOR]:</span> Refund approved for ₹1,499.</p>
              </div>
            )}
          </div>

          <div className="p-2 border-t border-border-subtle bg-canvas-subtle flex items-center justify-between text-[10px] font-mono text-ink-muted">
            <span>WER: 3.1% • AUDIO OPUS 48kHz</span>
            <Button variant="ghost" size="xs" className="gap-1 text-[10px]">
              <Download className="w-3 h-3" />
              <span>Export Audio & Logs</span>
            </Button>
          </div>
        </div>

        {/* RIGHT COLUMN (3 Cols): Actions Suite */}
        <div className="lg:col-span-3 bg-canvas-pure border border-border-subtle rounded-[4px] p-3 flex flex-col justify-between min-h-0 shadow-hairline overflow-y-auto">
          <div className="space-y-3">
            <div className="pb-1 border-b border-border-subtle">
              <span className="text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider block">
                ACTIONS
              </span>
            </div>

            {/* ACTION 1: REFUND */}
            <div className="bg-ops-liveBg border border-[#A7F3D0] rounded-[4px] p-2.5 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-ops-live font-mono">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Refund</span>
                </div>
                <Badge variant="live" size="xs">
                  COMPLETED
                </Badge>
              </div>
              <div className="font-mono text-xs font-bold text-ink-primary">
                ₹1,499.00
              </div>
              <div className="text-[10px] font-mono text-ink-muted">
                Txn #RF-92817 • UPI Instant
              </div>
            </div>

            {/* ACTION 2: TICKET */}
            <div className="bg-canvas-subtle border border-border-subtle rounded-[4px] p-2.5 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-ink-primary font-mono">
                  <Ticket className="w-3.5 h-3.5 text-accent" />
                  <span>Ticket</span>
                </div>
                <span className="text-[9px] font-mono text-ink-muted">SYNCED</span>
              </div>
              <div className="font-mono text-xs font-semibold text-ink-primary">
                #TCK-89241
              </div>
              <div className="text-[10px] font-mono text-ink-secondary">
                Zendesk / Jira Service Desk
              </div>
            </div>

            {/* ACTION 3: ESCALATION */}
            <div className="bg-canvas-subtle border border-border-subtle rounded-[4px] p-2.5 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-ink-primary font-mono">
                  <PhoneForwarded className="w-3.5 h-3.5 text-ops-warning" />
                  <span>Escalation</span>
                </div>
                <span className="text-[9px] font-mono text-ink-muted">TIER-2</span>
              </div>
              <div className="text-xs font-medium text-ink-primary">
                Supervised by Maya Sharma
              </div>
              <div className="text-[10px] font-mono text-ink-muted">
                No open escalations pending
              </div>
            </div>

            {/* ACTION 4: CALLBACK */}
            <div className="bg-canvas-subtle border border-border-subtle rounded-[4px] p-2.5 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-ink-primary font-mono">
                  <PhoneCall className="w-3.5 h-3.5 text-ink-muted" />
                  <span>Callback</span>
                </div>
                <span className="text-[9px] font-mono text-ops-live font-semibold">SMS SENT</span>
              </div>
              <div className="text-xs font-medium text-ink-primary">
                Automated SMS Confirmation
              </div>
              <div className="text-[10px] font-mono text-ink-muted">
                Sent to +91 98201 44102
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border-subtle space-y-1.5">
            <Button
              variant="outline"
              size="sm"
              className="w-full font-mono text-xs gap-1.5 h-7"
            >
              <Share2 className="w-3 h-3" />
              <span>Share Case Record</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

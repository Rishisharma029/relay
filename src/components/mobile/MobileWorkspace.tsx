import React, { useState } from 'react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { WaveformMonitor } from '../workspace/WaveformMonitor'
import {
  ShieldCheck,
  Check,
  Sparkles,
  Headphones,
  RotateCcw
} from 'lucide-react'

interface MobileWorkspaceProps {
  isHumanTakeover: boolean
  onToggleTakeover: () => void
}

export const MobileWorkspace: React.FC<MobileWorkspaceProps> = ({
  isHumanTakeover,
  onToggleTakeover,
}) => {
  const [refundState, setRefundState] = useState<'pending' | 'approved'>('pending')
  const [approvalTime, setApprovalTime] = useState<string>('21:34:08')

  const handleApprove = () => {
    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    setApprovalTime(`${hours}:${minutes}:${seconds}`)
    setRefundState('approved')
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-canvas overflow-y-auto pb-16 font-sans">
      {/* 1. TOP MOBILE HEADER */}
      <div className="h-9 px-3 bg-canvas-pure border-b border-border-subtle flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-1.5 font-bold tracking-tight text-ink-primary font-mono text-xs">
          <div className="w-2 h-2 bg-accent rounded-[1px]" />
          <span>RELAY</span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="live" dot size="xs">
            LIVE
          </Badge>
        </div>
      </div>

      {/* 2. MAIN ACTIVE CONVERSATION CARD */}
      <div className="p-3 space-y-3">
        {/* CASE HEADER & LIVE WAVEFORM */}
        <div className="bg-canvas-pure border border-border-subtle rounded-[4px] p-3 space-y-2.5 shadow-hairline">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-sans text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
                CASE
              </span>
              <span className="font-mono text-xs font-bold text-ink-primary tracking-tight">
                RLY-1042
              </span>
            </div>
            <h2 className="font-sans text-xs font-medium text-ink-primary mt-0.5">
              Delivery dispute
            </h2>
          </div>

          {/* Continuous Oscilloscope Waveform */}
          <WaveformMonitor />

          {/* Current Speaker Turn */}
          <div className="pt-2 border-t border-border-subtle/70 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="font-bold text-accent">Aarav</span>
              <span className="text-ink-muted">21:33:42 • Hindi</span>
            </div>
            <p className="text-xs text-ink-primary font-medium select-text">
              "Mera order 5 din se nahi aaya."
            </p>
          </div>
        </div>

        {/* 3. CASE STATE (STRUCTURED MEMORY) */}
        <div className="bg-canvas-pure border border-border-subtle rounded-[4px] p-3 space-y-2 shadow-hairline font-mono text-xs">
          <div className="flex items-center justify-between pb-1 border-b border-border-subtle text-[10px] font-bold text-ink-muted uppercase tracking-wider">
            <span>CASE STATE</span>
            <span className="text-ops-live">94% CONF</span>
          </div>

          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between">
              <span className="text-ink-muted text-[11px]">Intent</span>
              <span className="text-ink-primary font-semibold">Delivery dispute</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-ink-muted text-[11px]">Language</span>
              <span className="text-ink-primary">Hindi / Hinglish</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-ink-muted text-[11px]">Sentiment</span>
              <div className="flex items-center gap-1 text-ops-warning font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-ops-warning" />
                <span>Frustrated</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. ACTION (DISCRETE STATE TRANSITION) */}
        <div className="bg-canvas-pure border border-border-subtle rounded-[4px] p-3 space-y-2 shadow-hairline">
          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider">
            <span>ACTION</span>
            <ShieldCheck className="w-3.5 h-3.5 text-ink-muted" />
          </div>

          {refundState === 'pending' ? (
            <div className="space-y-2 pt-0.5">
              <div className="flex items-baseline justify-between font-mono">
                <span className="text-xs font-semibold text-ink-primary">
                  Refund ₹1,499
                </span>
                <span className="text-[10px] text-ops-warning font-semibold bg-ops-warningBg px-1.5 py-0.2 rounded border border-[#FED7AA]">
                  MEDIUM RISK
                </span>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleApprove}
                className="w-full font-mono text-xs font-bold tracking-wider uppercase h-8 bg-accent text-white hover:bg-accent-hover"
              >
                APPROVE
              </Button>
            </div>
          ) : (
            <div className="bg-ops-liveBg border border-ops-liveBorder rounded-[3px] p-2 space-y-1 font-mono text-xs">
              <div className="flex items-center gap-1.5 text-ops-live font-bold text-xs">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>REFUND INITIATED</span>
              </div>
              <div className="flex items-baseline justify-between text-[11px] text-ink-primary font-bold">
                <span>₹1,499.00</span>
                <span className="text-[10px] text-ink-muted font-normal">{approvalTime}</span>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setRefundState('pending')}
                  className="text-[9px] text-ink-muted hover:text-ink-primary flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. BOTTOM STICKY OPERATIONAL CONTROL */}
      <div className="fixed bottom-0 left-0 right-0 h-12 bg-canvas-pure border-t border-border-subtle px-3 flex items-center justify-between z-40 shadow-hairline select-none">
        <div className="flex items-center gap-2">
          {isHumanTakeover ? (
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-ops-warning">
              <span className="w-2 h-2 rounded-full bg-ops-warning animate-ping" />
              <span>● HUMAN ACTIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-accent">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span>● RELAY ACTIVE</span>
            </div>
          )}
        </div>

        <div>
          {isHumanTakeover ? (
            <Button
              variant="secondary"
              size="xs"
              onClick={onToggleTakeover}
              className="font-mono text-xs font-bold uppercase h-7 px-3"
            >
              <Sparkles className="w-3 h-3 text-accent mr-1" />
              <span>RETURN</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              size="xs"
              onClick={onToggleTakeover}
              className="font-mono text-xs font-bold uppercase h-7 px-3 bg-[#171717] text-white hover:bg-ink-secondary"
            >
              <Headphones className="w-3 h-3 mr-1" />
              <span>TAKE OVER</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

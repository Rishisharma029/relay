import React from 'react'
import { Button } from '../components/ui/Button'
import { Plus, ArrowRight, Radio, ShieldCheck, FolderKanban } from 'lucide-react'

interface LandingPortalViewProps {
  onStartLiveSession: () => void
  onViewDemoCase: () => void
  onExploreCasesQueue?: () => void
}

export const LandingPortalView: React.FC<LandingPortalViewProps> = ({
  onStartLiveSession,
  onViewDemoCase,
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-canvas p-6 select-none font-mono min-h-0">
      <div className="w-full max-w-sm bg-canvas-pure border border-border-subtle rounded-[4px] p-6 space-y-6 shadow-hairline">
        {/* Brand & Subtitle */}
        <div className="text-left space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-ink-primary font-mono">
            RELAY
          </h1>
          <p className="text-xs text-ink-muted">
            Real-time voice operations
          </p>
        </div>

        {/* DOMINANT ACTION: + NEW LIVE CASE */}
        <div>
          <Button
            variant="primary"
            size="md"
            onClick={onStartLiveSession}
            className="w-full font-mono text-xs font-bold uppercase tracking-wider h-11 bg-accent text-white hover:bg-accent-hover active:bg-[#083070] justify-center flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ NEW LIVE CASE</span>
          </Button>
        </div>

        {/* METRICS SUMMARY */}
        <div className="pt-2 border-t border-border-subtle/80 space-y-2.5 text-xs">
          <div className="flex items-center justify-between font-mono">
            <span className="text-ink-secondary flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-ops-live" />
              <span>Active calls</span>
            </span>
            <span className="font-bold text-ink-primary tabular-nums">3</span>
          </div>

          <div className="flex items-center justify-between font-mono">
            <span className="text-ink-secondary flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-accent" />
              <span>Awaiting approval</span>
            </span>
            <span className="font-bold text-accent tabular-nums">2</span>
          </div>

          <div className="flex items-center justify-between font-mono">
            <span className="text-ink-secondary flex items-center gap-2">
              <FolderKanban className="w-3.5 h-3.5 text-ink-muted" />
              <span>Open cases</span>
            </span>
            <span className="font-bold text-ink-primary tabular-nums">18</span>
          </div>
        </div>

        {/* RECENT CASE QUICK JUMP */}
        <div className="pt-3 border-t border-border-subtle/70 text-left space-y-1.5">
          <span className="text-[10px] text-ink-muted uppercase block font-semibold">
            Recent active case
          </span>
          <button
            type="button"
            onClick={onViewDemoCase}
            className="text-xs text-ink-primary hover:text-accent font-semibold flex items-center justify-between w-full cursor-pointer group bg-canvas-subtle p-2 rounded-[3px] border border-border-subtle transition-colors"
          >
            <span>RLY-1042 · Delivery dispute</span>
            <ArrowRight className="w-3.5 h-3.5 text-ink-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>
      </div>
    </div>
  )
}

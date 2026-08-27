import React from 'react'
import { Button } from '../components/ui/Button'
import { ArrowRight } from 'lucide-react'

interface LandingPortalViewProps {
  onStartLiveSession: () => void
  onViewDemoCase: () => void
  onExploreCasesQueue: () => void
}

export const LandingPortalView: React.FC<LandingPortalViewProps> = ({
  onStartLiveSession,
  onViewDemoCase,
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-canvas p-6 select-none font-mono min-h-0">
      <div className="w-full max-w-sm bg-canvas-pure border border-border-subtle rounded-[4px] p-6 space-y-6 shadow-hairline text-center">
        {/* Brand */}
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-ink-primary">
            RELAY
          </h1>
          <p className="text-xs text-ink-muted">
            Real-time voice operations.
          </p>
        </div>

        {/* Enter Button */}
        <div>
          <Button
            variant="primary"
            size="md"
            onClick={onStartLiveSession}
            className="w-full font-mono text-xs font-bold uppercase tracking-wider h-10 bg-accent text-white hover:bg-accent-hover justify-center"
          >
            [ ENTER LIVE WORKSTATION ]
          </Button>
        </div>

        {/* Recent Case Deep Link */}
        <div className="pt-2 border-t border-border-subtle/70 text-left space-y-1">
          <span className="text-[10px] text-ink-muted uppercase block font-semibold">
            Recent case
          </span>
          <button
            type="button"
            onClick={onViewDemoCase}
            className="text-xs text-ink-primary hover:text-accent font-semibold flex items-center justify-between w-full cursor-pointer group"
          >
            <span>RLY-1042 · Delivery dispute</span>
            <ArrowRight className="w-3 h-3 text-ink-muted group-hover:text-accent transition-colors" />
          </button>
        </div>
      </div>
    </div>
  )
}

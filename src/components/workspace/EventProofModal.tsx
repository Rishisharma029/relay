import React from 'react'
import { X, Terminal } from 'lucide-react'

export interface ProofEvent {
  timestamp: string
  eventType: string
  title: string
  source: string
  confidence?: number | string
  payload: Record<string, any>
}

interface EventProofModalProps {
  isOpen: boolean
  onClose: () => void
  event: ProofEvent | null
}

export const EventProofModal: React.FC<EventProofModalProps> = ({
  isOpen,
  onClose,
  event,
}) => {
  if (!isOpen || !event) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-canvas-pure border border-border rounded-[4px] shadow-lg overflow-hidden font-mono animate-in fade-in duration-150">
        {/* Header */}
        <div className="p-3 border-b border-border-subtle flex items-center justify-between bg-canvas-subtle">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-bold text-ink-primary uppercase tracking-tight">
              EVENT PROOF INSPECTOR
            </span>
          </div>

          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink-primary p-1 rounded hover:bg-canvas-muted cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 space-y-3 text-xs">
          <div className="flex items-baseline justify-between pb-2 border-b border-border-subtle/60">
            <div>
              <span className="text-[10px] text-ink-muted block uppercase">TIMESTAMP</span>
              <span className="font-bold text-ink-primary tabular-nums">{event.timestamp}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-ink-muted block uppercase">EVENT TYPE</span>
              <span className="font-bold text-accent">{event.eventType}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pb-2 border-b border-border-subtle/60">
            <div>
              <span className="text-[10px] text-ink-muted block uppercase">SOURCE</span>
              <span className="text-ink-primary font-medium">{event.source}</span>
            </div>
            {event.confidence !== undefined && (
              <div>
                <span className="text-[10px] text-ink-muted block uppercase">CONFIDENCE</span>
                <span className="text-ops-live font-bold tabular-nums">
                  {typeof event.confidence === 'number' ? event.confidence.toFixed(2) : event.confidence}
                </span>
              </div>
            )}
          </div>

          {/* Raw Payload Inspection */}
          <div className="space-y-1">
            <span className="text-[10px] text-ink-muted uppercase block font-semibold">
              TELEMETRY PAYLOAD
            </span>
            <pre className="bg-canvas-subtle border border-border-subtle p-2.5 rounded-[3px] text-[11px] text-ink-primary overflow-x-auto leading-relaxed max-h-48">
              {JSON.stringify(event.payload, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-2.5 px-4 bg-canvas-subtle border-t border-border-subtle flex items-center justify-between text-[10px] text-ink-muted">
          <span>Verified from pipeline telemetry</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-canvas-pure border border-border-subtle text-ink-primary rounded-[2px] font-bold hover:bg-canvas-muted cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  )
}

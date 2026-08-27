import React from 'react'
import { DEMO_SCENARIOS, DemoScenario } from '../../data/demoScenarios'
import {
  Sparkles,
  X,
  Play
} from 'lucide-react'

interface DemoModeModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectScenario: (scenario: DemoScenario) => void
  activeScenarioId?: string
}

export const DemoModeModal: React.FC<DemoModeModalProps> = ({
  isOpen,
  onClose,
  onSelectScenario,
  activeScenarioId,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-start justify-center pt-16 p-4 font-sans select-none animate-in fade-in duration-100">
      <div className="w-full max-w-2xl bg-canvas-pure border border-border-subtle rounded-[6px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-3.5 px-4 border-b border-border-subtle bg-canvas-pure flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-[2px] bg-accent-subtle border border-accent-border flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-ink-primary uppercase tracking-tight">
                  DEMO SCENARIOS CONTROL
                </span>
                <span className="font-mono text-[9px] font-bold bg-canvas-subtle text-ink-secondary px-1.5 py-0.2 rounded border border-border-subtle">
                  EVALUATOR SUITE
                </span>
              </div>
              <p className="text-[11px] font-sans text-ink-muted leading-tight">
                Seed controlled edge cases and live voice flows for judges
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink-primary cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scenarios Grid */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono min-h-[220px]">
          {DEMO_SCENARIOS.map((scenario) => {
            const isActive = activeScenarioId === scenario.id

            return (
              <div
                key={scenario.id}
                onClick={() => {
                  onSelectScenario(scenario)
                  onClose()
                }}
                className={`p-3 rounded-[4px] border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isActive
                    ? 'bg-accent-subtle/70 border-accent-border shadow-hairline'
                    : 'bg-canvas-subtle hover:bg-canvas-muted border-border-subtle'
                }`}
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-ink-primary">
                      {scenario.title}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded border bg-canvas-pure border-border-subtle text-accent">
                      {scenario.tag}
                    </span>
                    <span className="text-[10px] text-ink-muted font-sans hidden sm:inline">
                      • {scenario.customer} ({scenario.language})
                    </span>
                  </div>

                  <p className="text-[11px] font-sans text-ink-secondary leading-normal">
                    {scenario.description}
                  </p>

                  <div className="text-[10px] text-ink-muted font-mono flex items-center gap-2 pt-0.5">
                    <span>Case #{scenario.caseId}</span>
                    <span>•</span>
                    <span>Action: {scenario.proposedAction.title}</span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5 self-start sm:self-auto">
                  <button
                    type="button"
                    className={`px-2.5 py-1 rounded-[2px] font-mono text-[10px] font-bold uppercase transition-colors flex items-center gap-1 ${
                      isActive
                        ? 'bg-accent text-white'
                        : 'bg-canvas-pure text-ink-primary border border-border-subtle hover:border-accent hover:text-accent'
                    }`}
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>{isActive ? 'ACTIVE' : 'LOAD'}</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="p-2.5 px-4 border-t border-border-subtle bg-canvas-pure flex items-center justify-between font-mono text-[10px] text-ink-muted">
          <span>Press ESC or Alt+D to toggle demo controller</span>
          <span className="text-ink-secondary">Production-Grade Telephony Simulator</span>
        </div>
      </div>
    </div>
  )
}

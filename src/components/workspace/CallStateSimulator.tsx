import React from 'react'
import { CallState, CALL_STATES_META } from '../../types/callState'
import { Sliders } from 'lucide-react'

interface CallStateSimulatorProps {
  currentState: CallState
  onSelectState: (state: CallState) => void
}

export const CallStateSimulator: React.FC<CallStateSimulatorProps> = ({
  currentState,
  onSelectState,
}) => {
  const statesList: CallState[] = [
    'CONNECTING',
    'CONNECTED',
    'CUSTOMER_SPEAKING',
    'RELAY_SPEAKING',
    'RELAY_LISTENING',
    'CUSTOMER_INTERRUPTED',
    'TOOL_EXECUTING',
    'WAITING_FOR_APPROVAL',
    'HUMAN_TAKEOVER',
    'HUMAN_ACTIVE',
    'CALL_ENDING',
    'CALL_ENDED',
    'CONNECTION_LOST',
    'AI_ERROR',
    'TOOL_ERROR',
  ]

  return (
    <div className="bg-canvas-pure border-b border-border-subtle p-2 px-3 flex items-center justify-between gap-2 overflow-x-auto select-none font-mono text-xs shrink-0">
      <div className="flex items-center gap-1.5 shrink-0">
        <Sliders className="w-3 h-3 text-ink-muted" />
        <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
          SIMULATOR (15 STATES):
        </span>
      </div>

      {/* States Quick-Select Bar */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
        {statesList.map((st) => {
          const meta = CALL_STATES_META[st]
          const isSelected = st === currentState

          return (
            <button
              key={st}
              type="button"
              onClick={() => onSelectState(st)}
              className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono whitespace-nowrap transition-colors cursor-pointer border ${
                isSelected
                  ? 'bg-ink-primary text-white border-ink-primary font-bold shadow-hairline'
                  : 'bg-canvas-subtle hover:bg-canvas-muted text-ink-secondary border-border-subtle'
              }`}
              title={meta.description}
            >
              <span>{meta.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

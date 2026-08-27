import React, { useState } from 'react'
import { Play, Pause, Trash2, X, Terminal } from 'lucide-react'

export interface LogEntry {
  id: string
  timestamp: string
  level: 'INFO' | 'WARN' | 'CRIT' | 'SIP' | 'AUDIO' | 'ROUTE'
  source: string
  message: string
  latency?: string
}

interface TerminalPanelProps {
  logs: LogEntry[]
  onClear: () => void
  onClose: () => void
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ logs, onClear, onClose }) => {
  const [filterLevel, setFilterLevel] = useState<string>('ALL')
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')

  const levelColor = {
    INFO: 'text-ink-secondary bg-canvas-muted',
    WARN: 'text-ops-warning bg-ops-warningBg border border-[#FDE68A]',
    CRIT: 'text-ops-critical bg-ops-criticalBg border border-[#FECACA]',
    SIP: 'text-accent bg-accent-subtle border border-accent-border',
    AUDIO: 'text-[#6D28D9] bg-[#F5F3FF] border border-[#DDD6FE]',
    ROUTE: 'text-ops-live bg-ops-liveBg border border-[#A7F3D0]',
  }

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'ALL' && log.level !== filterLevel) return false
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase()) && !log.source.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  return (
    <div className="h-56 bg-[#0B0F19] text-[#E2E8F0] border-t border-border-subtle flex flex-col font-mono text-[11px] select-none shrink-0 z-20">
      {/* Terminal Toolbar */}
      <div className="h-8 bg-[#111827] border-b border-[#1F2937] px-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-white font-semibold">
            <Terminal className="w-3.5 h-3.5 text-accent" />
            <span className="tracking-wide text-[11px]">TELEMETRY STREAM // EVENT BUS</span>
          </div>

          <span className="text-[#4B5563]">|</span>

          {/* Level Filter */}
          <div className="flex items-center gap-1">
            {['ALL', 'ROUTE', 'SIP', 'AUDIO', 'WARN', 'CRIT'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-1.5 py-0.5 rounded-[2px] text-[10px] transition-colors cursor-pointer ${
                  filterLevel === lvl
                    ? 'bg-accent text-white font-semibold'
                    : 'text-[#9CA3AF] hover:text-white hover:bg-[#1F2937]'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="filter stream..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#1F2937] border border-[#374151] rounded-[3px] px-2 py-0.5 text-[10px] text-white placeholder-[#6B7280] focus:outline-none focus:border-accent w-36"
          />

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-1 text-[#9CA3AF] hover:text-white rounded hover:bg-[#1F2937] cursor-pointer"
            title={isPaused ? 'Resume stream' : 'Pause stream'}
          >
            {isPaused ? <Play className="w-3 h-3 text-ops-live" /> : <Pause className="w-3 h-3" />}
          </button>

          <button
            onClick={onClear}
            className="p-1 text-[#9CA3AF] hover:text-white rounded hover:bg-[#1F2937] cursor-pointer"
            title="Clear logs"
          >
            <Trash2 className="w-3 h-3" />
          </button>

          <button
            onClick={onClose}
            className="p-1 text-[#9CA3AF] hover:text-white rounded hover:bg-[#1F2937] cursor-pointer"
            title="Close log pane"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Log Output Rows */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 font-mono select-text leading-4">
        {filteredLogs.length === 0 ? (
          <div className="text-[#6B7280] italic py-2 text-center">
            No events match current filter criteria.
          </div>
        ) : (
          filteredLogs.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-2 hover:bg-[#1F2937]/50 px-1 py-0.5 rounded-[2px]"
            >
              <span className="text-[#6B7280] shrink-0 tabular-nums">{entry.timestamp}</span>
              <span
                className={`px-1 py-0.1 rounded-[2px] text-[9px] font-bold shrink-0 ${
                  levelColor[entry.level] || 'text-[#9CA3AF]'
                }`}
              >
                {entry.level}
              </span>
              <span className="text-[#9CA3AF] shrink-0 font-semibold">[{entry.source}]</span>
              <span className="text-[#E5E7EB] flex-1 break-all">{entry.message}</span>
              {entry.latency && (
                <span className="text-[#60A5FA] shrink-0 text-[10px] tabular-nums">
                  {entry.latency}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

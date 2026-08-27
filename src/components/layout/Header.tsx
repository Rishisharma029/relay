import React, { useState, useEffect } from 'react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import {
  Radio,
  Wifi,
  Activity,
  Terminal,
  Volume2,
  Settings,
  Bell
} from 'lucide-react'

interface HeaderProps {
  activeSection: string
  onToggleTerminal: () => void
  isTerminalOpen: boolean
}

export const Header: React.FC<HeaderProps> = ({
  onToggleTerminal,
  isTerminalOpen,
}) => {
  const [time, setTime] = useState<string>('')
  const [zuluTime, setZuluTime] = useState<string>('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(now.toTimeString().split(' ')[0])
      setZuluTime(now.toISOString().substring(11, 19) + 'Z')
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="h-10 bg-canvas-pure border-b border-border-subtle flex items-center justify-between px-3 shrink-0 select-none z-30">
      {/* Brand & Mode */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-bold tracking-tight text-ink-primary text-xs">
          <div className="w-2.5 h-2.5 bg-accent rounded-[2px]" />
          <span className="font-mono tracking-widest text-[13px]">RELAY</span>
          <span className="text-border text-xs">/</span>
          <span className="text-[11px] font-mono text-ink-muted uppercase">OPS-CONSOLE v2.4</span>
        </div>

        <div className="h-4 w-px bg-border-subtle mx-1" />

        <div className="flex items-center gap-1.5">
          <Badge variant="live" dot size="xs">
            SYSTEM ONLINE
          </Badge>
          <span className="font-mono text-[11px] text-ink-muted hidden md:inline">
            NODE: <span className="text-ink-primary font-semibold">IAD-04</span>
          </span>
        </div>
      </div>

      {/* Center telemetry */}
      <div className="hidden lg:flex items-center gap-4 text-xs font-mono text-ink-muted">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-ops-live" />
          <span>LATENCY:</span>
          <span className="text-ink-primary font-semibold tabular-nums">18ms</span>
        </div>

        <div className="h-3 w-px bg-border-subtle" />

        <div className="flex items-center gap-1.5">
          <Wifi className="w-3 h-3 text-accent" />
          <span>SIP TRUNKS:</span>
          <span className="text-ink-primary font-semibold tabular-nums">24/24 OK</span>
        </div>

        <div className="h-3 w-px bg-border-subtle" />

        <div className="flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-ink-secondary" />
          <span>CALL CONCURRENCY:</span>
          <span className="text-ink-primary font-semibold tabular-nums">142</span>
        </div>
      </div>

      {/* Clocks & Controls */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 font-mono text-[11px] bg-canvas-subtle px-2 py-0.5 rounded-[3px] border border-border-subtle">
          <span className="text-ink-muted">ZULU:</span>
          <span className="font-semibold text-ink-primary tabular-nums">{zuluTime || '00:00:00Z'}</span>
          <span className="text-border">|</span>
          <span className="text-ink-muted">LOC:</span>
          <span className="font-medium text-ink-secondary tabular-nums">{time || '00:00:00'}</span>
        </div>

        <div className="h-4 w-px bg-border-subtle mx-0.5" />

        <Button
          variant={isTerminalOpen ? 'primary' : 'secondary'}
          size="xs"
          onClick={onToggleTerminal}
          className="gap-1 font-mono text-[10px]"
          title="Toggle Stream Terminal (`)"
        >
          <Terminal className="w-3 h-3" />
          <span>LOGS</span>
        </Button>

        <Button variant="ghost" size="xs" iconOnly title="Audio Monitor">
          <Volume2 className="w-3.5 h-3.5 text-ink-secondary" />
        </Button>

        <Button variant="ghost" size="xs" iconOnly title="Notifications">
          <Bell className="w-3.5 h-3.5 text-ink-secondary" />
        </Button>

        <Button variant="ghost" size="xs" iconOnly title="Settings">
          <Settings className="w-3.5 h-3.5 text-ink-secondary" />
        </Button>
      </div>
    </header>
  )
}

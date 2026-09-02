import React, { useState, useEffect, useRef } from 'react'
import { Layers, Search, ArrowUpRight, ShieldAlert, Wrench, FolderPlus } from 'lucide-react'
import { useCaseState } from '../../contexts/CaseStateContext'
import { useDevMode } from '../../contexts/DevModeContext'

export interface NotificationItem {
  id: string
  title: string
  caseId: string
  type: 'approval' | 'tool_error' | 'case_assigned'
  time: string
  detail: string
  unread: boolean
}

interface AppHeaderProps {
  caseId?: string
  caseTitle?: string
  isConnected?: boolean
  isHumanTakeover?: boolean
  onToggleDrawer?: () => void
  isDrawerOpen?: boolean
  onOpenSearch?: () => void
  onSelectCase?: (caseId: string) => void
  onOpenDemoMode?: () => void
  onOpenNewCase?: () => void
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  caseId = 'CASE-1042',
  caseTitle = 'Delivery dispute',
  isConnected = true,
  isHumanTakeover = false,
  onToggleDrawer,
  isDrawerOpen = true,
  onOpenSearch,
  onSelectCase,
  onOpenDemoMode,
  onOpenNewCase,
}) => {
  const { runtimeMode, toggleRuntimeMode } = useCaseState()
  const { isDevMode, toggleDevMode } = useDevMode()
  const [timeString, setTimeString] = useState<string>('')
  const [showNotifications, setShowNotifications] = useState<boolean>(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'n-1',
      title: 'Refund approval required',
      caseId: 'RLY-1042',
      type: 'approval',
      time: '2m ago',
      detail: 'Proposed ₹1,499 refund awaiting operator authorization',
      unread: true,
    },
    {
      id: 'n-2',
      title: 'Tool failure',
      caseId: 'RLY-1038',
      type: 'tool_error',
      time: '5m ago',
      detail: 'lookupSubscription() returned 504 Gateway Timeout',
      unread: true,
    },
    {
      id: 'n-3',
      title: 'New case assigned',
      caseId: 'RLY-1037',
      type: 'case_assigned',
      time: '12m ago',
      detail: 'Inbound Hindi call routed to queue',
      unread: true,
    },
  ])

  const notifRef = useRef<HTMLDivElement | null>(null)
  const transparencyRef = useRef<HTMLDivElement | null>(null)
  const [showTransparencyPopover, setShowTransparencyPopover] = useState<boolean>(false)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      setTimeString(`${hours}:${minutes}:${seconds}`)
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
      if (transparencyRef.current && !transparencyRef.current.contains(e.target as Node)) {
        setShowTransparencyPopover(false)
      }
    }
    if (showNotifications || showTransparencyPopover) {
      window.addEventListener('mousedown', handleClickOutside)
    }
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [showNotifications, showTransparencyPopover])

  const unreadCount = notifications.filter((n) => n.unread).length

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
  }

  const handleNotificationClick = (item: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n))
    )
    setShowNotifications(false)
    if (onSelectCase) {
      onSelectCase(item.caseId)
    }
  }

  return (
    <header className="h-8 bg-canvas-pure border-b border-border-subtle flex items-center justify-between px-3 shrink-0 select-none z-30 font-sans text-xs relative">
      {/* Left: Operational Context */}
      <div className="flex items-center gap-3">
        {/* Module Title */}
        <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-tight text-ink-primary">
          <span>RELAY</span>
          <span className="text-border">/</span>
          <span className="text-ink-secondary uppercase tracking-wider font-semibold">
            LIVE OPERATIONS
          </span>
        </div>

        <div className="h-3.5 w-px bg-border-subtle" />

        {/* Case Info */}
        <div className="flex items-center gap-2">
          <div className="flex items-baseline gap-1">
            <span className="font-sans text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
              CASE
            </span>
            <span className="font-mono font-bold text-[11px] text-ink-primary tracking-tight">
              {caseId.replace('CASE-', '')}
            </span>
          </div>
          <span className="text-ink-muted text-[11px] hidden sm:inline font-sans font-normal">
            {caseTitle}
          </span>
        </div>

        <div className="h-3.5 w-px bg-border-subtle" />

        {/* Connection Status & Active Actor Badge */}
        {isConnected && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-ops-live shrink-0" />
              <span className="text-ops-live font-semibold">CONNECTED</span>
            </div>

            <div
              className={`font-mono text-[10px] uppercase px-1.5 py-0.2 rounded font-bold tracking-wider ${
                isHumanTakeover
                  ? 'bg-ops-warningBg text-ops-warning border border-[#FDE68A]'
                  : 'bg-accent-subtle text-accent border border-accent-border'
              }`}
            >
              {isHumanTakeover ? '● MAYA ACTIVE' : '● RELAY ACTIVE'}
            </div>
          </div>
        )}

        <div className="h-3.5 w-px bg-border-subtle hidden md:block" />

        {/* Live Clock */}
        <div className="font-mono text-[11px] text-ink-primary font-semibold tabular-nums hidden md:block">
          {timeString || '21:34:18'}
        </div>
      </div>

      {/* Center/Right: New Case, Runtime Mode Switcher, Global Search, Notifications */}
      <div className="flex items-center gap-2.5">
        {/* NEW LIVE CASE TRIGGER */}
        {onOpenNewCase && (
          <button
            type="button"
            onClick={onOpenNewCase}
            className="flex items-center gap-1 bg-accent text-white hover:bg-accent-hover active:bg-[#083070] border border-accent-border rounded-[3px] px-2 py-0.5 text-xs font-mono font-bold tracking-wider uppercase transition-colors cursor-pointer shadow-hairline"
            title="Start New Live Case"
          >
            <span>+ NEW CASE</span>
          </button>
        )}

        {/* RUNTIME MODE SWITCHER: REAL vs DEMO */}
        <button
          type="button"
          onClick={toggleRuntimeMode}
          className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded-[3px] font-bold tracking-wider border transition-colors cursor-pointer flex items-center gap-1.5 ${
            runtimeMode === 'REAL'
              ? 'bg-ops-liveBg text-ops-live border-ops-liveBorder'
              : 'bg-accent-subtle text-accent border-accent-border'
          }`}
          title="Toggle between LIVE CALL (WebRTC) and DEMO SIMULATION"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${runtimeMode === 'REAL' ? 'bg-ops-live animate-pulse' : 'bg-accent'}`} />
          <span>{runtimeMode === 'REAL' ? 'LIVE' : 'DEMO'}</span>
        </button>

        {/* SECTION 41: DEMO SCENARIOS TRIGGER */}
        {onOpenDemoMode && (
          <button
            type="button"
            onClick={onOpenDemoMode}
            className="flex items-center gap-1 bg-canvas-subtle hover:bg-canvas-muted border border-border-subtle rounded-[3px] px-2 py-0.5 text-xs text-ink-secondary hover:text-ink-primary font-mono font-bold transition-colors cursor-pointer"
            title="Demo Scenarios (Alt+D)"
          >
            <span>⚡ SCENARIOS</span>
          </button>
        )}

        {/* SYSTEM STATUS TRANSPARENCY BADGE */}
        <div className="relative" ref={transparencyRef}>
          <button
            type="button"
            onClick={() => setShowTransparencyPopover(!showTransparencyPopover)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] font-mono text-[10px] font-bold border transition-colors cursor-pointer bg-canvas-subtle text-ink-primary hover:bg-canvas-muted border-border-subtle hover:border-border-strong"
            title="System Architecture Status (Live vs Sandbox)"
          >
            <span className="w-2 h-2 rounded-full bg-ops-live animate-pulse" />
            <span className="font-bold">SYSTEM STATUS</span>
          </button>

          {showTransparencyPopover && (
            <div className="absolute right-0 top-7 w-80 bg-canvas-pure border border-border-subtle rounded-[6px] shadow-2xl z-50 overflow-hidden font-sans p-3 space-y-2.5 animate-in fade-in duration-100">
              <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle">
                <span className="font-mono text-xs font-bold text-ink-primary uppercase tracking-tight">
                  SYSTEM ARCHITECTURE STATUS
                </span>
                <span className="font-mono text-[9px] font-bold bg-ops-liveBg text-ops-live px-1.5 py-0.2 rounded border border-ops-liveBorder">
                  HONEST STATUS
                </span>
              </div>

              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between py-1 px-2 bg-canvas-subtle rounded border border-border-subtle">
                  <span className="text-ink-primary font-bold">VOICE</span>
                  <span className="text-ops-live font-bold bg-ops-liveBg px-1.5 py-0.5 rounded border border-ops-liveBorder text-[10px]">● LIVE</span>
                </div>
                <div className="flex items-center justify-between py-1 px-2 bg-canvas-subtle rounded border border-border-subtle">
                  <span className="text-ink-primary font-bold">AI REASONING</span>
                  <span className="text-ops-live font-bold bg-ops-liveBg px-1.5 py-0.5 rounded border border-ops-liveBorder text-[10px]">● LIVE</span>
                </div>
                <div className="flex items-center justify-between py-1 px-2 bg-canvas-subtle rounded border border-border-subtle">
                  <span className="text-ink-primary font-bold">ORDER API</span>
                  <span className="text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 text-[10px]">◉ SANDBOX</span>
                </div>
                <div className="flex items-center justify-between py-1 px-2 bg-canvas-subtle rounded border border-border-subtle">
                  <span className="text-ink-primary font-bold">LOGISTICS API</span>
                  <span className="text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 text-[10px]">◉ SANDBOX</span>
                </div>
                <div className="flex items-center justify-between py-1 px-2 bg-canvas-subtle rounded border border-border-subtle">
                  <span className="text-ink-primary font-bold">PAYMENT API</span>
                  <span className="text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 text-[10px]">◉ SANDBOX</span>
                </div>
                <div className="flex items-center justify-between py-1 px-2 bg-canvas-subtle rounded border border-border-subtle">
                  <span className="text-ink-primary font-bold">DATABASE</span>
                  <span className="text-accent font-bold bg-accent-subtle px-1.5 py-0.5 rounded border border-accent-border text-[10px]">POSTGRES</span>
                </div>
              </div>

              {/* AI SAFETY & GOVERNANCE BOUNDARY */}
              <div className="pt-2 border-t border-border-subtle space-y-1.5 font-mono text-[10px]">
                <span className="font-bold text-ink-primary uppercase tracking-wider block">
                  AI SAFETY & GOVERNANCE BOUNDARY
                </span>
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

              <p className="text-[10px] text-ink-muted leading-tight border-t border-border-subtle pt-1.5 italic">
                *Voice audio, Gemini operational reasoning, and the PostgreSQL event store execute live. Enterprise order, logistics, and payment services connect via mock sandbox REST endpoints.
              </p>
            </div>
          )}
        </div>

        {/* DEVELOPER MODE TOGGLE */}
        <button
          type="button"
          onClick={toggleDevMode}
          className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded-[3px] font-bold tracking-wider border transition-colors cursor-pointer flex items-center gap-1 ${
            isDevMode
              ? 'bg-accent text-white border-accent shadow-xs'
              : 'bg-canvas-subtle text-ink-muted border-border-subtle hover:text-ink-primary'
          }`}
          title="Toggle Developer Diagnostics Mode (Telemetry, Audio Metrics, Tool Calls)"
        >
          <Wrench className="w-3 h-3" />
          <span>DEV MODE: {isDevMode ? 'ON' : 'OFF'}</span>
        </button>

        {/* Global Search Trigger Bar */}
        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex items-center gap-2 bg-canvas-subtle hover:bg-canvas-muted border border-border-subtle hover:border-border-strong rounded-[3px] px-2 py-0.5 text-xs text-ink-muted hover:text-ink-primary transition-colors cursor-pointer"
            title="Global Search (⌘K / Ctrl+K)"
          >
            <Search className="w-3 h-3 text-ink-muted" />
            <span className="font-sans text-[11px] hidden md:inline">Search</span>
            <span className="font-mono text-[9px] bg-canvas-pure border border-border-subtle rounded px-1 text-ink-muted font-semibold">
              ⌘K
            </span>
          </button>
        )}

        {/* SECTION 37: NOTIFICATION CENTER INDICATOR (◎ 3) */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] font-mono text-[10px] border transition-colors cursor-pointer ${
              showNotifications || unreadCount > 0
                ? 'bg-ops-warningBg text-ops-warning border-ops-warningBorder font-bold'
                : 'bg-transparent text-ink-muted border-border-subtle hover:text-ink-primary'
            }`}
            title="Notification Center"
          >
            <span className="text-[11px]">◎</span>
            <span>{unreadCount}</span>
          </button>

          {/* NOTIFICATION CENTER DROPDOWN POPOVER */}
          {showNotifications && (
            <div className="absolute right-0 top-7 w-80 bg-canvas-pure border border-border-subtle rounded-[4px] shadow-2xl z-50 overflow-hidden font-sans animate-in fade-in duration-100">
              <div className="p-2.5 px-3 border-b border-border-subtle bg-canvas-pure flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-ink-primary uppercase tracking-tight">
                    NOTIFICATIONS
                  </span>
                  {unreadCount > 0 && (
                    <span className="font-mono text-[9px] font-bold bg-ops-warningBg text-ops-warning px-1.5 py-0.2 rounded border border-ops-warningBorder">
                      {unreadCount} NEW
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] font-mono text-accent hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="divide-y divide-border-subtle max-h-72 overflow-y-auto">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`p-2.5 px-3 flex items-start gap-2.5 cursor-pointer transition-colors ${
                      item.unread
                        ? 'bg-canvas-pure hover:bg-canvas-subtle'
                        : 'bg-canvas-subtle/50 hover:bg-canvas-subtle opacity-75'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {item.type === 'approval' && (
                        <div className="w-5 h-5 rounded-[2px] bg-ops-warningBg border border-ops-warningBorder flex items-center justify-center">
                          <ShieldAlert className="w-3 h-3 text-ops-warning" />
                        </div>
                      )}
                      {item.type === 'tool_error' && (
                        <div className="w-5 h-5 rounded-[2px] bg-ops-criticalBg border border-ops-criticalBorder flex items-center justify-center">
                          <Wrench className="w-3 h-3 text-ops-critical" />
                        </div>
                      )}
                      {item.type === 'case_assigned' && (
                        <div className="w-5 h-5 rounded-[2px] bg-accent-subtle border border-accent-border flex items-center justify-center">
                          <FolderPlus className="w-3 h-3 text-accent" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 font-sans">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-ink-primary truncate">
                          {item.title}
                        </span>
                        <span className="text-[9px] font-mono text-ink-muted shrink-0">
                          {item.time}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 font-mono text-[10px] text-accent font-semibold mt-0.5">
                        <span>{item.caseId}</span>
                        <ArrowUpRight className="w-2.5 h-2.5" />
                      </div>

                      <p className="text-[11px] text-ink-secondary leading-tight mt-0.5 truncate">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2 border-t border-border-subtle bg-canvas-subtle text-center">
                <span className="font-mono text-[10px] text-ink-muted">
                  Press ESC to close
                </span>
              </div>
            </div>
          )}
        </div>

        {onToggleDrawer && (
          <button
            onClick={onToggleDrawer}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] font-mono text-[10px] border transition-colors cursor-pointer ${
              isDrawerOpen
                ? 'bg-canvas-muted text-ink-primary border-border-strong'
                : 'bg-transparent text-ink-muted border-border-subtle hover:text-ink-primary'
            }`}
            title="Toggle Evidence Drawer"
          >
            <Layers className="w-3 h-3" />
            <span className="hidden lg:inline">EVIDENCE</span>
          </button>
        )}

        <div className="h-3.5 w-px bg-border-subtle" />

        {/* Operator Identity */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[#171717] text-white flex items-center justify-center font-mono text-[9px] font-bold">
            M
          </div>
          <div className="flex items-baseline gap-1 font-mono text-[11px]">
            <span className="font-bold text-ink-primary">MAYA</span>
            <span className="text-ink-muted text-[10px]">Operator</span>
          </div>
        </div>
      </div>
    </header>
  )
}

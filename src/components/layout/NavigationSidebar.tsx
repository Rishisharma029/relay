import React from 'react'
import {
  LayoutDashboard,
  PhoneCall,
  FolderKanban,
  Users,
  Sparkles,
  Activity,
  LucideIcon
} from 'lucide-react'
import { cn } from '../../lib/utils'

export type NavTabId =
  | 'overview'
  | 'live-calls'
  | 'cases'
  | 'customers'
  | 'approvals'
  | 'conversation'
  | 'automation'
  | 'knowledge'
  | 'tools'
  | 'activity'
  | 'settings'

interface NavItem {
  id: NavTabId
  label: string
  icon: LucideIcon
  count?: string
}

interface NavigationSidebarProps {
  currentTab: NavTabId
  onSelectTab: (tab: NavTabId) => void
  isCompact?: boolean
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  currentTab,
  onSelectTab,
  isCompact = false
}) => {
  const mainNavItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'live-calls', label: 'Live Calls', icon: PhoneCall, count: '03' },
    { id: 'cases', label: 'Cases', icon: FolderKanban, count: '18' },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'approvals', label: 'Approvals', icon: Sparkles, count: '03' },
    { id: 'activity', label: 'System', icon: Activity },
  ]

  if (isCompact) {
    return (
      <aside className="w-14 bg-canvas-subtle border-r border-border-subtle flex flex-col items-center justify-between py-3 select-none shrink-0 h-full">
        {/* Brand Icon */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-7 h-7 bg-accent rounded-[4px] flex items-center justify-center text-white font-mono font-bold text-xs shadow-xs">
            R
          </div>

          {/* Icon Navigation Rail */}
          <nav className="flex flex-col items-center gap-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon
              const isActive = currentTab === item.id

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  title={item.label + (item.count ? " (" + item.count + ")" : "")}
                  className={cn(
                    'relative w-10 h-10 rounded-[6px] flex items-center justify-center transition-all cursor-pointer group',
                    isActive
                      ? 'bg-canvas-pure text-accent shadow-hairline border border-accent/20'
                      : 'text-ink-muted hover:text-ink-primary hover:bg-canvas-pure/60'
                  )}
                >
                  <Icon className="w-4 h-4" strokeWidth={isActive ? 2.2 : 1.7} />
                  {item.count && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent animate-pulse" />
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Operator Initial Avatar */}
        <div
          className="w-8 h-8 rounded-full bg-canvas-pure border border-border-subtle flex items-center justify-center font-mono text-[10px] font-bold text-ink-primary shadow-xs"
          title="Operator: Maya Sharma"
        >
          MS
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-52 bg-canvas-subtle border-r border-border-subtle flex flex-col justify-between select-none shrink-0 h-full">
      <div className="flex flex-col">
        <div className="h-10 px-3.5 flex items-center justify-between border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-accent rounded-[1px]" />
            <span className="font-mono text-xs font-bold tracking-widest text-ink-primary">
              RELAY
            </span>
          </div>
          <span className="text-[10px] font-mono text-ink-muted">v2.4</span>
        </div>

        <div className="py-2 space-y-1 px-1.5">
          {mainNavItems.map((item) => {
            const Icon = item.icon
            const isActive = currentTab === item.id

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={cn(
                  'w-full relative flex items-center justify-between px-2.5 py-2 rounded-[4px] text-xs font-medium transition-colors cursor-pointer text-left',
                  isActive
                    ? 'bg-canvas-pure text-ink-primary font-semibold shadow-hairline border-l-2 border-accent rounded-l-none pl-2'
                    : 'text-ink-secondary hover:text-ink-primary hover:bg-canvas-muted'
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    strokeWidth={1.7}
                    className={cn(
                      'w-4 h-4 shrink-0',
                      isActive ? 'text-accent' : 'text-ink-muted'
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.count && (
                  <span
                    className={cn(
                      'font-mono text-[10px] tabular-nums font-semibold px-1 py-0.2 rounded',
                      isActive ? 'text-accent font-bold' : 'text-ink-muted'
                    )}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-3 border-t border-border-subtle bg-canvas-pure space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-ink-muted uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-ops-live shrink-0 animate-pulse" />
          <span className="text-ink-secondary font-semibold">SYSTEM OPERATIONAL</span>
        </div>
        <div className="text-xs font-bold text-ink-primary">MAYA SHARMA</div>
      </div>
    </aside>
  )
}

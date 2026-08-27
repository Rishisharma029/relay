import React from 'react'
import {
  LayoutDashboard,
  PhoneCall,
  FolderKanban,
  Users,
  MessageSquareCode,
  Sparkles,
  BookOpen,
  Wrench,
  Activity,
  Settings,
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

interface NavSection {
  title: string
  items: NavItem[]
}

interface NavigationSidebarProps {
  currentTab: NavTabId
  onSelectTab: (tab: NavTabId) => void
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const sections: NavSection[] = [
    {
      title: 'WORKSPACE',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'live-calls', label: 'Live Calls', icon: PhoneCall, count: '03' },
        { id: 'cases', label: 'Cases', icon: FolderKanban, count: '18' },
        { id: 'customers', label: 'Customers', icon: Users },
      ],
    },
    {
      title: 'INTELLIGENCE',
      items: [
        { id: 'approvals', label: 'Approvals', icon: Sparkles, count: '03' },
        { id: 'conversation', label: 'Conversation', icon: MessageSquareCode },
        { id: 'automation', label: 'Automation', icon: Sparkles },
        { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { id: 'tools', label: 'Tools', icon: Wrench },
        { id: 'activity', label: 'Activity', icon: Activity },
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ]

  return (
    <aside className="w-52 bg-canvas-subtle border-r border-border-subtle flex flex-col justify-between select-none shrink-0 h-full">
      {/* Brand Header */}
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

        {/* Navigation Sections */}
        <div className="py-2 overflow-y-auto">
          {sections.map((section, idx) => (
            <div key={section.title} className={cn(idx > 0 && 'mt-3 pt-3 border-t border-border-subtle')}>
              <div className="px-3.5 py-1 text-[10px] font-semibold text-ink-muted uppercase tracking-wider font-mono">
                {section.title}
              </div>

              <div className="mt-0.5 space-y-0.5 px-1.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = currentTab === item.id

                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectTab(item.id)}
                      className={cn(
                        'w-full relative flex items-center justify-between px-2.5 py-1.5 rounded-[3px] text-xs font-medium transition-colors cursor-pointer text-left',
                        isActive
                          ? 'bg-canvas-pure text-ink-primary font-semibold shadow-hairline border-l-2 border-accent rounded-l-none pl-2'
                          : 'text-ink-secondary hover:text-ink-primary hover:bg-canvas-muted'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Icon
                          strokeWidth={1.5}
                          className={cn(
                            'w-3.5 h-3.5 shrink-0',
                            isActive ? 'text-ink-primary' : 'text-ink-muted'
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.count && (
                        <span
                          className={cn(
                            'font-mono text-[10px] tabular-nums font-semibold px-1 py-0.2 rounded',
                            isActive
                              ? 'text-accent font-bold'
                              : 'text-ink-muted'
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
          ))}
        </div>
      </div>

      {/* Bottom Status & Operator Card */}
      <div className="p-2.5 border-t border-border-subtle bg-canvas-pure space-y-2">
        {/* System Operational Status */}
        <div className="flex items-center gap-1.5 px-1 text-[10px] font-mono text-ink-muted uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-ops-live shrink-0" />
          <span className="text-ink-secondary font-semibold">SYSTEM OPERATIONAL</span>
        </div>

        {/* Operator Profile */}
        <div className="p-2 bg-canvas-subtle border border-border-subtle rounded-[4px] flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="font-semibold text-xs text-ink-primary tracking-tight">
              MAYA SHARMA
            </div>
            <div className="text-[10px] text-ink-secondary leading-none">
              Operator
            </div>
          </div>
          <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded-[2px] bg-accent-subtle text-accent border border-accent-border font-medium">
            Important
          </span>
        </div>
      </div>
    </aside>
  )
}

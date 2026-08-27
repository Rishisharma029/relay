import React from 'react'
import {
  PhoneCall,
  Radio,
  Sliders,
  ShieldAlert,
  Server,
  Workflow,
  Cpu,
  BarChart3,
  Network,
  Users,
  LucideIcon
} from 'lucide-react'
import { cn } from '../../lib/utils'

interface SidebarItem {
  id: string
  label: string
  icon: LucideIcon
  badge?: string
  badgeType?: 'live' | 'warning' | 'normal'
}

interface SidebarSection {
  group: string
  items: SidebarItem[]
}

interface SidebarProps {
  currentTab: string
  onSelectTab: (tab: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const sections: SidebarSection[] = [
    {
      group: 'REAL-TIME DISPATCH',
      items: [
        { id: 'active-calls', label: 'Live Operations', icon: PhoneCall, badge: '142', badgeType: 'live' },
        { id: 'voice-channels', label: 'Voice Streams', icon: Radio, badge: '12', badgeType: 'normal' },
        { id: 'escalations', label: 'Priority Escalations', icon: ShieldAlert, badge: '3', badgeType: 'warning' },
        { id: 'agent-roster', label: 'Operator Roster', icon: Users, badge: '28', badgeType: 'normal' },
      ],
    },
    {
      group: 'INFRASTRUCTURE & SIP',
      items: [
        { id: 'sip-trunks', label: 'Carrier Trunks', icon: Network, badge: '24', badgeType: 'normal' },
        { id: 'routing-rules', label: 'Dispatch Rules', icon: Workflow, badge: '9', badgeType: 'normal' },
        { id: 'llm-pipelines', label: 'AI Voice Pipelines', icon: Cpu, badge: '4', badgeType: 'normal' },
        { id: 'edge-nodes', label: 'Edge Topology', icon: Server, badge: '6', badgeType: 'normal' },
      ],
    },
    {
      group: 'TELEMETRY & AUDIT',
      items: [
        { id: 'metrics', label: 'Aviation / SLA KPIs', icon: BarChart3 },
        { id: 'config', label: 'Console Config', icon: Sliders },
      ],
    },
  ]

  return (
    <aside className="w-56 bg-canvas-subtle border-r border-border-subtle flex flex-col justify-between select-none shrink-0 h-full overflow-y-auto">
      <div className="py-2">
        {sections.map((section, idx) => (
          <div key={idx} className="mb-3">
            <div className="px-3 py-1 text-[10px] font-semibold text-ink-muted uppercase tracking-wider font-mono">
              {section.group}
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
                      'w-full flex items-center justify-between px-2.5 py-1.5 rounded-[4px] text-xs font-medium transition-colors cursor-pointer text-left',
                      isActive
                        ? 'bg-canvas-pure text-ink-primary font-semibold border border-border-subtle'
                        : 'text-ink-secondary hover:text-ink-primary hover:bg-canvas-muted border border-transparent'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon
                        className={cn(
                          'w-3.5 h-3.5 shrink-0',
                          isActive ? 'text-accent' : 'text-ink-muted'
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={cn(
                          'font-mono text-[10px] px-1.5 py-0.2 rounded tabular-nums font-semibold shrink-0',
                          item.badgeType === 'live'
                            ? 'bg-ops-liveBg text-ops-live border border-[#A7F3D0]'
                            : item.badgeType === 'warning'
                            ? 'bg-ops-warningBg text-ops-warning border-[#FDE68A]'
                            : 'bg-canvas-muted text-ink-muted'
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer system status */}
      <div className="p-2.5 m-2 bg-canvas-pure border border-border-subtle rounded-[4px]">
        <div className="flex items-center justify-between text-[10px] font-mono text-ink-muted">
          <span>UPTIME</span>
          <span className="text-ink-primary font-semibold tabular-nums">99.992%</span>
        </div>
        <div className="w-full bg-canvas-muted h-1 rounded-none mt-1.5 overflow-hidden">
          <div className="bg-ops-live h-full w-[99.9%]" />
        </div>
        <div className="mt-1 flex justify-between text-[9px] font-mono text-ink-muted">
          <span>SLA: Tier-1</span>
          <span>SYNC: 2ms</span>
        </div>
      </div>
    </aside>
  )
}

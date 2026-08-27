import React from 'react'
import { cn } from '../../lib/utils'

interface StatMetricProps {
  label: string
  value: string | number
  unit?: string
  subtext?: string
  trend?: 'up' | 'down' | 'neutral'
  status?: 'live' | 'warning' | 'critical' | 'normal'
  className?: string
}

export const StatMetric: React.FC<StatMetricProps> = ({
  label,
  value,
  unit,
  subtext,
  status = 'normal',
  className,
}) => {
  const statusBorder = {
    normal: 'border-border-subtle',
    live: 'border-l-2 border-l-ops-live border-border-subtle',
    warning: 'border-l-2 border-l-ops-warning border-border-subtle',
    critical: 'border-l-2 border-l-ops-critical border-border-subtle',
  }

  return (
    <div
      className={cn(
        'bg-canvas-pure border rounded-[4px] px-3 py-2 flex flex-col justify-between select-none',
        statusBorder[status],
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-wider text-ink-muted uppercase">
          {label}
        </span>
        {status === 'live' && (
          <span className="w-1.5 h-1.5 rounded-full bg-ops-live animate-pulse" />
        )}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-lg font-bold font-mono text-ink-primary tracking-tight tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="text-[11px] font-mono text-ink-muted font-normal">
            {unit}
          </span>
        )}
      </div>
      {subtext && (
        <div className="mt-1 text-[10px] font-mono text-ink-muted leading-tight truncate">
          {subtext}
        </div>
      )}
    </div>
  )
}

import React from 'react'
import { cn } from '../../lib/utils'

interface TabOption {
  id: string
  label: string
  count?: number | string
  badge?: string
}

interface SegmentedControlProps {
  options: TabOption[]
  activeId: string
  onChange: (id: string) => void
  size?: 'xs' | 'sm'
  className?: string
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  activeId,
  onChange,
  size = 'xs',
  className,
}) => {
  return (
    <div
      className={cn(
        'inline-flex items-center p-0.5 bg-canvas-muted rounded-[4px] border border-border-subtle select-none',
        className
      )}
    >
      {options.map((opt) => {
        const isActive = opt.id === activeId
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              'flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] font-medium transition-all text-xs cursor-pointer',
              isActive
                ? 'bg-canvas-pure text-ink-primary font-semibold shadow-hairline'
                : 'text-ink-secondary hover:text-ink-primary',
              size === 'xs' ? 'text-[11px] h-5' : 'text-xs h-6'
            )}
          >
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={cn(
                  'px-1 py-0.2 rounded font-mono text-[9px] tabular-nums',
                  isActive
                    ? 'bg-canvas-muted text-ink-primary'
                    : 'bg-transparent text-ink-muted'
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

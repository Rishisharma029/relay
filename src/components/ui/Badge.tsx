import React from 'react'
import { cn } from '../../lib/utils'

export type BadgeVariant = 'default' | 'live' | 'warning' | 'critical' | 'standby' | 'accent' | 'mono'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: 'xs' | 'sm'
  dot?: boolean
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'xs',
  dot = false,
  className,
  ...props
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-canvas-subtle text-ink-secondary border-border-subtle',
    live: 'bg-ops-liveBg text-ops-live border-ops-liveBorder',
    warning: 'bg-ops-warningBg text-ops-warning border-ops-warningBorder',
    critical: 'bg-ops-criticalBg text-ops-critical border-ops-criticalBorder',
    standby: 'bg-ops-standbyBg text-ops-standby border-border-subtle',
    accent: 'bg-accent-subtle text-accent border-accent-border font-medium',
    mono: 'bg-canvas-subtle text-ink-primary font-mono border-border-subtle tracking-tight',
  }

  const dotColor: Record<BadgeVariant, string> = {
    default: 'bg-ink-muted',
    live: 'bg-ops-live',
    warning: 'bg-ops-warning',
    critical: 'bg-ops-critical',
    standby: 'bg-ops-standby',
    accent: 'bg-accent',
    mono: 'bg-ink-primary',
  }

  const sizeStyles = {
    xs: 'text-[10px] leading-3 px-1.5 py-0.5 rounded-[2px] border',
    sm: 'text-[11px] leading-4 px-2 py-0.5 rounded-[3px] border',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium select-none uppercase tracking-wide',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full inline-block shrink-0', dotColor[variant])} />
      )}
      {children}
    </span>
  )
}

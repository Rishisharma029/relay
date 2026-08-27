import React from 'react'
import { cn } from '../../lib/utils'

interface PanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode
  action?: React.ReactNode
  statusIndicator?: React.ReactNode
  noPadding?: boolean
}

export const Panel: React.FC<PanelProps> = ({
  title,
  action,
  statusIndicator,
  noPadding = false,
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-canvas-pure border border-border-subtle rounded-[6px] flex flex-col overflow-hidden',
        className
      )}
      {...props}
    >
      {(title || action || statusIndicator) && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle bg-canvas select-none shrink-0 h-9">
          <div className="flex items-center gap-2">
            {statusIndicator}
            {typeof title === 'string' ? (
              <span className="text-xs font-semibold text-ink-primary tracking-tight uppercase">
                {title}
              </span>
            ) : (
              title
            )}
          </div>
          {action && <div className="flex items-center gap-1.5">{action}</div>}
        </div>
      )}
      <div className={cn('flex-1 min-h-0', !noPadding && 'p-3')}>
        {children}
      </div>
    </div>
  )
}

import React from 'react'
import { cn } from '../../lib/utils'

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  className,
  ...props
}) => (
  <div className="w-full overflow-x-auto">
    <table
      className={cn(
        'w-full text-left text-xs border-collapse font-sans',
        className
      )}
      {...props}
    />
  </div>
)

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  ...props
}) => (
  <thead
    className={cn(
      'bg-canvas border-b border-border-subtle text-[10px] uppercase font-semibold text-ink-muted tracking-wider sticky top-0 z-10 select-none',
      className
    )}
    {...props}
  />
)

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  ...props
}) => <tbody className={cn('divide-y divide-border-subtle', className)} {...props} />

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement> & { active?: boolean }> = ({
  className,
  active,
  ...props
}) => (
  <tr
    className={cn(
      'hover:bg-canvas-subtle transition-colors cursor-pointer',
      active && 'bg-accent-subtle/60 hover:bg-accent-subtle',
      className
    )}
    {...props}
  />
)

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  ...props
}) => (
  <th
    className={cn('px-2.5 py-1.5 font-semibold text-ink-muted select-none text-[10px] tracking-wider', className)}
    {...props}
  />
)

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement> & { mono?: boolean }> = ({
  className,
  mono = false,
  ...props
}) => (
  <td
    className={cn(
      'px-2.5 py-1.5 text-xs text-ink-primary whitespace-nowrap align-middle',
      mono && 'font-mono text-[11px] tabular-nums',
      className
    )}
    {...props}
  />
)

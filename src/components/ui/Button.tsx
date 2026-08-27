import React from 'react'
import { cn } from '../../lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'xs' | 'sm' | 'md'
  iconOnly?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'sm', iconOnly = false, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink-primary disabled:opacity-50 disabled:pointer-events-none rounded-[4px] cursor-pointer'

    const variantStyles = {
      primary:
        'bg-accent text-white border border-accent hover:bg-accent-hover active:bg-[#083070]',
      secondary:
        'bg-canvas-pure text-ink-primary border border-border-subtle hover:bg-canvas-subtle active:bg-canvas-muted shadow-none',
      outline:
        'bg-transparent text-ink-primary border border-border hover:bg-canvas-subtle active:bg-canvas-muted',
      ghost:
        'bg-transparent text-ink-secondary hover:text-ink-primary hover:bg-canvas-muted active:bg-canvas-subtle border-transparent',
      danger:
        'bg-ops-critical text-white border border-ops-critical hover:bg-red-700 active:bg-red-800',
    }

    const sizeStyles = {
      xs: iconOnly ? 'w-6 h-6 text-xs p-0' : 'h-6 px-2 text-[11px] gap-1',
      sm: iconOnly ? 'w-7 h-7 text-xs p-0' : 'h-7 px-2.5 text-xs gap-1.5',
      md: iconOnly ? 'w-8 h-8 text-sm p-0' : 'h-8 px-3 text-xs gap-2',
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

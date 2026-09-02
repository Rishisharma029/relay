import React from 'react'
import {
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react'
import { useCaseState } from '../../contexts/CaseStateContext'

interface CaseContextPanelProps {
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  onOpenCaseDetail?: (caseId: string) => void
}

export const CaseContextPanel: React.FC<CaseContextPanelProps> = ({
  isCollapsed = false,
  onToggleCollapse,
  onOpenCaseDetail
}) => {
  const { caseState } = useCaseState()

  if (isCollapsed) {
    return (
      <aside className="w-10 border-r border-border-subtle bg-canvas flex flex-col items-center py-4 space-y-4 shrink-0 select-none transition-all duration-200">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1 rounded text-ink-muted hover:text-ink-primary hover:bg-canvas-subtle transition-colors cursor-pointer"
          title="Expand Case Context"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="[writing-mode:vertical-lr] font-mono text-[10px] font-bold text-ink-muted tracking-wider uppercase rotate-180">
          Case Context
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-64 lg:w-72 border-r border-border-subtle bg-canvas flex flex-col min-h-0 shrink-0 select-none overflow-y-auto font-sans transition-all duration-200">
      {/* 1. MINIMAL HEADER */}
      <div className="h-12 px-4 border-b border-border-subtle flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-ink-primary tracking-wider uppercase">
          <span>CASE CONTEXT</span>
          <span className="text-ink-muted font-normal">#{caseState.id}</span>
        </div>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 rounded text-ink-muted hover:text-ink-primary hover:bg-canvas-subtle transition-colors cursor-pointer"
            title="Collapse Case Context"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. UNIFIED CONTENT SECTIONS WITH WHITESPACE (NO NESTED BOXES) */}
      <div className="p-4 space-y-5 flex-1 text-xs">
        {/* CUSTOMER */}
        <div className="space-y-1">
          <span className="text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider block">
            CUSTOMER
          </span>
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-ink-primary font-sans">
              {caseState.customerName || 'Aarav Patel'}
            </span>
            <span className="flex items-center gap-0.5 text-ops-live text-[10px] font-mono font-semibold">
              <ShieldCheck className="w-3 h-3" />
              <span>Verified</span>
            </span>
          </div>
          <p className="text-[11px] font-mono text-ink-secondary">
            {caseState.language || 'Hindi / Hinglish'} • <span className="text-accent font-semibold">{caseState.customerTier || 'Platinum VIP'}</span>
          </p>
        </div>

        <div className="h-px bg-border-subtle/70" />

        {/* ISSUE */}
        <div className="space-y-1">
          <span className="text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider block">
            ISSUE
          </span>
          <div className="font-bold text-ink-primary">
            Delivery SLA Breach
          </div>
          <p className="text-[11px] text-ink-secondary leading-relaxed">
            Refund Request (Delayed {caseState.orderDelayDays || 4} days in transit)
          </p>
        </div>

        <div className="h-px bg-border-subtle/70" />

        {/* ORDER */}
        <div className="space-y-1">
          <span className="text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider block">
            ORDER
          </span>
          <div className="flex items-center justify-between font-mono">
            <span className="font-bold text-ink-primary">#{caseState.orderId || '72143'}</span>
            <span className="font-bold text-ink-primary text-xs">₹{(caseState.orderAmount || caseState.activeAction?.amount || 2899).toLocaleString('en-IN')}</span>
          </div>
          {caseState.orderItem && (
            <p className="text-[11px] text-ink-primary font-medium truncate">
              {caseState.orderItem}
            </p>
          )}
          <p className="text-[11px] font-mono text-ink-secondary">
            {caseState.orderCarrier || 'Delhivery Express'} • AWB: <span className="text-accent font-semibold">{caseState.orderAwb || 'DL-721438910'}</span>
          </p>
        </div>

        <div className="h-px bg-border-subtle/70" />

        {/* ESSENTIAL TIMELINE */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider block">
            TIMELINE
          </span>
          <div className="space-y-2 font-mono text-[11px] pl-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-ops-live" />
              <span className="text-ink-primary">21:34:02 Call connected</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span className="text-ink-primary">21:34:06 Order verified</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-ink-primary">21:34:11 Refund qualified</span>
            </div>
          </div>
        </div>

        {onOpenCaseDetail && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onOpenCaseDetail(caseState.id)}
              className="text-[10px] font-mono text-accent font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Case History</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

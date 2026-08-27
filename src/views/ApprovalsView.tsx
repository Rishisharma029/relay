import React, { useState } from 'react'
import { Badge, BadgeVariant } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import {
  ShieldAlert,
  Check,
  X,
  ArrowUpRight,
  Search,
  CheckCircle2,
  RotateCcw,
  FileCheck2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

export interface ApprovalItem {
  id: string
  caseId: string
  action: string
  amount?: string
  risk: 'Low risk' | 'Medium risk' | 'High risk'
  age: string
  customer: string
  reason: string
  actionBasis: string[]
  status: 'pending' | 'approved' | 'declined'
  approvedAt?: string
}

const initialApprovals: ApprovalItem[] = [
  {
    id: 'APP-101',
    caseId: 'RLY-1042',
    action: 'Refund ₹1,499',
    amount: '₹1,499',
    risk: 'Medium risk',
    age: '2m ago',
    customer: 'Aarav Sharma',
    reason: 'Carrier delivery exception • Courier no-answer at transit hub',
    actionBasis: [
      'Order delayed 3 days',
      'Customer explicitly requested refund',
      'Refund policy permits refund',
      'No previous refund detected',
    ],
    status: 'pending',
  },
  {
    id: 'APP-102',
    caseId: 'RLY-1038',
    action: 'Cancel subscription',
    amount: '₹4,999/yr',
    risk: 'High risk',
    age: '5m ago',
    customer: 'Vikram Patel',
    reason: 'Immediate prorated refund requested on enterprise annual tier',
    actionBasis: [
      'Customer requested cancellation within 14-day statutory cooling-off window',
      'Prorated calculation verified by billing engine (₹3,749 unutilized)',
      'Account has 0 disputed chargebacks on file',
    ],
    status: 'pending',
  },
  {
    id: 'APP-103',
    caseId: 'RLY-1034',
    action: 'Issue compensation ₹500',
    amount: '₹500',
    risk: 'Low risk',
    age: '8m ago',
    customer: 'Sunita Roy',
    reason: 'Delayed order apology credit applied to wallet',
    actionBasis: [
      'Transit delay exceeded SLA by > 48 hours',
      'Customer satisfaction retention credit eligible',
      'Auto-capped within tier-1 compensation allowance',
    ],
    status: 'pending',
  },
]

interface ApprovalsViewProps {
  onOpenCase: (caseId: string) => void
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({ onOpenCase }) => {
  const [approvals, setApprovals] = useState<ApprovalItem[]>(initialApprovals)
  const [filterRisk, setFilterRisk] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [expandedWhyIds, setExpandedWhyIds] = useState<Record<string, boolean>>({
    'APP-101': true,
  })

  const toggleWhy = (id: string) => {
    setExpandedWhyIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const handleApprove = (id: string) => {
    const now = new Date()
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
    setApprovals((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'approved', approvedAt: timeStr } : item
      )
    )
  }

  const handleDecline = (id: string) => {
    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'declined' } : item))
    )
  }

  const handleReset = () => {
    setApprovals(initialApprovals)
  }

  const pendingCount = approvals.filter((a) => a.status === 'pending').length

  const filteredApprovals = approvals.filter((a) => {
    if (filterRisk === 'high' && a.risk !== 'High risk') return false
    if (filterRisk === 'medium' && a.risk !== 'Medium risk') return false
    if (filterRisk === 'low' && a.risk !== 'Low risk') return false

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        a.caseId.toLowerCase().includes(q) ||
        a.action.toLowerCase().includes(q) ||
        a.customer.toLowerCase().includes(q)
      )
    }
    return true
  })

  const riskBadgeVariant = (risk: ApprovalItem['risk']): BadgeVariant => {
    switch (risk) {
      case 'High risk':
        return 'critical'
      case 'Medium risk':
        return 'warning'
      case 'Low risk':
        return 'live'
      default:
        return 'default'
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-canvas overflow-hidden p-3 gap-3 font-sans">
      {/* Top Header */}
      <div className="bg-canvas-pure border border-border-subtle rounded-[4px] p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 shadow-hairline">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[3px] bg-ops-warningBg border border-ops-warningBorder flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-ops-warning" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-sm font-bold text-ink-primary tracking-tight">
                APPROVALS
              </h1>
              <span className="font-mono text-xs font-bold text-ops-warning bg-ops-warningBg px-1.5 py-0.2 rounded border border-ops-warningBorder">
                {pendingCount} PENDING
              </span>
            </div>
            <p className="text-[10px] font-mono text-ink-muted leading-tight">
              Human-in-the-loop authorization center for high/medium risk agent actions
            </p>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <input
              type="text"
              placeholder="Search approvals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-canvas-subtle border border-border-subtle rounded-[3px] pl-6 pr-2 py-1 text-xs text-ink-primary placeholder-ink-muted focus:outline-none focus:border-accent w-full font-sans"
            />
            <Search className="w-3 h-3 text-ink-muted absolute left-2 top-2" />
          </div>

          <div className="inline-flex items-center p-0.5 bg-canvas-muted rounded-[4px] border border-border-subtle select-none font-mono text-[10px]">
            {['all', 'high', 'medium', 'low'].map((r) => (
              <button
                key={r}
                onClick={() => setFilterRisk(r)}
                className={`px-2 py-1 rounded-[3px] font-semibold uppercase transition-colors cursor-pointer ${
                  filterRisk === r
                    ? 'bg-canvas-pure text-ink-primary shadow-hairline'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="p-1 text-ink-muted hover:text-ink-primary rounded border border-border-subtle bg-canvas-subtle cursor-pointer"
            title="Reset Approvals Demo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Approvals Cards Grid */}
      <div className="flex-1 overflow-y-auto space-y-2.5 min-h-0">
        {filteredApprovals.map((item) => (
          <div
            key={item.id}
            className="bg-canvas-pure border border-border-subtle rounded-[4px] p-3 shadow-hairline space-y-2.5 font-mono"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Left Info: Case ID, Action, Risk, Age */}
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenCase(item.caseId)}
                    className="font-mono text-xs font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{item.caseId}</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>

                  <span className="text-border">/</span>

                  <span className="font-bold text-xs text-ink-primary">
                    {item.action}
                  </span>

                  <Badge variant={riskBadgeVariant(item.risk)} size="xs">
                    {item.risk}
                  </Badge>

                  <span className="text-[10px] text-ink-muted tabular-nums">
                    {item.age}
                  </span>
                </div>

                <div className="text-[11px] font-sans text-ink-secondary flex items-center gap-2">
                  <span className="font-semibold text-ink-primary">Customer: {item.customer}</span>
                  <span>•</span>
                  <span>{item.reason}</span>
                </div>
              </div>

              {/* Right Action: Discrete state changes */}
              <div className="shrink-0 flex items-center gap-2">
                {item.status === 'pending' && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="primary"
                      size="xs"
                      onClick={() => handleApprove(item.id)}
                      className="font-mono text-[10px] font-bold uppercase h-7 px-3 bg-accent text-white hover:bg-accent-hover"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      <span>APPROVE</span>
                    </Button>

                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => handleDecline(item.id)}
                      className="font-mono text-[10px] uppercase h-7 px-2.5 text-ink-muted hover:text-ink-primary"
                    >
                      Decline
                    </Button>
                  </div>
                )}

                {item.status === 'approved' && (
                  <div className="bg-ops-liveBg border border-ops-liveBorder px-2.5 py-1 rounded-[3px] text-ops-live font-mono text-[10px] font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                    <span>APPROVED BY MAYA ({item.approvedAt})</span>
                  </div>
                )}

                {item.status === 'declined' && (
                  <div className="bg-canvas-subtle border border-border-subtle px-2.5 py-1 rounded-[3px] text-ink-muted font-mono text-[10px] font-semibold flex items-center gap-1.5">
                    <X className="w-3 h-3" />
                    <span>DECLINED BY OPERATOR</span>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 31: "WHY THIS ACTION?" ACCORDION */}
            <div className="pt-2 border-t border-border-subtle/70">
              <button
                type="button"
                onClick={() => toggleWhy(item.id)}
                className="flex items-center gap-1 text-[10px] font-mono text-accent hover:text-accent-hover font-semibold cursor-pointer transition-colors"
              >
                <FileCheck2 className="w-3 h-3" />
                <span>Why this action?</span>
                {expandedWhyIds[item.id] ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>

              {expandedWhyIds[item.id] && (
                <div className="bg-canvas-subtle p-2 rounded-[3px] border border-border-subtle mt-1.5 space-y-1 font-mono text-[11px]">
                  <div className="text-[9px] font-bold text-ink-muted uppercase tracking-wider mb-1">
                    ACTION BASIS
                  </div>
                  {item.actionBasis.map((basis, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-ink-primary leading-tight">
                      <span className="text-ops-live font-bold">•</span>
                      <span>{basis}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

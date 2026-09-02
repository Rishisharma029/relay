import React, { useState } from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/Table'
import { Badge, BadgeVariant } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import {
  Search,
  ArrowUpRight,
  FolderKanban,
  SlidersHorizontal
} from 'lucide-react'
import { useCaseState } from '../contexts/CaseStateContext'

export interface CaseRecord {
  id: string
  customer: string
  phone: string
  issue: string
  status: 'Approval' | 'Active' | 'Resolved' | 'Escalated'
  age: string
  channel: string
  language: string
  amount?: string
}

interface CasesListViewProps {
  onSelectCase: (caseId: string) => void
  selectedCaseId?: string
  onOpenNewCase?: () => void
}

const mockCases: CaseRecord[] = [
  {
    id: 'RLY-1042',
    customer: 'Aarav Sharma',
    phone: '+91 98201 44102',
    issue: 'Delivery dispute',
    status: 'Approval',
    age: '4m',
    channel: 'Agora Voice',
    language: 'Hindi / Hinglish',
    amount: '₹1,499',
  },
  {
    id: 'RLY-1041',
    customer: 'Priya Shah',
    phone: '+91 98110 54192',
    issue: 'Payment failure',
    status: 'Active',
    age: '8m',
    channel: 'Agora Voice',
    language: 'English / Hindi',
    amount: '₹3,200',
  },
  {
    id: 'RLY-1040',
    customer: 'Rahul Mehta',
    phone: '+91 98302 91823',
    issue: 'Refund request',
    status: 'Resolved',
    age: '13m',
    channel: 'SIP Inbound',
    language: 'Hinglish',
    amount: '₹899',
  },
  {
    id: 'RLY-1039',
    customer: 'Anita Roy',
    phone: '+91 98450 11920',
    issue: 'Address change in transit',
    status: 'Active',
    age: '18m',
    channel: 'Agora Voice',
    language: 'Bengali / English',
    amount: '₹4,500',
  },
  {
    id: 'RLY-1038',
    customer: 'Vikram Patel',
    phone: '+91 98790 33412',
    issue: 'Damaged item received',
    status: 'Approval',
    age: '24m',
    channel: 'SIP Inbound',
    language: 'Gujarati / Hindi',
    amount: '₹2,150',
  },
  {
    id: 'RLY-1037',
    customer: 'Neha Gupta',
    phone: '+91 98101 88402',
    issue: 'Order cancellation',
    status: 'Resolved',
    age: '32m',
    channel: 'Agora Voice',
    language: 'Hindi',
    amount: '₹1,120',
  },
  {
    id: 'RLY-1036',
    customer: 'Karan Malhotra',
    phone: '+91 98200 44910',
    issue: 'Courier no-show complaint',
    status: 'Escalated',
    age: '45m',
    channel: 'SIP Inbound',
    language: 'English',
    amount: '₹6,400',
  },
]

export const CasesListView: React.FC<CasesListViewProps> = ({
  onSelectCase,
  selectedCaseId = 'RLY-72143',
  onOpenNewCase,
}) => {
  const { caseState } = useCaseState()
  const [filterState, setFilterState] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const liveAmount = caseState.orderAmount || caseState.activeAction?.amount || 2899
  const liveStatus: CaseRecord['status'] =
    caseState.activeAction?.status === 'APPROVED' || caseState.status === 'resolved'
      ? 'Resolved'
      : caseState.activeAction?.status === 'DECLINED'
      ? 'Escalated'
      : caseState.status === 'awaiting_approval'
      ? 'Approval'
      : 'Active'

  const cases: CaseRecord[] = [
    {
      id: caseState.id || 'RLY-72143',
      customer: caseState.customerName || 'Aarav Patel',
      phone: caseState.customerPhone || '+91 98201 44102',
      issue: caseState.intent ? caseState.intent.replace(/_/g, ' ') : 'Delivery SLA Breach',
      status: liveStatus,
      age: 'Just now',
      channel: 'Agora Voice',
      language: caseState.language || 'Hindi / Hinglish',
      amount: `₹${liveAmount.toLocaleString('en-IN')}`,
    },
    ...mockCases.filter((c) => c.id !== caseState.id && c.id !== 'RLY-1042')
  ]

  const statusVariant = (status: CaseRecord['status']): BadgeVariant => {
    switch (status) {
      case 'Approval':
        return 'warning'
      case 'Active':
        return 'live'
      case 'Resolved':
        return 'standby'
      case 'Escalated':
        return 'critical'
      default:
        return 'default'
    }
  }

  const filteredCases = cases.filter((c) => {
    if (filterState === 'active' && c.status !== 'Active') return false
    if (filterState === 'approval' && c.status !== 'Approval') return false
    if (filterState === 'resolved' && c.status !== 'Resolved') return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        c.id.toLowerCase().includes(q) ||
        c.customer.toLowerCase().includes(q) ||
        c.issue.toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-canvas overflow-hidden p-3 gap-3">
      {/* Top Header & Action Row */}
      <div className="bg-canvas-pure border border-border-subtle rounded-[4px] p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shrink-0 shadow-hairline">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[3px] bg-canvas-subtle border border-border-subtle flex items-center justify-center">
            <FolderKanban className="w-4 h-4 text-ink-primary" />
          </div>
          <div>
            <h1 className="font-mono text-sm font-bold text-ink-primary tracking-tight">
              CASES
            </h1>
            <p className="text-[10px] font-mono text-ink-muted leading-tight">
              Real-time operational dispatch queue • {mockCases.length} total cases
            </p>
          </div>
        </div>

        {/* Filter Pill Buttons, Search & + NEW LIVE CASE */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {onOpenNewCase && (
            <Button
              variant="primary"
              size="xs"
              onClick={onOpenNewCase}
              className="gap-1 font-mono text-xs font-bold uppercase tracking-wider h-8 bg-accent text-white hover:bg-accent-hover active:bg-[#083070] cursor-pointer"
            >
              <span>+ NEW LIVE CASE</span>
            </Button>
          )}

          {/* Search Box */}
          <div className="relative flex-1 md:w-56">
            <input
              type="text"
              placeholder="Search cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-canvas-subtle border border-border-subtle rounded-[3px] pl-6 pr-2 py-1 text-xs text-ink-primary placeholder-ink-muted focus:outline-none focus:border-accent w-full font-sans"
            />
            <Search className="w-3 h-3 text-ink-muted absolute left-2 top-2" />
          </div>

          <div className="h-4 w-px bg-border-subtle hidden md:block" />

          {/* Segmented Filter */}
          <div className="inline-flex items-center p-0.5 bg-canvas-muted rounded-[4px] border border-border-subtle select-none">
            {[
              { id: 'all', label: 'All', count: mockCases.length },
              { id: 'active', label: 'Active', count: mockCases.filter(c => c.status === 'Active').length },
              { id: 'approval', label: 'Awaiting approval', count: mockCases.filter(c => c.status === 'Approval').length },
              { id: 'resolved', label: 'Resolved', count: mockCases.filter(c => c.status === 'Resolved').length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterState(tab.id)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-[3px] font-medium text-xs transition-colors cursor-pointer ${
                  filterState === tab.id
                    ? 'bg-canvas-pure text-ink-primary font-bold shadow-hairline'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] font-mono text-ink-muted">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <Button variant="secondary" size="sm" className="gap-1 font-mono text-xs h-7">
            <SlidersHorizontal className="w-3 h-3 text-ink-muted" />
            <span className="hidden lg:inline">FILTER</span>
          </Button>
        </div>
      </div>

      {/* PROPER ENTERPRISE TABLE (NO GIANT CARDS) */}
      <div className="flex-1 bg-canvas-pure border border-border-subtle rounded-[4px] flex flex-col min-h-0 shadow-hairline overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <Table>
            <TableHeader>
              <tr>
                <TableHead>CASE</TableHead>
                <TableHead>CUSTOMER</TableHead>
                <TableHead>ISSUE</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead>AGE</TableHead>
                <TableHead>CHANNEL</TableHead>
                <TableHead>LANGUAGE</TableHead>
                <TableHead className="text-right">ACTION</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-ink-muted font-mono text-xs italic">
                    No cases found matching query criteria.
                  </td>
                </tr>
              ) : (
                filteredCases.map((item) => {
                  const isCurrent = item.id === selectedCaseId

                  return (
                    <TableRow
                      key={item.id}
                      active={isCurrent}
                      onClick={() => onSelectCase(item.id)}
                      className="cursor-pointer hover:bg-canvas-subtle transition-colors"
                    >
                      {/* CASE */}
                      <TableCell mono className="font-bold text-ink-primary">
                        <div className="flex items-center gap-1.5">
                          {isCurrent && (
                            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                          )}
                          <span>{item.id}</span>
                        </div>
                      </TableCell>

                      {/* CUSTOMER */}
                      <TableCell>
                        <div className="font-semibold text-xs text-ink-primary">
                          {item.customer}
                        </div>
                        <div className="text-[10px] font-mono text-ink-muted">
                          {item.phone}
                        </div>
                      </TableCell>

                      {/* ISSUE */}
                      <TableCell className="font-medium text-ink-primary">
                        {item.issue}
                      </TableCell>

                      {/* STATUS */}
                      <TableCell>
                        <Badge variant={statusVariant(item.status)} dot size="xs">
                          {item.status}
                        </Badge>
                      </TableCell>

                      {/* AGE */}
                      <TableCell mono className="text-ink-secondary">
                        {item.age}
                      </TableCell>

                      {/* CHANNEL */}
                      <TableCell mono className="text-[10px] text-ink-muted">
                        {item.channel}
                      </TableCell>

                      {/* LANGUAGE */}
                      <TableCell className="text-[11px] text-ink-secondary">
                        {item.language}
                      </TableCell>

                      {/* ACTION */}
                      <TableCell className="text-right">
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation()
                            onSelectCase(item.id)
                          }}
                          className="gap-1 font-mono text-[10px] h-6 px-2"
                        >
                          <span>OPEN</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Table Footer */}
        <div className="px-3 py-2 border-t border-border-subtle bg-canvas-subtle flex items-center justify-between text-[11px] font-mono text-ink-muted select-none">
          <div className="flex items-center gap-2">
            <span>Showing {filteredCases.length} of {mockCases.length} records</span>
            <span>•</span>
            <span className="text-ops-live">Agora RTC Voice Active</span>
          </div>

          <div className="flex items-center gap-1.5 text-ink-primary">
            <span>Sorted by: Age (Newest first)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

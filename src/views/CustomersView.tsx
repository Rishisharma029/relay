import React, { useState } from 'react'
import { Badge } from '../components/ui/Badge'
import {
  Users,
  Search,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Calendar
} from 'lucide-react'
import { useCaseState } from '../contexts/CaseStateContext'

interface CustomerRecord {
  id: string
  name: string
  phone: string
  interactions: number
  language: string
  resolutionRate: string
  openCasesCount: number
  openCases: Array<{
    id: string
    title: string
    status: string
    age: string
    amount?: string
  }>
  pastConversations: Array<{
    date: string
    topic: string
    resolution: string
    duration: string
  }>
  pastActions: Array<{
    date: string
    action: string
    operator?: string
  }>
}

const mockCustomers: CustomerRecord[] = [
  {
    id: 'CUST-01',
    name: 'Aarav Sharma',
    phone: '+91 98201 44102',
    interactions: 12,
    language: 'Hindi',
    resolutionRate: '98.2%',
    openCasesCount: 1,
    openCases: [
      {
        id: 'RLY-1042',
        title: 'Delivery dispute',
        status: 'Refund Initiated',
        age: '4m ago',
        amount: '₹1,499',
      },
    ],
    pastConversations: [
      {
        date: 'Aug 20, 2026',
        topic: 'Courier delayed at transit hub',
        resolution: 'Expedited with priority courier upgrade',
        duration: '03:12',
      },
      {
        date: 'Aug 04, 2026',
        topic: 'Precision sensor bulk order inquiry',
        resolution: 'Order ORD-84921 confirmed & invoice dispatched',
        duration: '05:40',
      },
      {
        date: 'Jul 18, 2026',
        topic: 'Delivery address update request',
        resolution: 'Address verified and updated in manifest',
        duration: '01:25',
      },
    ],
    pastActions: [
      {
        date: 'Aug 27, 2026',
        action: '₹1,499 UPI Refund initiated (Approved by Operator Maya Sharma)',
        operator: 'Maya Sharma',
      },
      {
        date: 'Aug 20, 2026',
        action: 'Complimentary priority courier override applied (Zero fee)',
      },
      {
        date: 'Aug 04, 2026',
        action: 'Invoice #INV-9281 sent via automated SMS notification',
      },
    ],
  },
  {
    id: 'CUST-02',
    name: 'Priya Shah',
    phone: '+91 98110 54192',
    interactions: 7,
    language: 'English',
    resolutionRate: '100%',
    openCasesCount: 1,
    openCases: [
      {
        id: 'RLY-1041',
        title: 'Payment failure',
        status: 'Active',
        age: '8m ago',
        amount: '₹3,200',
      },
    ],
    pastConversations: [
      {
        date: 'Aug 15, 2026',
        topic: 'Payment gateway timeout',
        resolution: 'Instant retry link dispatched via SMS',
        duration: '02:04',
      },
    ],
    pastActions: [
      {
        date: 'Aug 15, 2026',
        action: 'Payment link regenerated and verified',
      },
    ],
  },
  {
    id: 'CUST-03',
    name: 'Rahul Mehta',
    phone: '+91 98302 91823',
    interactions: 4,
    language: 'Hinglish',
    resolutionRate: '95.0%',
    openCasesCount: 0,
    openCases: [],
    pastConversations: [
      {
        date: 'Aug 26, 2026',
        topic: 'Item return & refund request',
        resolution: 'Refund processed to source account',
        duration: '02:45',
      },
    ],
    pastActions: [
      {
        date: 'Aug 26, 2026',
        action: 'Return shipping pickup label generated',
      },
    ],
  },
  {
    id: 'CUST-04',
    name: 'Anita Roy',
    phone: '+91 98450 11920',
    interactions: 9,
    language: 'Bengali / English',
    resolutionRate: '100%',
    openCasesCount: 1,
    openCases: [
      {
        id: 'RLY-1039',
        title: 'Address change in transit',
        status: 'Active',
        age: '18m ago',
      },
    ],
    pastConversations: [],
    pastActions: [],
  },
  {
    id: 'CUST-05',
    name: 'Vikram Patel',
    phone: '+91 98790 33412',
    interactions: 6,
    language: 'Gujarati / Hindi',
    resolutionRate: '92.5%',
    openCasesCount: 1,
    openCases: [
      {
        id: 'RLY-1038',
        title: 'Damaged item received',
        status: 'Approval',
        age: '24m ago',
      },
    ],
    pastConversations: [],
    pastActions: [],
  },
]

interface CustomersViewProps {
  onOpenCase: (caseId: string) => void
}

export const CustomersView: React.FC<CustomersViewProps> = ({ onOpenCase }) => {
  const { caseState } = useCaseState()
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('CUST-01')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const liveAmount = caseState.orderAmount || caseState.activeAction?.amount || 2899
  const customers: CustomerRecord[] = [
    {
      id: 'CUST-01',
      name: caseState.customerName || 'Aarav Patel',
      phone: caseState.customerPhone || '+91 98201 44102',
      interactions: 12,
      language: caseState.language || 'Hindi / Hinglish',
      resolutionRate: '98.2%',
      openCasesCount: 1,
      openCases: [
        {
          id: caseState.id || 'RLY-72143',
          title: caseState.intent ? caseState.intent.replace(/_/g, ' ') : 'Delivery SLA Breach',
          status: caseState.activeAction?.status === 'APPROVED' ? 'Refund Settled' : 'Approval Required',
          age: 'Just now',
          amount: `₹${liveAmount.toLocaleString('en-IN')}`,
        },
      ],
      pastConversations: [
        {
          date: 'Aug 27, 2026',
          topic: `Order #${caseState.orderId || '72143'} delivery SLA inquiry`,
          resolution: 'Instant electronic refund qualified under POL-REFUND-3.2',
          duration: '02:41',
        },
        {
          date: 'Aug 04, 2026',
          topic: 'Item delivery tracking inquiry',
          resolution: 'Confirmed tracking number and dispatched invoice',
          duration: '03:12',
        },
      ],
      pastActions: [
        {
          date: 'Aug 27, 2026',
          action: `₹${liveAmount.toLocaleString('en-IN')} UPI Refund processed (Approved by Operator Maya Sharma)`,
          operator: 'Maya Sharma',
        },
      ],
    },
    ...mockCustomers.slice(1)
  ]

  const selectedCustomer =
    customers.find((c) => c.id === selectedCustomerId) || customers[0]

  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.language.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-canvas overflow-hidden p-3 gap-3">
      {/* Top Header */}
      <div className="bg-canvas-pure border border-border-subtle rounded-[4px] p-3 flex items-center justify-between shrink-0 shadow-hairline">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[3px] bg-canvas-subtle border border-border-subtle flex items-center justify-center">
            <Users className="w-4 h-4 text-ink-primary" />
          </div>
          <div>
            <h1 className="font-mono text-sm font-bold text-ink-primary tracking-tight">
              CUSTOMERS
            </h1>
            <p className="text-[10px] font-mono text-ink-muted leading-tight">
              Persistent memory & caller history across conversations
            </p>
          </div>
        </div>

        <div className="relative w-64">
          <input
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-canvas-subtle border border-border-subtle rounded-[3px] pl-6 pr-2 py-1 text-xs text-ink-primary placeholder-ink-muted focus:outline-none focus:border-accent w-full font-sans"
          />
          <Search className="w-3 h-3 text-ink-muted absolute left-2 top-2" />
        </div>
      </div>

      {/* Main Split Layout: Customer List (Left) & Customer History (Right) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 min-h-0">
        {/* LEFT LIST: CUSTOMERS */}
        <div className="md:col-span-4 bg-canvas-pure border border-border-subtle rounded-[4px] flex flex-col min-h-0 shadow-hairline overflow-hidden">
          <div className="p-2.5 border-b border-border-subtle bg-canvas-subtle text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider shrink-0 select-none">
            CALLER DIRECTORY ({filteredCustomers.length})
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border-subtle">
            {filteredCustomers.map((cust) => {
              const isSelected = cust.id === selectedCustomer.id

              return (
                <button
                  key={cust.id}
                  type="button"
                  onClick={() => setSelectedCustomerId(cust.id)}
                  className={`w-full p-3 text-left transition-colors cursor-pointer flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-accent-subtle/50 border-l-2 border-accent'
                      : 'hover:bg-canvas-subtle'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-ink-primary">
                      {cust.name}
                    </span>
                    <span className="font-mono text-[10px] text-ink-muted tabular-nums font-semibold">
                      {cust.interactions} interactions
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-ink-secondary">{cust.language}</span>
                    <span className="text-ink-muted text-[10px]">{cust.phone}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* RIGHT PANE: CUSTOMER HISTORY (RELAY'S MEMORY) */}
        <div className="md:col-span-8 bg-canvas-pure border border-border-subtle rounded-[4px] p-3 flex flex-col gap-3.5 min-h-0 shadow-hairline overflow-y-auto">
          {/* Header & Core Memory Stats */}
          <div className="pb-3 border-b border-border-subtle flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                  CUSTOMER HISTORY
                </span>
                <span className="text-border text-xs">/</span>
                <h2 className="font-bold text-sm text-ink-primary font-mono">
                  {selectedCustomer.name}
                </h2>
              </div>
              <p className="text-[11px] font-mono text-ink-secondary mt-0.5">
                {selectedCustomer.phone} • Account ID: {selectedCustomer.id}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="accent" size="xs">
                {selectedCustomer.interactions} TOTAL CALLS
              </Badge>
              <Badge variant="live" size="xs">
                {selectedCustomer.resolutionRate} RESOLUTION
              </Badge>
            </div>
          </div>

          {/* Memory Summary Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-canvas-subtle p-2.5 rounded-[4px] border border-border-subtle font-mono text-[11px]">
            <div>
              <span className="text-ink-muted text-[10px] block">Language preference</span>
              <span className="font-bold text-ink-primary block mt-0.5">
                {selectedCustomer.language}
              </span>
            </div>
            <div>
              <span className="text-ink-muted text-[10px] block">Resolution rate</span>
              <span className="font-bold text-ops-live block mt-0.5 tabular-nums">
                {selectedCustomer.resolutionRate}
              </span>
            </div>
            <div>
              <span className="text-ink-muted text-[10px] block">Open cases</span>
              <span className="font-bold text-ink-primary block mt-0.5 tabular-nums">
                {selectedCustomer.openCasesCount} Active
              </span>
            </div>
            <div>
              <span className="text-ink-muted text-[10px] block">Total interactions</span>
              <span className="font-bold text-ink-primary block mt-0.5 tabular-nums">
                {selectedCustomer.interactions}
              </span>
            </div>
          </div>

          {/* 1. OPEN CASES */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider">
              <span>OPEN CASES</span>
              <span>{selectedCustomer.openCases.length}</span>
            </div>

            {selectedCustomer.openCases.length === 0 ? (
              <div className="p-2.5 bg-canvas-subtle rounded border border-border-subtle text-xs text-ink-muted font-mono italic">
                No active open cases.
              </div>
            ) : (
              selectedCustomer.openCases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onOpenCase(c.id)}
                  className="p-2.5 bg-canvas-subtle hover:bg-canvas-muted rounded border border-border-subtle flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-3.5 h-3.5 text-ops-warning shrink-0" />
                    <div>
                      <span className="font-mono text-xs font-bold text-ink-primary mr-2">
                        {c.id}
                      </span>
                      <span className="text-xs text-ink-primary font-medium">
                        {c.title}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {c.amount && (
                      <span className="font-mono text-xs font-bold text-ink-primary tabular-nums">
                        {c.amount}
                      </span>
                    )}
                    <Badge variant="warning" size="xs">
                      {c.status}
                    </Badge>
                    <span className="font-mono text-[10px] text-ink-muted">
                      {c.age}
                    </span>
                    <ArrowUpRight className="w-3 h-3 text-ink-muted" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 2. PREVIOUS CONVERSATIONS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider">
              <span>PREVIOUS CONVERSATIONS</span>
              <span>{selectedCustomer.pastConversations.length} RECORDED</span>
            </div>

            {selectedCustomer.pastConversations.length === 0 ? (
              <div className="p-2.5 bg-canvas-subtle rounded border border-border-subtle text-xs text-ink-muted font-mono italic">
                No previous call history found.
              </div>
            ) : (
              <div className="space-y-1.5">
                {selectedCustomer.pastConversations.map((conv, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-canvas-subtle rounded border border-border-subtle space-y-1 font-sans text-xs"
                  >
                    <div className="flex items-center justify-between font-mono text-[10px] text-ink-muted">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-ink-muted" />
                        <span className="font-semibold text-ink-primary">{conv.date}</span>
                      </div>
                      <span>DURATION: {conv.duration}</span>
                    </div>
                    <p className="font-semibold text-ink-primary">{conv.topic}</p>
                    <p className="text-[11px] text-ink-secondary flex items-center gap-1">
                      <span className="text-ops-live font-semibold">Outcome:</span> {conv.resolution}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. PAST ACTIONS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-ink-muted uppercase tracking-wider">
              <span>PAST ACTIONS TAKEN BY RELAY</span>
              <span>{selectedCustomer.pastActions.length} ACTIONS</span>
            </div>

            {selectedCustomer.pastActions.length === 0 ? (
              <div className="p-2.5 bg-canvas-subtle rounded border border-border-subtle text-xs text-ink-muted font-mono italic">
                No past automated actions logged.
              </div>
            ) : (
              <div className="space-y-1.5">
                {selectedCustomer.pastActions.map((act, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-canvas-subtle rounded border border-border-subtle flex items-start gap-2 text-xs font-mono"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-ops-live shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-ink-primary">{act.action}</span>
                        <span className="text-[10px] text-ink-muted">{act.date}</span>
                      </div>
                      {act.operator && (
                        <span className="text-[10px] text-accent block mt-0.5">
                          Operator: {act.operator}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

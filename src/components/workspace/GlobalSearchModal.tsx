import React, { useState, useEffect, useRef } from 'react'
import {
  Search,
  Users,
  FolderKanban,
  PhoneCall,
  Package,
  ArrowUpRight,
  Sparkles,
  X
} from 'lucide-react'

export interface SearchResultItem {
  id: string
  category: 'case' | 'customer' | 'call' | 'order' | 'action'
  title: string
  subtitle: string
  badge?: string
  targetView: 'case-detail' | 'customers' | 'live-workstation' | 'approvals'
  targetId?: string
}

const mockSearchDatabase: SearchResultItem[] = [
  // Cases
  {
    id: 'case-1042',
    category: 'case',
    title: 'CASE RLY-1042',
    subtitle: 'Delivery dispute • Aarav Sharma • Hindi • 21:30',
    badge: 'AWAITING APPROVAL',
    targetView: 'case-detail',
    targetId: 'RLY-1042',
  },
  {
    id: 'case-1038',
    category: 'case',
    title: 'CASE RLY-1038',
    subtitle: 'Subscription cancellation • Vikram Patel • English',
    badge: 'HIGH RISK',
    targetView: 'case-detail',
    targetId: 'RLY-1038',
  },
  {
    id: 'case-1034',
    category: 'case',
    title: 'CASE RLY-1034',
    subtitle: 'Delayed order compensation • Sunita Roy • Bengali / English',
    badge: 'RESOLVED',
    targetView: 'case-detail',
    targetId: 'RLY-1034',
  },
  {
    id: 'case-1029',
    category: 'case',
    title: 'CASE RLY-1029',
    subtitle: 'Payment gateway timeout • Priya Shah • English',
    badge: 'ESCALATED',
    targetView: 'case-detail',
    targetId: 'RLY-1029',
  },

  // Customers
  {
    id: 'cust-aarav',
    category: 'customer',
    title: 'Aarav Sharma',
    subtitle: '12 interactions • Language: Hindi • Tier 1 Account',
    badge: '89% RESOLUTION',
    targetView: 'customers',
    targetId: 'Aarav Sharma',
  },
  {
    id: 'cust-priya',
    category: 'customer',
    title: 'Priya Shah',
    subtitle: '7 interactions • Language: English • Tier 2 Account',
    badge: '100% RESOLUTION',
    targetView: 'customers',
    targetId: 'Priya Shah',
  },
  {
    id: 'cust-rahul',
    category: 'customer',
    title: 'Rahul Mehta',
    subtitle: '4 interactions • Language: Hinglish • Tier 1 Account',
    badge: '75% RESOLUTION',
    targetView: 'customers',
    targetId: 'Rahul Mehta',
  },
  {
    id: 'cust-vikram',
    category: 'customer',
    title: 'Vikram Patel',
    subtitle: '9 interactions • Language: Gujarati / English • Enterprise Tier',
    badge: '92% RESOLUTION',
    targetView: 'customers',
    targetId: 'Vikram Patel',
  },

  // Orders
  {
    id: 'ord-84921',
    category: 'order',
    title: 'Order #84921',
    subtitle: '₹1,499 • Delivery exception at Mumbai Hub • Customer: Aarav Sharma',
    badge: 'DELAYED 3D',
    targetView: 'case-detail',
    targetId: 'RLY-1042',
  },
  {
    id: 'ord-92817',
    category: 'order',
    title: 'Refund Tx #RF-92817',
    subtitle: '₹1,499 UPI initiated • Order #84921',
    badge: 'UPI SUCCESS',
    targetView: 'case-detail',
    targetId: 'RLY-1042',
  },

  // Calls
  {
    id: 'call-live',
    category: 'call',
    title: 'Active Live Session',
    subtitle: 'Aarav Sharma (Hindi) • Channel: relay-case-1042 • 86ms',
    badge: 'AGORA RTC LIVE',
    targetView: 'live-workstation',
    targetId: 'RLY-1042',
  },

  // Actions
  {
    id: 'act-refund',
    category: 'action',
    title: 'Refund Proposed ₹1,499',
    subtitle: 'Case RLY-1042 • Policy gate awaiting operator authorization',
    badge: 'APPROVAL REQ',
    targetView: 'approvals',
    targetId: 'RLY-1042',
  },
]

interface GlobalSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (view: 'case-detail' | 'customers' | 'live-workstation' | 'approvals', id?: string) => void
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState<string>('')
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setSelectedIndex(0)
    } else {
      setQuery('')
    }
  }, [isOpen])

  // Filter items based on query
  const filteredResults = mockSearchDatabase.filter((item) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      (item.badge && item.badge.toLowerCase().includes(q))
    )
  })

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1 < filteredResults.length ? prev + 1 : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredResults.length - 1))
      } else if (e.key === 'Enter' && filteredResults[selectedIndex]) {
        e.preventDefault()
        const selected = filteredResults[selectedIndex]
        onNavigate(selected.targetView, selected.targetId)
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, filteredResults])

  if (!isOpen) return null

  const getCategoryIcon = (cat: SearchResultItem['category']) => {
    switch (cat) {
      case 'case':
        return <FolderKanban className="w-3.5 h-3.5 text-accent" />
      case 'customer':
        return <Users className="w-3.5 h-3.5 text-ops-live" />
      case 'call':
        return <PhoneCall className="w-3.5 h-3.5 text-ops-live" />
      case 'order':
        return <Package className="w-3.5 h-3.5 text-ink-muted" />
      case 'action':
        return <Sparkles className="w-3.5 h-3.5 text-ops-warning" />
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-start justify-center pt-20 p-4 font-sans select-none animate-in fade-in duration-100">
      <div className="w-full max-w-2xl bg-canvas-pure border border-border-subtle rounded-[6px] shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
        {/* Search Input Bar */}
        <div className="p-3 border-b border-border-subtle flex items-center gap-2.5 bg-canvas-pure">
          <Search className="w-4 h-4 text-ink-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search cases, customers, calls, orders (e.g. Aarav, 84921, refund, delivery, RLY-1042)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            className="flex-1 bg-transparent text-sm text-ink-primary placeholder-ink-muted focus:outline-none font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-ink-muted hover:text-ink-primary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[10px] font-mono text-ink-muted border border-border-subtle rounded px-1.5 py-0.5 bg-canvas-subtle">
            ESC
          </span>
        </div>

        {/* Quick Suggestion Pill Tags */}
        <div className="p-2 border-b border-border-subtle/70 bg-canvas-subtle flex items-center gap-1.5 text-[10px] font-mono overflow-x-auto">
          <span className="text-ink-muted uppercase mr-1">QUICK:</span>
          {['Aarav', '84921', 'refund', 'delivery', 'RLY-1042'].map((tag) => (
            <button
              key={tag}
              onClick={() => {
                setQuery(tag)
                setSelectedIndex(0)
              }}
              className="px-2 py-0.5 rounded-[2px] bg-canvas-pure border border-border-subtle text-ink-primary hover:border-accent hover:text-accent cursor-pointer transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 min-h-[160px]">
          {filteredResults.length === 0 ? (
            <div className="text-center py-10 font-mono text-xs text-ink-muted">
              No results found for "{query}". Try searching by customer name, order number, or case ID.
            </div>
          ) : (
            filteredResults.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => {
                  onNavigate(item.targetView, item.targetId)
                  onClose()
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`p-2.5 rounded-[3px] flex items-center justify-between cursor-pointer transition-colors ${
                  selectedIndex === idx
                    ? 'bg-accent-subtle/60 border border-accent-border'
                    : 'bg-canvas-pure hover:bg-canvas-subtle border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-[2px] bg-canvas-subtle border border-border-subtle flex items-center justify-center shrink-0">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-ink-primary">
                        {item.title}
                      </span>
                      {item.badge && (
                        <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded border bg-canvas-pure border-border-subtle text-ink-secondary">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-secondary leading-tight mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[10px] font-mono text-ink-muted">
                  <span className="hidden sm:inline">Jump</span>
                  <ArrowUpRight className="w-3 h-3 text-accent" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-2.5 px-4 bg-canvas-subtle border-t border-border-subtle flex items-center justify-between text-[10px] font-mono text-ink-muted">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1 py-0.5 bg-canvas-pure border border-border-subtle rounded text-[9px]">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1 py-0.5 bg-canvas-pure border border-border-subtle rounded text-[9px]">↵</kbd> Select</span>
            <span><kbd className="px-1 py-0.5 bg-canvas-pure border border-border-subtle rounded text-[9px]">ESC</kbd> Close</span>
          </div>

          <span>RELAY Global Index • In-Memory Search</span>
        </div>
      </div>
    </div>
  )
}

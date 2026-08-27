import React, { useState } from 'react'
import { X, Radio, User, Globe, HelpCircle, PhoneCall, Plus } from 'lucide-react'
import { Button } from '../ui/Button'
import { RuntimeMode } from '../../contexts/CaseStateContext'

export interface NewCaseConfig {
  customerName: string
  customerId: string
  preferredLanguage: string
  reason: string
  mode: RuntimeMode
}

interface NewLiveCaseModalProps {
  isOpen: boolean
  onClose: () => void
  onStartCase: (config: NewCaseConfig) => void
  defaultMode?: RuntimeMode
}

const EXISTING_CUSTOMERS = [
  { id: 'CUST-AARAV-01', name: 'Aarav Sharma', phone: '+91 98201 44102', tier: 'PLATINUM' },
  { id: 'CUST-PRIYA-02', name: 'Priya Shah', phone: '+91 98334 11094', tier: 'GOLD' },
  { id: 'CUST-RAHUL-03', name: 'Rahul Mehta', phone: '+91 97110 55420', tier: 'STANDARD' },
]

const LANGUAGES = [
  'Auto Detect (Hindi / English)',
  'Hindi (हिन्दी)',
  'English (Indian)',
  'Hinglish (Colloquial)',
]

const REASONS = [
  'Customer Support (Delivery / Order #84921)',
  'Payment & Billing Dispute',
  'Subscription Cancellation & Proration',
  'General Inbound Inquiry',
]

export const NewLiveCaseModal: React.FC<NewLiveCaseModalProps> = ({
  isOpen,
  onClose,
  onStartCase,
  defaultMode = 'REAL',
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('CUST-AARAV-01')
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState<boolean>(false)
  const [newCustomerName, setNewCustomerName] = useState<string>('')
  const [language, setLanguage] = useState<string>('Auto Detect (Hindi / English)')
  const [reason, setReason] = useState<string>('Customer Support (Delivery / Order #84921)')
  const [mode, setMode] = useState<RuntimeMode>(defaultMode)

  if (!isOpen) return null

  const handleStart = () => {
    let customerName = 'Aarav Sharma'
    let customerId = selectedCustomerId

    if (isAddingNewCustomer && newCustomerName.trim()) {
      customerName = newCustomerName.trim()
      customerId = `CUST-${Date.now().toString().slice(-4)}`
    } else {
      const found = EXISTING_CUSTOMERS.find((c) => c.id === selectedCustomerId)
      if (found) customerName = found.name
    }

    onStartCase({
      customerName,
      customerId,
      preferredLanguage: language,
      reason,
      mode,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 select-none font-mono animate-fadeIn">
      <div className="bg-canvas-pure border border-border rounded-[4px] shadow-modal w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border-subtle flex items-center justify-between bg-canvas-subtle">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-bold text-ink-primary tracking-wider uppercase">
              NEW LIVE CASE
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-muted hover:text-ink-primary p-1 rounded hover:bg-canvas transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Customer Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-ink-primary flex items-center gap-1.5 uppercase text-[11px] tracking-tight">
                <User className="w-3.5 h-3.5 text-ink-muted" />
                <span>Customer</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddingNewCustomer(!isAddingNewCustomer)}
                className="text-[10px] text-accent font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>{isAddingNewCustomer ? 'Choose existing' : '+ New customer'}</span>
              </button>
            </div>

            {isAddingNewCustomer ? (
              <input
                type="text"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="Enter customer full name..."
                autoFocus
                className="w-full bg-canvas border border-border-subtle rounded-[3px] px-3 py-2 text-xs text-ink-primary focus:outline-none focus:border-accent font-mono"
              />
            ) : (
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-canvas border border-border-subtle rounded-[3px] px-3 py-2 text-xs text-ink-primary focus:outline-none focus:border-accent font-mono cursor-pointer"
              >
                {EXISTING_CUSTOMERS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.tier})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Preferred Language */}
          <div className="space-y-1.5">
            <label className="font-bold text-ink-primary flex items-center gap-1.5 uppercase text-[11px] tracking-tight">
              <Globe className="w-3.5 h-3.5 text-ink-muted" />
              <span>Preferred language</span>
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-canvas border border-border-subtle rounded-[3px] px-3 py-2 text-xs text-ink-primary focus:outline-none focus:border-accent font-mono cursor-pointer"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="font-bold text-ink-primary flex items-center gap-1.5 uppercase text-[11px] tracking-tight">
              <HelpCircle className="w-3.5 h-3.5 text-ink-muted" />
              <span>Reason</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-canvas border border-border-subtle rounded-[3px] px-3 py-2 text-xs text-ink-primary focus:outline-none focus:border-accent font-mono cursor-pointer"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Mode (REAL vs DEMO) */}
          <div className="space-y-2 pt-1 border-t border-border-subtle">
            <label className="font-bold text-ink-primary uppercase text-[11px] tracking-tight block">
              Runtime Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('REAL')}
                className={`p-2.5 rounded-[3px] border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  mode === 'REAL'
                    ? 'bg-ops-liveBg border-ops-liveBorder text-ink-primary shadow-sm'
                    : 'bg-canvas-subtle border-border-subtle text-ink-muted hover:text-ink-primary'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${mode === 'REAL' ? 'bg-ops-live animate-pulse' : 'bg-ink-muted'}`} />
                  <span className="font-bold text-[11px] uppercase">REAL CALL</span>
                </div>
                <span className="text-[10px] text-ink-secondary leading-tight">
                  Agora RTC Live WebRTC + SSE stream
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMode('DEMO')}
                className={`p-2.5 rounded-[3px] border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  mode === 'DEMO'
                    ? 'bg-accent-subtle border-accent-border text-ink-primary shadow-sm'
                    : 'bg-canvas-subtle border-border-subtle text-ink-muted hover:text-ink-primary'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${mode === 'DEMO' ? 'bg-accent' : 'bg-ink-muted'}`} />
                  <span className="font-bold text-[11px] uppercase">DEMO MODE</span>
                </div>
                <span className="text-[10px] text-ink-secondary leading-tight">
                  Deterministic simulator loop
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer with [ START CALL ] */}
        <div className="p-4 border-t border-border-subtle bg-canvas-subtle flex items-center justify-end gap-2">
          <Button variant="secondary" size="md" onClick={onClose} className="font-mono text-xs cursor-pointer">
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleStart}
            className="font-mono text-xs font-bold uppercase tracking-wider bg-accent text-white hover:bg-accent-hover active:bg-[#083070] flex items-center gap-1.5 px-4 cursor-pointer"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>[ START CALL ]</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

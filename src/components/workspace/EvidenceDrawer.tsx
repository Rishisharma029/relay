import React, { useState, useEffect } from 'react'
import {
  Terminal,
  Wrench,
  Activity,
  ChevronDown,
  ChevronUp,
  Search,
  Radio,
  Sparkles
} from 'lucide-react'
import { agoraRtm } from '../../services/agoraRtmService'
import { agoraRtc } from '../../services/agoraRtcService'
import { useDevMode } from '../../contexts/DevModeContext'

export type EvidenceTab = 'activity' | 'tools' | 'system'

interface ActivityItem {
  id: string
  time: string
  event: string
  payload?: string
  category: 'audio' | 'speech' | 'intent' | 'tool' | 'policy' | 'action'
}

export const EvidenceDrawer: React.FC = () => {
  const { isDevMode } = useDevMode()
  const [activeTab, setActiveTab] = useState<EvidenceTab>('activity')
  const [isExpanded, setIsExpanded] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [liveEvents, setLiveEvents] = useState<ActivityItem[]>([
    { id: 'act-1', time: '21:34:03', event: 'customer.interruption', category: 'audio' },
    { id: 'act-2', time: '21:34:04', event: 'speech.language', payload: 'hi-IN', category: 'speech' },
    { id: 'act-3', time: '21:34:05', event: 'intent.detected', payload: 'refund_request', category: 'intent' },
    { id: 'act-4', time: '21:34:06', event: 'tool.call', payload: 'lookupOrder', category: 'tool' },
    { id: 'act-5', time: '21:34:07', event: 'tool.result', payload: 'delivery_exception', category: 'tool' },
    { id: 'act-6', time: '21:34:08', event: 'policy.check', payload: 'approval_required', category: 'policy' },
    { id: 'act-7', time: '21:34:09', event: 'action.created', payload: 'refund', category: 'action' },
  ])

  const [liveToolExecutions, setLiveToolExecutions] = useState<any[]>([
    {
      id: 't-1',
      time: '21:34:06.110',
      name: 'lookupOrder',
      status: '200 OK',
      latency: '85ms',
      params: { orderId: '84921', customerId: 'CUST-AARAV-01' },
      response: {
        orderId: '84921',
        amount: 1499,
        status: 'DELIVERY_EXCEPTION',
        carrier: 'BlueDart Air',
        exceptionCode: 'COURIER_DELAY_TRANSIT',
        lastLocation: 'Hub 04 (Outer Ring Logistics Terminal)',
      },
    },
    {
      id: 't-2',
      time: '21:34:08.040',
      name: 'evaluateRefundPolicy',
      status: '200 OK',
      latency: '38ms',
      params: { policyId: 'POL-REFUND-3.2', amount: 1499 },
      response: {
        policyId: 'POL-REFUND-3.2',
        eligible: true,
        riskTier: 'MEDIUM',
        requiresHumanApproval: true,
      },
    },
  ])

  useEffect(() => {
    const unsub = agoraRtm.subscribeRelayEvents((ev: any) => {
      const categoryMap: Record<string, ActivityItem['category']> = {
        'speech.started': 'speech',
        'speech.transcript': 'speech',
        'language.changed': 'speech',
        'tool.started': 'tool',
        'tool.completed': 'tool',
        'approval.created': 'action',
        'approval.approved': 'action',
        'human.takeover': 'audio',
        'call.started': 'audio',
      }

      const item: ActivityItem = {
        id: ev.id || ('re-' + Date.now()),
        time: ev.timestamp,
        event: ev.type,
        payload: JSON.stringify(ev),
        category: categoryMap[ev.type] || 'action',
      }

      setLiveEvents((prev) => [item, ...prev])

      if (ev.type === 'tool.completed') {
        const toolItem = {
          id: ev.id || ('t-' + Date.now()),
          time: ev.timestamp,
          name: ev.tool,
          status: '200 OK',
          latency: (ev.durationMs + 'ms'),
          params: {},
          response: ev.result || {},
        }
        setLiveToolExecutions((prev) => [toolItem, ...prev])
      }
    })

    return unsub
  }, [])

  const filteredActivity = liveEvents.filter((item) => {
    if (!searchQuery) return true
    return (
      item.event.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.payload && item.payload.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })

  if (!isDevMode && !isExpanded) {
    return (
      <footer className="h-7 bg-[#0B0F19] text-[#9CA3AF] border-t border-[#1F2937] px-3 flex items-center justify-between font-mono text-[10px] select-none shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-ops-live font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-ops-live animate-pulse" />
            <span>SYSTEM HEALTHY</span>
          </div>
          <span className="text-[#374151]">|</span>
          <div className="flex items-center gap-1 text-[#D1D5DB]">
            <Radio className="w-3 h-3 text-accent" />
            <span>Agora RTC: {agoraRtc.getConnectionState()}</span>
          </div>
          <span className="text-[#374151]">|</span>
          <div className="flex items-center gap-1 text-[#D1D5DB]">
            <Sparkles className="w-3 h-3 text-accent" />
            <span>AI: Gemini 2.5 Flash</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-1 text-[#9CA3AF] hover:text-white hover:bg-[#1F2937] px-2 py-0.5 rounded cursor-pointer transition-colors"
        >
          <ChevronUp className="w-3 h-3" />
          <span>▸ Expand Diagnostics</span>
        </button>
      </footer>
    )
  }

  return (
    <footer
      className={`bg-[#0B0F19] text-[#E2E8F0] border-t border-border-subtle flex flex-col font-mono text-[11px] select-none shrink-0 transition-all duration-200 ${
        isExpanded || isDevMode ? 'h-56' : 'h-32'
      }`}
    >
      <div className="h-7.5 bg-[#111827] border-b border-[#1F2937] px-3 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-[10px] font-mono font-bold tracking-wider uppercase transition-colors cursor-pointer ${
              activeTab === 'activity'
                ? 'bg-accent text-white'
                : 'text-[#9CA3AF] hover:text-white hover:bg-[#1F2937]'
            }`}
          >
            <Terminal className="w-3 h-3" />
            <span>SYSTEM ACTIVITY</span>
            <span className="text-[9px] opacity-70">({liveEvents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tools')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-[10px] font-mono font-bold tracking-wider uppercase transition-colors cursor-pointer ${
              activeTab === 'tools'
                ? 'bg-accent text-white'
                : 'text-[#9CA3AF] hover:text-white hover:bg-[#1F2937]'
            }`}
          >
            <Wrench className="w-3 h-3" />
            <span>TOOL CALLS</span>
            <span className="text-[9px] opacity-70">({liveToolExecutions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-[10px] font-mono font-bold tracking-wider uppercase transition-colors cursor-pointer ${
              activeTab === 'system'
                ? 'bg-accent text-white'
                : 'text-[#9CA3AF] hover:text-white hover:bg-[#1F2937]'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>DIAGNOSTICS</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="w-3 h-3 absolute left-2 top-1.5 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Filter events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#0B0F19] border border-[#374151] rounded-[2px] pl-6 pr-2 py-0.5 text-[10px] text-white focus:outline-none focus:border-accent w-36"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[#9CA3AF] hover:text-white p-1 rounded hover:bg-[#1F2937] transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2.5 font-mono text-[10px] space-y-1.5">
        {activeTab === 'activity' && (
          <div className="space-y-1">
            {filteredActivity.map((item) => (
              <div key={item.id} className="flex items-start gap-2 hover:bg-[#1F2937]/50 p-1 rounded">
                <span className="text-[#6B7280] tabular-nums shrink-0">{item.time}</span>
                <span className="text-accent font-bold uppercase shrink-0">[{item.category}]</span>
                <span className="text-white font-semibold">{item.event}</span>
                {item.payload && <span className="text-[#9CA3AF] truncate max-w-md">{item.payload}</span>}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="space-y-2">
            {liveToolExecutions.map((tool) => (
              <div key={tool.id} className="bg-[#111827] border border-[#1F2937] p-2 rounded flex flex-col gap-1">
                <div className="flex items-center justify-between font-bold text-white">
                  <span className="text-accent">⚡ {tool.name}()</span>
                  <div className="flex items-center gap-2">
                    <span className="text-ops-live">{tool.status}</span>
                    <span className="text-[#6B7280]">{tool.latency}</span>
                  </div>
                </div>
                <pre className="text-[9px] text-[#9CA3AF] overflow-x-auto bg-[#0B0F19] p-1.5 rounded">
                  {JSON.stringify(tool.response, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'system' && (
          <div className="grid grid-cols-3 gap-3 p-2 bg-[#111827] border border-[#1F2937] rounded">
            <div>
              <span className="text-[#6B7280] block text-[9px]">AGORA RTC</span>
              <span className="text-ops-live font-bold">{agoraRtc.getConnectionState()}</span>
            </div>
            <div>
              <span className="text-[#6B7280] block text-[9px]">SPEECH RECOGNITION</span>
              <span className="text-white font-bold">Continuous ASR (hi-IN / en-IN)</span>
            </div>
            <div>
              <span className="text-[#6B7280] block text-[9px]">PAYMENT SANDBOX</span>
              <span className="text-amber-400 font-bold">Active (Demo Txn Mock)</span>
            </div>
          </div>
        )}
      </div>
    </footer>
  )
}

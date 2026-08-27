import React, { useState, useEffect } from 'react'
import {
  Terminal,
  FileText,
  Wrench,
  Activity,
  ChevronDown,
  ChevronUp,
  Search,
  Code2
} from 'lucide-react'
import { agoraRtm } from '../../services/agoraRtmService'
import { RelayEvent } from '../../types/relayEvents'

export type EvidenceTab = 'activity' | 'transcript' | 'tools' | 'system'

interface ActivityItem {
  id: string
  time: string
  event: string
  payload?: string
  category: 'audio' | 'speech' | 'intent' | 'tool' | 'policy' | 'action'
}

export const EvidenceDrawer: React.FC = () => {
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
      params: { policyId: 'POL-DELIVERY-DELAY-01', amount: 1499 },
      response: {
        policyId: 'POL-DELIVERY-DELAY-01',
        eligible: true,
        riskTier: 'MEDIUM',
        requiresHumanApproval: true,
      },
    },
  ])

  // Subscribe to live Agora RTM Event Bus via unified RelayEvents
  useEffect(() => {
    const unsub = agoraRtm.subscribeRelayEvents((ev: RelayEvent) => {
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
        id: ev.id || `re-${Date.now()}`,
        time: ev.timestamp,
        event: ev.type,
        payload: JSON.stringify(ev),
        category: categoryMap[ev.type] || 'action',
      }

      setLiveEvents((prev) => [item, ...prev])

      if (ev.type === 'tool.completed') {
        const toolItem = {
          id: ev.id || `t-${Date.now()}`,
          time: ev.timestamp,
          name: ev.tool,
          status: '200 OK',
          latency: `${ev.durationMs}ms`,
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

  return (
    <div
      className={`bg-[#0B0F19] text-[#E2E8F0] border-t border-border-subtle flex flex-col font-mono text-[11px] select-none shrink-0 transition-all duration-200 ${
        isExpanded ? 'h-64' : 'h-36'
      }`}
    >
      {/* 1. TABS HEADER BAR (ACTIVITY, TRANSCRIPT, TOOLS, SYSTEM) */}
      <div className="h-7.5 bg-[#111827] border-b border-[#1F2937] px-3 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-1">
          {/* TAB 1: ACTIVITY (DEFAULT) */}
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-[10px] font-mono font-bold tracking-wider uppercase transition-colors cursor-pointer ${
              activeTab === 'activity'
                ? 'bg-accent text-white'
                : 'text-[#9CA3AF] hover:text-white hover:bg-[#1F2937]'
            }`}
          >
            <Terminal className="w-3 h-3" />
            <span>ACTIVITY</span>
          </button>

          {/* TAB 2: TRANSCRIPT */}
          <button
            onClick={() => setActiveTab('transcript')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-[10px] font-mono font-bold tracking-wider uppercase transition-colors cursor-pointer ${
              activeTab === 'transcript'
                ? 'bg-accent text-white'
                : 'text-[#9CA3AF] hover:text-white hover:bg-[#1F2937]'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>TRANSCRIPT</span>
          </button>

          {/* TAB 3: TOOLS (FOR DEVELOPERS / JUDGES) */}
          <button
            onClick={() => setActiveTab('tools')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-[10px] font-mono font-bold tracking-wider uppercase transition-colors cursor-pointer ${
              activeTab === 'tools'
                ? 'bg-accent text-white'
                : 'text-[#9CA3AF] hover:text-white hover:bg-[#1F2937]'
            }`}
          >
            <Wrench className="w-3 h-3" />
            <span>TOOLS</span>
            <span className="bg-[#1E293B] text-[#93C5FD] px-1 py-0.1 rounded text-[9px]">
              {liveToolExecutions.length}
            </span>
          </button>

          {/* TAB 4: SYSTEM */}
          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-[10px] font-mono font-bold tracking-wider uppercase transition-colors cursor-pointer ${
              activeTab === 'system'
                ? 'bg-accent text-white'
                : 'text-[#9CA3AF] hover:text-white hover:bg-[#1F2937]'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>SYSTEM</span>
          </button>
        </div>

        {/* Right Tools: Filter & Expand/Collapse */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="filter events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#1F2937] border border-[#374151] rounded-[2px] pl-5 pr-2 py-0.5 text-[10px] text-white placeholder-[#6B7280] focus:outline-none focus:border-accent w-32"
            />
            <Search className="w-3 h-3 text-[#6B7280] absolute left-1.5 top-1.5" />
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-[#9CA3AF] hover:text-white rounded hover:bg-[#1F2937] cursor-pointer"
            title={isExpanded ? 'Collapse Drawer' : 'Expand Drawer'}
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. TAB CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-2 min-h-0 select-text leading-tight font-mono">
        {/* TAB: ACTIVITY (SECTION 11 EXACT FORMAT) */}
        {activeTab === 'activity' && (
          <div className="space-y-1 font-mono text-[11px]">
            {filteredActivity.map((act) => {
              const isInterruption = act.event === 'customer.interruption'
              const isTool = act.event.startsWith('tool.')
              const isPolicy = act.event.startsWith('policy.')
              const isAction = act.event.startsWith('action.')
              const isIntent = act.event.startsWith('intent.')

              return (
                <div
                  key={act.id}
                  className={`flex items-center gap-3 hover:bg-[#1F2937]/60 px-2 py-0.5 rounded-[2px] transition-colors ${
                    isInterruption ? 'bg-ops-criticalBg/10 text-[#FCA5A5]' : 'text-[#E2E8F0]'
                  }`}
                >
                  <span className="text-[#6B7280] tabular-nums shrink-0 font-semibold">
                    {act.time}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-semibold ${
                        isInterruption
                          ? 'text-[#EF4444]'
                          : isTool
                          ? 'text-[#60A5FA]'
                          : isPolicy
                          ? 'text-[#FBBF24]'
                          : isAction
                          ? 'text-[#34D399]'
                          : isIntent
                          ? 'text-[#A78BFA]'
                          : 'text-[#E2E8F0]'
                      }`}
                    >
                      {act.event}
                    </span>

                    {act.payload && (
                      <>
                        <span className="text-[#6B7280]">→</span>
                        <span
                          className={`font-mono ${
                            isTool
                              ? 'text-[#93C5FD] font-semibold'
                              : isAction
                              ? 'text-[#6EE7B7] font-semibold'
                              : isPolicy
                              ? 'text-[#FDE68A]'
                              : 'text-white'
                          }`}
                        >
                          {act.payload}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* TAB: TOOLS (FOR DEVELOPERS / JUDGES) */}
        {activeTab === 'tools' && (
          <div className="space-y-2">
            {liveToolExecutions.map((tool) => (
              <div
                key={tool.id}
                className="bg-[#111827] border border-[#1F2937] p-2 rounded-[3px] space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-3 h-3 text-accent" />
                    <span className="text-[#60A5FA] font-bold text-xs">{tool.name}()</span>
                    <span className="text-[#6B7280] text-[10px] tabular-nums">
                      LATENCY: {tool.latency}
                    </span>
                  </div>
                  <span className="bg-[#064E3B] text-[#6EE7B7] text-[9px] px-1.5 py-0.2 rounded font-bold">
                    {tool.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                  <div>
                    <span className="text-[#6B7280] block font-semibold">INVOCATION ARGS:</span>
                    <pre className="text-[#93C5FD] bg-[#0B0F19] p-1.5 rounded border border-[#1F2937] overflow-x-auto">
                      {JSON.stringify(tool.params, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block font-semibold">STRUCTURED RESULT:</span>
                    <pre className="text-[#A7F3D0] bg-[#0B0F19] p-1.5 rounded border border-[#1F2937] overflow-x-auto">
                      {JSON.stringify(tool.response, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB: TRANSCRIPT */}
        {activeTab === 'transcript' && (
          <div className="space-y-1.5 text-[#D1D5DB] leading-relaxed px-1 text-[11px]">
            <p><span className="text-[#60A5FA] font-bold">[21:33:42 - CUSTOMER (hi-IN)]:</span> "Mera order 5 din se nahi aaya."</p>
            <p><span className="text-[#34D399] font-bold">[21:33:46 - RELAY]:</span> "I'll check that for you." (TTS RTT: 24ms)</p>
            <p><span className="text-[#FBBF24] font-bold">[21:33:51 - TOOL]:</span> ⚡ lookupOrder(orderId="84921") → delivery_exception (Latency: 62ms)</p>
            <p><span className="text-[#34D399] font-bold">[21:33:52 - RELAY]:</span> "Your order has a delivery exception."</p>
            <p><span className="text-[#60A5FA] font-bold">[21:34:03 - CUSTOMER (hi-IN)]:</span> "Mujhe refund chahiye." (Intent: refund_request)</p>
          </div>
        )}

        {/* TAB: SYSTEM */}
        {activeTab === 'system' && (
          <div className="grid grid-cols-4 gap-2 text-[10px]">
            <div className="bg-[#111827] p-2 rounded-[3px] border border-accent/40">
              <span className="text-[#60A5FA] font-bold block">AGORA RTC GATEWAY</span>
              <span className="text-[#34D399] font-bold text-xs">relay-case-1042 (LIVE)</span>
              <span className="text-[#9CA3AF] block mt-1">Latency: 86ms | 3 Peers (48kHz)</span>
            </div>
            <div className="bg-[#111827] p-2 rounded-[3px] border border-[#1F2937]">
              <span className="text-[#6B7280] block">SPEECH SYNTHESIS</span>
              <span className="text-[#60A5FA] font-bold text-xs">CARTESIA DUPLEX</span>
              <span className="text-[#9CA3AF] block mt-1">Streaming RTT: 24ms</span>
            </div>
            <div className="bg-[#111827] p-2 rounded-[3px] border border-[#1F2937]">
              <span className="text-[#6B7280] block">ASR MODEL</span>
              <span className="text-[#34D399] font-bold text-xs">DEEPGRAM HINDI-V2</span>
              <span className="text-[#9CA3AF] block mt-1">WER: 3.1% | Conf: 99.4%</span>
            </div>
            <div className="bg-[#111827] p-2 rounded-[3px] border border-[#1F2937]">
              <span className="text-[#6B7280] block">LLM INFERENCE</span>
              <span className="text-[#FBBF24] font-bold text-xs">RELAY-OPS-CORE</span>
              <span className="text-[#9CA3AF] block mt-1">TTFT: 112ms | Tok/s: 64.2</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

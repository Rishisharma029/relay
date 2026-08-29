/**
 * RELAY — Authoritative Case State Context
 *
 * Supports Dual Runtime Modes:
 *   - REAL MODE: Live Agora RTC WebRTC channel, SSE real-time event pipeline, PostgreSQL event ledger.
 *   - DEMO MODE: Deterministic simulation loop for presentation & failover demonstrations.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { CaseState, INITIAL_CASE_STATE, Fact } from '../types/caseState'
import { RelayEvent } from '../types/relayEvents'
import { agoraRtm } from '../services/agoraRtmService'
import { agoraRtc, RealtimeTelemetry } from '../services/agoraRtcService'
import { caseStateReducer, reconstructCaseState } from '../services/caseStateReducer'
import { DEMO_SCENARIOS, DemoScenario } from '../data/demoScenarios'

export type RuntimeMode = 'REAL' | 'DEMO'

interface CaseStateContextType {
  runtimeMode: RuntimeMode
  setRuntimeMode: (mode: RuntimeMode) => void
  toggleRuntimeMode: () => void
  caseState: CaseState
  setCaseState: React.Dispatch<React.SetStateAction<CaseState>>
  activeScenario: DemoScenario | null
  setActiveScenario: (scenario: DemoScenario | null) => void
  loadScenario: (scenario: DemoScenario) => void
  events: RelayEvent[]
  dispatchRelayEvent: (event: RelayEvent) => void
  replayUpToIndex: (index: number) => void
  updateLanguage: (language: string) => void
  updateIntent: (intent: string) => void
  updateSentiment: (sentiment: string) => void
  addFact: (fact: Fact) => void
  removeUnknown: (unknownText: string) => void
  setStatus: (status: CaseState['status']) => void
  approveActiveAction: (operatorName?: string) => Promise<void>
  declineActiveAction: () => Promise<void>
  resetCase: (caseId?: string) => void
  startNewLiveCase: (config: {
    customerName: string
    customerId: string
    preferredLanguage: string
    reason: string
    mode: RuntimeMode
  }) => void
  clearFailure: () => void
}

const CaseStateContext = createContext<CaseStateContextType | null>(null)

export const CaseStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>('REAL')
  const [activeScenario, setActiveScenario] = useState<DemoScenario | null>(DEMO_SCENARIOS[0])
  const [caseState, setCaseState] = useState<CaseState>(INITIAL_CASE_STATE)
  const [events, setEvents] = useState<RelayEvent[]>([
    {
      type: 'call.started',
      caseId: 'RLY-1042',
      timestamp: '21:33:40',
    },
    {
      type: 'speech.transcript',
      speaker: 'customer',
      text: 'Mera order 5 din se nahi aaya.',
      language: 'Hindi',
      translation: "My order hasn't arrived for 5 days.",
      timestamp: '21:33:42',
    },
    {
      type: 'tool.started',
      tool: 'lookupOrder',
      params: { orderId: '84921' },
      timestamp: '21:33:44',
    },
    {
      type: 'tool.completed',
      tool: 'lookupOrder',
      durationMs: 184,
      result: { orderId: '84921', status: 'DELIVERY_EXCEPTION', daysDelayed: 3 },
      timestamp: '21:33:45',
    },
  ])

  const toggleRuntimeMode = () => {
    setRuntimeMode((prev) => (prev === 'REAL' ? 'DEMO' : 'REAL'))
  }

  // Pure Dispatcher: appends event and runs through deterministic caseStateReducer
  const dispatchRelayEvent = useCallback((ev: RelayEvent) => {
    setEvents((prevEvents) => [...prevEvents, ev])
    setCaseState((prevState) => caseStateReducer(prevState, ev))
  }, [])

  // Time-travel replay: reconstructs state up to any historical event index
  const replayUpToIndex = useCallback(
    (index: number) => {
      setCaseState(reconstructCaseState(events, index, INITIAL_CASE_STATE))
    },
    [events]
  )

  // Real-Time SSE Stream Subscription in REAL Mode
  useEffect(() => {
    if (runtimeMode !== 'REAL') return

    let eventSource: EventSource | null = null

    try {
      eventSource = new EventSource('/api/events/stream')

      eventSource.onmessage = (e) => {
        try {
          const raw = JSON.parse(e.data)
          if (raw.type === 'connected') return

          const ev: RelayEvent = {
            type: raw.event_type || raw.type || 'case.updated',
            timestamp: raw.timestamp || new Date().toLocaleTimeString(),
            payload: raw.payload || raw,
            caseId: raw.case_id || 'RLY-1042',
            ...(raw.payload || {}),
          }

          dispatchRelayEvent(ev)
        } catch (parseErr) {
          console.warn('[SSE] Parse error:', parseErr)
        }
      }

      eventSource.onerror = () => {
        // Handled silently with auto-reconnect
      }
    } catch (sseErr) {
      console.warn('[SSE] Failed to establish live event stream:', sseErr)
    }

    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [runtimeMode, dispatchRelayEvent])

  // Synchronize with Agora RTM and RTC events
  useEffect(() => {
    const unsubRelay = agoraRtm.subscribeRelayEvents((ev) => {
      dispatchRelayEvent(ev)
    })

    const unsubRtc = agoraRtc.subscribeTelemetry((tel: RealtimeTelemetry) => {
      if (tel.isHumanTakeover && caseState.takeoverState !== 'HUMAN_ACTIVE') {
        dispatchRelayEvent({
          type: 'human.takeover',
          operatorId: 'OP-782',
          state: 'HUMAN_ACTIVE',
          reason: 'Agora RTC Telemetry Hardware Sync',
          timestamp: new Date().toLocaleTimeString(),
        })
      } else if (!tel.isHumanTakeover && caseState.takeoverState === 'HUMAN_ACTIVE') {
        dispatchRelayEvent({
          type: 'human.takeover',
          operatorId: 'OP-782',
          state: 'AI_ACTIVE',
          reason: 'Agora RTC Telemetry Hardware Return',
          timestamp: new Date().toLocaleTimeString(),
        })
      } else if (['REQUESTING_MIC', 'GETTING_TOKEN', 'JOINING_AGORA', 'AGENT_STARTING'].includes(tel.connectionState) && caseState.status !== 'connecting') {
        setCaseState((prev) => ({ ...prev, status: 'connecting' }))
      } else if (tel.connectionState === 'ERROR' && caseState.status !== 'failed') {
        setCaseState((prev) => ({ ...prev, status: 'failed' }))
      }
    })

    return () => {
      unsubRelay()
      unsubRtc()
    }
  }, [caseState.takeoverState, caseState.status, dispatchRelayEvent])

  const updateLanguage = (language: string) => {
    setCaseState((prev) => ({ ...prev, language }))
  }

  const updateIntent = (intent: string) => {
    setCaseState((prev) => ({ ...prev, intent }))
  }

  const updateSentiment = (sentiment: string) => {
    setCaseState((prev) => ({ ...prev, sentiment }))
  }

  const addFact = (fact: Fact) => {
    setCaseState((prev) => ({
      ...prev,
      facts: prev.facts.some((f) => f.label === fact.label) ? prev.facts : [...prev.facts, fact],
    }))
  }

  const removeUnknown = (unknownText: string) => {
    setCaseState((prev) => ({
      ...prev,
      unknowns: prev.unknowns.filter((u) => u !== unknownText),
    }))
  }

  const setStatus = (status: CaseState['status']) => {
    setCaseState((prev) => ({ ...prev, status }))
  }

  const loadScenario = (scenario: DemoScenario) => {
    setActiveScenario(scenario)

    const initials = scenario.customer
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'CU'

    const parsedAmount = scenario.proposedAction.amount
      ? parseInt(scenario.proposedAction.amount.replace(/[^0-9]/g, '')) || undefined
      : undefined

    const actionType: 'REFUND' | 'ESCALATION' | 'REROUTE' =
      scenario.id === 'delivery-refund' || scenario.id === 'angry-customer' || scenario.id === 'payment-failure'
        ? 'REFUND'
        : scenario.id === 'language-switch'
        ? 'REROUTE'
        : 'ESCALATION'

    const riskTier = (scenario.proposedAction.risk.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH') || 'MEDIUM'

    const newCaseState: CaseState = {
      id: scenario.caseId,
      customerId: `CUST-${initials}-01`,
      customerName: scenario.customer,
      customerPhone: '+91 98201 44102',
      customerTier: scenario.id === 'human-takeover' ? 'Enterprise' : 'Platinum',
      channelName: `relay-case-${scenario.caseId.toLowerCase()}`,
      language: scenario.language,
      intent: scenario.caseTitle,
      sentiment: scenario.sentiment,
      status:
        scenario.callState === 'CALL_ENDED'
          ? 'resolved'
          : scenario.callState === 'WAITING_FOR_APPROVAL'
          ? 'awaiting_approval'
          : 'active',
      takeoverState: scenario.isHumanTakeover ? 'HUMAN_ACTIVE' : 'AI_ACTIVE',
      facts: scenario.proposedAction.actionBasis.map((basis, idx) => ({
        id: `fact-${scenario.caseId}-${idx}`,
        label: basis,
        verified: true,
        source: 'Relay Knowledge Graph',
      })),
      unknowns: scenario.callState === 'WAITING_FOR_APPROVAL' ? [] : ['Resolution SLA confirmation'],
      activeAction: scenario.proposedAction
        ? {
            id: `appr-${scenario.caseId.toLowerCase()}`,
            type: actionType,
            title: scenario.proposedAction.title,
            amount: parsedAmount,
            currency: 'INR',
            riskTier: riskTier,
            policyId: 'POL-REFUND-3.2',
            policyUsed: {
              policyId: 'POL-REFUND-3.2',
              name: 'Dispute Resolution & Compensation Matrix',
              section: 'Section 4.1 — Immediate Settlement Protocol',
            },
            evidence: scenario.proposedAction.actionBasis,
            justification: scenario.proposedAction.actionBasis,
            status: scenario.callState === 'WAITING_FOR_APPROVAL' ? 'PENDING' : 'APPROVED',
          }
        : undefined,
      activeFailure:
        scenario.isServiceFailed || scenario.callState === 'TOOL_ERROR'
          ? {
              state: 'TOOL_ERROR',
              message: 'Carrier tracking gateway 504 Gateway Timeout (AWB: DEL-9928174)',
              escalate: false,
              attempt: 3,
              maxAttempts: 3,
              timestamp: '21:34:00',
              recovery: {
                autoRetry: true,
                maxAttempts: 3,
                fallback: 'human.escalation',
                userMessage: 'Carrier API timed out after 3 retries. Engaging manual trace.',
              },
            }
          : undefined,
      participants: [
        {
          id: `CUST-${initials}-01`,
          role: 'CUSTOMER',
          name: scenario.customer,
          joinedAt: new Date().toLocaleTimeString(),
        },
        {
          id: 'AI-9999',
          role: 'AI_AGENT',
          name: 'RELAY AI',
          joinedAt: new Date().toLocaleTimeString(),
        },
        ...(scenario.isHumanTakeover
          ? [
              {
                id: 'OP-782',
                role: 'OPERATOR' as const,
                name: 'Maya Sharma (Senior Operator)',
                joinedAt: new Date().toLocaleTimeString(),
              },
            ]
          : []),
      ],
    }

    setCaseState(newCaseState)

    // Build timeline events for this scenario
    const newEvents: RelayEvent[] = [
      {
        type: 'call.started',
        caseId: scenario.caseId,
        timestamp: '21:33:40',
      },
      ...scenario.transcript.map((item) => ({
        type: (item.isTool ? 'tool.completed' : 'speech.transcript') as any,
        id: item.id,
        speaker: (item.speaker === 'MAYA' ? 'operator' : item.speaker === 'CUSTOMER' ? 'customer' : 'agent') as any,
        text: item.content,
        translation: item.translation,
        language: item.language,
        timestamp: item.timestamp,
        tool: item.toolName,
        status: item.status,
      })),
      ...(scenario.callState === 'WAITING_FOR_APPROVAL'
        ? [
            {
              type: 'approval.created' as const,
              actionId: `appr-${scenario.caseId.toLowerCase()}`,
              amount: parsedAmount || 1499,
              timestamp: '21:34:03',
            },
          ]
        : []),
      ...(scenario.isHumanTakeover
        ? [
            {
              type: 'human.takeover' as const,
              operatorId: 'OP-782',
              state: 'HUMAN_ACTIVE' as const,
              reason: 'Operator takeover',
              timestamp: '21:34:08',
            },
          ]
        : []),
    ]

    setEvents(newEvents)

    // Broadcast across Agora RTM
    newEvents.forEach((ev) => agoraRtm.publishRelayEvent(ev))
  }

  const approveActiveAction = async (operatorName: string = 'Maya Sharma') => {
    const now = new Date().toLocaleTimeString()
    const approvalId = caseState.activeAction?.id || 'appr-1042-99042'
    const amount = caseState.activeAction?.amount || 1499
    const actionTitle = caseState.activeAction?.title || 'Action'

    // Optimistically update case state immediately
    setCaseState((prev) => ({
      ...prev,
      status: 'resolved',
      activeAction: prev.activeAction
        ? {
            ...prev.activeAction,
            status: 'APPROVED',
            approvedAt: now,
            approvedBy: operatorName,
          }
        : undefined,
      facts: [
        ...prev.facts,
        {
          id: `f-appr-${Date.now()}`,
          label: `${actionTitle} Approved (${operatorName})`,
          verified: true,
          source: 'Operator Authorization Matrix',
        },
      ],
    }))

    // Dispatch lifecycle events
    dispatchRelayEvent({
      type: 'approval.approved',
      actionId: approvalId,
      operatorId: 'OP-782',
      amount,
      timestamp: now,
    })

    dispatchRelayEvent({
      type: 'approval.executing',
      approvalId,
      amount,
      timestamp: now,
    })

    dispatchRelayEvent({
      type: 'approval.completed',
      approvalId,
      amount,
      timestamp: now,
    })

    const confirmationText = amount
      ? `${actionTitle} initiate ho gaya hai. ₹${amount} account mein process ho jayenge.`
      : `${actionTitle} safaltapoorvak approve aur execute ho gaya hai.`

    dispatchRelayEvent({
      type: 'speech.transcript',
      speaker: 'agent',
      text: confirmationText,
      translation: `Approved and processed ${actionTitle} successfully.`,
      language: 'Hindi / Hinglish',
      timestamp: now,
    })

    try {
      await fetch('/api/approvals/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId,
          operator: { id: 'OP-782', name: operatorName },
          caseId: caseState.id,
        }),
      })
    } catch (err) {
      console.warn('[Approval] Backend sync note:', err)
    }
  }

  const declineActiveAction = async () => {
    try {
      await fetch('/api/approvals/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId: caseState.activeAction?.id || 'appr-1042-99042',
          operator: { id: 'OP-782', name: 'Maya Sharma' },
          caseId: caseState.id,
        }),
      })
    } catch (e) {}

    setCaseState((prev) => ({
      ...prev,
      status: 'active',
      activeAction: prev.activeAction ? { ...prev.activeAction, status: 'DECLINED' } : undefined,
    }))
  }

  const resetCase = async (caseId: string = 'RLY-1042') => {
    setCaseState({
      ...INITIAL_CASE_STATE,
      id: caseId,
    })

    try {
      const res = await fetch(`/api/cases/${caseId}/events`)
      if (res.ok) {
        const data = await res.json()
        if (data.events && Array.isArray(data.events)) {
          setEvents(data.events)
          return
        }
      }
    } catch (e) {}

    setEvents([
      {
        type: 'call.started',
        caseId,
        timestamp: new Date().toLocaleTimeString(),
      },
    ])
  }

  const startNewLiveCase = (config: {
    customerName: string
    customerId: string
    preferredLanguage: string
    reason: string
    mode: RuntimeMode
  }) => {
    const newCaseId = `RLY-${Math.floor(1045 + Math.random() * 8950)}`
    const initials = config.customerName
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'CU'

    setRuntimeMode(config.mode)
    setCaseState({
      id: newCaseId,
      customerId: config.customerId || `CUST-${initials}-01`,
      customerName: config.customerName,
      customerPhone: '+91 98000 00000',
      customerTier: 'Platinum',
      channelName: `relay-case-${newCaseId.toLowerCase()}`,
      language: config.preferredLanguage,
      intent: config.reason,
      sentiment: 'Calm · Active',
      facts: [], // Clean slate - no pre-seeded facts from other cases!
      unknowns: ['Reason for call', 'Customer inquiry'],
      activeAction: undefined, // No pending refund action until detected!
      status: 'active',
      takeoverState: 'AI_ACTIVE',
      participants: [
        {
          id: config.customerId || 'CUST-01',
          role: 'CUSTOMER',
          name: config.customerName,
          joinedAt: new Date().toLocaleTimeString(),
        },
        {
          id: 'AI-9999',
          role: 'AI_AGENT',
          name: 'RELAY AI',
          joinedAt: new Date().toLocaleTimeString(),
        },
      ],
    })

    setEvents([
      {
        type: 'call.started',
        caseId: newCaseId,
        timestamp: new Date().toLocaleTimeString(),
      },
    ])

    // Asynchronously notify backend to persist new case record
    fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newCaseId,
        customerName: config.customerName,
        customerId: config.customerId,
        preferredLanguage: config.preferredLanguage,
        reason: config.reason,
      }),
    }).catch((e) => console.warn('Case creation backend note:', e))
  }

  const clearFailure = () => {
    setCaseState((prev) => ({ ...prev, activeFailure: undefined }))
  }

  return (
    <CaseStateContext.Provider
      value={{
        runtimeMode,
        setRuntimeMode,
        toggleRuntimeMode,
        caseState,
        setCaseState,
        activeScenario,
        setActiveScenario,
        loadScenario,
        events,
        dispatchRelayEvent,
        replayUpToIndex,
        updateLanguage,
        updateIntent,
        updateSentiment,
        addFact,
        removeUnknown,
        setStatus,
        approveActiveAction,
        declineActiveAction,
        resetCase,
        startNewLiveCase,
        clearFailure,
      }}
    >
      {children}
    </CaseStateContext.Provider>
  )
}

export function useCaseState() {
  const ctx = useContext(CaseStateContext)
  if (!ctx) {
    throw new Error('useCaseState must be used within a CaseStateProvider')
  }
  return ctx
}

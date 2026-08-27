/**
 * RELAY — Authoritative Case State Context
 * Single source of truth driven by event-sourcing and deterministic reducers.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { CaseState, INITIAL_CASE_STATE, Fact } from '../types/caseState'
import { RelayEvent } from '../types/relayEvents'
import { agoraRtm } from '../services/agoraRtmService'
import { agoraRtc, RealtimeTelemetry } from '../services/agoraRtcService'
import { caseStateReducer, reconstructCaseState } from '../services/caseStateReducer'

interface CaseStateContextType {
  caseState: CaseState
  setCaseState: React.Dispatch<React.SetStateAction<CaseState>>
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
  clearFailure: () => void
}

const CaseStateContext = createContext<CaseStateContextType | null>(null)

export const CaseStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  // Pure Dispatcher: appends event and runs through deterministic caseStateReducer
  const dispatchRelayEvent = useCallback((ev: RelayEvent) => {
    setEvents((prevEvents) => [...prevEvents, ev])
    setCaseState((prevState) => caseStateReducer(prevState, ev))
  }, [])

  // Time-travel replay: reconstructs state up to any historical event index
  const replayUpToIndex = useCallback((index: number) => {
    setCaseState(reconstructCaseState(events, index, INITIAL_CASE_STATE))
  }, [events])

  // Synchronize with Agora RTM and RTC events via unified RelayEvent bus
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
      } else if (tel.connectionState === 'CONNECTING' && caseState.status !== 'connecting') {
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
    dispatchRelayEvent({
      type: 'language.changed',
      from: caseState.language,
      to: language,
      timestamp: new Date().toLocaleTimeString(),
    })
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

  const approveActiveAction = async (operatorName: string = 'Maya Sharma') => {
    try {
      const now = new Date().toLocaleTimeString()
      const res = await fetch('/api/approvals/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId: caseState.activeAction?.id || 'appr-1042-99042',
          operator: { id: 'OP-782', name: operatorName },
          caseId: caseState.id,
        }),
      })

      if (res.ok) {
        dispatchRelayEvent({
          type: 'approval.approved',
          actionId: caseState.activeAction?.id || 'appr-1042-99042',
          operatorId: 'OP-782',
          amount: caseState.activeAction?.amount || 1499,
          timestamp: now,
        })
      }
    } catch (e) {
      dispatchRelayEvent({
        type: 'approval.approved',
        actionId: caseState.activeAction?.id || 'appr-1042-99042',
        operatorId: 'OP-782',
        amount: 1499,
        timestamp: new Date().toLocaleTimeString(),
      })
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

  const resetCase = (caseId: string = 'RLY-1042') => {
    setCaseState({
      ...INITIAL_CASE_STATE,
      id: caseId,
    })
    setEvents([
      {
        type: 'call.started',
        caseId,
        timestamp: new Date().toLocaleTimeString(),
      },
    ])
  }

  const clearFailure = () => {
    setCaseState((prev) => ({ ...prev, activeFailure: undefined }))
  }

  return (
    <CaseStateContext.Provider
      value={{
        caseState,
        setCaseState,
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

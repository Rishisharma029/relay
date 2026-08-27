/**
 * RELAY — Authoritative Case State Context
 * Single source of truth across all workspaces, views, and panes.
 */

import React, { createContext, useContext, useState, useEffect } from 'react'
import { CaseState, INITIAL_CASE_STATE, Fact } from '../types/caseState'
import { agoraRtm } from '../services/agoraRtmService'
import { agoraRtc, RealtimeTelemetry } from '../services/agoraRtcService'

interface CaseStateContextType {
  caseState: CaseState
  setCaseState: React.Dispatch<React.SetStateAction<CaseState>>
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

  // Synchronize with Agora RTM and RTC events via unified RelayEvent bus
  useEffect(() => {
    const unsubRelay = agoraRtm.subscribeRelayEvents((ev) => {
      switch (ev.type) {
        case 'call.started':
          setCaseState((prev) => ({ ...prev, id: ev.caseId, status: 'active' }))
          break
        case 'speech.transcript':
          if (ev.language && ev.language !== caseState.language) {
            setCaseState((prev) => ({ ...prev, language: ev.language }))
          }
          break
        case 'language.changed':
          setCaseState((prev) => ({ ...prev, language: ev.to }))
          break
        case 'approval.created':
          setCaseState((prev) => ({ ...prev, status: 'awaiting_approval' }))
          break
        case 'approval.approved':
          setCaseState((prev) => ({
            ...prev,
            status: 'resolved',
            activeAction: prev.activeAction
              ? { ...prev.activeAction, status: 'APPROVED', approvedAt: ev.timestamp, approvedBy: ev.operatorId }
              : undefined,
          }))
          break
        case 'human.takeover':
          setCaseState((prev) => {
            const nextState = ev.state || (prev.takeoverState === 'AI_ACTIVE' ? 'HUMAN_ACTIVE' : 'AI_ACTIVE')
            return {
              ...prev,
              takeoverState: nextState,
              status: nextState === 'HUMAN_ACTIVE' || nextState === 'TAKEOVER_REQUESTED' ? 'human_takeover' : 'active',
            }
          })
          break
        // ── Failure Events ────────────────────────────────────────────────
        case 'failure.tool_timeout':
          setCaseState((prev) => ({
            ...prev,
            activeFailure: {
              state:       ev.state as any,
              message:     `Tool ${ev.tool} timed out (attempt ${ev.attempt}/${ev.maxAttempts})`,
              attempt:     ev.attempt,
              maxAttempts: ev.maxAttempts,
              escalate:    ev.attempt >= ev.maxAttempts,
              timestamp:   ev.timestamp,
              recovery:    ev.recovery,
            },
          }))
          break
        case 'failure.llm_timeout':
          setCaseState((prev) => ({
            ...prev,
            activeFailure: {
              state:     ev.state as any,
              message:   'AI processing timeout. Retrying...',
              timestamp: ev.timestamp,
              recovery:  ev.recovery,
            },
          }))
          break
        case 'failure.agora_disconnect':
          setCaseState((prev) => ({
            ...prev,
            status:       'connecting',
            activeFailure: {
              state:     ev.state as any,
              message:   `Audio disconnected. Reconnect attempt ${ev.reconnectAttempt}...`,
              timestamp: ev.timestamp,
              recovery:  ev.recovery,
            },
          }))
          break
        case 'failure.asr_failure':
        case 'failure.tts_failure':
          setCaseState((prev) => ({
            ...prev,
            activeFailure: {
              state:     ev.state as any,
              message:   ev.reason,
              timestamp: ev.timestamp,
              recovery:  ev.recovery,
            },
          }))
          break
        case 'failure.db_unavailable':
          setCaseState((prev) => ({
            ...prev,
            activeFailure: {
              state:     ev.state as any,
              message:   'Database unavailable. Read-only mode active.',
              timestamp: ev.timestamp,
              recovery:  ev.recovery,
            },
          }))
          break
        case 'failure.approval_expired':
          setCaseState((prev) => ({
            ...prev,
            activeFailure: {
              state:     ev.state as any,
              message:   'Approval window expired. A new request has been created.',
              timestamp: ev.timestamp,
              recovery:  ev.recovery,
            },
          }))
          break
        case 'failure.approval_duplicate':
          setCaseState((prev) => ({
            ...prev,
            activeFailure: {
              state:     ev.state as any,
              message:   'Duplicate prevented. This refund was already processed.',
              timestamp: ev.timestamp,
              recovery:  ev.recovery,
            },
          }))
          break
        case 'failure.token_expired':
          setCaseState((prev) => ({
            ...prev,
            activeFailure: {
              state:     ev.state as any,
              message:   'Token refreshing. Call will not be interrupted.',
              timestamp: ev.timestamp,
              recovery:  ev.recovery,
            },
          }))
          break
        case 'failure.customer_disconnect':
          setCaseState((prev) => ({
            ...prev,
            status:       'resolved',
            activeFailure: {
              state:     ev.state as any,
              message:   'Customer disconnected. Case preserved.',
              timestamp: ev.timestamp,
              recovery:  ev.recovery,
            },
          }))
          break
        case 'failure.human_disconnect':
          setCaseState((prev) => ({
            ...prev,
            takeoverState: 'AI_ACTIVE',
            status:        'active',
            activeFailure: {
              state:     ev.state as any,
              message:   'Operator disconnected. AI agent resumed.',
              timestamp: ev.timestamp,
              recovery:  ev.recovery,
            },
          }))
          break
        case 'failure.escalation_required':
          setCaseState((prev) => ({
            ...prev,
            activeFailure: {
              state:     (ev.state || ev.failureState) as any,
              message:   `Escalating: ${ev.reason}`,
              escalate:  true,
              timestamp: ev.timestamp,
              recovery:  ev.recovery,
            },
          }))
          break
      }
    })

    const unsubRtc = agoraRtc.subscribeTelemetry((tel: RealtimeTelemetry) => {
      if (tel.isHumanTakeover && caseState.takeoverState !== 'HUMAN_ACTIVE') {
        setCaseState((prev) => ({ ...prev, takeoverState: 'HUMAN_ACTIVE', status: 'human_takeover' }))
      } else if (!tel.isHumanTakeover && caseState.takeoverState === 'HUMAN_ACTIVE') {
        setCaseState((prev) => ({ ...prev, takeoverState: 'AI_ACTIVE', status: 'active' }))
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
  }, [caseState.language, caseState.status])

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

  const approveActiveAction = async (operatorName: string = 'Maya Sharma') => {
    try {
      const now = new Date().toLocaleTimeString()
      await fetch('/api/approvals/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId: caseState.activeAction?.id || 'appr-1042-99042',
          operator: { id: 'OP-782', name: operatorName },
        }),
      })

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
      }))
    } catch (e) {
      setCaseState((prev) => ({
        ...prev,
        status: 'resolved',
        activeAction: prev.activeAction ? { ...prev.activeAction, status: 'APPROVED' } : undefined,
      }))
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
  }

  const clearFailure = () => {
    setCaseState((prev) => ({ ...prev, activeFailure: undefined }))
  }

  return (
    <CaseStateContext.Provider
      value={{
        caseState,
        setCaseState,
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

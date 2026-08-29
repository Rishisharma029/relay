import React, { useState, useEffect, useRef } from 'react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { WaveformMonitor } from './WaveformMonitor'
import { CallStateSimulator } from './CallStateSimulator'
import { CallState, CALL_STATES_META } from '../../types/callState'
import { VoiceControlsBar } from './VoiceControlsBar'
import { EventProofModal, ProofEvent } from './EventProofModal'
import {
  Languages,
  Radio,
  ArrowUpDown,
  Wrench,
  Play,
  AlertTriangle,
  AlertOctagon,
  Copy,
  Check,
  Loader2,
  Mic,
  MicOff,
  RotateCcw
} from 'lucide-react'

import { soundEffects } from '../../utils/soundEffects'
import { agoraRtc } from '../../services/agoraRtcService'
import { agoraRtm } from '../../services/agoraRtmService'
import { speechService } from '../../services/speechRecognitionService'
import { useCaseState } from '../../contexts/CaseStateContext'
import { RelayEvent } from '../../types/relayEvents'
import { DEMO_SCENARIOS } from '../../data/demoScenarios'

interface LiveConversationPaneProps {
  isHumanTakeover: boolean
  onToggleTakeover: () => void
  onViewCase?: (caseId: string) => void
  onStartNewCall?: () => void
}

interface TranscriptItem {
  id: string
  timestamp: string
  speaker: 'CUSTOMER' | 'RELAY' | 'OPERATOR'
  content: string
  translation?: string
  language?: string
  isBargeIn?: boolean
  isTool?: boolean
  toolName?: string
  status?: string
  isLanguageSwitch?: boolean
  switchFrom?: string
  switchTo?: string
}

export type AiWorkingState = 'Listening...' | 'Understanding...' | 'Checking order...' | 'Waiting for approval...' | 'Executing action...' | 'Idle'

export const LiveConversationPane: React.FC<LiveConversationPaneProps> = ({
  isHumanTakeover,
  onToggleTakeover,
  onViewCase,
  onStartNewCall,
}) => {
  const { caseState, resetCase, clearFailure, runtimeMode, activeScenario, loadScenario } = useCaseState()
  const [callState, setCallState] = useState<CallState>('RELAY_LISTENING')
  const [isAiPaused, setIsAiPaused] = useState<boolean>(false)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [showEvaluatorTools, setShowEvaluatorTools] = useState<boolean>(false)
  const [copiedPhrase, setCopiedPhrase] = useState<boolean>(false)
  const [caseStatus, setCaseStatus] = useState<'creating' | 'created'>('created')
  const [reconnectAttempt, setReconnectAttempt] = useState<number>(2)
  const [currentLanguageMode, setCurrentLanguageMode] = useState<string>('Hindi → English')
  const [aiWorkingState, setAiWorkingState] = useState<AiWorkingState>('Listening...')
  const [customUtterance, setCustomUtterance] = useState<string>('')

  const [agentGender, setAgentGender] = useState<'female' | 'male'>('female')

  // Proof Layer Modal State (Section 3)
  const [isProofModalOpen, setIsProofModalOpen] = useState<boolean>(false)
  const [selectedProofEvent, setSelectedProofEvent] = useState<ProofEvent | null>(null)

  const openProofInspector = (event: ProofEvent) => {
    setSelectedProofEvent(event)
    setIsProofModalOpen(true)
  }

  const handleToggleMute = () => {
    const next = !isMuted
    setIsMuted(next)
    agoraRtc.toggleMute()
    if (next) {
      speechService.stopListening()
    } else {
      speechService.startListening()
    }
  }

  const [transcript, setTranscript] = useState<TranscriptItem[]>([
    {
      id: 'greeting-0',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      speaker: 'RELAY',
      content: '"Hi, I\'m RELAY. How can I help you today?"',
      translation:
        agentGender === 'male'
          ? 'Namaste, main RELAY hoon. Main aapki kya madad kar sakta hoon?'
          : 'Namaste, main RELAY hoon. Main aapki kya madad kar sakti hoon?',
      language: 'English / Hindi',
    },
  ])

  // REAL-TIME SPEECH & FUNCTION CALLING DISPATCHER
  const isProcessingTurn = useRef<boolean>(false)

  const handleProcessSpokenUtterance = async (utterance: string) => {
    if (!utterance || !utterance.trim() || isProcessingTurn.current) return
    if (speechService.isSpeakingTTS()) return

    isProcessingTurn.current = true

    const cleanText = utterance.trim()
    const isHindi =
      cleanText.includes('Mera') ||
      cleanText.includes('chahiye') ||
      cleanText.includes('aaya') ||
      cleanText.includes('karo') ||
      cleanText.includes('hai') ||
      cleanText.includes('nahi')

    const userItem: TranscriptItem = {
      id: `cust-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      speaker: 'CUSTOMER',
      content: cleanText.startsWith('"') ? cleanText : `"${cleanText}"`,
      translation: isHindi
        ? cleanText.includes('refund')
          ? 'I want a refund.'
          : "My order hasn't arrived for 5 days."
        : undefined,
      language: isHindi ? 'Hindi' : 'English',
    }

    setTranscript((prev) => [...prev, userItem])
    setCallState('RELAY_SPEAKING')
    setAiWorkingState('Understanding...')

    try {
      const res = await fetch('/api/agent/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utterance: cleanText,
          caseId: caseState.id,
          customerName: currentCustomerName,
          agentGender,
        }),
      })

      if (res.ok) {
        const data = await res.json()

        // 1. Tool executions
        if (data.toolsCalled && Array.isArray(data.toolsCalled)) {
          data.toolsCalled.forEach((tool: string) => {
            const toolItem: TranscriptItem = {
              id: `tool-${Date.now()}-${Math.random()}`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              speaker: 'RELAY',
              content: `${tool}() → SUCCESS (184ms)`,
              isTool: true,
              toolName: `${tool}()`,
              status: 'SUCCESS',
            }
            setTranscript((prev) => [...prev, toolItem])
          })
        }

        // 2. Language shift notification
        if (data.languageShift?.shifted) {
          setCurrentLanguageMode(`${data.languageShift.from} → ${data.languageShift.to}`)
        }

        // 3. Agent response transcript
        if (data.agentResponse) {
          const agentItem: TranscriptItem = {
            id: `agent-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            speaker: 'RELAY',
            content: `"${data.agentResponse}"`,
            translation: data.agentTranslation,
            language: data.activeLanguage === 'en-IN' ? 'English' : 'Hindi',
          }
          setTranscript((prev) => [...prev, agentItem])

          // Audible TTS Speech Synthesis through Speakers with strict gender voice matching!
          speechService.speak(
            data.agentResponse,
            data.activeLanguage || 'hi-IN',
            agentGender,
            () => {
              if (data.intent === 'refund_request' || data.events?.some((e: any) => e.type === 'approval.created')) {
                setCallState('WAITING_FOR_APPROVAL')
                setAiWorkingState('Waiting for approval...')
              } else {
                setCallState('RELAY_LISTENING')
                setAiWorkingState('Listening...')
              }
              isProcessingTurn.current = false
            },
            () => {
              setCallState('RELAY_SPEAKING')
            }
          )
        } else {
          if (data.intent === 'refund_request' || data.events?.some((e: any) => e.type === 'approval.created')) {
            setCallState('WAITING_FOR_APPROVAL')
            setAiWorkingState('Waiting for approval...')
          } else {
            setCallState('RELAY_LISTENING')
            setAiWorkingState('Listening...')
          }
          isProcessingTurn.current = false
        }
      } else {
        isProcessingTurn.current = false
      }
    } catch (err) {
      console.error('[Agent] Turn processing error:', err)
      setCallState('RELAY_LISTENING')
      setAiWorkingState('Listening...')
      isProcessingTurn.current = false
    }
  }

  // Dynamic Turn-by-Turn Scenario Playback Engine
  const scenarioTimersRef = useRef<NodeJS.Timeout[]>([])
  const [isPlayingScenario, setIsPlayingScenario] = useState<boolean>(false)

  const clearScenarioTimers = () => {
    scenarioTimersRef.current.forEach((t) => clearTimeout(t))
    scenarioTimersRef.current = []
    setIsPlayingScenario(false)
  }

  // Fast skip to fully loaded state
  const skipToScenarioEnd = (scenario: (typeof DEMO_SCENARIOS)[0]) => {
    clearScenarioTimers()
    setTranscript(
      scenario.transcript.map((item) => ({
        id: item.id,
        timestamp: item.timestamp,
        speaker: item.speaker === 'MAYA' ? 'OPERATOR' : item.speaker === 'CUSTOMER' ? 'CUSTOMER' : 'RELAY',
        content: item.content,
        translation: item.translation,
        language: item.language,
        isTool: item.isTool,
        toolName: item.toolName,
        status: item.status,
      }))
    )
    setCallState(scenario.callState)
    setCurrentLanguageMode(scenario.language)
    setIsAiPaused(false)
    if (scenario.callState === 'WAITING_FOR_APPROVAL') {
      setAiWorkingState('Waiting for approval...')
    } else if (scenario.callState === 'TOOL_EXECUTING') {
      setAiWorkingState('Checking order...')
    } else if (scenario.callState === 'TOOL_ERROR') {
      setAiWorkingState('Idle')
    } else {
      setAiWorkingState('Listening...')
    }
  }

  const playScenarioTurnByTurn = (scenario: (typeof DEMO_SCENARIOS)[0]) => {
    clearScenarioTimers()
    setIsPlayingScenario(true)

    // 1. Initial greeting
    const greetingItem: TranscriptItem = {
      id: `greeting-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      speaker: 'RELAY',
      content: '"Hi, I\'m RELAY. How can I help you today?"',
      translation:
        agentGender === 'male'
          ? 'Namaste, main RELAY hoon. Main aapki kya madad kar sakta hoon?'
          : 'Namaste, main RELAY hoon. Main aapki kya madad kar sakti hoon?',
      language: 'English / Hindi',
    }

    setTranscript([greetingItem])
    setCallState('RELAY_LISTENING')
    setAiWorkingState('Listening...')
    setCurrentLanguageMode(scenario.language)
    setIsAiPaused(false)

    let accumulatedDelay = 700 // initial customer speak offset

    scenario.transcript.forEach((item) => {
      const isCustomer = item.speaker === 'CUSTOMER'
      const isTool = item.isTool
      const isRelay = item.speaker === 'RELAY' && !item.isTool
      const isOperator = item.speaker === 'MAYA'

      // Schedule turn
      const timer = setTimeout(() => {
        const mappedItem: TranscriptItem = {
          id: `${item.id}-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          speaker: isOperator ? 'OPERATOR' : isCustomer ? 'CUSTOMER' : 'RELAY',
          content: item.content,
          translation: item.translation,
          language: item.language,
          isTool: item.isTool,
          toolName: item.toolName,
          status: item.status,
        }

        setTranscript((prev) => [...prev, mappedItem])

        if (isCustomer) {
          setCallState('CUSTOMER_SPEAKING')
          setAiWorkingState('Listening...')
        } else if (isTool) {
          setCallState('TOOL_EXECUTING')
          setAiWorkingState('Checking order...')
          try {
            soundEffects.playToolExecuted()
          } catch (e) {}
        } else if (isRelay) {
          setCallState('RELAY_SPEAKING')
          setAiWorkingState('Executing action...')
          const cleanText = item.content.replace(/^"|"$/g, '')
          const lang = item.language?.toLowerCase().includes('hindi') ? 'hi-IN' : 'en-IN'
          try {
            speechService.speak(
              cleanText,
              lang,
              agentGender,
              () => {
                setCallState('RELAY_LISTENING')
                setAiWorkingState('Listening...')
              },
              () => {
                setCallState('RELAY_SPEAKING')
              }
            )
          } catch (e) {}
        } else if (isOperator) {
          setCallState('HUMAN_ACTIVE')
          setAiWorkingState('Listening...')
          try {
            soundEffects.playHumanTakeover()
          } catch (e) {}
        }
      }, accumulatedDelay)

      scenarioTimersRef.current.push(timer)

      // Add realistic duration for each turn
      if (isCustomer) {
        accumulatedDelay += 1800
      } else if (isTool) {
        accumulatedDelay += 1100
      } else if (isRelay) {
        accumulatedDelay += 2400
      } else {
        accumulatedDelay += 1800
      }
    })

    // End of scenario lifecycle transition
    const finalTimer = setTimeout(() => {
      setCallState(scenario.callState)
      setIsPlayingScenario(false)

      if (scenario.callState === 'WAITING_FOR_APPROVAL') {
        setAiWorkingState('Waiting for approval...')
        try {
          soundEffects.playApprovalRequested()
        } catch (e) {}
      } else if (scenario.callState === 'HUMAN_ACTIVE') {
        setAiWorkingState('Listening...')
        try {
          soundEffects.playHumanTakeover()
        } catch (e) {}
      } else if (scenario.callState === 'TOOL_ERROR') {
        setAiWorkingState('Idle')
      } else {
        setAiWorkingState('Listening...')
      }
    }, accumulatedDelay + 400)

    scenarioTimersRef.current.push(finalTimer)
  }

  // Play turn-by-turn animation whenever activeScenario changes
  useEffect(() => {
    if (activeScenario && activeScenario.caseId === caseState.id && activeScenario.transcript.length > 0) {
      playScenarioTurnByTurn(activeScenario)
    } else {
      clearScenarioTimers()
      setTranscript([
        {
          id: `greeting-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          speaker: 'RELAY',
          content: '"Hi, I\'m RELAY. How can I help you today?"',
          translation:
            agentGender === 'male'
              ? 'Namaste, main RELAY hoon. Main aapki kya madad kar sakta hoon?'
              : 'Namaste, main RELAY hoon. Main aapki kya madad kar sakti hoon?',
          language: 'English / Hindi',
        },
      ])
      setCallState('RELAY_LISTENING')
      setIsAiPaused(false)
      setAiWorkingState('Listening...')
    }

    return () => {
      clearScenarioTimers()
    }
  }, [activeScenario, caseState.id, agentGender])

  // Listen for Operator Approval in Case State and immediately resolve WAITING_FOR_APPROVAL
  const lastAnnouncedActionKey = useRef<string | null>(null)
  useEffect(() => {
    if (caseState.activeAction?.status === 'APPROVED' || caseState.status === 'resolved') {
      const actionKey = `${caseState.id}-${caseState.activeAction?.id || 'approved'}`
      if (lastAnnouncedActionKey.current === actionKey) return
      lastAnnouncedActionKey.current = actionKey

      setCallState('RELAY_SPEAKING')
      setAiWorkingState('Executing action...')
      try {
        soundEffects.playToolExecuted()
      } catch (e) {}

      const isEn = currentLanguageMode.includes('English')
      const actionTitle = caseState.activeAction?.title || 'Action'
      const amountStr = caseState.activeAction?.amount ? `₹${caseState.activeAction.amount}` : ''
      
      const approvedMsg = isEn
        ? `Supervisor Maya Sharma has approved the ${actionTitle} ${amountStr ? `of ${amountStr}` : ''}. The resolution has been committed successfully.`
        : agentGender === 'male'
        ? `Supervisor ne ${actionTitle} ${amountStr ? `${amountStr}` : ''} approve kar diya hai. Action process ho gaya hai.`
        : `Supervisor ne ${actionTitle} ${amountStr ? `${amountStr}` : ''} approve kar di hai. Action process ho gaya hai.`

      const approvedTranslation = isEn
        ? undefined
        : `Supervisor has approved ${actionTitle}. Action executed.`

      setTranscript((prev) => [
        ...prev,
        {
          id: `appr-done-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          speaker: 'RELAY',
          content: `"${approvedMsg}"`,
          translation: approvedTranslation,
          language: isEn ? 'English' : 'Hindi',
        },
      ])

      speechService.speak(
        approvedMsg,
        isEn ? 'en-IN' : 'hi-IN',
        agentGender,
        () => {
          setCallState('RELAY_LISTENING')
          setAiWorkingState('Listening...')
        },
        () => {
          setCallState('RELAY_SPEAKING')
        }
      )
    }
  }, [caseState.activeAction?.status, caseState.activeAction?.id, caseState.status, caseState.id, agentGender, currentLanguageMode])

  // Continuous Speech Recognition (ASR) Listener + Active Speaking Detector
  useEffect(() => {
    speechService.startListening()

    const unsubSpeech = speechService.subscribe((payload) => {
      if (payload.isFinal && payload.text) {
        // Prevent feedback loop: strictly ignore microphone when RELAY is synthesizing speech, playing scenario, or in tool execution
        if (speechService.isSpeakingTTS() || isPlayingScenario) {
          return
        }
        handleProcessSpokenUtterance(payload.text)
      }
    })

    const unsubSpeaking = speechService.subscribeSpeaking((isSpeaking) => {
      if (isSpeaking) {
        setCallState((curr) => {
          if (
            curr === 'HUMAN_ACTIVE' ||
            curr === 'HUMAN_TAKEOVER' ||
            curr === 'RECONNECTING' ||
            curr === 'CALL_ENDED' ||
            curr === 'TOOL_EXECUTING' ||
            curr === 'WAITING_FOR_APPROVAL'
          ) {
            return curr
          }
          return 'CUSTOMER_SPEAKING'
        })
      } else {
        setCallState((curr) => (curr === 'CUSTOMER_SPEAKING' ? 'RELAY_LISTENING' : curr))
      }
    })

    return () => {
      unsubSpeech()
      unsubSpeaking()
      speechService.stopListening()
    }
  }, [caseState.id])

  // AGORA RTC & RTM LIFECYCLE: Audio Channel + Event Bus
  useEffect(() => {
    const channel = caseState.channelName || 'relay-case-1042'
    agoraRtc.joinAndStart(channel)
    agoraRtm.loginAndJoin(channel)

    // Subscribe to Agora RTM Event Bus via unified RelayEvents
    const unsubRelay = agoraRtm.subscribeRelayEvents((ev: RelayEvent) => {
      if (ev.type === 'speech.transcript') {
        const speaker = ev.speaker.toUpperCase() === 'CUSTOMER' ? 'CUSTOMER' : 'RELAY'
        const item: TranscriptItem = {
          id: ev.id || `re-${Date.now()}`,
          timestamp: ev.timestamp,
          speaker,
          content: ev.text.startsWith('"') ? ev.text : `"${ev.text}"`,
          translation: ev.translation,
          language: ev.language || 'English',
        }
        setTranscript((prev) => [...prev, item])
      } else if (ev.type === 'language.changed') {
        const item: TranscriptItem = {
          id: ev.id || `re-${Date.now()}`,
          timestamp: ev.timestamp,
          speaker: 'RELAY',
          content: `Detected language change: ${ev.from} → ${ev.to}`,
          isLanguageSwitch: true,
          switchFrom: ev.from,
          switchTo: ev.to,
        }
        setTranscript((prev) => [...prev, item])
      } else if (ev.type === 'tool.completed') {
        const toolItem: TranscriptItem = {
          id: ev.id || `re-${Date.now()}`,
          timestamp: ev.timestamp,
          speaker: 'RELAY',
          content: `${ev.tool}() → COMPLETED (${ev.durationMs}ms)`,
          isTool: true,
          toolName: `${ev.tool}()`,
          status: 'SUCCESS',
        }
        setTranscript((prev) => [...prev, toolItem])
      } else if (ev.type === 'approval.created') {
        setCallState('WAITING_FOR_APPROVAL')
        setAiWorkingState('Waiting for approval...')
      } else if (ev.type === 'approval.approved') {
        setCallState('CALL_ENDED')
      }
    })

    const unsubInterruption = agoraRtc.subscribeInterruption(() => {
      setCallState('CUSTOMER_INTERRUPTED')
      setTimeout(() => {
        setCallState('RELAY_LISTENING')
      }, 2800)
    })

    return () => {
      unsubRelay()
      unsubInterruption()
      agoraRtc.leaveAndCleanup()
      agoraRtm.leaveAndLogout()
    }
  }, [caseState.channelName])

  // Sync takeover prop with CallState and play sound cue
  useEffect(() => {
    if (isHumanTakeover) {
      setCallState('HUMAN_ACTIVE')
      agoraRtc.setHumanTakeover(true)
      soundEffects.playHumanTakeover()
    } else if (callState === 'HUMAN_ACTIVE' || callState === 'HUMAN_TAKEOVER') {
      setCallState('RELAY_LISTENING')
      agoraRtc.setHumanTakeover(false)
    }
  }, [isHumanTakeover])

  // SECTION 40: RECONNECTION STATE CYCLE
  useEffect(() => {
    if (callState === 'RECONNECTING') {
      setReconnectAttempt(1)
      const t1 = setTimeout(() => setReconnectAttempt(2), 700)
      const t2 = setTimeout(() => {
        setCallState('CONNECTION_RESTORED')
        soundEffects.playCallConnected()
      }, 1600)
      const t3 = setTimeout(() => {
        setCallState('RELAY_LISTENING')
      }, 3400)

      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
      }
    } else if (callState === 'WAITING_FOR_APPROVAL') {
      soundEffects.playApprovalRequested()
    } else if (callState === 'CALL_ENDED') {
      soundEffects.playCallEnded()
    }
  }, [callState])

  const meta = CALL_STATES_META[callState]

  // Autonomous AI Agent ↔ Tool Calling Loop
  const handleRunWowDemo = async () => {
    const sc = activeScenario || DEMO_SCENARIOS[0]
    setCallState('CUSTOMER_SPEAKING')
    setIsAiPaused(false)
    setAiWorkingState('Listening...')

    const defaultUtterance =
      sc.id === 'payment-failure'
        ? 'My bank account was debited twice for ₹2,499.'
        : sc.id === 'language-switch'
        ? 'Bhaiya actually main Gurgaon mein nahi hoon, mujhe Noida Sector 62 bhejna hai.'
        : sc.id === 'human-takeover'
        ? 'I want to talk to a human supervisor right now.'
        : sc.id === 'tool-failure'
        ? 'Mera package track nahi ho raha hai, error aa raha hai.'
        : sc.id === 'angry-customer'
        ? 'Yeh teesri baar hai jab tumhari service ne mera time waste kiya hai!'
        : 'Mera order 5 din se nahi aaya.'

    try {
      setAiWorkingState('Understanding...')
      const res = await fetch('/api/agent/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utterance: defaultUtterance,
          caseId: caseState.id || sc.caseId,
        }),
      })

      if (res.ok) {
        const data = await res.json()

        // 1. Customer speech event
        if (data.events?.[0]) {
          agoraRtm.publishRelayEvent(data.events[0])
        }

        // 2. Autonomous Tool Invocation decisions
        setTimeout(() => {
          setCallState(sc.callState === 'TOOL_ERROR' ? 'TOOL_ERROR' : 'TOOL_EXECUTING')
          setAiWorkingState(sc.callState === 'TOOL_ERROR' ? 'Idle' : 'Checking order...')
          soundEffects.playToolExecuted()

          const toolCompletedEvent = data.events?.find((e: any) => e.type === 'tool.completed')
          if (toolCompletedEvent) {
            agoraRtm.publishRelayEvent(toolCompletedEvent)
          }
        }, 1000)

        // 3. Approval created event
        setTimeout(() => {
          setCallState(sc.callState)
          if (sc.callState === 'WAITING_FOR_APPROVAL') {
            setAiWorkingState('Waiting for approval...')
            soundEffects.playApprovalRequested()
          } else if (sc.callState === 'HUMAN_ACTIVE') {
            setAiWorkingState('Listening...')
            soundEffects.playHumanTakeover()
          }

          const approvalEvent = data.events?.find((e: any) => e.type === 'approval.created')
          if (approvalEvent) {
            agoraRtm.publishRelayEvent(approvalEvent)
          }
        }, 2200)

        // 4. Agent response synthesis
        setTimeout(() => {
          const agentSpeech = data.events?.find((e: any) => e.speaker === 'agent')
          if (agentSpeech) {
            agoraRtm.publishRelayEvent(agentSpeech)
          }
        }, 3200)
        return
      }
    } catch (err) {
      console.warn('[Autonomous Agent] Fallback loop:', err)
    }

    agoraRtm.publishRelayEvent({
      type: 'speech.transcript',
      speaker: 'customer',
      text: defaultUtterance,
      translation: sc.language.includes('Hindi') ? "My order hasn't arrived for 5 days." : undefined,
      language: sc.language,
      timestamp: new Date().toLocaleTimeString(),
    })
  }

  // Authoritative Dynamic Language Switch without Reload
  const handleRunLanguageSwitchDemo = async () => {
    setCallState('CUSTOMER_SPEAKING')
    setIsAiPaused(false)

    try {
      const res = await fetch('/api/agent/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utterance: "Actually, let's continue in English.",
          caseId: caseState.id || 'RLY-1042',
        }),
      })

      if (res.ok) {
        const data = await res.json()

        // 1. Customer speech event
        if (data.events?.[0]) {
          agoraRtm.publishRelayEvent(data.events[0])
        }

        // 2. Authoritative language.changed event
        setTimeout(() => {
          soundEffects.playToolExecuted()
          setCurrentLanguageMode('Hindi → English (Switched)')

          const langEvent = data.events?.find((e: any) => e.type === 'language.changed')
          if (langEvent) {
            agoraRtm.publishRelayEvent(langEvent)
          }
        }, 500)

        // 3. Agent response in new language (Zero Session Reload)
        setTimeout(() => {
          setCallState('RELAY_SPEAKING')
          const agentSpeech = data.events?.find((e: any) => e.speaker === 'agent')
          if (agentSpeech) {
            agoraRtm.publishRelayEvent(agentSpeech)
          }
        }, 1200)
        return
      }
    } catch (err) {
      console.warn('[Language Switch] Fallback loop:', err)
    }

    agoraRtm.publishRelayEvent({
      type: 'language.changed',
      from: 'hi-IN',
      to: 'en-IN',
      timestamp: new Date().toLocaleTimeString(),
    })
  }

  // Section 34: Auto Case Provisioning simulation
  const handleStartNewCallSession = () => {
    setCaseStatus('creating')
    setCallState('CONNECTING')
    setIsAiPaused(false)
    setTranscript([])

    setTimeout(() => {
      setCaseStatus('created')
      resetCase('RLY-1043')
      setCallState('RELAY_LISTENING')
      soundEffects.playCallConnected()

      agoraRtm.publishEvent('TRANSCRIPT', {
        speaker: 'CUSTOMER',
        text: 'Hi, I need assistance with my subscription invoice.',
        translation: 'Namaste, mujhe apne subscription invoice ke sath madad chahiye.',
        language: 'English',
      })
      onStartNewCall?.()
    }, 1200)
  }

  const isBargeIn = callState === 'CUSTOMER_INTERRUPTED'
  const isOperator = callState === 'HUMAN_ACTIVE' || callState === 'HUMAN_TAKEOVER'

  const currentCustomerName = caseState.customerName || 'Aarav Sharma'
  const currentCustomerInitials =
    currentCustomerName
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'CU'
  const currentCustomerTier = caseState.customerTier
    ? `${caseState.customerTier} Tier`
    : 'Platinum Tier (12 Orders)'

  // Step determination for the Dominant 5-Step Pipeline
  const currentStepNum =
    callState === 'CALL_ENDED'
      ? 5
      : callState === 'WAITING_FOR_APPROVAL'
      ? 4
      : callState === 'TOOL_EXECUTING' || aiWorkingState === 'Checking order...'
      ? 3
      : aiWorkingState === 'Understanding...' || (callState === 'RELAY_SPEAKING' && transcript.length <= 2)
      ? 2
      : 1

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-canvas overflow-hidden">
      {/* 1. ULTRA-COMPACT UNIFIED TOP BAR: CASE INFO + 5-STEP PIPELINE + LANGUAGE & EVALUATOR TOOLS */}
      <div className="bg-canvas-pure border-b border-border-subtle px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 select-none font-mono text-xs">
        {/* Left: Case ID & Intent */}
        <div className="flex items-center gap-2 min-w-0">
          {caseStatus === 'creating' ? (
            <div className="flex items-center gap-1.5 text-ops-warning font-bold animate-pulse text-[11px]">
              <Loader2 className="w-3 h-3 animate-spin text-ops-warning" />
              <span>Creating...</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="font-sans text-[10px] font-semibold text-ink-muted uppercase">CASE</span>
              <span className="font-bold text-xs text-ink-primary font-mono tracking-tight">#{caseState.id}</span>
            </div>
          )}

          <span className="text-border text-xs">/</span>
          <span className="text-xs font-medium text-ink-primary truncate max-w-[140px] sm:max-w-[220px]">
            {caseStatus === 'creating' ? 'Provisioning...' : caseState.intent ? caseState.intent.replace(/_/g, ' ') : 'Customer Support'}
          </span>
          <span className="text-[10px] text-ink-muted hidden md:inline">• SIP_04</span>
        </div>

        {/* Center: Slim 5-Step Pipeline Chips */}
        <div className="hidden lg:flex items-center gap-1 text-[10px]">
          {[
            { num: 1, label: 'SPEAKS' },
            { num: 2, label: 'UNDERSTANDS' },
            { num: 3, label: 'ACTS' },
            { num: 4, label: 'APPROVES' },
            { num: 5, label: 'COMPLETES' },
          ].map((step, idx) => (
            <React.Fragment key={step.num}>
              {idx > 0 && <span className="text-ink-muted text-[9px]">→</span>}
              <div
                className={`px-1.5 py-0.2 rounded-[2px] border transition-all ${
                  currentStepNum === step.num
                    ? 'bg-accent text-white border-accent font-bold shadow-xs'
                    : currentStepNum > step.num
                    ? 'bg-canvas-subtle text-ink-primary border-border-subtle font-medium'
                    : 'bg-canvas-subtle text-ink-muted border-border-subtle opacity-60'
                }`}
              >
                <span>{step.num}. {step.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Right: Language Pill, Status Badge & Tools Toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 text-[10px] bg-canvas-subtle border border-border-subtle px-2 py-0.5 rounded-[3px] text-ink-secondary">
            <Languages className="w-2.5 h-2.5 text-ink-muted" />
            <span>{currentLanguageMode}</span>
          </div>

          {isAiPaused ? (
            <Badge variant="warning" dot size="xs" className="font-mono">RELAY PAUSED</Badge>
          ) : (
            <Badge variant={meta.badgeVariant} dot size="xs" className="font-mono">
              {meta.topBarBadge.replace('● ', '')}
            </Badge>
          )}

          <button
            type="button"
            onClick={() => setShowEvaluatorTools((prev) => !prev)}
            className={`font-mono text-[10px] px-1.5 py-0.5 rounded-[3px] border transition-colors cursor-pointer flex items-center gap-1 ${
              showEvaluatorTools || runtimeMode === 'DEMO'
                ? 'bg-canvas-muted text-ink-primary border-border-strong font-bold'
                : 'bg-canvas-subtle text-ink-muted border-border-subtle hover:text-ink-primary'
            }`}
            title="Toggle Evaluator State Simulator & Demo Tools"
          >
            <span>⚡ Tools</span>
            <span className="text-[8px] opacity-70">{showEvaluatorTools ? '▲' : '▼'}</span>
          </button>
        </div>
      </div>

      {/* EVALUATOR TOOLS & STATE SIMULATOR BAR (CONDITIONAL) */}
      {(showEvaluatorTools || runtimeMode === 'DEMO') && (
        <div className="bg-canvas-subtle border-b border-border-subtle p-2 px-3 flex flex-col gap-2 shrink-0 select-none animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono font-bold text-ink-muted uppercase tracking-wider">
                DEMO AUTOMATION:
              </span>
              <Button
                variant="primary"
                size="xs"
                onClick={handleRunWowDemo}
                className="font-mono text-[10px] gap-1 h-6 px-2 bg-accent text-white font-bold hover:bg-accent-hover cursor-pointer"
                title="Execute the 5-step speech-to-action demonstration"
              >
                <Play className="w-2.5 h-2.5 fill-current" />
                <span>PLAY DEMO LOOP</span>
              </Button>

              <Button
                variant="secondary"
                size="xs"
                onClick={handleRunLanguageSwitchDemo}
                className="font-mono text-[10px] gap-1 h-6 px-2 text-ink-primary border-border-subtle bg-canvas-pure hover:bg-canvas-muted cursor-pointer"
                title="Simulate dynamic mid-call language switch from Hindi to English"
              >
                <Languages className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">SWITCH LANG</span>
              </Button>
            </div>

            <span className="text-[9px] font-mono text-ink-muted hidden md:inline">
              15-State Deterministic Simulator
            </span>
          </div>

          {/* 6 SCENARIOS QUICK BUTTON STRIP & PLAYBACK CONTROLS */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 border-t border-border-subtle/60 pt-1.5">
            <span className="text-[9px] font-mono font-bold text-accent uppercase tracking-wider shrink-0">
              ⚡ SCENARIOS:
            </span>
            {DEMO_SCENARIOS.map((sc, idx) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => loadScenario(sc)}
                className={`px-2 py-0.5 rounded-[2px] font-mono text-[9px] font-bold uppercase transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 shrink-0 ${
                  activeScenario?.id === sc.id
                    ? 'bg-accent text-white shadow-xs'
                    : 'bg-canvas-pure text-ink-primary border border-border-subtle hover:border-accent hover:text-accent'
                }`}
                title={`${sc.title}: ${sc.description}`}
              >
                <span className="opacity-70">{idx + 1}.</span>
                <span>{sc.title}</span>
              </button>
            ))}

            {activeScenario && (
              <div className="flex items-center gap-1 ml-auto shrink-0 pl-2 border-l border-border-subtle">
                <button
                  type="button"
                  onClick={() => playScenarioTurnByTurn(activeScenario)}
                  className="px-1.5 py-0.5 rounded-[2px] font-mono text-[9px] font-bold uppercase bg-canvas-pure text-ink-primary border border-border-subtle hover:border-accent hover:text-accent cursor-pointer flex items-center gap-1"
                  title="Replay this scenario turn-by-turn"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>REPLAY</span>
                </button>

                {isPlayingScenario && (
                  <button
                    type="button"
                    onClick={() => skipToScenarioEnd(activeScenario)}
                    className="px-1.5 py-0.5 rounded-[2px] font-mono text-[9px] font-bold uppercase bg-canvas-pure text-ops-warning border border-ops-warningBorder hover:bg-ops-warningBg cursor-pointer flex items-center gap-1 animate-pulse"
                    title="Skip turn-by-turn animation and show all messages immediately"
                  >
                    <span>⏭ SKIP TO END</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <CallStateSimulator
            currentState={callState}
            onSelectState={(st) => setCallState(st)}
          />
        </div>
      )}

      {/* FAILURE STATE BANNER */}
      {caseState.activeFailure && (
        <div
          className={`flex items-center justify-between gap-3 px-3 py-1.5 border-b font-mono text-xs shrink-0 animate-in slide-in-from-top duration-200 ${
            caseState.activeFailure.escalate
              ? 'bg-ops-criticalBg border-ops-criticalBorder text-ops-critical'
              : 'bg-ops-warningBg border-ops-warningBorder text-ops-warning'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <div>
              <span className="font-bold uppercase tracking-wider">{caseState.activeFailure.state}</span>
              <span className="mx-1.5 text-border">·</span>
              <span>{caseState.activeFailure.message}</span>
            </div>
          </div>
          <button
            onClick={clearFailure}
            className="text-[10px] font-bold opacity-70 hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded border border-current"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* RECONNECTION STATE BANNER */}
      {callState === 'RECONNECTING' && (
        <div className="bg-ops-warningBg border-b border-ops-warningBorder px-3 py-1.5 flex items-center justify-between font-mono text-xs text-ops-warning select-none">
          <div className="flex items-center gap-2 font-bold text-xs tracking-tight uppercase">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>RECONNECTING AGORA AUDIO STREAM...</span>
          </div>
          <span className="font-bold text-xs tabular-nums">Attempt {reconnectAttempt} / 5</span>
        </div>
      )}

      {callState === 'CONNECTION_RESTORED' && (
        <div className="bg-ops-liveBg border-b border-ops-liveBorder px-3 py-1 flex items-center justify-between font-mono text-xs text-ops-live select-none animate-in fade-in duration-150">
          <div className="flex items-center gap-2 font-bold">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>✓ WEBRTC AUDIO RESTORED</span>
          </div>
          <span className="text-[10px] text-ink-muted">Channel Synced</span>
        </div>
      )}

      {/* 2. SECTION 33: END-OF-CALL SUMMARY CARD */}
      {callState === 'CALL_ENDED' ? (
        <div className="flex-1 flex items-center justify-center p-6 bg-canvas-subtle overflow-y-auto">
          <div className="w-full max-w-md bg-canvas-pure border border-border-subtle rounded-[6px] p-6 shadow-hairline space-y-5 font-sans animate-in fade-in duration-200">
            <div className="flex items-start justify-between pb-3 border-b border-border-subtle">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-ops-live" />
                  <h2 className="font-mono text-sm font-bold text-ink-primary tracking-widest uppercase">
                    CALL COMPLETE
                  </h2>
                </div>
                <p className="font-mono text-xs text-ink-muted mt-0.5 tabular-nums">02:41 duration</p>
              </div>
              <Badge variant="live" size="xs" className="font-mono">ARCHIVED</Badge>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <span className="text-[10px] text-ink-muted uppercase block font-semibold tracking-wider">ISSUE</span>
                <span className="text-sm font-bold text-ink-primary block font-sans">Delivery dispute</span>
              </div>
              <div className="h-px bg-border-subtle/70" />
              <div>
                <span className="text-[10px] text-ink-muted uppercase block font-semibold tracking-wider">RESOLUTION</span>
                <span className="text-xs font-bold text-ops-live block">Refund initiated</span>
              </div>
              <div className="h-px bg-border-subtle/70" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-ink-muted uppercase block font-semibold tracking-wider">TOOLS USED</span>
                  <span className="text-sm font-bold text-ink-primary block tabular-nums">4</span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-muted uppercase block font-semibold tracking-wider">HUMAN INTERVENTION</span>
                  <span className="text-sm font-bold text-ink-primary block tabular-nums">1</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border-subtle flex flex-col gap-2 font-mono">
              <Button
                variant="primary"
                size="md"
                onClick={() => onViewCase?.(caseState.id)}
                className="w-full font-mono text-xs font-bold uppercase tracking-wider bg-accent text-white hover:bg-accent-hover justify-center h-9"
              >
                <span>[ ⚡ REPLAY EVIDENCE TIMELINE ]</span>
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onViewCase?.(caseState.id)}
                  className="flex-1 font-mono text-xs font-bold uppercase tracking-wider text-ink-primary hover:bg-canvas-muted"
                >
                  VIEW CASE
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleStartNewCallSession}
                  className="flex-1 font-mono text-xs font-bold uppercase tracking-wider text-ink-primary hover:bg-canvas-muted"
                >
                  START NEW CALL
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* BANNER MESSAGE (IF ANY) */}
          {!isAiPaused && callState !== 'RECONNECTING' && callState !== 'CONNECTION_RESTORED' && meta.bannerMessage && (
            <div
              className={`px-3 py-1 border-b font-mono text-[10px] flex items-center justify-between select-none ${
                meta.bannerMessage.type === 'critical'
                  ? 'bg-ops-criticalBg border-ops-criticalBorder text-ops-critical'
                  : meta.bannerMessage.type === 'warning'
                  ? 'bg-ops-warningBg border-ops-warningBorder text-ops-warning'
                  : 'bg-accent-subtle border-accent-border text-accent'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                {meta.bannerMessage.type === 'critical' ? (
                  <AlertOctagon className="w-3 h-3 shrink-0" />
                ) : meta.bannerMessage.type === 'warning' ? (
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                ) : (
                  <Radio className="w-3 h-3 shrink-0" />
                )}
                <span>{meta.bannerMessage.text}</span>
              </div>
              {meta.bannerMessage.code && (
                <span className="text-[9px] font-mono text-ink-muted hidden sm:inline">
                  CODE: {meta.bannerMessage.code}
                </span>
              )}
            </div>
          )}

          {/* 3. SLIM 2-COLUMN PARTICIPANT STRIP (Side-by-Side: Customer & Voice Agent) */}
          <div className="px-3 py-1.5 bg-canvas-subtle border-b border-border-subtle flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 select-none shrink-0 text-xs">
            {/* Customer Box */}
            <div className={`flex-1 bg-canvas-pure border rounded-[4px] px-2.5 py-1 flex items-center justify-between shadow-hairline transition-colors ${
              isBargeIn
                ? 'border-ops-criticalBorder bg-ops-criticalBg/20'
                : callState === 'CUSTOMER_SPEAKING'
                ? 'border-accent-border bg-accent-subtle/20'
                : 'border-border-subtle'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-[3px] bg-accent-subtle border border-accent-border flex items-center justify-center font-mono text-[10px] font-bold text-accent shrink-0">
                  {currentCustomerInitials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 leading-tight">
                    <span className="text-[9px] font-mono font-bold text-ink-muted uppercase">CUSTOMER</span>
                    <span className="text-border text-[10px]">/</span>
                    <span className="font-bold text-xs text-ink-primary font-sans truncate">{currentCustomerName}</span>
                  </div>
                  <div className="text-[9px] font-mono text-ink-muted leading-tight truncate">
                    <span>{currentLanguageMode}</span> • <span>{currentCustomerTier}</span>
                  </div>
                </div>
              </div>

              {/* Accurate Customer Speaking Badge: ONLY shows SPEAKING when customer is actually speaking */}
              <div className="shrink-0 pl-2">
                {callState === 'CUSTOMER_SPEAKING' ? (
                  <Badge variant="accent" dot size="xs" className="font-mono animate-pulse">
                    SPEAKING
                  </Badge>
                ) : callState === 'CUSTOMER_INTERRUPTED' ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openProofInspector({
                        timestamp: '21:34:02',
                        eventType: 'customer.interruption',
                        title: 'Caller Barge-in Detected',
                        source: 'Agora VAD + WebRTC Audio Stream',
                        confidence: 0.98,
                        payload: {
                          vad_trigger: 'SPEECH_DETECTED',
                          active_stream: 'inbound_audio_track_0',
                          cancelled_audio_buffer_ms: 320,
                          pipeline_action: 'CANCEL_TTS_IMMEDIATE'
                        }
                      })}
                      className="text-[8px] font-mono font-bold text-ops-critical bg-ops-criticalBg border border-ops-criticalBorder px-1 py-0.2 rounded cursor-pointer"
                    >
                      [EVENT]
                    </button>
                    <Badge variant="critical" dot size="xs" className="font-mono animate-pulse">
                      INTERRUPTED
                    </Badge>
                  </div>
                ) : callState === 'RECONNECTING' ? (
                  <Badge variant="warning" dot size="xs" className="font-mono animate-pulse">
                    RECONNECTING
                  </Badge>
                ) : (
                  <Badge variant="standby" size="xs" className="font-mono text-ink-muted">
                    {meta.participantStatus.customer === 'SPEAKING' ? 'IDLE' : meta.participantStatus.customer}
                  </Badge>
                )}
              </div>
            </div>

            {/* Duplex Bridge Center Pill */}
            <div className="hidden md:flex items-center justify-center px-1">
              <div className="flex items-center gap-1 px-2 py-0.5 bg-canvas-pure rounded-full border border-border-subtle text-[9px] font-mono text-ink-muted shadow-hairline shrink-0">
                <ArrowUpDown className="w-2.5 h-2.5 text-accent" />
                <span>{isOperator ? 'OPERATOR ACTIVE' : isAiPaused ? 'PAUSED' : 'SPEECH TRANSLATION'}</span>
              </div>
            </div>

            {/* Voice Agent / Operator Box */}
            <div className={`flex-1 bg-canvas-pure border rounded-[4px] px-2.5 py-1 flex items-center justify-between shadow-hairline transition-colors ${
              isOperator
                ? 'border-ops-warningBorder bg-ops-warningBg/20'
                : isAiPaused
                ? 'border-ops-warningBorder bg-ops-warningBg/10'
                : callState === 'RELAY_SPEAKING'
                ? 'border-ops-liveBorder bg-ops-liveBg/20'
                : 'border-border-subtle'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-6 h-6 rounded-[3px] border flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                  isOperator ? 'bg-ops-warningBg border-ops-warningBorder text-ops-warning' : 'bg-ops-liveBg border-ops-liveBorder text-ops-live'
                }`}>
                  {isOperator ? 'MS' : 'RL'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 leading-tight">
                    <span className="text-[9px] font-mono font-bold text-ink-muted uppercase">{isOperator ? 'OPERATOR' : 'RELAY'}</span>
                    <span className="text-border text-[10px]">/</span>
                    <span className="font-bold text-xs text-ink-primary font-sans truncate">{isOperator ? 'Maya Sharma' : 'Voice Agent'}</span>
                  </div>
                  <div className="text-[9px] font-mono text-ink-muted leading-tight truncate">
                    <span>{isOperator ? 'Live On Line' : isAiPaused ? 'Paused' : 'Listening & Synthesizing'}</span> • <span>Agora RTC Opus</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 pl-2">
                {/* Voice Gender Switcher */}
                <button
                  type="button"
                  onClick={() => {
                    const nextGender = agentGender === 'female' ? 'male' : 'female'
                    setAgentGender(nextGender)
                    speechService.setAgentGender(nextGender)
                  }}
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] border transition-all cursor-pointer ${
                    agentGender === 'female'
                      ? 'bg-pink-500/10 text-pink-600 border-pink-500/30 hover:bg-pink-500/20'
                      : 'bg-blue-500/10 text-blue-600 border-blue-500/30 hover:bg-blue-500/20'
                  }`}
                  title="Toggle Agent Voice Gender"
                >
                  <span>{agentGender === 'female' ? '♀ FEMALE' : '♂ MALE'}</span>
                </button>

                {isOperator ? (
                  <Badge variant="warning" dot size="xs" className="font-mono">HUMAN</Badge>
                ) : isAiPaused ? (
                  <Badge variant="warning" dot size="xs" className="font-mono">PAUSED</Badge>
                ) : callState === 'RELAY_SPEAKING' ? (
                  <Badge variant="live" dot size="xs" className="font-mono animate-pulse">SPEAKING</Badge>
                ) : (
                  <Badge variant="live" dot size="xs" className="font-mono">ACTIVE</Badge>
                )}
              </div>
            </div>
          </div>

          {/* 4. COMPACT VOICE & INPUT CONSOLE (Slim Waveform, Mic Controls, Spoken Chips & Input) */}
          <div className="px-3 py-1.5 bg-canvas-pure border-b border-border-subtle flex flex-col gap-1.5 select-none font-mono shrink-0">
            {/* Row 1: Slim Oscilloscope Waveform & Mute Switch */}
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <WaveformMonitor callState={callState} />
              </div>
              <button
                type="button"
                onClick={handleToggleMute}
                className={`h-7 px-2.5 rounded-[3px] font-mono text-[10px] font-bold border transition-colors cursor-pointer flex items-center gap-1 shrink-0 ${
                  isMuted
                    ? 'bg-ops-warningBg text-ops-warning border-ops-warningBorder hover:bg-ops-warningBg/80'
                    : 'bg-canvas-subtle text-ink-primary border-border-subtle hover:bg-canvas-muted'
                }`}
                title={isMuted ? 'Click to unmute microphone' : 'Click to mute microphone'}
              >
                {isMuted ? <MicOff className="w-3 h-3 text-ops-warning" /> : <Mic className="w-3 h-3 text-ops-live" />}
                <span>{isMuted ? 'UNMUTE' : 'MUTE'}</span>
              </button>
            </div>

            {/* Row 2: Test Phrase Chips (Horizontal single-line scroll) + Direct Spoken Input */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 shrink-0 max-w-full sm:max-w-[55%]">
                <span className="text-[9px] font-mono font-bold text-ink-muted uppercase shrink-0">SAY:</span>
                {(
                  activeScenario?.id === 'payment-failure'
                    ? [
                        { text: 'My bank account was debited twice for ₹2,499', label: '1. Double debit' },
                        { text: 'Can you reverse the duplicate charge?', label: '2. Reverse charge' },
                        { text: 'Thank you for resolving it', label: '3. Thanks' },
                      ]
                    : activeScenario?.id === 'language-switch'
                    ? [
                        { text: 'I want to change my delivery address', label: '1. English request' },
                        { text: 'Bhaiya Noida Sector 62 bhej do', label: '2. Hindi: Noida 62' },
                        { text: 'Address update ho gaya kya?', label: '3. Confirm update' },
                      ]
                    : activeScenario?.id === 'human-takeover'
                    ? [
                        { text: 'I want to speak with a human manager', label: '1. Demand manager' },
                        { text: 'Cancel our enterprise account', label: '2. Cancel contract' },
                        { text: 'Thank you Maya', label: '3. Thanks' },
                      ]
                    : activeScenario?.id === 'tool-failure'
                    ? [
                        { text: 'Mera package track nahi ho raha hai', label: '1. Tracking error' },
                        { text: 'Carrier API timeout check karo', label: '2. Check carrier' },
                        { text: 'Manual trace shuru karo', label: '3. Manual dispatch' },
                      ]
                    : activeScenario?.id === 'angry-customer'
                    ? [
                        { text: 'Yeh teesri baar hai jab tumne mera time waste kiya!', label: '1. Angry complaint' },
                        { text: 'Mujhe compensation credit chahiye', label: '2. Demand credit' },
                        { text: '₹1,000 credit accept karta hoon', label: '3. Accept credit' },
                      ]
                    : [
                        { text: 'Mera order 5 din se nahi aaya', label: '1. Order late' },
                        { text: 'Mujhe refund chahiye', label: '2. Refund' },
                        { text: 'UPI par bhej do', label: '3. UPI' },
                        { text: 'Return policy kya hai?', label: '4. Policy' },
                        { text: 'Bas itna hi tha, thank you!', label: '5. Thanks' },
                        { text: 'Can we switch to English please?', label: '6. English' },
                      ]
                ).map((phrase) => (
                  <button
                    key={phrase.text}
                    type="button"
                    onClick={() => handleProcessSpokenUtterance(phrase.text)}
                    className="bg-canvas-subtle hover:bg-canvas-muted text-ink-primary border border-border-subtle hover:border-accent rounded px-2 py-0.5 text-[10px] font-mono whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 shadow-hairline active:scale-95 shrink-0"
                    title={`Speak: "${phrase.text}"`}
                  >
                    <Mic className="w-2 h-2 text-accent" />
                    <span>{phrase.label}</span>
                  </button>
                ))}
              </div>

              {/* Direct Utterance Input & Active SPEAK Button */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const textToSend = customUtterance.trim() || 'Mera order 5 din se nahi aaya'
                  handleProcessSpokenUtterance(textToSend)
                  setCustomUtterance('')
                }}
                className="flex items-center gap-1.5 flex-1 min-w-0"
              >
                <input
                  type="text"
                  placeholder="Type speech or click phrase on left..."
                  value={customUtterance}
                  onChange={(e) => setCustomUtterance(e.target.value)}
                  className="bg-canvas-subtle border border-border-subtle rounded px-2.5 py-1 text-xs text-ink-primary placeholder-ink-muted focus:outline-none focus:border-accent flex-1 font-sans shadow-xs h-7 min-w-0"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="xs"
                  className="font-mono text-[10px] font-bold uppercase tracking-wider bg-accent text-white hover:bg-accent-hover active:bg-[#083070] h-7 px-3 cursor-pointer shrink-0 shadow-hairline"
                >
                  SPEAK
                </Button>
              </form>
            </div>
          </div>

          {/* 5. MAIN EXPANDED LIVE TRANSCRIPT RAIL & LIVE EVENTS (Full Vertical Space) */}
          <div
            className="flex-1 overflow-y-auto p-4 bg-canvas min-h-0"
            role="log"
            aria-live="polite"
            aria-label="Real-time bilingual captions and transcript rail"
          >
            <div className="max-w-2xl mx-auto space-y-4">
              {/* SECTION 32: CONVERSATION HANDOFF BRIEF (Renders immediately on Human Takeover) */}
              {isOperator && (
                <div className="bg-canvas-pure border-2 border-ops-warningBorder rounded-[4px] p-3.5 shadow-hairline space-y-2.5 font-mono animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-ops-warning animate-ping" />
                      <span className="font-mono text-xs font-bold text-ink-primary uppercase tracking-tight">
                        HANDOFF BRIEF
                      </span>
                      <span className="text-border">/</span>
                      <span className="text-[10px] text-ops-warning font-bold">
                        Direct Audio Bridge
                      </span>
                    </div>

                    <button
                      onClick={() => openProofInspector({
                        timestamp: '21:34:08',
                        eventType: 'human.takeover',
                        title: 'Operator Duplex Audio Takeover',
                        source: 'Human Operator Console',
                        confidence: 1.0,
                        payload: {
                          operator_id: 'OP-782',
                          operator_name: 'Maya Sharma',
                          handover_reason: 'REFUND_DISPUTE_ESCALATION',
                          audio_route: 'AGORA_OPERATOR_MIC_PRIORITY',
                          ai_speech_state: 'MUTED_PASSIVE_LISTEN'
                        }
                      })}
                      className="text-[10px] font-mono font-bold text-ops-warning bg-canvas-pure border border-ops-warningBorder px-2 py-0.5 rounded hover:bg-ops-warningBg cursor-pointer"
                    >
                      [ VIEW EVENT ]
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-ink-muted uppercase block">Customer:</span>
                      <span className="font-bold text-ink-primary block">Aarav Sharma</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-muted uppercase block">Language:</span>
                      <span className="font-bold text-ink-primary block">Hindi</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs pt-1 border-t border-border-subtle/70">
                    <div>
                      <span className="text-[10px] text-ink-muted uppercase block font-semibold">Issue:</span>
                      <span className="text-ink-primary font-medium">Delayed delivery</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-ink-muted uppercase block font-semibold">What happened:</span>
                      <span className="text-ink-primary font-medium">
                        Order #84921 missed expected delivery date by 3 days.
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-ink-muted uppercase block font-semibold">Customer request:</span>
                      <span className="text-ink-primary font-medium">Full refund.</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-ink-muted uppercase block font-semibold">Action:</span>
                      <span className="text-ops-warning font-bold">Refund awaiting approval.</span>
                    </div>

                    <div className="bg-accent-subtle p-2.5 rounded-[3px] border border-accent-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-accent font-bold uppercase block">Suggested next step:</span>
                        <span className="text-xs font-semibold text-accent font-sans">
                          Confirm refund timeline.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText("Main aapke refund ki timeline confirm kar deti hoon.")
                          setCopiedPhrase(true)
                          setTimeout(() => setCopiedPhrase(false), 2000)
                        }}
                        className="text-[10px] font-mono font-bold text-white bg-accent px-2.5 py-1 rounded-[2px] cursor-pointer hover:bg-accent-hover flex items-center gap-1 shrink-0 self-start sm:self-auto"
                      >
                        {copiedPhrase ? <Check className="w-3 h-3 stroke-[3]" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedPhrase ? 'COPIED' : 'COPY PHRASE'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] font-mono text-ink-muted uppercase tracking-wider select-none pb-1 border-b border-border-subtle">
                <span>LIVE TRANSCRIPT RAIL</span>
                <span>STATUS: {isAiPaused ? 'RELAY_PAUSED' : callState}</span>
              </div>

              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border-subtle">
                {transcript.map((item) => {
                  const isCustomer = item.speaker === 'CUSTOMER'
                  const isOperator = item.speaker === 'OPERATOR'

                  return (
                    <div key={item.id} className="relative group">
                      {/* Hairline timeline node dot */}
                      <div
                        className={`absolute -left-6 top-1.5 w-2 h-2 rounded-full border-2 border-canvas ${
                          item.isLanguageSwitch
                            ? 'bg-accent animate-pulse'
                            : item.isTool
                            ? 'bg-ops-warning'
                            : isCustomer
                            ? 'bg-accent'
                            : isOperator
                            ? 'bg-ops-warning'
                            : 'bg-ops-live'
                        }`}
                      />

                      {/* SECTION 46: LANGUAGE SWITCH CARD & SECTION 3 PROOF LAYER TRIGGER */}
                      {item.isLanguageSwitch ? (
                        <div className="bg-canvas-pure border-2 border-accent-border rounded-[4px] p-3 shadow-hairline space-y-2 font-mono animate-in fade-in duration-150">
                          <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
                            <div className="flex items-center gap-1.5 font-bold text-accent text-xs tracking-tight uppercase">
                              <Languages className="w-3.5 h-3.5 text-accent" />
                              <span>LANGUAGE SWITCH</span>
                            </div>
                            <span className="text-[9px] font-bold text-accent bg-accent-subtle px-1.5 py-0.2 rounded border border-accent-border">
                              AUTO-DETECTED
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-0.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-ink-primary">
                              <span>{item.switchFrom || 'Hindi'}</span>
                              <span className="text-accent">→</span>
                              <span className="text-accent font-extrabold">{item.switchTo || 'English'}</span>
                            </div>

                            <button
                              onClick={() => openProofInspector({
                                timestamp: item.timestamp || '21:34:07',
                                eventType: 'language.detected',
                                title: 'Automated Bilingual Language Switch',
                                source: 'Agora audio stream',
                                confidence: 0.96,
                                payload: {
                                  detected: 'en-IN',
                                  previous: 'hi-IN',
                                  confidence: 0.96,
                                  utterance_sample: 'Actually, let\'s continue in English.',
                                  pipeline: 'Deepgram Multilingual ASR v2',
                                  adaptation_time_ms: 18
                                }
                              })}
                              className="text-[10px] font-mono font-bold text-accent bg-accent-subtle border border-accent-border px-2 py-0.5 rounded hover:bg-accent hover:text-white transition-colors cursor-pointer"
                            >
                              [ VIEW EVENT ]
                            </button>
                          </div>

                          <p className="text-[10px] text-ink-muted font-sans">
                            Detected automatically • Continuing in {item.switchTo || 'English'} without restarting session
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Header Row: Timestamp + Speaker pill */}
                          <div className="flex items-center gap-2 mb-1 select-none">
                            <span className="font-mono text-[10px] text-ink-muted tabular-nums">
                              {item.timestamp}
                            </span>

                            <span
                              className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-[2px] tracking-wider uppercase ${
                                item.isTool
                                  ? 'bg-canvas-muted text-ink-secondary border border-border-subtle'
                                  : isCustomer
                                  ? 'bg-accent-subtle text-accent border border-accent-border'
                                  : isOperator
                                  ? 'bg-ops-warningBg text-ops-warning border-[#FED7AA]'
                                  : 'bg-ops-liveBg text-ops-live border-ops-liveBorder'
                              }`}
                            >
                              {item.isTool ? 'TOOL' : item.speaker}
                            </span>

                            {item.language && (
                              <span className="text-[10px] font-mono text-ink-muted">
                                • {item.language}
                              </span>
                            )}

                            {item.status && (
                              <span className="text-[9px] font-mono text-ops-warning bg-ops-warningBg px-1 rounded border border-[#FED7AA]">
                                {item.status}
                              </span>
                            )}
                          </div>

                          {/* Body Content */}
                          <div className="space-y-1">
                            {item.isTool ? (
                              <div className="font-mono text-xs text-ops-warning bg-canvas-pure border border-border-subtle p-2 rounded-[3px] shadow-hairline flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Wrench className="w-3.5 h-3.5 text-ops-warning shrink-0" />
                                  <span className="font-semibold">{item.content}</span>
                                </div>
                                <button
                                  onClick={() => openProofInspector({
                                    timestamp: item.timestamp,
                                    eventType: 'tool.executed',
                                    title: 'RPC Tool Execution Telemetry',
                                    source: 'Internal Order/CRM Gateway',
                                    confidence: 1.0,
                                    payload: {
                                      tool_name: item.toolName || 'getOrderStatus',
                                      request_params: { orderId: '84921' },
                                      response_status: '200 OK',
                                      execution_latency_ms: 184,
                                      delivery_status: 'EXCEPTION_DELAYED_3_DAYS'
                                    }
                                  })}
                                  className="text-[9px] font-mono font-bold text-ops-warning bg-ops-warningBg border border-ops-warningBorder px-1.5 py-0.5 rounded hover:bg-ops-warning hover:text-white transition-colors cursor-pointer"
                                >
                                  [ VIEW EVENT ]
                                </button>
                              </div>
                            ) : (
                              <div className="bg-canvas-pure border border-border-subtle rounded-[3px] p-2.5 shadow-hairline space-y-1">
                                <p className="font-sans text-xs text-ink-primary leading-relaxed select-text font-medium">
                                  {item.content}
                                </p>
                                {item.translation && (
                                  <p className="font-sans text-[11px] text-ink-secondary leading-normal select-text italic border-t border-border-subtle/50 pt-1">
                                    {item.translation}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* SECTION 48: CONTEXTUAL LIVE AI WORKING STATE PILL */}
              <div className="flex items-center justify-center pt-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-canvas-pure border border-border-subtle rounded-full text-xs font-mono shadow-hairline">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <span className="font-semibold text-ink-primary">{aiWorkingState}</span>
                </div>
              </div>

              <div className="text-center py-1">
                <span className="font-mono text-[10px] text-ink-muted uppercase tracking-wider animate-pulse">
                  {isAiPaused
                    ? 'RELAY is paused and listening passively for operator instructions...'
                    : meta.description.replace(/Aarav/gi, currentCustomerName.split(' ')[0])}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 5. SECTION 24 & 25: COMPACT OPERATIONAL VOICE CONTROLS */}
      <VoiceControlsBar
        isHumanTakeover={isOperator}
        isAiPaused={isAiPaused}
        onToggleTakeover={onToggleTakeover}
        onTogglePauseAi={() => setIsAiPaused(!isAiPaused)}
        onEndCall={() => setCallState('CALL_ENDED')}
      />

      {/* SECTION 3: PROOF LAYER TELEMETRY INSPECTOR MODAL */}
      <EventProofModal
        isOpen={isProofModalOpen}
        onClose={() => setIsProofModalOpen(false)}
        event={selectedProofEvent}
      />
    </div>
  )
}

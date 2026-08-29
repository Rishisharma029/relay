import React, { useState, useEffect } from 'react'
import { AppHeader } from './components/layout/AppHeader'
import { NavigationSidebar, NavTabId } from './components/layout/NavigationSidebar'
import { LiveConversationPane } from './components/workspace/LiveConversationPane'
import { CaseIntelligencePane } from './components/workspace/CaseIntelligencePane'
import { EvidenceDrawer } from './components/workspace/EvidenceDrawer'
import { GlobalSearchModal } from './components/workspace/GlobalSearchModal'
import { DemoModeModal } from './components/workspace/DemoModeModal'
import { MicrophonePermissionModal } from './components/workspace/MicrophonePermissionModal'
import { DemoScenario } from './data/demoScenarios'
import { CasesListView } from './views/CasesListView'
import { CaseDetailView } from './views/CaseDetailView'
import { CustomersView } from './views/CustomersView'
import { ApprovalsView } from './views/ApprovalsView'
import { LandingPortalView } from './views/LandingPortalView'
import { SystemHealthView } from './views/SystemHealthView'
import { MobileWorkspace } from './components/mobile/MobileWorkspace'
import { agoraRtm } from './services/agoraRtmService'
import { NewLiveCaseModal, NewCaseConfig } from './components/workspace/NewLiveCaseModal'
import { useCaseState } from './contexts/CaseStateContext'

export type ViewMode =
  | 'landing'
  | 'live-workstation'
  | 'cases-list'
  | 'case-detail'
  | 'customers'
  | 'approvals'
  | 'system-health'

export const App: React.FC = () => {
  const { runtimeMode, startNewLiveCase, caseState, loadScenario } = useCaseState()
  const [currentTab, setCurrentTab] = useState<NavTabId>('live-calls')
  const [selectedCaseId, setSelectedCaseId] = useState<string>('RLY-1042')
  const [viewMode, setViewMode] = useState<ViewMode>('live-workstation')
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true)
  const [isHumanTakeover, setIsHumanTakeover] = useState<boolean>(false)
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false)
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false)
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState<boolean>(false)
  const [isMicModalOpen, setIsMicModalOpen] = useState<boolean>(false)
  const [activeScenarioId, setActiveScenarioId] = useState<string>('delivery-refund')

  // Global Shortcuts: Cmd+K (Search), Alt+D (Demo Mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen((prev) => !prev)
      } else if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault()
        setIsDemoModalOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSelectTab = (tab: NavTabId) => {
    setCurrentTab(tab)
    if (tab === 'overview') {
      setViewMode('landing')
    } else if (tab === 'cases') {
      setViewMode('cases-list')
    } else if (tab === 'live-calls') {
      setViewMode('live-workstation')
    } else if (tab === 'customers') {
      setViewMode('customers')
    } else if (tab === 'approvals') {
      setViewMode('approvals')
    } else if (tab === 'settings' || tab === 'activity' || tab === 'tools') {
      setViewMode('system-health')
    }
  }

  const handleOpenCaseDetail = (caseId: string) => {
    setSelectedCaseId(caseId)
    setViewMode('case-detail')
  }

  const handleOpenLiveConsole = () => {
    setViewMode('live-workstation')
    setCurrentTab('live-calls')
  }

  const handleStartNewCase = (config: NewCaseConfig) => {
    startNewLiveCase(config)
    setIsHumanTakeover(false)
    setViewMode('live-workstation')
    setCurrentTab('live-calls')
    setIsNewCaseModalOpen(false)
  }

  const handleToggleTakeover = () => {
    const nextState = !isHumanTakeover
    setIsHumanTakeover(nextState)

    // Publish authoritative RelayEvent with state machine payload
    agoraRtm.publishRelayEvent({
      type: 'human.takeover',
      operatorId: 'OP-782',
      state: nextState ? 'HUMAN_ACTIVE' : 'AI_ACTIVE',
      reason: nextState ? 'Operator initiated priority takeover' : 'Operator returned control to AI agent',
      timestamp: new Date().toLocaleTimeString(),
    })
  }

  const handleSelectDemoScenario = (scenario: DemoScenario) => {
    setActiveScenarioId(scenario.id)
    setSelectedCaseId(scenario.caseId)
    setIsHumanTakeover(scenario.isHumanTakeover)
    loadScenario(scenario)
    setViewMode('live-workstation')
    setCurrentTab('live-calls')
  }

  const handleGlobalSearchNavigate = (
    targetView: 'case-detail' | 'customers' | 'live-workstation' | 'approvals',
    targetId?: string
  ) => {
    if (targetView === 'case-detail') {
      if (targetId) setSelectedCaseId(targetId)
      setViewMode('case-detail')
    } else if (targetView === 'customers') {
      setViewMode('customers')
      setCurrentTab('customers')
    } else if (targetView === 'live-workstation') {
      setViewMode('live-workstation')
      setCurrentTab('live-calls')
    } else if (targetView === 'approvals') {
      setViewMode('approvals')
      setCurrentTab('approvals')
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-canvas text-ink-primary font-sans antialiased select-none">
      {/* 1. DESKTOP HEADER (Hidden on mobile) */}
      <div className="hidden md:block">
        <AppHeader
          caseId={`CASE-${caseState.id.replace('RLY-', '')}`}
          caseTitle={caseState.intent ? caseState.intent.replace(/_/g, ' ') : 'Customer Support'}
          isConnected={true}
          isHumanTakeover={isHumanTakeover}
          isDrawerOpen={isDrawerOpen}
          onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onSelectCase={handleOpenCaseDetail}
          onOpenDemoMode={() => setIsDemoModalOpen(true)}
          onOpenNewCase={() => setIsNewCaseModalOpen(true)}
        />
      </div>

      {/* 2. DEDICATED MOBILE VIEW (< md) */}
      <div className="flex md:hidden flex-1 min-h-0 overflow-hidden">
        <MobileWorkspace
          isHumanTakeover={isHumanTakeover}
          onToggleTakeover={() => setIsHumanTakeover(!isHumanTakeover)}
        />
      </div>

      {/* 3. DESKTOP WORKSPACE (>= md) */}
      <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT ZONE: Understated Navigation */}
        <NavigationSidebar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
        />

        {/* Dynamic Views */}
        {viewMode === 'landing' && (
          <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-canvas">
            <LandingPortalView
              onStartLiveSession={() => setIsNewCaseModalOpen(true)}
              onViewDemoCase={() => handleOpenCaseDetail('RLY-1042')}
              onExploreCasesQueue={() => {
                setCurrentTab('cases')
                setViewMode('cases-list')
              }}
            />
          </main>
        )}

        {viewMode === 'cases-list' && (
          <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-canvas">
            <CasesListView
              selectedCaseId={selectedCaseId}
              onSelectCase={handleOpenCaseDetail}
              onOpenNewCase={() => setIsNewCaseModalOpen(true)}
            />
          </main>
        )}

        {viewMode === 'case-detail' && (
          <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-canvas">
            <CaseDetailView
              caseId={selectedCaseId}
              onBack={() => setViewMode('cases-list')}
              onOpenLiveCall={handleOpenLiveConsole}
            />
          </main>
        )}

        {viewMode === 'customers' && (
          <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-canvas">
            <CustomersView
              onOpenCase={handleOpenCaseDetail}
            />
          </main>
        )}

        {viewMode === 'approvals' && (
          <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-canvas">
            <ApprovalsView
              onOpenCase={handleOpenCaseDetail}
            />
          </main>
        )}

        {viewMode === 'system-health' && (
          <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-canvas">
            <SystemHealthView />
          </main>
        )}

        {viewMode === 'live-workstation' && (
          <>
            {/* CENTER ZONE: What is happening now (Live Conversation, Waveform, Transcript & Takeover) */}
            <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-canvas">
              <LiveConversationPane
                isHumanTakeover={isHumanTakeover}
                onToggleTakeover={handleToggleTakeover}
                onViewCase={handleOpenCaseDetail}
              />
            </main>

            {/* RIGHT ZONE: Case Intelligence (Agora Status / CASE STATE / KNOWN FACTS / ACTION / FAILURE UX) */}
            <CaseIntelligencePane
              onTakeover={() => setIsHumanTakeover(true)}
            />
          </>
        )}
      </div>

      {/* BOTTOM ZONE: Evidence Drawer (Activity / Transcript / Tools / System) - Desktop only */}
      {isDrawerOpen && viewMode !== 'landing' && viewMode !== 'system-health' && (
        <div className="hidden md:block">
          <EvidenceDrawer />
        </div>
      )}

      {/* SECTION 35: GLOBAL SEARCH MODAL (⌘K / Ctrl+K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleGlobalSearchNavigate}
      />

      {/* SECTION 41: DEMO SCENARIOS MODAL (Alt+D) */}
      <DemoModeModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onSelectScenario={handleSelectDemoScenario}
        activeScenarioId={activeScenarioId}
      />

      {/* SECTION 45: MICROPHONE PERMISSION EXPERIENCE MODAL */}
      <MicrophonePermissionModal
        isOpen={isMicModalOpen}
        onGranted={() => {
          setIsMicModalOpen(false)
          setIsHumanTakeover(true)
        }}
        onDismiss={() => setIsMicModalOpen(false)}
      />

      {/* NEW LIVE CASE MODAL */}
      <NewLiveCaseModal
        isOpen={isNewCaseModalOpen}
        onClose={() => setIsNewCaseModalOpen(false)}
        onStartCase={handleStartNewCase}
        defaultMode={runtimeMode}
      />
    </div>
  )
}

export default App

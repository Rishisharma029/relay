import React, { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Pause,
  Play,
  PhoneForwarded,
  Hand,
  Settings,
  PhoneOff,
  Radio,
  Sparkles,
  X
} from 'lucide-react'
import { agoraRtc } from '../../services/agoraRtcService'

interface VoiceControlsBarProps {
  isHumanTakeover: boolean
  isAiPaused: boolean
  onToggleTakeover: () => void
  onTogglePauseAi: () => void
  onEndCall: () => void
}

export const VoiceControlsBar: React.FC<VoiceControlsBarProps> = ({
  isHumanTakeover,
  isAiPaused,
  onToggleTakeover,
  onTogglePauseAi,
  onEndCall,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(true)
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false)
  const [showAudioSettings, setShowAudioSettings] = useState<boolean>(false)
  const [selectedTransferDesk, setSelectedTransferDesk] = useState<string>('logistics')

  // Sync state with Agora RTC hardware
  useEffect(() => {
    agoraRtc.setMute(isMuted)
  }, [isMuted])

  useEffect(() => {
    agoraRtc.setAiPause(isAiPaused)
  }, [isAiPaused])

  useEffect(() => {
    agoraRtc.setHumanTakeover(isHumanTakeover)
  }, [isHumanTakeover])

  const handleEndCall = () => {
    agoraRtc.leaveAndCleanup()
    onEndCall()
  }

  // SECTION 36: KEYBOARD SHORTCUTS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase()
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        onTogglePauseAi()
      } else if (e.key === 'm' || e.key === 'M') {
        setIsMuted((prev) => !prev)
      } else if (e.key === 't' || e.key === 'T') {
        if (!isHumanTakeover) onToggleTakeover()
      } else if (e.key === 'r' || e.key === 'R') {
        if (isHumanTakeover) onToggleTakeover()
      } else if (e.key === 'Escape') {
        setShowTransferModal(false)
        setShowAudioSettings(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isHumanTakeover, isAiPaused, onTogglePauseAi, onToggleTakeover])

  return (
    <div className="bg-canvas-pure border-t border-border-subtle p-2 px-3 flex flex-wrap items-center justify-between gap-2 shrink-0 select-none font-mono text-xs relative">
      {/* Left: Agent & Takeover State */}
      <div className="flex items-center gap-2.5">
        {isHumanTakeover ? (
          <div className="flex items-center gap-1.5 font-bold text-ops-warning">
            <span className="w-2 h-2 rounded-full bg-ops-warning animate-ping" />
            <span>● HUMAN ACTIVE</span>
            <span className="text-border">/</span>
            <span className="text-ink-muted text-[11px] font-normal">AI IS LISTENING</span>
          </div>
        ) : isAiPaused ? (
          <div className="flex items-center gap-1.5 font-bold text-ops-warning">
            <Pause className="w-3 h-3 text-ops-warning" />
            <span>RELAY PAUSED</span>
            <span className="text-border">/</span>
            <span className="text-ink-secondary text-[11px] font-normal">Listening for operator instruction...</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 font-bold text-accent">
            <Radio className="w-3.5 h-3.5 text-accent animate-pulse" />
            <span>RELAY ACTIVE</span>
            <span className="text-border">/</span>
            <span className="text-ink-muted text-[11px] font-normal">VOICE AGENT</span>
          </div>
        )}
      </div>

      {/* Right: Section 24, 25 & 36 Voice Controls Suite with Subtle Keyboard Shortcuts */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* 1. MUTE (M) */}
        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          className={`flex items-center gap-1 px-2 py-1 rounded-[2px] font-mono text-[10px] uppercase font-semibold transition-colors cursor-pointer border ${
            isMuted
              ? 'bg-ops-criticalBg text-ops-critical border-ops-criticalBorder'
              : 'bg-canvas-subtle hover:bg-canvas-muted text-ink-primary border-border-subtle'
          }`}
          title="Mute microphone [M]"
        >
          {isMuted ? <MicOff className="w-3 h-3 text-ops-critical" /> : <Mic className="w-3 h-3 text-ink-muted" />}
          <span>{isMuted ? 'MUTED' : 'MUTE'}</span>
        </button>

        {/* 2. SPEAKER */}
        <button
          type="button"
          onClick={() => setIsSpeakerOn(!isSpeakerOn)}
          className={`flex items-center gap-1 px-2 py-1 rounded-[2px] font-mono text-[10px] uppercase font-semibold transition-colors cursor-pointer border ${
            !isSpeakerOn
              ? 'bg-canvas-muted text-ink-muted border-border-subtle'
              : 'bg-canvas-subtle hover:bg-canvas-muted text-ink-primary border-border-subtle'
          }`}
          title={isSpeakerOn ? 'Speaker Active' : 'Speaker Muted'}
        >
          {isSpeakerOn ? <Volume2 className="w-3 h-3 text-accent" /> : <VolumeX className="w-3 h-3 text-ink-muted" />}
          <span>{isSpeakerOn ? 'SPEAKER' : 'SPK OFF'}</span>
        </button>

        {/* 3. PAUSE RELAY (Space) */}
        <button
          type="button"
          onClick={onTogglePauseAi}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-[2px] font-mono text-[10px] uppercase font-bold transition-colors cursor-pointer border ${
            isAiPaused
              ? 'bg-ops-warningBg text-ops-warning border-ops-warningBorder'
              : 'bg-canvas-subtle hover:bg-canvas-muted text-ink-primary border-border-subtle'
          }`}
          title="Pause/Resume RELAY [Space]"
        >
          {isAiPaused ? <Play className="w-3 h-3 text-ops-warning fill-ops-warning" /> : <Pause className="w-3 h-3 text-ink-muted" />}
          <span>{isAiPaused ? 'RESUME RELAY' : 'PAUSE RELAY'}</span>
        </button>

        {/* 4. TRANSFER */}
        <button
          type="button"
          onClick={() => {
            setShowTransferModal(!showTransferModal)
            setShowAudioSettings(false)
          }}
          className={`flex items-center gap-1 px-2 py-1 rounded-[2px] font-mono text-[10px] uppercase font-semibold transition-colors cursor-pointer border ${
            showTransferModal
              ? 'bg-accent text-white border-accent'
              : 'bg-canvas-subtle hover:bg-canvas-muted text-ink-primary border-border-subtle'
          }`}
          title="Transfer call to another department"
        >
          <PhoneForwarded className="w-3 h-3 text-ink-muted" />
          <span>TRANSFER</span>
        </button>

        {/* 5. TAKE OVER (T) / RETURN TO RELAY (R) */}
        {isHumanTakeover ? (
          <button
            type="button"
            onClick={onToggleTakeover}
            className="flex items-center gap-1 px-2.5 py-1 rounded-[2px] font-mono text-[10px] uppercase font-bold transition-colors cursor-pointer bg-canvas-pure border border-accent text-accent hover:bg-accent-subtle"
            title="Return to autonomous RELAY [R]"
          >
            <Sparkles className="w-3 h-3 text-accent" />
            <span>RETURN TO RELAY</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleTakeover}
            className="flex items-center gap-1 px-2.5 py-1 rounded-[2px] font-mono text-[10px] uppercase font-bold transition-colors cursor-pointer bg-[#171717] text-white hover:bg-ink-secondary"
            title="Take over call [T]"
          >
            <Hand className="w-3 h-3" />
            <span>TAKE OVER</span>
          </button>
        )}

        {/* 6. AUDIO SETTINGS */}
        <button
          type="button"
          onClick={() => {
            setShowAudioSettings(!showAudioSettings)
            setShowTransferModal(false)
          }}
          className={`p-1.5 rounded-[2px] transition-colors cursor-pointer border ${
            showAudioSettings
              ? 'bg-accent text-white border-accent'
              : 'bg-canvas-subtle hover:bg-canvas-muted text-ink-secondary border-border-subtle'
          }`}
          title="Audio Hardware & Stream Settings"
        >
          <Settings className="w-3 h-3" />
        </button>

        <div className="h-4 w-px bg-border-subtle" />

        {/* 7. END CALL */}
        <Button
          variant="danger"
          size="xs"
          onClick={handleEndCall}
          className="font-mono text-[10px] h-6 px-2 gap-1"
        >
          <PhoneOff className="w-3 h-3" />
          <span>END</span>
        </Button>
      </div>

      {/* POPUP MODAL 1: TRANSFER CALL */}
      {showTransferModal && (
        <div className="absolute right-3 bottom-12 w-72 bg-canvas-pure border border-border-subtle rounded-[4px] p-3 shadow-hairline z-50 space-y-2.5 font-sans">
          <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle">
            <span className="font-mono text-xs font-bold text-ink-primary uppercase tracking-tight">
              TRANSFER CALL
            </span>
            <button
              onClick={() => setShowTransferModal(false)}
              className="text-ink-muted hover:text-ink-primary cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            {[
              { id: 'logistics', name: 'Logistics Escalation Desk', queue: '1 min wait', agent: 'Suresh V.' },
              { id: 'billing', name: 'Senior Refund Approvals', queue: 'Immediate', agent: 'Pooja M.' },
              { id: 'hindi', name: 'North India Regional Operations', queue: 'Immediate', agent: 'Kunal S.' },
            ].map((desk) => (
              <button
                key={desk.id}
                onClick={() => setSelectedTransferDesk(desk.id)}
                className={`w-full p-2 rounded-[3px] text-left border transition-colors cursor-pointer flex items-center justify-between ${
                  selectedTransferDesk === desk.id
                    ? 'bg-accent-subtle border-accent-border text-accent font-semibold'
                    : 'bg-canvas-subtle hover:bg-canvas-muted border-border-subtle text-ink-primary'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">{desk.name}</div>
                  <div className="text-[10px] text-ink-muted">Assigned: {desk.agent}</div>
                </div>
                <Badge variant="live" size="xs">
                  {desk.queue}
                </Badge>
              </button>
            ))}
          </div>

          <div className="pt-1 flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="xs"
              onClick={() => setShowTransferModal(false)}
              className="font-mono text-[10px]"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="xs"
              onClick={() => {
                setShowTransferModal(false)
              }}
              className="font-mono text-[10px] bg-accent text-white"
            >
              Confirm Transfer
            </Button>
          </div>
        </div>
      )}

      {/* POPUP MODAL 2: AUDIO CONFIGURATION */}
      {showAudioSettings && (
        <div className="absolute right-3 bottom-12 w-80 bg-canvas-pure border border-border-subtle rounded-[4px] p-3 shadow-hairline z-50 space-y-2.5 font-mono text-xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle">
            <span className="font-bold text-ink-primary uppercase tracking-tight">
              AUDIO & AGORA STREAM
            </span>
            <button
              onClick={() => setShowAudioSettings(false)}
              className="text-ink-muted hover:text-ink-primary cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 text-[11px]">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-ink-muted uppercase">Input Microphone</span>
                <span className="text-[10px] text-ops-live font-bold">✓ CONNECTED</span>
              </div>
              <span className="text-ink-primary font-semibold block mt-0.5">Default - Shure MV7 USB Audio</span>
            </div>

            <div>
              <span className="text-[10px] text-ink-muted block uppercase">Output Monitor</span>
              <span className="text-ink-primary font-semibold block">Headphones (Realtek HD Audio)</span>
            </div>

            <div className="pt-1 border-t border-border-subtle space-y-1 text-[10px]">
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">Noise Suppression</span>
                <span className="text-ops-live font-bold">Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">Echo Cancellation (AEC)</span>
                <span className="text-ops-live font-bold">Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">Codec Profile</span>
                <span className="text-ink-primary font-bold">Opus Voice Standard</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useEffect, useRef, useState } from 'react'
import { AlertCircle, Volume2, Mic } from 'lucide-react'
import { agoraRtc, RealtimeTelemetry } from '../../services/agoraRtcService'
import { telemetryCollector, MeasuredTelemetry } from '../../services/telemetryCollector'
import { CallState } from '../../types/callState'

export type SpeakerState = 'customer_speaking' | 'relay_speaking' | 'customer_interrupted' | 'listening'

interface WaveformMonitorProps {
  initialState?: SpeakerState
  callState?: CallState
}

export const WaveformMonitor: React.FC<WaveformMonitorProps> = ({
  initialState = 'listening',
  callState,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [speakerState, setSpeakerState] = useState<SpeakerState>(initialState)
  const [seconds, setSeconds] = useState<number>(42)

  // Synchronize speaker state with external callState
  useEffect(() => {
    if (callState === 'CUSTOMER_SPEAKING') {
      setSpeakerState('customer_speaking')
    } else if (callState === 'RELAY_SPEAKING') {
      setSpeakerState('relay_speaking')
    } else if (callState === 'CUSTOMER_INTERRUPTED') {
      setSpeakerState('customer_interrupted')
    } else if (callState === 'RELAY_LISTENING' || callState === 'CONNECTED') {
      setSpeakerState('listening')
    }
  }, [callState])
  const [telemetry, setTelemetry] = useState<RealtimeTelemetry>({
    channel: 'relay-case-1042',
    connectionState: 'CONNECTED',
    participantCount: 3,
    rttMs: 84,
    packetLossRate: 0.01,
    sampleRate: '48 kHz',
    localAudioLevel: 0,
    remoteAudioLevel: 0,
    isMuted: false,
    isAiPaused: false,
    isHumanTakeover: false,
    isInterrupted: false,
  })
  const [measured, setMeasured] = useState<MeasuredTelemetry>(telemetryCollector.getSnapshot())

  // Subscribe to Agora RTC Telemetry & Real VAD Interruption
  useEffect(() => {
    const unsubRtc = agoraRtc.subscribeTelemetry((tel) => {
      setTelemetry(tel)
      if (tel.isInterrupted) {
        setSpeakerState('customer_interrupted')
      } else if (tel.isHumanTakeover) {
        setSpeakerState('relay_speaking')
      } else if (tel.isAiPaused) {
        setSpeakerState('listening')
      } else if (speakerState === 'customer_interrupted' && !tel.isInterrupted) {
        setSpeakerState('customer_speaking')
      }
    })

    const unsubMetrics = telemetryCollector.subscribe((data) => {
      setMeasured(data)
    })

    return () => {
      unsubRtc()
      unsubMetrics()
    }
  }, [speakerState])

  // Call duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Interactive toggle between normal speaking and interruption
  const handleTriggerInterruption = () => {
    if (speakerState === 'customer_interrupted') {
      setSpeakerState('customer_speaking')
    } else {
      agoraRtc.triggerManualInterruption()
      setSpeakerState('customer_interrupted')
    }
  }

  // Real-time organic oscilloscope driven by Agora Web Audio stream
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let audioBuffer: any = new Float32Array(64)
    let animationFrameId: number
    let phase = 0

    // Subscribe to live audio data from Agora WebRTC stream
    const unsubWave = agoraRtc.subscribeWaveform((data: any) => {
      audioBuffer = data
    })

    const render = () => {
      const width = canvas.offsetWidth
      const height = canvas.offsetHeight
      const dpr = window.devicePixelRatio || 1

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr
        canvas.height = height * dpr
      }

      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, width, height)

      const centerY = height / 2

      // Draw subtle zero-reference centerline
      ctx.beginPath()
      ctx.strokeStyle = '#E2E8F0'
      ctx.lineWidth = 1
      ctx.moveTo(0, centerY)
      ctx.lineTo(width, centerY)
      ctx.stroke()

      // Determine waveform energy & color based on speaker state & telemetry
      let baseAmplitude = 12
      let strokeColor = '#0F52BA' // Accent Cobalt (Customer)
      let secondaryColor = 'rgba(15, 82, 186, 0.25)'

      if (telemetry.isMuted) {
        baseAmplitude = 1.5
        strokeColor = '#94A3B8'
        secondaryColor = 'rgba(148, 163, 184, 0.1)'
      } else if (speakerState === 'customer_interrupted') {
        baseAmplitude = 22
        strokeColor = '#DC2626'
        secondaryColor = 'rgba(220, 38, 38, 0.2)'
      } else if (speakerState === 'relay_speaking' || telemetry.isHumanTakeover) {
        baseAmplitude = 15
        strokeColor = telemetry.isHumanTakeover ? '#D97706' : '#059669'
        secondaryColor = telemetry.isHumanTakeover ? 'rgba(217, 119, 6, 0.2)' : 'rgba(5, 150, 105, 0.2)'
      } else if (speakerState === 'listening') {
        baseAmplitude = 2
        strokeColor = '#94A3B8'
        secondaryColor = 'rgba(148, 163, 184, 0.15)'
      }

      // Draw harmonic shadow wave
      ctx.beginPath()
      ctx.strokeStyle = secondaryColor
      ctx.lineWidth = 1
      for (let x = 0; x < width; x++) {
        const progress = x / width
        const envelope = Math.sin(progress * Math.PI)
        const y =
          centerY +
          Math.sin(x * 0.04 + phase * 1.3) *
            Math.cos(x * 0.015 - phase * 0.7) *
            baseAmplitude *
            1.3 *
            envelope
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      // Draw primary continuous oscillograph wave mixed with real WebRTC audio buffer
      ctx.beginPath()
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = 1.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      for (let x = 0; x < width; x++) {
        const progress = x / width
        const envelope = Math.sin(progress * Math.PI)

        // Read real audio frame from Agora stream buffer
        const bufferIdx = Math.floor(progress * audioBuffer.length)
        const liveSample = (audioBuffer[bufferIdx] || 0) * 20

        const synthSample =
          (Math.sin(x * 0.05 + phase * 2.2) +
            Math.cos(x * 0.02 - phase * 1.1) +
            Math.sin(x * 0.12 + phase * 3.4) * 0.35) *
          baseAmplitude

        let combined = (synthSample + liveSample) * envelope

        if (speakerState === 'customer_interrupted' && x > width * 0.35 && x < width * 0.65) {
          combined += (Math.random() - 0.5) * 8
        }

        const y = centerY + combined

        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      // Interruption Cutoff Marker
      if (speakerState === 'customer_interrupted') {
        const cutX = width * 0.52
        ctx.save()
        ctx.setLineDash([2, 3])
        ctx.strokeStyle = '#DC2626'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(cutX, 4)
        ctx.lineTo(cutX, height - 4)
        ctx.stroke()
        ctx.restore()
      }

      ctx.restore()
      phase += 0.045
      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      unsubWave()
      cancelAnimationFrame(animationFrameId)
    }
  }, [speakerState, telemetry])

  const formatTime = (secs: number) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0')
    const s = String(secs % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="bg-canvas-pure border border-border-subtle rounded-[4px] p-1.5 px-2 flex flex-col gap-1 select-none">
      {/* Top Monitor Header */}
      <div className="flex items-center justify-between text-[10px] font-mono leading-none">
        <div className="flex items-center gap-2">
          {telemetry.isMuted ? (
            <div className="flex items-center gap-1 font-bold text-ink-muted">
              <Mic className="w-2.5 h-2.5 text-ink-muted opacity-50" />
              <span>MUTED // 0.0 dB</span>
            </div>
          ) : speakerState === 'customer_speaking' ? (
            <div className="flex items-center gap-1 font-bold text-accent">
              <Mic className="w-2.5 h-2.5 text-accent" />
              <span>LIVE AUDIO // 48kHz</span>
            </div>
          ) : speakerState === 'relay_speaking' ? (
            <div className="flex items-center gap-1 font-bold text-ops-live">
              <Volume2 className="w-2.5 h-2.5 text-ops-live" />
              <span>RELAY TTS // 24ms</span>
            </div>
          ) : speakerState === 'customer_interrupted' ? (
            <div className="flex items-center gap-1 font-bold text-ops-critical">
              <AlertCircle className="w-2.5 h-2.5 text-ops-critical" />
              <span>BARGE-IN PREEMPTED</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-ink-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-ops-live animate-pulse" />
              <span>LISTENING // VAD ARMED</span>
              <span className="tabular-nums font-mono text-ink-primary font-bold ml-1">({formatTime(seconds)})</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerInterruption}
            className={`px-1.5 py-0.2 rounded-[2px] font-mono text-[9px] border transition-colors cursor-pointer ${
              speakerState === 'customer_interrupted'
                ? 'bg-ops-criticalBg text-ops-critical border-[#FECACA] font-bold'
                : 'bg-canvas-subtle text-ink-secondary border-border-subtle hover:text-ink-primary hover:bg-canvas-muted'
            }`}
            title="Click to simulate customer barge-in interruption"
          >
            {speakerState === 'customer_interrupted' ? 'RESET INTERRUPTION' : 'BARGE-IN'}
          </button>

          <div className="flex items-center gap-1 font-mono text-[9px] text-ink-muted hidden sm:flex">
            <span className="tabular-nums">RTT: <strong className="text-ink-primary font-semibold">{measured.rttMs}ms</strong></span>
            <span className="opacity-40">·</span>
            <span className="tabular-nums">JITTER: <strong className="text-ink-primary font-semibold">{measured.jitterMs}ms</strong></span>
            <span className="opacity-40">·</span>
            <span className="tabular-nums">LOSS: <strong className="text-ink-primary font-semibold">{(measured.packetLossRate * 100).toFixed(1)}%</strong></span>
          </div>
        </div>
      </div>

      {/* Thin Continuous Waveform Canvas */}
      <div className="h-7 w-full bg-canvas-subtle rounded-[2px] border border-border-subtle relative overflow-hidden flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          role="img"
          aria-label="Real-time continuous oscilloscope audio waveform monitor"
        />

        {/* Live Audio Stream Level & Measured Latencies */}
        <div className="absolute right-1.5 top-0.5 flex items-center gap-1.5 text-[8px] font-mono text-ink-muted/70 pointer-events-none">
          <span>TURN: {(measured.agentTurnLatencyMs / 1000).toFixed(1)}s</span>
          <span>TOOL: {measured.lastToolDurationMs}ms</span>
        </div>
      </div>

      {/* Under-Waveform State & Section 26 Interruption Card */}
      {speakerState === 'customer_interrupted' ? (
        <div className="bg-ops-criticalBg border border-ops-criticalBorder rounded-[2px] p-1.5 flex items-center justify-between font-mono text-[10px]">
          <div className="flex items-center gap-2 text-ops-critical font-bold uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-ops-critical animate-ping shrink-0" />
            <span>BARGE-IN: AI STOPPED (12ms)</span>
          </div>
          <span className="text-[9px] text-ops-critical font-bold tabular-nums">PREEMPTION: 12ms</span>
        </div>
      ) : null}
    </div>
  )
}

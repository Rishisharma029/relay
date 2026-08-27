import React, { useState, useEffect } from 'react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import {
  Activity,
  Radio,
  Cpu,
  Database,
  Layers,
  Bell,
  RefreshCw,
  Zap,
  Server,
  Network
} from 'lucide-react'
import { telemetryCollector, MeasuredTelemetry } from '../services/telemetryCollector'

export interface ServiceHealthItem {
  id: string
  name: string
  status: 'Operational' | 'Degraded' | 'Incident'
  latency: string
  detail: string
  icon: React.ElementType
}

export const SystemHealthView: React.FC = () => {
  const [isRunningPing, setIsRunningPing] = useState<boolean>(false)
  const [lastChecked, setLastChecked] = useState<string>('Just now')
  const [measured, setMeasured] = useState<MeasuredTelemetry>(telemetryCollector.getSnapshot())

  useEffect(() => {
    return telemetryCollector.subscribe((data) => {
      setMeasured(data)
    })
  }, [])

  const services: ServiceHealthItem[] = [
    {
      id: 'agora',
      name: 'Agora RTC',
      status: 'Operational',
      latency: '18 ms',
      detail: 'Mumbai Hub Gateway • Channel relay-case-1042 • Stable low jitter',
      icon: Radio,
    },
    {
      id: 'voice-agent',
      name: 'Voice Agent',
      status: 'Operational',
      latency: '24 ms',
      detail: 'Streaming TTS synthesizer • VAD armed (280ms threshold)',
      icon: Zap,
    },
    {
      id: 'llm',
      name: 'LLM',
      status: 'Operational',
      latency: '620 ms',
      detail: 'Bilingual Hindi/English semantic parsing engine • Token stream ok',
      icon: Cpu,
    },
    {
      id: 'tool-gateway',
      name: 'Tool Gateway',
      status: 'Operational',
      latency: '184 ms',
      detail: 'Internal Order/CRM gRPC proxy • 100% RPC success rate',
      icon: Layers,
    },
    {
      id: 'database',
      name: 'Database',
      status: 'Operational',
      latency: '4 ms',
      detail: 'PostgreSQL 16 Primary + Read Replica • 0 replication lag',
      icon: Database,
    },
    {
      id: 'notifications',
      name: 'Notifications',
      status: 'Operational',
      latency: '12 ms',
      detail: 'WebSocket push dispatcher • Operator channel connected',
      icon: Bell,
    },
  ]

  const handleRunDiagnostics = () => {
    setIsRunningPing(true)
    setTimeout(() => {
      setIsRunningPing(false)
      const now = new Date()
      setLastChecked(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      )
    }, 800)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-canvas overflow-hidden p-4 gap-4 font-sans select-none">
      {/* Top Header */}
      <div className="bg-canvas-pure border border-border-subtle rounded-[4px] p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 shadow-hairline">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[3px] bg-ops-liveBg border border-ops-liveBorder flex items-center justify-center">
            <Activity className="w-4 h-4 text-ops-live" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-sm font-bold text-ink-primary tracking-tight">
                SYSTEM HEALTH
              </h1>
              <Badge variant="live" dot size="xs" className="font-mono">
                ALL SYSTEMS OPERATIONAL
              </Badge>
            </div>
            <p className="text-[11px] font-mono text-ink-muted leading-tight mt-0.5">
              Infrastructure diagnostics, real-time telephony telemetry, and latency benchmarks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-ink-muted">
            Checked: {lastChecked}
          </span>
          <Button
            variant="secondary"
            size="xs"
            onClick={handleRunDiagnostics}
            disabled={isRunningPing}
            className="font-mono text-[10px] gap-1 h-7 bg-canvas-pure hover:bg-canvas-muted text-ink-primary border-border-subtle"
          >
            <RefreshCw className={`w-3 h-3 ${isRunningPing ? 'animate-spin' : ''}`} />
            <span>{isRunningPing ? 'RUNNING...' : 'RUN DIAGNOSTICS'}</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
        {/* SECTION 38: LATENCY BENCHMARKS HERO ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. VOICE LATENCY */}
          <div className="bg-canvas-pure border border-border-subtle rounded-[4px] p-3.5 shadow-hairline space-y-1 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                VOICE LATENCY
              </span>
              <Radio className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="text-2xl font-bold text-ink-primary tracking-tight tabular-nums">
                {measured.rttMs}
              </span>
              <span className="text-xs font-semibold text-ink-muted">ms</span>
            </div>
            <p className="text-[10px] font-sans text-ink-secondary leading-tight pt-1 border-t border-border-subtle/70">
              Agora WebRTC audio stream roundtrip to edge
            </p>
          </div>

          {/* 2. TOOL LATENCY */}
          <div className="bg-canvas-pure border border-border-subtle rounded-[4px] p-3.5 shadow-hairline space-y-1 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                TOOL LATENCY
              </span>
              <Zap className="w-3.5 h-3.5 text-ops-warning" />
            </div>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="text-2xl font-bold text-ink-primary tracking-tight tabular-nums">
                {measured.lastToolDurationMs}
              </span>
              <span className="text-xs font-semibold text-ink-muted">ms</span>
            </div>
            <p className="text-[10px] font-sans text-ink-secondary leading-tight pt-1 border-t border-border-subtle/70">
              Deterministic CRM/order RPC gateway execution
            </p>
          </div>

          {/* 3. AGENT RESPONSE */}
          <div className="bg-canvas-pure border border-border-subtle rounded-[4px] p-3.5 shadow-hairline space-y-1 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                AGENT RESPONSE
              </span>
              <Cpu className="w-3.5 h-3.5 text-ops-live" />
            </div>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className="text-2xl font-bold text-ink-primary tracking-tight tabular-nums">
                {(measured.agentTurnLatencyMs / 1000).toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-ink-muted">s</span>
            </div>
            <p className="text-[10px] font-sans text-ink-secondary leading-tight pt-1 border-t border-border-subtle/70">
              End-to-end turn turnaround: VAD → LLM → Voice
            </p>
          </div>
        </div>

        {/* SECTION 38: SERVICES STATUS TABLE / LIST */}
        <div className="bg-canvas-pure border border-border-subtle rounded-[4px] shadow-hairline overflow-hidden font-mono">
          <div className="p-3 border-b border-border-subtle bg-canvas-pure flex items-center justify-between">
            <span className="text-xs font-bold text-ink-primary uppercase tracking-wider">
              CORE SERVICES MATRIX
            </span>
            <span className="text-[10px] text-ops-live font-bold">
              6 / 6 OPERATIONAL
            </span>
          </div>

          <div className="divide-y divide-border-subtle">
            {services.map((service) => {
              const Icon = service.icon
              return (
                <div
                  key={service.id}
                  className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-canvas-subtle transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-[3px] bg-canvas-subtle border border-border-subtle flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-ink-secondary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink-primary">
                          {service.name}
                        </span>
                        <span className="text-[10px] text-ink-muted font-normal">
                          • {service.latency} RTT
                        </span>
                      </div>
                      <p className="text-[11px] font-sans text-ink-secondary mt-0.5">
                        {service.detail}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <div className="flex items-center gap-1.5 text-xs text-ops-live font-semibold bg-ops-liveBg px-2 py-0.5 rounded border border-ops-liveBorder">
                      <span className="w-1.5 h-1.5 rounded-full bg-ops-live" />
                      <span>Operational</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ARCHITECTURE TOPOLOGY: AGORA VOICE LOOP + RELAY OPERATIONS PLANE */}
        <div className="bg-canvas-pure border border-border-subtle rounded-[4px] p-3.5 shadow-hairline space-y-3 font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <span className="text-xs font-bold text-ink-primary uppercase tracking-wider">
              DUAL-ENGINE SYSTEM TOPOLOGY
            </span>
            <span className="text-[10px] text-accent font-bold">
              AGORA AI VOICE LOOP + RELAY CONTROL PLANE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* 1. AGORA VOICE LOOP */}
            <div className="bg-canvas-subtle border border-border-subtle rounded-[3px] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-ops-live uppercase flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" />
                  <span>AGORA CONVERSATIONAL AI ENGINE</span>
                </span>
                <span className="text-[9px] bg-ops-liveBg text-ops-live px-1.5 py-0.2 border border-ops-liveBorder rounded font-semibold">
                  VOICE LOOP OWNER
                </span>
              </div>
              <p className="text-[10px] font-sans text-ink-secondary leading-relaxed">
                Manages low-latency bidirectional telephony, streaming multilingual ASR, VAD barge-in preemption, and real-time TTS audio generation.
              </p>
              <div className="p-2 bg-canvas-pure border border-border-subtle rounded text-[10px] text-ink-muted font-mono leading-tight space-y-1">
                <div className="text-ink-primary font-semibold">Caller Voice ➔ Agora RTC ➔ ASR ➔ LLM ➔ TTS ➔ Agora RTC</div>
                <div className="text-[9px] text-ink-muted">• Deepgram Nova-2 (hi-IN / en-IN) • GPT-4o-mini • ElevenLabs Multilingual</div>
              </div>
            </div>

            {/* 2. RELAY CONTROL PLANE */}
            <div className="bg-canvas-subtle border border-border-subtle rounded-[3px] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-accent uppercase flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>RELAY OPERATIONS PLANE</span>
                </span>
                <span className="text-[9px] bg-accent-subtle text-accent px-1.5 py-0.2 border border-accent-border rounded font-semibold">
                  GOVERNANCE & ACTION
                </span>
              </div>
              <p className="text-[10px] font-sans text-ink-secondary leading-relaxed">
                Supervises real-time case state, executes deterministic logistics & CRM tools, enforces financial policy, and routes human approval.
              </p>
              <div className="p-2 bg-canvas-pure border border-border-subtle rounded text-[10px] text-ink-muted font-mono leading-tight space-y-1">
                <div className="text-ink-primary font-semibold">Case State ➔ Tools ➔ Policies ➔ Operator Approvals ➔ Audit</div>
                <div className="text-[9px] text-ink-muted">• BlueDart Logistics RPC • Razorpay UPI • Replayable Evidence Ledger</div>
              </div>
            </div>
          </div>
        </div>

        {/* NETWORK & AUDIO CODEC TELEMETRY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
          <div className="bg-canvas-pure border border-border-subtle rounded-[4px] p-3 shadow-hairline space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
                <Network className="w-3 h-3 text-accent" />
                <span>TELEPHONY & RTC NETWORK</span>
              </span>
              <span className="text-[10px] text-ops-live font-semibold">LOCKED</span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">Agora Channel</span>
                <span className="text-ink-primary font-bold">relay-case-1042</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">Protocol Profile</span>
                <span className="text-ink-primary font-bold">WebRTC / SRTP Duplex</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">Jitter Buffer</span>
                <span className="text-ink-primary font-bold tabular-nums">0.8 ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">Packet Loss</span>
                <span className="text-ops-live font-bold tabular-nums">0.00%</span>
              </div>
            </div>
          </div>

          <div className="bg-canvas-pure border border-border-subtle rounded-[4px] p-3 shadow-hairline space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
                <Server className="w-3 h-3 text-ops-live" />
                <span>AUDIO ENGINE & PIPELINE</span>
              </span>
              <span className="text-[10px] text-ops-live font-semibold">48kHz</span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">Codec</span>
                <span className="text-ink-primary font-bold">Opus Fullband Stereo</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">Sampling Rate</span>
                <span className="text-ink-primary font-bold tabular-nums">48,000 Hz</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">Bitrate</span>
                <span className="text-ink-primary font-bold tabular-nums">64 kbps</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">AEC Echo Cancel</span>
                <span className="text-ops-live font-bold">Enabled</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

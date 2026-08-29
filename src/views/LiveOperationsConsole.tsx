import React, { useState } from 'react'
import { Panel } from '../components/ui/Panel'
import { StatMetric } from '../components/ui/StatMetric'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/Table'
import {
  PhoneForwarded,
  Mic,
  Radio,
  Search,
  Filter,
  Cpu,
  Layers,
  UserCheck,
  Disc
} from 'lucide-react'

interface CallSession {
  id: string
  caller: string
  origin: string
  route: string
  handler: string
  status: 'active' | 'synthesizing' | 'hold' | 'escalated'
  duration: string
  mosScore: number
  jitter: string
  sentiment: 'positive' | 'neutral' | 'urgent'
}

const mockCalls: CallSession[] = [
  {
    id: 'RLY-9042',
    caller: '+1 (312) 555-0194',
    origin: 'ORD / Dispatch Alpha',
    route: 'PRIORITY_FLIGHT_OPS',
    handler: 'AGENT-DELTA-01',
    status: 'escalated',
    duration: '03:42',
    mosScore: 4.5,
    jitter: '0.8ms',
    sentiment: 'urgent',
  },
  {
    id: 'RLY-9043',
    caller: '+1 (415) 555-8321',
    origin: 'SFO / Gate Control',
    route: 'AUTO_VOICE_SYNTH',
    handler: 'AI-CORE-V3',
    status: 'synthesizing',
    duration: '01:15',
    mosScore: 4.4,
    jitter: '1.2ms',
    sentiment: 'neutral',
  },
  {
    id: 'RLY-9044',
    caller: '+1 (212) 555-4920',
    origin: 'JFK / Logistics Hub',
    route: 'CARRIER_TRUNK_08',
    handler: 'OPERATOR-J-MILLER',
    status: 'active',
    duration: '06:28',
    mosScore: 4.3,
    jitter: '1.4ms',
    sentiment: 'positive',
  },
  {
    id: 'RLY-9045',
    caller: '+1 (206) 555-7788',
    origin: 'SEA / Ground Control',
    route: 'AUTO_VOICE_SYNTH',
    handler: 'AI-CORE-V2',
    status: 'hold',
    duration: '00:48',
    mosScore: 4.2,
    jitter: '2.1ms',
    sentiment: 'neutral',
  },
  {
    id: 'RLY-9046',
    caller: '+1 (305) 555-9011',
    origin: 'MIA / Ramp Ops',
    route: 'PRIORITY_FLIGHT_OPS',
    handler: 'AI-CORE-V3',
    status: 'active',
    duration: '02:04',
    mosScore: 4.5,
    jitter: '0.9ms',
    sentiment: 'neutral',
  },
  {
    id: 'RLY-9047',
    caller: '+1 (512) 555-3211',
    origin: 'AUS / Support Line',
    route: 'GENERAL_DISPATCH',
    handler: 'OPERATOR-K-CHEN',
    status: 'active',
    duration: '04:19',
    mosScore: 4.1,
    jitter: '1.8ms',
    sentiment: 'positive',
  },
]

export const LiveOperationsConsole: React.FC = () => {
  const [selectedCallId, setSelectedCallId] = useState<string>('RLY-9042')
  const [filterQueue, setFilterQueue] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const selectedCall = mockCalls.find((c) => c.id === selectedCallId) || mockCalls[0]

  const statusBadgeVariant = (status: CallSession['status']) => {
    switch (status) {
      case 'active':
        return 'live'
      case 'synthesizing':
        return 'accent'
      case 'hold':
        return 'warning'
      case 'escalated':
        return 'critical'
      default:
        return 'default'
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-canvas overflow-hidden p-2 gap-2">
      {/* Top Telemetry KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 shrink-0">
        <StatMetric
          label="ACTIVE CONCURRENCY"
          value="142"
          unit="/ 200 MAX"
          subtext="Load: 71.0% (Stable)"
          status="live"
        />
        <StatMetric
          label="AUDIO ROUNDTRIP"
          value="18.4"
          unit="ms"
          subtext="Jitter: ±1.1ms | Codec: Opus 48k"
          status="normal"
        />
        <StatMetric
          label="SLA PICKUP RATE"
          value="99.8"
          unit="%"
          subtext="Avg queue hold: 1.8s"
          status="live"
        />
        <StatMetric
          label="SYNTHESIZER LOAD"
          value="41.2"
          unit="%"
          subtext="Inference latency: 42ms"
          status="normal"
        />
        <StatMetric
          label="ACTIVE ESCALATIONS"
          value="03"
          unit="CHANNELS"
          subtext="Priority tier: ALPHA"
          status="warning"
        />
      </div>

      {/* Main Split Console Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 min-h-0">
        {/* Left 7 Cols: Dispatch Queue & Call Matrix */}
        <Panel
          className="lg:col-span-7 flex flex-col min-h-0 shadow-hairline"
          title={
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink-primary uppercase tracking-tight">
                CALL CONSOLE MATRIX
              </span>
              <Badge variant="mono" size="xs">
                {mockCalls.length} ACTIVE
              </Badge>
            </div>
          }
          action={
            <div className="flex items-center gap-2">
              <SegmentedControl
                options={[
                  { id: 'all', label: 'All', count: 142 },
                  { id: 'priority', label: 'Priority', count: 3 },
                  { id: 'ai', label: 'AI Voice', count: 88 },
                  { id: 'operator', label: 'Human', count: 51 },
                ]}
                activeId={filterQueue}
                onChange={setFilterQueue}
                size="xs"
              />
            </div>
          }
          noPadding
        >
          {/* Filter Bar */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-subtle bg-canvas-subtle gap-2">
            <div className="flex items-center gap-1.5 flex-1 max-w-xs">
              <Search className="w-3 h-3 text-ink-muted shrink-0" />
              <input
                type="text"
                placeholder="Search Call ID, Caller ID, Route..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-canvas-pure border border-border-subtle rounded-[3px] px-2 py-0.5 text-xs text-ink-primary placeholder-ink-muted focus:outline-none focus:border-accent w-full"
              />
            </div>

            <div className="flex items-center gap-1">
              <Button variant="secondary" size="xs" className="gap-1">
                <Filter className="w-3 h-3 text-ink-muted" />
                <span>FILTER</span>
              </Button>
              <Button variant="secondary" size="xs" className="gap-1">
                <Layers className="w-3 h-3 text-ink-muted" />
                <span>COLS</span>
              </Button>
            </div>
          </div>

          {/* Tabular Grid */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <Table>
              <TableHeader>
                <tr>
                  <TableHead>SESSION ID</TableHead>
                  <TableHead>CALLER / ORIGIN</TableHead>
                  <TableHead>ROUTE / QUEUE</TableHead>
                  <TableHead>HANDLER</TableHead>
                  <TableHead>STATUS</TableHead>
                  <TableHead>DUR</TableHead>
                  <TableHead>MOS</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {mockCalls.map((call) => {
                  const isSelected = call.id === selectedCallId
                  return (
                    <TableRow
                      key={call.id}
                      active={isSelected}
                      onClick={() => setSelectedCallId(call.id)}
                    >
                      <TableCell mono className="font-semibold text-ink-primary">
                        {call.id}
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-[11px] text-ink-primary leading-tight">
                          {call.caller}
                        </div>
                        <div className="text-[10px] text-ink-muted leading-tight">
                          {call.origin}
                        </div>
                      </TableCell>
                      <TableCell mono className="text-ink-secondary text-[10px]">
                        {call.route}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-[10px] bg-canvas-muted px-1.5 py-0.5 rounded-[2px] text-ink-secondary">
                          {call.handler}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(call.status)} dot size="xs">
                          {call.status}
                        </Badge>
                      </TableCell>
                      <TableCell mono className="text-ink-secondary">
                        {call.duration}
                      </TableCell>
                      <TableCell mono className="font-semibold">
                        <span
                          className={
                            call.mosScore >= 4.3 ? 'text-ops-live' : 'text-ops-warning'
                          }
                        >
                          {call.mosScore.toFixed(1)}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Panel>

        {/* Right 5 Cols: Selected Call Telemetry & Waveform Inspector */}
        <Panel
          className="lg:col-span-5 flex flex-col min-h-0 shadow-hairline"
          title={
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-semibold text-ink-primary uppercase tracking-tight">
                TRANSMISSION INSPECTOR: {selectedCall.id}
              </span>
            </div>
          }
          action={
            <div className="flex items-center gap-1">
              <Badge variant={statusBadgeVariant(selectedCall.status)} dot size="xs">
                {selectedCall.status}
              </Badge>
            </div>
          }
          noPadding
        >
          {/* Transmission Overview Header */}
          <div className="p-3 bg-canvas-subtle border-b border-border-subtle flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-ink-primary">
                  {selectedCall.caller}
                </span>
                <span className="text-ink-muted text-xs">({selectedCall.origin})</span>
              </div>
              <div className="font-mono text-xs font-semibold text-accent">
                {selectedCall.duration}
              </div>
            </div>

            {/* Simulated Live Audio Spectrum */}
            <div className="bg-canvas-pure border border-border-subtle rounded-[4px] p-2 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-ink-muted">
                <div className="flex items-center gap-1.5">
                  <Disc className="w-3 h-3 text-ops-live animate-spin" />
                  <span>RTP 48kHz OPUS STEREO</span>
                </div>
                <span>JITTER: {selectedCall.jitter} | LOSS: 0.00%</span>
              </div>

              {/* Bar waveform */}
              <div className="flex items-end justify-between h-8 gap-0.5 px-1 bg-canvas-subtle rounded-[2px] overflow-hidden">
                {[
                  12, 28, 45, 78, 60, 32, 50, 92, 70, 40, 65, 80, 55, 30, 20, 48,
                  88, 72, 35, 60, 85, 90, 44, 25, 65, 75, 52, 30, 18, 40, 68, 85,
                  94, 62, 35, 50, 70, 45, 20, 32,
                ].map((height, i) => (
                  <div
                    key={i}
                    style={{ height: `${height}%` }}
                    className="w-1 bg-accent/80 rounded-none transition-all duration-75 hover:bg-accent"
                  />
                ))}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              <Button variant="secondary" size="xs" className="gap-1 font-mono text-[10px]">
                <Mic className="w-3 h-3" />
                <span>MUTE</span>
              </Button>
              <Button variant="secondary" size="xs" className="gap-1 font-mono text-[10px]">
                <PhoneForwarded className="w-3 h-3" />
                <span>TRANSFER</span>
              </Button>
              <Button variant="secondary" size="xs" className="gap-1 font-mono text-[10px]">
                <UserCheck className="w-3 h-3" />
                <span>BARGE</span>
              </Button>
              <Button variant="danger" size="xs" className="gap-1 font-mono text-[10px]">
                <span>TERMINATE</span>
              </Button>
            </div>
          </div>

          {/* Diarized Real-Time Transcript Stream */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0 bg-canvas-pure">
            <div className="flex items-center justify-between text-[10px] font-mono text-ink-muted border-b border-border-subtle pb-1">
              <span>LIVE SPEECH-TO-TEXT // DIARIZATION</span>
              <span>CONFIDENCE: 98.4%</span>
            </div>

            {/* Transcript Messages */}
            <div className="space-y-2 text-xs">
              <div className="flex gap-2">
                <span className="font-mono text-[10px] font-bold text-accent shrink-0 pt-0.5">
                  [CALLER]
                </span>
                <div className="bg-canvas-subtle p-2 rounded-[4px] border border-border-subtle text-ink-primary flex-1 leading-relaxed">
                  Tower, Relay 402 inbound approach runway 27R with heavy crosswind advisory. Need immediate gate slot update.
                  <div className="mt-1 flex items-center gap-1.5 text-[9px] font-mono text-ink-muted">
                    <span>14:32:01 UTC</span>
                    <span>•</span>
                    <span className="text-ops-warning font-semibold">TAG: RUNWAY_APPROACH</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <span className="font-mono text-[10px] font-bold text-ops-live shrink-0 pt-0.5">
                  [AI-VOX]
                </span>
                <div className="bg-accent-subtle/50 p-2 rounded-[4px] border border-accent-border/60 text-ink-primary flex-1 leading-relaxed">
                  Relay 402, gate Delta-14 assigned. Wind vector 280 at 22 knots, gusts 31. Surface radar synced. Proceeding on final vector.
                  <div className="mt-1 flex items-center gap-1.5 text-[9px] font-mono text-ink-muted">
                    <span>14:32:04 UTC</span>
                    <span>•</span>
                    <span className="text-accent font-semibold">SYNTH_LATENCY: 38ms</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <span className="font-mono text-[10px] font-bold text-accent shrink-0 pt-0.5">
                  [CALLER]
                </span>
                <div className="bg-canvas-subtle p-2 rounded-[4px] border border-border-subtle text-ink-primary flex-1 leading-relaxed">
                  Roger Delta-14. Contacting ramp control on 121.8. Thanks Relay.
                  <div className="mt-1 flex items-center gap-1.5 text-[9px] font-mono text-ink-muted">
                    <span>14:32:09 UTC</span>
                    <span>•</span>
                    <span className="text-ops-live font-semibold">SENTIMENT: RESOLVED</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Diagnostics Footer */}
          <div className="p-2 border-t border-border-subtle bg-canvas-subtle flex items-center justify-between text-[10px] font-mono text-ink-muted">
            <div className="flex items-center gap-2">
              <span>SIP CODEC: G.711u / OPUS</span>
              <span>•</span>
              <span>CARRIER: LEVEL3-TRUNK-2</span>
            </div>
            <div className="flex items-center gap-1 text-ink-primary font-semibold">
              <Cpu className="w-3 h-3 text-accent" />
              <span>GPU-NODE-07</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}

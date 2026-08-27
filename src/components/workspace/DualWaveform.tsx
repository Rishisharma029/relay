import React from 'react'
import { Disc, Mic, Volume2 } from 'lucide-react'

export const DualWaveform: React.FC = () => {
  // Simulated bar heights for customer and relay audio tracks
  const customerBars = [
    18, 35, 60, 85, 70, 42, 20, 15, 25, 50, 75, 90, 65, 30, 15, 10,
    20, 45, 65, 50, 30, 18, 12, 28, 48, 70, 82, 60, 35, 18, 10, 22,
  ]

  const relayBars = [
    10, 15, 22, 35, 55, 80, 92, 75, 50, 68, 88, 95, 78, 45, 30, 20,
    35, 60, 82, 70, 40, 25, 38, 65, 85, 90, 72, 48, 28, 15, 12, 18,
  ]

  return (
    <div className="bg-canvas-pure border border-border-subtle rounded-[4px] p-2 flex flex-col gap-2">
      {/* Top Track: CUSTOMER */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <div className="flex items-center gap-1.5 font-bold text-accent">
            <Mic className="w-3 h-3 text-accent" />
            <span>CUSTOMER (INBOUND)</span>
          </div>
          <span className="text-ink-muted">VOX DETECTED • 48kHz OPUS</span>
        </div>

        <div className="flex items-end justify-between h-6 gap-0.5 px-1 bg-canvas-subtle rounded-[2px] overflow-hidden border border-border-subtle">
          {customerBars.map((h, i) => (
            <div
              key={i}
              style={{ height: `${h}%` }}
              className="w-1 bg-accent/70 rounded-none transition-all duration-75 hover:bg-accent"
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border-subtle w-full" />

      {/* Bottom Track: RELAY */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <div className="flex items-center gap-1.5 font-bold text-ops-live">
            <Volume2 className="w-3 h-3 text-ops-live" />
            <span>RELAY (AI SYNTHESIZER)</span>
          </div>
          <div className="flex items-center gap-1 text-ink-muted">
            <Disc className="w-2.5 h-2.5 text-ops-live animate-spin" />
            <span>LATENCY: 32ms</span>
          </div>
        </div>

        <div className="flex items-end justify-between h-6 gap-0.5 px-1 bg-canvas-subtle rounded-[2px] overflow-hidden border border-border-subtle">
          {relayBars.map((h, i) => (
            <div
              key={i}
              style={{ height: `${h}%` }}
              className="w-1 bg-ops-live/80 rounded-none transition-all duration-75 hover:bg-ops-live"
            />
          ))}
        </div>
      </div>
    </div>
  )
}

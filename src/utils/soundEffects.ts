/**
 * SECTION 44: SOUND DESIGN (Web Audio API Synthesizer)
 *
 * Provides ultra-subtle, professional confirmation earcons for operations:
 * - Call connected
 * - Tool executed
 * - Approval requested
 * - Human takeover
 * - Call ended
 *
 * No annoying startup jingles. Used strictly for operational confirmation.
 */

class SoundEngine {
  private ctx: AudioContext | null = null
  private isEnabled: boolean = true

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled
  }

  public getEnabled(): boolean {
    return this.isEnabled
  }

  /**
   * 1. Call Connected
   * Subtle upward dual blip confirming Agora WebRTC duplex lock
   */
  public playCallConnected() {
    if (!this.isEnabled) return
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, now) // A5
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.06) // D6

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.1)
    } catch {
      // Ignore autoplay policy exceptions
    }
  }

  /**
   * 2. Tool Executed
   * Crisp, soft micro-chime confirming RPC completion
   */
  public playToolExecuted() {
    if (!this.isEnabled) return
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(659.25, now) // E5

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.07)
    } catch {}
  }

  /**
   * 3. Approval Requested
   * Gentle double tone alerting operator of policy gate
   */
  public playApprovalRequested() {
    if (!this.isEnabled) return
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime

      // Tone 1
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(523.25, now) // C5
      gain1.gain.setValueAtTime(0.06, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.07)

      // Tone 2
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(659.25, now + 0.08) // E5
      gain2.gain.setValueAtTime(0.001, now + 0.08)
      gain2.gain.exponentialRampToValueAtTime(0.07, now + 0.09)
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.17)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now + 0.08)
      osc2.stop(now + 0.18)
    } catch {}
  }

  /**
   * 4. Human Takeover
   * Deep, reassuring bridge tone signaling 0ms human transition
   */
  public playHumanTakeover() {
    if (!this.isEnabled) return
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(440, now) // A4
      osc.frequency.exponentialRampToValueAtTime(554.37, now + 0.08) // C#5

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.exponentialRampToValueAtTime(0.09, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.15)
    } catch {}
  }

  /**
   * 5. Call Ended
   * Soft descending warm tone confirming graceful session archiving
   */
  public playCallEnded() {
    if (!this.isEnabled) return
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, now) // D5
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.12) // A4

      gain.gain.setValueAtTime(0.07, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.15)
    } catch {}
  }
}

export const soundEffects = new SoundEngine()

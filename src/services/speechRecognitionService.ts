/**
 * RELAY — Real-Time Browser Speech Recognition (ASR) & Speech Synthesis (TTS)
 *
 * Captures real continuous user microphone audio into text (Hindi / English / Hinglish),
 * emits transcripts to the Live Workstation, and synthesizes RELAY AI's voice response.
 */

export interface SpeechRecognitionResultPayload {
  text: string
  isFinal: boolean
  confidence: number
  language: string
}

export type SpeechCallback = (payload: SpeechRecognitionResultPayload) => void

class SpeechRecognitionService {
  private recognition: any = null
  private isListening: boolean = false
  private currentLanguage: string = 'hi-IN'
  private subscribers: Set<SpeechCallback> = new Set()
  private speakingSubscribers: Set<(isSpeaking: boolean) => void> = new Set()
  private restartTimeout: any = null
  private isSynthesizingSpeech: boolean = false
  private silenceTimer: any = null
  private isSpeechSynthesisSupported: boolean = typeof window !== 'undefined' && 'speechSynthesis' in window

  constructor() {
    this.initRecognition()
  }

  public isSpeakingTTS(): boolean {
    return this.isSynthesizingSpeech || (typeof window !== 'undefined' && !!window.speechSynthesis?.speaking)
  }

  public cancelSpeech() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel()
      } catch (e) {}
    }
    this.isSynthesizingSpeech = false
  }

  private initRecognition() {
    if (typeof window === 'undefined') return

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition

    if (!SpeechRecognition) {
      console.warn('[ASR] SpeechRecognition API not supported in this browser. Falling back to simulation/manual input.')
      return
    }

    try {
      this.recognition = new SpeechRecognition()
      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.recognition.maxAlternatives = 1
      this.recognition.lang = this.currentLanguage

      this.recognition.onspeechstart = () => {
        // Echo barrier: Ignore mic trigger if RELAY is speaking
        if (this.isSpeakingTTS()) return
        this.notifySpeaking(true)
      }

      this.recognition.onspeechend = () => {
        this.notifySpeaking(false)
      }

      this.recognition.onaudioend = () => {
        this.notifySpeaking(false)
      }

      this.recognition.onresult = (event: any) => {
        // Echo barrier: Strictly discard mic input if RELAY is synthesizing speech
        if (this.isSpeakingTTS()) {
          return
        }

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i]
          const text = result[0]?.transcript?.trim()
          if (!text) continue

          const isFinal = result.isFinal
          const confidence = result[0]?.confidence || 0.9

          if (!isFinal) {
            this.notifySpeaking(true)
            if (this.silenceTimer) clearTimeout(this.silenceTimer)
            this.silenceTimer = setTimeout(() => {
              this.notifySpeaking(false)
            }, 1200)
          } else {
            this.notifySpeaking(false)
            if (this.silenceTimer) clearTimeout(this.silenceTimer)
          }

          this.notifySubscribers({
            text,
            isFinal,
            confidence,
            language: this.currentLanguage,
          })
        }
      }

      this.recognition.onerror = (event: any) => {
        console.warn('[ASR] Speech recognition error:', event.error)
        this.notifySpeaking(false)
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.isListening = false
        }
      }

      this.recognition.onend = () => {
        this.notifySpeaking(false)
        if (this.isListening) {
          // Continuous loop: restart after short delay
          this.restartTimeout = setTimeout(() => {
            if (this.isListening && this.recognition) {
              try {
                this.recognition.start()
              } catch (e) {}
            }
          }, 300)
        }
      }
    } catch (err) {
      console.warn('[ASR] Failed to initialize SpeechRecognition:', err)
    }
  }

  public setLanguage(lang: string) {
    this.currentLanguage = lang
    if (this.recognition) {
      this.recognition.lang = lang
      if (this.isListening) {
        try {
          this.recognition.stop()
        } catch (e) {}
      }
    }
  }

  public startListening(): boolean {
    if (!this.recognition) {
      this.initRecognition()
    }
    if (!this.recognition) return false

    try {
      this.isListening = true
      this.recognition.start()
      console.log('[ASR] Started continuous microphone speech recognition in', this.currentLanguage)
      return true
    } catch (err: any) {
      // If already started, ignore error
      if (err.name === 'InvalidStateError') {
        this.isListening = true
        return true
      }
      console.warn('[ASR] Could not start speech recognition:', err)
      return false
    }
  }

  public stopListening() {
    this.isListening = false
    this.notifySpeaking(false)
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout)
      this.restartTimeout = null
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer)
      this.silenceTimer = null
    }
    if (this.recognition) {
      try {
        this.recognition.stop()
      } catch (e) {}
    }
  }

  public subscribe(cb: SpeechCallback): () => void {
    this.subscribers.add(cb)
    return () => this.subscribers.delete(cb)
  }

  public subscribeSpeaking(cb: (isSpeaking: boolean) => void): () => void {
    this.speakingSubscribers.add(cb)
    return () => this.speakingSubscribers.delete(cb)
  }

  private notifySpeaking(isSpeaking: boolean) {
    this.speakingSubscribers.forEach((cb) => {
      try {
        cb(isSpeaking)
      } catch (err) {
        console.error('[ASR] Speaking subscriber callback error:', err)
      }
    })
  }

  private notifySubscribers(payload: SpeechRecognitionResultPayload) {
    this.subscribers.forEach((cb) => {
      try {
        cb(payload)
      } catch (err) {
        console.error('[ASR] Subscriber callback error:', err)
      }
    })
  }

  private agentGender: 'female' | 'male' = 'female'

  public setAgentGender(gender: 'female' | 'male') {
    this.agentGender = gender
  }

  public getAgentGender(): 'female' | 'male' {
    return this.agentGender
  }

  /**
   * Browser Speech Synthesis (TTS): Speaks text out loud through speakers with strict gender voice matching
   */
  public speak(
    text: string,
    language: string = 'hi-IN',
    gender?: 'female' | 'male',
    onEnd?: () => void,
    onStart?: () => void
  ) {
    if (!this.isSpeechSynthesisSupported || !text) {
      onEnd?.()
      return
    }

    try {
      this.isSynthesizingSpeech = true
      window.speechSynthesis.cancel() // Cancel any in-flight utterance

      const cleanText = text.replace(/[*_#"`]/g, '').trim()
      const utterance = new SpeechSynthesisUtterance(cleanText)

      let finished = false
      const finishOnce = () => {
        if (!finished) {
          finished = true
          setTimeout(() => {
            this.isSynthesizingSpeech = false
          }, 350)
          onEnd?.()
        }
      }

      utterance.onstart = () => {
        this.isSynthesizingSpeech = true
        onStart?.()
      }

      utterance.onend = () => {
        finishOnce()
      }

      utterance.onerror = (e) => {
        console.warn('[TTS] Speech error or canceled:', e)
        finishOnce()
      }

      // Safety timeout in case TTS hangs without emitting onend
      const estDurationMs = Math.max(1500, Math.min(12000, (cleanText.length / 15) * 1000 + 1000))
      setTimeout(() => {
        finishOnce()
      }, estDurationMs)

      const targetGender = gender || this.agentGender
      const isMale = targetGender === 'male'

      // Pitch and rate adjusted strictly by gender
      utterance.pitch = isMale ? 0.88 : 1.25
      utterance.rate = isMale ? 1.0 : 1.04

      // Match best available gender-appropriate voice from OS/Browser
      const voices = window.speechSynthesis.getVoices()
      utterance.lang = language || (cleanText.includes('main') || cleanText.includes('hai') || cleanText.includes('hoon') ? 'hi-IN' : 'en-IN')

      let matchedVoice = null

      if (isMale) {
        utterance.pitch = 0.68 // Deep masculine pitch
        utterance.rate = 0.98

        // Strictly search for Male voices across browser/OS voices
        matchedVoice =
          voices.find(
            (v) =>
              (v.name.toLowerCase().includes('david') ||
                v.name.toLowerCase().includes('mark') ||
                v.name.toLowerCase().includes('george') ||
                v.name.toLowerCase().includes('ravi') ||
                v.name.toLowerCase().includes('madhav') ||
                v.name.toLowerCase().includes('hemant') ||
                v.name.toLowerCase().includes('male')) &&
              !v.name.toLowerCase().includes('female') &&
              !v.name.toLowerCase().includes('swara') &&
              !v.name.toLowerCase().includes('heera') &&
              !v.name.toLowerCase().includes('zira')
          ) ||
          voices.find((v) => v.name.toLowerCase().includes('david')) ||
          voices.find(
            (v) =>
              !v.name.toLowerCase().includes('female') &&
              !v.name.toLowerCase().includes('zira') &&
              !v.name.toLowerCase().includes('swara') &&
              !v.name.toLowerCase().includes('heera')
          )
      } else {
        utterance.pitch = 1.25 // Bright feminine pitch
        utterance.rate = 1.04

        // Strictly search for Female voices across browser/OS voices
        matchedVoice =
          voices.find(
            (v) =>
              v.name.toLowerCase().includes('swara') ||
              v.name.toLowerCase().includes('heera') ||
              v.name.toLowerCase().includes('kalpana') ||
              v.name.toLowerCase().includes('zira') ||
              v.name.toLowerCase().includes('veena') ||
              v.name.toLowerCase().includes('female') ||
              v.name.toLowerCase().includes('google हिन्दी')
          ) || voices.find((v) => v.lang.includes('hi'))
      }

      if (matchedVoice) {
        utterance.voice = matchedVoice
      }

      window.speechSynthesis.speak(utterance)
    } catch (err) {
      console.warn('[TTS] Speech synthesis playback error:', err)
      onEnd?.()
    }
  }
}

export const speechService = new SpeechRecognitionService()

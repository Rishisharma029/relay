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
  private restartTimeout: any = null
  private isSpeechSynthesisSupported: boolean = typeof window !== 'undefined' && 'speechSynthesis' in window

  constructor() {
    this.initRecognition()
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

      this.recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i]
          const text = result[0]?.transcript?.trim()
          if (!text) continue

          const isFinal = result.isFinal
          const confidence = result[0]?.confidence || 0.9

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
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.isListening = false
        }
      }

      this.recognition.onend = () => {
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
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout)
      this.restartTimeout = null
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
  public speak(text: string, language: string = 'hi-IN', gender?: 'female' | 'male') {
    if (!this.isSpeechSynthesisSupported || !text) return

    try {
      window.speechSynthesis.cancel() // Cancel any in-flight utterance

      const cleanText = text.replace(/[*_#"`]/g, '').trim()
      const utterance = new SpeechSynthesisUtterance(cleanText)

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
    }
  }
}

export const speechService = new SpeechRecognitionService()

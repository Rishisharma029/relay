/**
 * RELAY — Authoritative Real-Time Multilingual Language Manager
 * Detects dynamic dialect shifts (hi-IN <-> en-IN), updates session language state, and adapts ASR/TTS prompts without session teardown.
 */

class SessionLanguageStore {
  constructor() {
    this.sessionLanguages = new Map() // caseId -> languageCode
  }

  getLanguage(caseId = 'RLY-1042') {
    return this.sessionLanguages.get(caseId) || 'hi-IN'
  }

  setLanguage(caseId = 'RLY-1042', languageCode = 'en-IN') {
    this.sessionLanguages.set(caseId, languageCode)
    return languageCode
  }
}

export const sessionLanguageStore = new SessionLanguageStore()

/**
 * Detects if utterance contains an explicit or implicit language switch directive.
 */
export function detectLanguageShift(utterance = '', currentLanguage = 'hi-IN') {
  const text = utterance.toLowerCase().trim()

  // Switch to English triggers
  const englishTriggers = [
    'continue in english',
    'speak in english',
    'talk in english',
    'english please',
    'can we speak in english',
    'switch to english',
    'in english',
  ]

  // Switch to Hindi triggers
  const hindiTriggers = [
    'hindi mein',
    'hindi me',
    'hindi please',
    'switch to hindi',
    'hindi mein baat',
    'shuddh hindi',
  ]

  const wantsEnglish = englishTriggers.some((t) => text.includes(t))
  const wantsHindi = hindiTriggers.some((t) => text.includes(t))

  if (wantsEnglish && currentLanguage !== 'en-IN') {
    return {
      shifted: true,
      from: currentLanguage,
      to: 'en-IN',
      targetName: 'English (India)',
      confidence: 0.98,
      reason: 'Customer explicitly requested English communication',
    }
  }

  if (wantsHindi && currentLanguage !== 'hi-IN') {
    return {
      shifted: true,
      from: currentLanguage,
      to: 'hi-IN',
      targetName: 'Hindi (Devanagari / Hinglish)',
      confidence: 0.98,
      reason: 'Customer explicitly requested Hindi communication',
    }
  }

  return {
    shifted: false,
    current: currentLanguage,
  }
}

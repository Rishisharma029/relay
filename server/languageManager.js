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
 * Detects if utterance is English vs Hindi/Hinglish or contains an explicit language switch directive.
 */
export function detectLanguageShift(utterance = '', currentLanguage = 'hi-IN') {
  const text = utterance.toLowerCase().trim()
  if (!text) return { shifted: false, current: currentLanguage }

  // 1. Explicit Switch Triggers
  const englishTriggers = [
    'continue in english',
    'speak in english',
    'talk in english',
    'english please',
    'can we speak in english',
    'switch to english',
    'in english',
  ]

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

  if (wantsEnglish) {
    return {
      shifted: true,
      from: currentLanguage,
      to: 'en-IN',
      targetName: 'English (India)',
      confidence: 0.99,
      reason: 'Customer explicitly requested English communication',
    }
  }

  if (wantsHindi) {
    return {
      shifted: true,
      from: currentLanguage,
      to: 'hi-IN',
      targetName: 'Hindi (Devanagari / Hinglish)',
      confidence: 0.99,
      reason: 'Customer explicitly requested Hindi communication',
    }
  }

  // 2. Natural Language Content Analysis
  const hindiKeywords = [
    'mera',
    'meri',
    'mere',
    'karo',
    'karein',
    'karti',
    'karta',
    'chahiye',
    'aaya',
    'aayi',
    'aaye',
    'nahi',
    'naahi',
    'paisa',
    'paise',
    'madad',
    'namaste',
    'hai',
    'hain',
    'hoon',
    'kya',
    'kyun',
    'kab',
    'kahan',
    'batao',
    'bhejo',
    'shukriya',
    'dhanyawad',
    'theek',
    'accha',
    'suno',
    'pehle',
    'wapas',
  ]

  const englishKeywords = [
    'where',
    'what',
    'when',
    'why',
    'how',
    'order',
    'refund',
    'delivery',
    'delayed',
    'status',
    'cancel',
    'tracking',
    'package',
    'parcel',
    'arrive',
    'arrived',
    'please',
    'help',
    'need',
    'want',
    'money',
    'account',
    'thank',
    'good',
    'hello',
  ]

  const words = text.split(/\s+/)
  const hindiMatchCount = words.filter((w) => hindiKeywords.some((k) => w.includes(k))).length
  const englishMatchCount = words.filter((w) => englishKeywords.some((k) => w.includes(k))).length

  // If user spoke strictly English phrases (e.g. "where is my order", "I want a refund", "please check status")
  if (englishMatchCount > 0 && hindiMatchCount === 0 && currentLanguage !== 'en-IN') {
    return {
      shifted: true,
      from: currentLanguage,
      to: 'en-IN',
      targetName: 'English (India)',
      confidence: 0.95,
      reason: 'Natural English utterance detected',
    }
  }

  // If user spoke Hindi (e.g. "Mera order nahi aaya", "Mujhe refund chahiye")
  if (hindiMatchCount > 0 && currentLanguage !== 'hi-IN') {
    return {
      shifted: true,
      from: currentLanguage,
      to: 'hi-IN',
      targetName: 'Hindi (Devanagari / Hinglish)',
      confidence: 0.95,
      reason: 'Natural Hindi / Hinglish utterance detected',
    }
  }

  return {
    shifted: false,
    current: currentLanguage,
  }
}

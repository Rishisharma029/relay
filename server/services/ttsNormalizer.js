/**
 * RELAY — Deterministic TTS Normalizer & Phonetic Synthesizer
 *
 * Converts rich UI transcripts (Devanagari Hindi, currency symbols, large numbers,
 * abbreviations, and technical terms) into 100% TTS-safe, clearly pronounced Latin Hinglish.
 */

// Devanagari character mapping table
const DEVANAGARI_VOWELS = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
  'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
  'अं': 'an', 'अः': 'ah'
};

const DEVANAGARI_MATRAS = {
  'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
  'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
  'ं': 'n', 'ँ': 'n', 'ः': 'h', '्': ''
};

const DEVANAGARI_CONSONANTS = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v',
  'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'ड़': 'd', 'ढ़': 'dh', 'ज़': 'z', 'फ़': 'f', 'क़': 'q', 'ख़': 'kh', 'ग़': 'gh'
};

// Common conversational words dictionary for natural phonetics
const COMMON_WORD_MAP = {
  'मैंने': 'Maine',
  'मैने': 'Maine',
  'आपका': 'aapka',
  'आपकी': 'aapki',
  'आपके': 'aapke',
  'ऑर्डर': 'order',
  'आर्डर': 'order',
  'चेक': 'check',
  'कर': 'kar',
  'लिया': 'liya',
  'ली': 'lee',
  'दी': 'dee',
  'दिया': 'diya',
  'है': 'hai',
  'हैं': 'hain',
  'हूँ': 'hoon',
  'हूं': 'hoon',
  'होगा': 'hoga',
  'होगी': 'hogi',
  'होंगे': 'honge',
  'दिल्लीवरी': 'Delhivery',
  'डिलिवरी': 'delivery',
  'डिलीवरी': 'delivery',
  'एक्सप्रेस': 'Express',
  'के': 'ke',
  'की': 'ki',
  'का': 'ka',
  'को': 'ko',
  'से': 'se',
  'में': 'mein',
  'साथ': 'saath',
  'दिन': 'days',
  'लेट': 'late',
  'देरी': 'deri',
  'पॉलिसी': 'Policy',
  'पालिसी': 'Policy',
  'नियम': 'niyam',
  'तहत': 'tahat',
  'रिफंड': 'refund',
  'एलिजिबल': 'eligible',
  'योग्य': 'yogya',
  'लेकिन': 'lekin',
  'मगर': 'magar',
  'पर': 'par',
  'ह्यूमन': 'human',
  'इंसान': 'insan',
  'ऑपरेटर': 'operator',
  'मंज़ूरी': 'approval',
  'मंजूरी': 'approval',
  'स्वीकृति': 'approval',
  'अप्रूवल': 'approval',
  'ज़रूरी': 'zaroori',
  'जरूरी': 'zaroori',
  'आवश्यक': 'zaroori',
  'इसके': 'iske',
  'लिए': 'liye',
  'तुरंत': 'turant',
  'नमस्ते': 'Namaste',
  'धन्यवाद': 'Dhanyawad',
  'शुक्रिया': 'Shukriya',
  'कृपया': 'Kripya',
  'हाँ': 'haan',
  'नहीं': 'nahi',
  'रही': 'rahi',
  'रहा': 'raha',
  'रहे': 'rahe',
  'सकती': 'sakti',
  'सकता': 'sakta',
  'सकते': 'sakte',
  'मदद': 'madad',
  'सहायता': 'sahayata',
  'जारी': 'jaari',
  'प्रक्रिया': 'process',
  'शुरू': 'shuru',
  'टूट': 'toot',
  'गया': 'gaya',
  'गई': 'gayi',
  'गए': 'gaye',
  'मुझसे': 'mujhse',
  'बात': 'baat',
  'वरिष्ठ': 'senior',
  'सीनियर': 'senior',
  'कनेक्ट': 'connect',
  'लाइन': 'line',
  'बने': 'bane',
  'रहें': 'rahein',
  'रहिए': 'rahiye',
};

const NUMBER_WORDS_EN = {
  0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five',
  6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten',
  11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen', 15: 'fifteen',
  16: 'sixteen', 17: 'seventeen', 18: 'eighteen', 19: 'nineteen',
  20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty',
  60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety'
};

const DIGIT_WORDS = {
  '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
  '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine'
};

/**
 * Converts integers up to 999,999 into spoken English words
 */
function numberToWords(num) {
  const n = parseInt(num, 10);
  if (isNaN(n) || n === 0) return 'zero';
  if (n < 0) return 'minus ' + numberToWords(Math.abs(n));

  if (n <= 20) return NUMBER_WORDS_EN[n];
  if (n < 100) {
    const tens = Math.floor(n / 10) * 10;
    const rem = n % 10;
    return rem === 0 ? NUMBER_WORDS_EN[tens] : `${NUMBER_WORDS_EN[tens]} ${NUMBER_WORDS_EN[rem]}`;
  }
  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const rem = n % 100;
    return rem === 0 ? `${NUMBER_WORDS_EN[hundreds]} hundred` : `${NUMBER_WORDS_EN[hundreds]} hundred ${numberToWords(rem)}`;
  }
  if (n < 100000) {
    const thousands = Math.floor(n / 1000);
    const rem = n % 1000;
    return rem === 0 ? `${numberToWords(thousands)} thousand` : `${numberToWords(thousands)} thousand ${numberToWords(rem)}`;
  }
  if (n < 10000000) {
    const lakhs = Math.floor(n / 100000);
    const rem = n % 100000;
    return rem === 0 ? `${numberToWords(lakhs)} lakh` : `${numberToWords(lakhs)} lakh ${numberToWords(rem)}`;
  }
  return String(n);
}

/**
 * Converts a sequence of digits into individually spaced words for order IDs / tracking numbers
 * e.g., "72143" -> "seven two one four three"
 */
function digitsToWords(digitStr) {
  return digitStr
    .split('')
    .map(d => DIGIT_WORDS[d] || d)
    .join(' ');
}

/**
 * Algorithmic Devanagari to Latin Transliteration fallback
 */
function transliterateDevanagariWord(word) {
  if (COMMON_WORD_MAP[word]) return COMMON_WORD_MAP[word];

  let result = '';
  const len = word.length;
  for (let i = 0; i < len; i++) {
    const char = word[i];
    const nextChar = i + 1 < len ? word[i + 1] : '';

    if (DEVANAGARI_VOWELS[char]) {
      result += DEVANAGARI_VOWELS[char];
    } else if (DEVANAGARI_CONSONANTS[char]) {
      const base = DEVANAGARI_CONSONANTS[char];
      if (DEVANAGARI_MATRAS[nextChar] !== undefined) {
        result += base + DEVANAGARI_MATRAS[nextChar];
        i++;
      } else if (nextChar === '्') {
        result += base;
        i++;
      } else {
        result += (i === len - 1) ? base : base + 'a';
      }
    } else if (DEVANAGARI_MATRAS[char] !== undefined) {
      result += DEVANAGARI_MATRAS[char];
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * Normalizes text specifically for flawless TTS audio synthesis
 *
 * @param {string} text - Raw input text (Hindi, Hinglish, or English)
 * @param {Object} [context] - Optional metadata (orderId, amount, carrier)
 * @returns {string} TTS-safe phonetic text
 */
export function normalizeForTts(text, context = {}) {
  if (!text || typeof text !== 'string') return '';

  let t = text;

  // 1. Remove markdown, URLs, emojis, and code formatting
  t = t.replace(/[*_#`~]/g, '');
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  t = t.replace(/https?:\/\/\S+/g, '');
  t = t.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

  // 2. Expand Policy codes e.g. "POL-REFUND-3.2" -> "Policy POL-REFUND-3.2"
  t = t.replace(/(?:Policy\s+)?POL-REFUND-([0-9]+)\.([0-9]+)/gi, 'Policy POL-REFUND-$1.$2');
  t = t.replace(/(?:Policy\s+)?POL-([A-Z]+)-([0-9]+)/gi, 'Policy POL-$1-$2');

  // 3. Expand common enterprise logistics abbreviations
  t = t.replace(/\bSLA\b/g, 'service level agreement');
  t = t.replace(/\bAWB\b/g, 'air waybill number');
  t = t.replace(/\bUPI\b/g, 'U P I');
  t = t.replace(/\bVPA\b/g, 'V P A');
  t = t.replace(/\bCOD\b/g, 'cash on delivery');
  t = t.replace(/\bNPCI\b/g, 'N P C I');
  t = t.replace(/\bOTP\b/g, 'O T P');
  t = t.replace(/\bPIN\b/g, 'pin');
  t = t.replace(/\bSMS\b/g, 'S M S');

  // 4. Normalize Currency: e.g. "₹2,899", "₹ 2899", "Rs. 2,899", "2899 rupees"
  t = t.replace(/(?:₹|Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, (match, numStr) => {
    const cleanNum = numStr.replace(/,/g, '');
    const words = numberToWords(cleanNum);
    return `${words} rupees`;
  });

  t = t.replace(/\b([0-9,]+)\s*(?:rupees|rupaye|rupee|inr)\b/gi, (match, numStr) => {
    const cleanNum = numStr.replace(/,/g, '');
    const words = numberToWords(cleanNum);
    return `${words} rupees`;
  });

  // 5. Normalize Order / AWB IDs: e.g. "order #72143", "#72143", "ऑर्डर 72143"
  t = t.replace(/(?:order\s*(?:number)?|package|awb|ऑर्डर|आर्डर)?\s*#?([0-9]{4,8})\b/gi, (match, idStr) => {
    const digitsSpoken = digitsToWords(idStr);
    return `order number ${digitsSpoken}`;
  });

  // 6. Transliterate Devanagari Hindi words into clear Latin Hinglish
  const hasDevanagari = /[\u0900-\u097F]/.test(t);
  if (hasDevanagari) {
    t = t.replace(/([\u0900-\u097F]+)/g, (match) => {
      if (COMMON_WORD_MAP[match]) {
        return COMMON_WORD_MAP[match];
      }
      return transliterateDevanagariWord(match);
    });
  }

  // 7. Small number expansion for days e.g. "4 days" -> "four days"
  t = t.replace(/\b([1-9])\s+(days|din)\b/gi, (match, d, unit) => {
    const w = NUMBER_WORDS_EN[parseInt(d, 10)] || d;
    return `${w} ${unit}`;
  });

  // 8. Clean punctuation for natural speech cadence
  t = t.replace(/[।|]/g, '.');
  t = t.replace(/\s+/g, ' ').trim();
  t = t.replace(/\s+([.,!?;:])/g, '$1');

  return t;
}

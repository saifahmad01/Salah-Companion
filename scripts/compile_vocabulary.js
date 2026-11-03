import fs from 'fs';
import path from 'path';

let str = fs.readFileSync('C:/Users/Mdsai/.gemini/antigravity/brain/1939eea4-fba8-420b-aa3f-5a49b8d4b0d8/scratch/ocr_raw.json', 'utf8').replace(/^\uFEFF/, '');
const raw = JSON.parse(str);

const allCards = [];
const slideKeys = Object.keys(raw).map(Number).sort((a,b)=>a-b);

for (const s of slideKeys) {
  const slide = raw[String(s)];
  if (!slide || !slide.lines) continue;
  let currentCardLines = [];
  for (const line of slide.lines) {
    currentCardLines.push(line);
    if (/Congratulations\s+you\s+have\s+completed/i.test(line)) {
      allCards.push({ slide: s, lines: currentCardLines });
      currentCardLines = [];
    }
  }
}

console.log(`Extracting 600 cards from ${allCards.length} raw cards...`);

// Load existing 600 words as reference for Arabic text if transliteration matches
const existingPath = 'src/data/quranVocabulary600.json';
let existing = [];
try {
  existing = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
} catch (e) {}

// Standard Surah Names mapping
const surahNames = {
  1: 'Al-Fatihah', 2: 'Al-Baqarah', 3: 'Ali Imran', 4: 'An-Nisa', 5: 'Al-Maidah',
  6: 'Al-Anam', 7: 'Al-Araf', 8: 'Al-Anfal', 9: 'At-Tawbah', 10: 'Yunus',
  11: 'Hud', 12: 'Yusuf', 13: 'Ar-Rad', 14: 'Ibrahim', 15: 'Al-Hijr',
  16: 'An-Nahl', 17: 'Al-Isra', 18: 'Al-Kahf', 19: 'Maryam', 20: 'Taha',
  21: 'Al-Anbiya', 22: 'Al-Hajj', 23: 'Al-Muminun', 24: 'An-Nur', 25: 'Al-Furqan',
  26: 'Ash-Shuara', 27: 'An-Naml', 28: 'Al-Qasas', 29: 'Al-Ankabut', 30: 'Ar-Rum',
  31: 'Luqman', 32: 'As-Sajdah', 33: 'Al-Ahzab', 34: 'Saba', 35: 'Fatir',
  36: 'Ya-Sin', 37: 'As-Saffat', 38: 'Sad', 39: 'Az-Zumar', 40: 'Ghafir',
  41: 'Fussilat', 42: 'Ash-Shura', 43: 'Az-Zukhruf', 44: 'Ad-Dukhan', 45: 'Al-Jathiyah',
  46: 'Al-Ahqaf', 47: 'Muhammad', 48: 'Al-Fath', 49: 'Al-Hujurat', 50: 'Qaf',
  51: 'Adh-Dhariyat', 52: 'At-Tur', 53: 'An-Najm', 54: 'Al-Qamar', 55: 'Ar-Rahman',
  56: 'Al-Waqiah', 57: 'Al-Hadid', 58: 'Al-Mujadila', 59: 'Al-Hashr', 60: 'Al-Mumtahanah',
  61: 'As-Saff', 62: 'Al-Jumuah', 63: 'Al-Munafiqun', 64: 'At-Taghabun', 65: 'At-Talaq',
  66: 'At-Tahrim', 67: 'Al-Mulk', 68: 'Al-Qalam', 69: 'Al-Haqqah', 70: 'Al-Maarij',
  71: 'Nuh', 72: 'Al-Jinn', 73: 'Al-Muzzammil', 74: 'Al-Muddathir', 75: 'Al-Qiyamah',
  76: 'Al-Insan', 77: 'Al-Mursalat', 78: 'An-Naba', 79: 'An-Naziat', 80: 'Abasa',
  81: 'At-Takwir', 82: 'Al-Infitar', 83: 'Al-Mutaffifin', 84: 'Al-Inshiqaq', 85: 'Al-Buruj',
  86: 'At-Tariq', 87: 'Al-Ala', 88: 'Al-Ghashiyah', 89: 'Al-Fajr', 90: 'Al-Balad',
  91: 'Ash-Shams', 92: 'Al-Layl', 93: 'Ad-Duha', 94: 'Ash-Sharh', 95: 'At-Tin',
  96: 'Al-Alaq', 97: 'Al-Qadr', 98: 'Al-Bayyinah', 99: 'Az-Zalzalah', 100: 'Al-Adiyat',
  101: 'Al-Qariah', 102: 'At-Takathur', 103: 'Al-Asr', 104: 'Al-Humazah', 105: 'Al-Fil',
  106: 'Quraysh', 107: 'Al-Maun', 108: 'Al-Kawthar', 109: 'Al-Kafirun', 110: 'An-Nasr',
  111: 'Al-Masad', 112: 'Al-Ikhlas', 113: 'Al-Falaq', 114: 'An-Nas'
};

const compiledWords = [];

for (let idx = 0; idx < Math.min(600, allCards.length); idx++) {
  const card = allCards[idx];
  const lines = card.lines.map(l => l.replace(/[\r\n]+/g, ' ').trim());
  const lastLine = lines[lines.length - 1];
  const pctMatch = lastLine.match(/completed\s+([\d.,]+%?)/i);
  const pct = pctMatch ? pctMatch[1].replace('%', '') + '%' : '';

  // 1. Surah:Ayah Ref
  let ref = '';
  let refLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/\(?(\d{1,3})[:,\.](\d{1,3})\)?/);
    if (m) {
      const sNum = parseInt(m[1]);
      const aNum = parseInt(m[2]);
      const sName = surahNames[sNum] || `Surah ${sNum}`;
      ref = `${sName} ${sNum}:${aNum}`;
      refLineIdx = i;
      break;
    }
  }

  // 2. Repeats
  let repeats = null;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/Repeats?\s+(\d+)\s*T/i) || lines[i].match(/(\d+)\s*Times/i);
    if (m) {
      repeats = parseInt(m[1]);
      break;
    }
  }

  // 3. Header lines before refLineIdx
  const headerLines = refLineIdx > 0 ? lines.slice(0, refLineIdx) : lines.slice(0, 3);
  const headerText = headerLines.join(' ');

  // 4. Part of Speech
  let partOfSpeech = 'Noun';
  if (/preposition/i.test(headerText)) partOfSpeech = 'Preposition';
  else if (/proper noun/i.test(headerText)) partOfSpeech = 'Proper Noun';
  else if (/pronoun/i.test(headerText)) partOfSpeech = 'Pronoun';
  else if (/particle/i.test(headerText)) partOfSpeech = 'Particle';
  else if (/adverb/i.test(headerText)) partOfSpeech = 'Adverb';
  else if (/verb/i.test(headerText)) partOfSpeech = 'Verb';
  else if (/adjective/i.test(headerText)) partOfSpeech = 'Adjective';
  else if (/noun/i.test(headerText)) partOfSpeech = 'Noun';

  // 5. Transliteration in parens
  let transliteration = '';
  for (const l of headerLines) {
    const m = l.match(/\(([A-Za-zāīūḍṣṭẓḥ'\- ]+)\)/);
    if (m && !/times|mein|se|din|par/i.test(m[1])) {
      transliteration = m[1].trim();
      break;
    }
  }
  if (!transliteration && existing[idx]?.transliteration) {
    transliteration = existing[idx].transliteration;
  }

  // 6. Meanings: English & Roman Urdu
  let meaningEnglish = '';
  let meaningUrdu = '';
  for (const l of headerLines) {
    const m = l.match(/([A-Za-z /'’]+)\s*\(([A-Za-z /'’]+)\)/);
    if (m && m[1].trim() !== transliteration && !/times/i.test(m[1])) {
      meaningEnglish = m[1].replace(/^(Preposition|Proper noun|Noun|Verb|Adverb|Particle)\s+/i, '').trim();
      meaningUrdu = m[2].trim();
      break;
    }
  }
  if (!meaningEnglish && existing[idx]?.meaning) {
    meaningEnglish = existing[idx].meaning;
  }
  if (!meaningUrdu) {
    meaningUrdu = transliteration || meaningEnglish;
  }

  // 7. Verse Lines (English and Roman Urdu)
  const verseLines = refLineIdx >= 0 ? lines.slice(refLineIdx + 1, lines.length - 1) : [];
  
  // Separate English verse from Roman Urdu verse
  // Urdu translation usually starts with words like: Yeh, Aur, Phir, Jab, Agar, Uske, Jo, Haan, Lihaza, Aey, etc.
  let engVerseLines = [];
  let urduVerseLines = [];
  let foundUrdu = false;

  for (const vl of verseLines) {
    if (!foundUrdu && /^(Yeh|Aur|Phir|Jab|Agar|Uske|Jo|Haan|Lihaza|Aey|Tum|Maine|Hum|In|Zameen|Pas|Anqareeb|Jise|Wohi|Kya)\b/i.test(vl)) {
      foundUrdu = true;
    }
    if (foundUrdu) {
      urduVerseLines.push(vl);
    } else {
      engVerseLines.push(vl);
    }
  }

  const verseEnglish = engVerseLines.join(' ').trim() || (existing[idx]?.verseEnglish || '');
  const verseRomanUrdu = urduVerseLines.join(' ').trim();

  // 8. Arabic Word Text
  // Match with existing or transliteration
  let arabic = existing[idx]?.arabic || '—';
  let verseArabic = existing[idx]?.verseArabic || '';

  // 9. Category mapping
  let category = 'Faith & Tawhid';
  if (partOfSpeech === 'Verb') category = 'Quranic Verbs & Actions';
  else if (partOfSpeech === 'Preposition' || partOfSpeech === 'Particle') category = 'Particles & Qualifiers';
  else if (partOfSpeech === 'Proper Noun') category = 'Faith & Tawhid';
  else if (existing[idx]?.category) category = existing[idx].category;

  // 10. Difficulty
  const difficulty = idx < 200 ? 'Beginner' : idx < 450 ? 'Intermediate' : 'Advanced';

  compiledWords.push({
    id: idx + 1,
    arabic,
    transliteration: transliteration || `Word #${idx + 1}`,
    meaning: meaningUrdu ? `${meaningEnglish || transliteration} (${meaningUrdu})` : (meaningEnglish || transliteration),
    meaningEnglish: meaningEnglish || transliteration,
    meaningUrdu: meaningUrdu || '',
    partOfSpeech,
    category,
    difficulty,
    repeats: repeats ? `${repeats} Times` : (existing[idx]?.repeats || 'Frequently repeated'),
    surahAyahRef: ref || existing[idx]?.surahAyahRef || 'Quran',
    verseArabic,
    verseEnglish,
    verseRomanUrdu,
    progressPercentage: pct || `${Math.round(((idx + 1) / 600) * 82 * 100) / 100}%`
  });
}

console.log(`Compiled ${compiledWords.length} words! Writing to JSON...`);
fs.writeFileSync('src/data/quranVocabulary600.json', JSON.stringify(compiledWords, null, 2), 'utf8');
fs.writeFileSync('server/src/data/quranVocabulary600.json', JSON.stringify(compiledWords, null, 2), 'utf8');
console.log('Successfully saved to src/data/quranVocabulary600.json and server/src/data/quranVocabulary600.json!');

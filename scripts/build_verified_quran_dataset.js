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

console.log(`Found ${allCards.length} cards in OCR data.`);

// Standard Surah Names
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

const finalWords = [];

for (let idx = 0; idx < 600; idx++) {
  const card = allCards[idx];
  const lines = card.lines.map(l => l.replace(/[\r\n]+/g, ' ').trim());
  const lastLine = lines[lines.length - 1];
  const pctMatch = lastLine.match(/completed\s+([\d.,]+%?)/i);
  const pct = pctMatch ? pctMatch[1].replace('%', '') + '%' : `${Math.round(((idx + 1) / 600) * 82 * 100) / 100}%`;

  // 1. Ref (e.g. 59:21, 2:255, 108:1)
  let surahNum = 0;
  let ayahNum = 0;
  let refStr = '';
  let refLineIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/\(?(\d{1,3})[:,\.](\d{1,3})\)?/);
    if (m) {
      surahNum = parseInt(m[1]);
      ayahNum = parseInt(m[2]);
      const sName = surahNames[surahNum] || `Surah ${surahNum}`;
      refStr = `${sName} ${surahNum}:${ayahNum}`;
      refLineIdx = i;
      break;
    }
  }

  // 2. Repeats
  let repeats = '';
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/Repeats?\s+(\d+)\s*T/i) || lines[i].match(/(\d+)\s*Times/i);
    if (m) {
      repeats = `${m[1]} Times`;
      break;
    }
  }

  // 3. Header lines
  const headerLines = refLineIdx > 0 ? lines.slice(0, refLineIdx) : lines.slice(0, 3);
  const headerText = headerLines.join(' ');

  // 4. Part of Speech
  let partOfSpeech = 'Noun';
  if (/preposition/i.test(headerText)) partOfSpeech = 'Preposition';
  else if (/proper noun/i.test(headerText)) partOfSpeech = 'Proper Noun';
  else if (/demonstrative pronoun/i.test(headerText)) partOfSpeech = 'Demonstrative Pronoun';
  else if (/relative pronoun/i.test(headerText)) partOfSpeech = 'Relative Pronoun';
  else if (/pronoun/i.test(headerText)) partOfSpeech = 'Pronoun';
  else if (/particle/i.test(headerText)) partOfSpeech = 'Particle';
  else if (/adverb/i.test(headerText)) partOfSpeech = 'Adverb';
  else if (/verb/i.test(headerText)) partOfSpeech = 'Verb';
  else if (/adjective/i.test(headerText)) partOfSpeech = 'Adjective';

  // 5. Transliteration in parens
  let transliteration = '';
  for (const l of headerLines) {
    const m = l.match(/\(([A-Za-zāīūḍṣṭẓḥ'\- ]+)\)/);
    if (m && !/times|mein|se|din|par|yeh/i.test(m[1])) {
      transliteration = m[1].trim();
      break;
    }
  }

  // 6. Meanings: English & Roman Urdu
  let meaningEng = '';
  let meaningUrdu = '';
  for (const l of headerLines) {
    const m = l.match(/([A-Za-z /'’]+)\s*\(([A-Za-z /'’]+)\)/);
    if (m && m[1].trim() !== transliteration && !/times/i.test(m[1])) {
      meaningEng = m[1].replace(/^(Preposition|Proper noun|Noun|Verb|Adverb|Particle|Demonstrative pronoun)\s+/i, '').trim();
      meaningUrdu = m[2].trim();
      break;
    }
  }

  if (!meaningEng) {
    for (const l of headerLines) {
      if (!l.includes('(') && !/noun|verb|particle|pronoun|repeats|times/i.test(l)) {
        meaningEng = l.trim();
        break;
      }
    }
  }

  // Fallbacks if single meaning
  if (!meaningUrdu) meaningUrdu = transliteration;
  if (!meaningEng) meaningEng = transliteration;

  // 7. Verse Lines
  const verseLines = refLineIdx >= 0 ? lines.slice(refLineIdx + 1, lines.length - 1) : [];
  let engVerse = [];
  let urduVerse = [];
  let inUrdu = false;

  for (const vl of verseLines) {
    if (!inUrdu && /^(Yeh|Aur|Phir|Jab|Agar|Uske|Jo|Haan|Lihaza|Aey|Tum|Maine|Hum|In|Zameen|Pas|Anqareeb|Jise|Wohi|Kya|Dar-asal|Ya|Beshak)\b/i.test(vl)) {
      inUrdu = true;
    }
    if (inUrdu) urduVerse.push(vl);
    else engVerse.push(vl);
  }

  const verseEnglish = engVerse.join(' ').trim();
  const verseRomanUrdu = urduVerse.join(' ').trim();

  // Category & Difficulty
  let category = 'Particles & Qualifiers';
  if (partOfSpeech === 'Verb') category = 'Quranic Verbs & Actions';
  else if (partOfSpeech === 'Proper Noun') category = 'Faith & Tawhid';
  else if (/Day|Torment|Fire|Paradise|Everlasting|Resurrection|Wicked/i.test(meaningEng + ' ' + verseEnglish)) category = 'The Hereafter & Eternity';
  else if (/Lord|God|Worship|Pray/i.test(meaningEng + ' ' + verseEnglish)) category = 'Worship & Devotion';
  else if (/Mountain|Tree|Heavens|Earth|Fruits|Sky|Sea|Sun|Moon/i.test(meaningEng + ' ' + verseEnglish)) category = 'Creation & Nature';
  else if (/Soul|Heart|People|Righteous|Patience|Mercy/i.test(meaningEng + ' ' + verseEnglish)) category = 'Human Soul & Life';

  const difficulty = idx < 200 ? 'Beginner' : idx < 450 ? 'Intermediate' : 'Advanced';
  const imgPath = `/images/quran_words/word_${String(idx + 1).padStart(3, '0')}.webp`;

  finalWords.push({
    id: idx + 1,
    image: imgPath,
    arabic: transliteration || `Word #${idx + 1}`,
    transliteration: transliteration || `Word #${idx + 1}`,
    meaning: meaningUrdu ? `${meaningEng} (${meaningUrdu})` : meaningEng,
    meaningEnglish: meaningEng,
    meaningUrdu: meaningUrdu,
    partOfSpeech,
    category,
    difficulty,
    repeats: repeats || 'Repeated in Quran',
    surahAyahRef: refStr || 'Quran',
    verseArabic: '',
    verseEnglish,
    verseRomanUrdu,
    progressPercentage: pct,
  });
}

console.log(`Successfully compiled all ${finalWords.length} words!`);
console.log('Sample word 1:', finalWords[0]);
console.log('Sample word 35:', finalWords[34]);
console.log('Sample word 36:', finalWords[35]);
console.log('Sample word 600:', finalWords[599]);

fs.writeFileSync('src/data/quranVocabulary600.json', JSON.stringify(finalWords, null, 2), 'utf8');
fs.writeFileSync('server/src/data/quranVocabulary600.json', JSON.stringify(finalWords, null, 2), 'utf8');
console.log('Saved to src/data/quranVocabulary600.json and server/src/data/quranVocabulary600.json!');

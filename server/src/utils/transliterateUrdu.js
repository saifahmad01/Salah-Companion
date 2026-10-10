/**
 * Roman Urdu Transliteration Engine
 * 
 * Accurately transliterates Urdu Perso-Arabic text into readable, natural Roman Urdu
 * for children, students, and beginners learning Hadith scriptures.
 * 
 * Features:
 * - High-frequency Urdu morphological lexicon (pronouns, verbs, prepositions, Islamic vocabulary)
 * - Aspirated consonants (Do-chashmi he: بھ، پھ، تھ، ٹھ، جھ، چھ، دھ، ڈھ، کھ، گھ، ڑھ)
 * - Full Islamic honorifics & du'as (ﷺ, رضی اللہ عنہ, رحمہ اللہ, علیہ السلام)
 * - Diacritics & I'rab handling (zabar, zer, pesh, tashdeed, tanween)
 * - Contextual phonetic syllable generator for unseen words
 * - Built-in LRU string cache for instant repeated lookups
 */

import { InMemoryCache } from './cache.js';

// Dedicated cache for transliterated sentences/paragraphs (500 items, 48 hours TTL)
const transliterationCache = new InMemoryCache(172800, 500, 3600);

// Islamic Honorifics and liturgical expressions
const HONORIFICS = [
  { urdu: /صلی\s+اللہ\s+علیہ\s+و\s*آلہ\s*و\s*سلم/gi, roman: '(Sallallahu Alaihi Wa Aalihi Wasallam)' },
  { urdu: /صلی\s+اللہ\s+علیہ\s+وسلم/gi, roman: '(Sallallahu Alaihi Wasallam)' },
  { urdu: /ﷺ/g, roman: '(Sallallahu Alaihi Wasallam)' },
  { urdu: /رضی\s+اللہ\s+عنہا/gi, roman: '(Radiallahu Anha)' },
  { urdu: /رضی\s+اللہ\s+عنہ/gi, roman: '(Radiallahu Anhu)' },
  { urdu: /رضی\s+اللہ\s+عنہم/gi, roman: '(Radiallahu Anhum)' },
  { urdu: /رحمۃ\s+اللہ\s+علیہ/gi, roman: '(Rahmatullah Alaihi)' },
  { urdu: /رحمہ\s+اللہ/gi, roman: '(Rahimahullah)' },
  { urdu: /علیہ\s+السلام/gi, roman: '(Alaihis Salam)' },
  { urdu: /علیہم\s+السلام/gi, roman: '(Alaihimus Salam)' },
  { urdu: /سبحانہ\s+و\s*تعالیٰ?/gi, roman: "(Subhanahu wa Ta'ala)" },
  { urdu: /عز\s*و\s*جل/gi, roman: '(Azza wa Jall)' },
  { urdu: /تبارک\s+و\s*تعالیٰ?/gi, roman: "(Tabaraka wa Ta'ala)" },
];

// Aspirated consonants (Do-chashmi he: ھ)
const ASPIRATED_CONSONANTS = {
  'بھ': 'bh',
  'پھ': 'ph',
  'تھ': 'th',
  'ٹھ': 'th',
  'جھ': 'jh',
  'چھ': 'chh',
  'دھ': 'dh',
  'ڈھ': 'dh',
  'کھ': 'kh',
  'گھ': 'gh',
  'ڑھ': 'rh',
};

// Character-by-character phonetic mapping
const CHAR_MAP = {
  // Alif variants
  'آ': 'aa',
  'ا': 'a',
  'أ': 'a',
  'إ': 'i',
  
  // Consonants
  'ب': 'b',
  'پ': 'p',
  'ت': 't',
  'ٹ': 't',
  'ث': 's',
  'ج': 'j',
  'چ': 'ch',
  'ح': 'h',
  'خ': 'kh',
  'د': 'd',
  'ڈ': 'd',
  'ذ': 'z',
  'ر': 'r',
  'ڑ': 'r',
  'ز': 'z',
  'ژ': 'zh',
  'س': 's',
  'ش': 'sh',
  'ص': 's',
  'ض': 'z',
  'ط': 't',
  'ظ': 'z',
  'ع': 'a',
  'غ': 'gh',
  'ف': 'f',
  'ق': 'q',
  'ک': 'k',
  'ك': 'k',
  'گ': 'g',
  'ل': 'l',
  'م': 'm',
  'ن': 'n',
  'ں': 'n',
  'و': 'o',
  'ہ': 'h',
  'ھ': 'h',
  'ة': 'h',
  'ء': "'",
  'ی': 'i',
  'ي': 'i',
  'ى': 'a',
  'ے': 'e',
  'ئ': 'i',
  'ؤ': 'o',

  // Diacritics (Harakat)
  'َ': 'a', // Zabar / Fatha
  'ِ': 'i', // Zer / Kasra
  'ُ': 'u', // Pesh / Damma
  'ٰ': 'a', // Khada zabar
  'ً': 'an', // Tanween fath
  'ٍ': 'in', // Tanween kasr
  'ٌ': 'un', // Tanween damm
  'ْ': '',   // Sukun
};

// Morphological Prefixes
const PREFIXES = [
  { prefix: 'بے', roman: 'be-' },
  { prefix: 'نا', roman: 'na-' },
  { prefix: 'با', roman: 'ba-' },
  { prefix: 'لا', roman: 'la-' },
  { prefix: 'غیر', roman: 'ghair-' },
  { prefix: 'اہل', roman: 'ahl-e-' },
  { prefix: 'بد', roman: 'bad-' },
  { prefix: 'کم', roman: 'kam-' },
  { prefix: 'ہم', roman: 'ham-' },
];

// Morphological Suffixes
const SUFFIXES = [
  { suffix: 'وں', roman: 'on' },
  { suffix: 'یں', roman: 'ein' },
  { suffix: 'ئے', roman: 'ye' },
  { suffix: 'ئے گا', roman: 'yega' },
  { suffix: 'ئے گی', roman: 'yegi' },
  { suffix: 'ئے گے', roman: 'yege' },
  { suffix: 'دار', roman: 'dar' },
  { suffix: 'وار', roman: 'war' },
  { suffix: 'گار', roman: 'gar' },
  { suffix: 'بان', roman: 'ban' },
  { suffix: 'دان', roman: 'dan' },
  { suffix: 'مند', roman: 'mand' },
  { suffix: 'ناک', roman: 'nak' },
  { suffix: 'سازی', roman: 'saazi' },
  { suffix: 'باز', roman: 'baaz' },
];

// Comprehensive Urdu Lexicon of standard vocabulary
const URDU_LEXICON = {
  // Pronouns, Demonstratives, Relatives
  'آپ': 'Aap', 'آپکا': 'aapka', 'آپکی': 'aapki', 'آپکے': 'aapke',
  'میں': 'mein', 'ہم': 'hum', 'تم': 'tum', 'وہ': 'woh', 'یہ': 'yeh',
  'اس': 'us', 'ان': 'un', 'اسے': 'usey', 'انہیں': 'unhein',
  'اسکا': 'uska', 'اسکی': 'uski', 'اسکے': 'uske',
  'انکا': 'unka', 'انکی': 'unki', 'انکے': 'unke',
  'میرا': 'mera', 'میری': 'meri', 'میرے': 'mere', 'مجھ': 'mujh', 'مجھے': 'mujhe',
  'ہمارا': 'hamara', 'ہماری': 'hamari', 'ہمارے': 'hamare',
  'تمہارا': 'tumhara', 'تمہاری': 'tumhari', 'تمہارے': 'tumhare',
  'جو': 'jo', 'جس': 'jis', 'جن': 'jin', 'جسے': 'jise', 'جنہیں': 'jinhein',
  'جسکا': 'jiska', 'جسکی': 'jiski', 'جسکے': 'jiske', 'جسکو': 'jisko',
  'کون': 'kaun', 'کیا': 'kya', 'کیوں': 'kyun', 'کب': 'kab', 'کہاں': 'kahan',
  'کیسے': 'kaise', 'کیسا': 'kaisa', 'کیسی': 'kaisi',
  'کوئی': 'koi', 'کچھ': 'kuch', 'سب': 'sab', 'ہر': 'har', 'کسی': 'kisi',

  // Prepositions, Conjunctions, Adverbs
  'کا': 'ka', 'کی': 'ki', 'کے': 'ke', 'کو': 'ko', 'سے': 'se', 'پر': 'par', 'تک': 'tak',
  'اور': 'aur', 'کہ': 'keh', 'تو': 'toh', 'ہی': 'hi', 'بھی': 'bhi', 'پس': 'pas',
  'یا': 'ya', 'نہ': 'na', 'نہیں': 'nahin', 'اگر': 'agar', 'مگر': 'magar', 'لیکن': 'lekin',
  'جب': 'jab', 'تب': 'tab', 'اب': 'ab', 'پھر': 'phir', 'چونکہ': 'chunke', 'تاکہ': 'taake',
  'ساتھ': 'saath', 'پاس': 'paas', 'پہلے': 'pehle', 'بعد': 'baad', 'لیے': 'liye', 'لئے': 'liye',
  'درمیان': 'darmiyan', 'سامنے': 'saamne', 'پیچھے': 'peeche', 'اوپر': 'oopar', 'نیچے': 'neeche',
  'بہت': 'bohot', 'زیادہ': 'zyada', 'کم': 'kam', 'تھوڑا': 'thoda', 'صرف': 'sirf',
  'یہاں': 'yahan', 'وہاں': 'wahan', 'جہاں': 'jahan', 'کہیں': 'kahin',
  'شاید': 'shayad', 'ضرور': 'zaroor', 'ہمیشہ': 'hamesha', 'کبھی': 'kabhi',

  // Auxiliaries & Tenses
  'ہے': 'hai', 'ہیں': 'hain', 'ہوں': 'hoon', 'ہو': 'ho', 'تھا': 'tha', 'تھی': 'thi', 'تھے': 'the', 'تھیں': 'theen',
  'گا': 'ga', 'گی': 'gi', 'گے': 'ge',
  'ہوا': 'hua', 'ہوئی': 'hui', 'ہوئے': 'hue', 'ہوتا': 'hota', 'ہوتی': 'hoti', 'ہوتے': 'hote', 'ہونا': 'hona', 'ہونے': 'hone',

  // Common Verbs
  'فرما': 'farma', 'فرمایا': 'farmaya', 'فرمائی': 'farmai', 'فرمائے': 'farmae', 'فرماتے': 'farmate', 'فرماتی': 'farmati', 'فرمانا': 'farmana',
  'کہا': 'kaha', 'کہی': 'kahi', 'کہے': 'kahe', 'کہتے': 'kahte', 'کہتی': 'kahti', 'کہنا': 'kahna',
  'سنا': 'suna', 'سنی': 'suni', 'سنے': 'sune', 'سنتے': 'sunte', 'سنتی': 'sunti', 'سننا': 'sunna',
  'دیکھا': 'dekha', 'دیکھی': 'dekhi', 'دیکھے': 'dekhe', 'دیکھ': 'dekh', 'دیکھتے': 'dekhte',
  'کیا': 'kiya', 'کیئے': 'kiye', 'کیے': 'kiye', 'کر': 'kar', 'کرتا': 'karta', 'کرتی': 'karti', 'کرتے': 'karte', 'کرنا': 'karna', 'کرنے': 'karne',
  'دیا': 'diya', 'دیئے': 'diye', 'دیے': 'diye', 'دے': 'de', 'دیتا': 'deta', 'دیتی': 'deti', 'دیتے': 'dete', 'دینا': 'dena', 'دینے': 'dene',
  'لیا': 'liya', 'لیئے': 'liye', 'لیے': 'liye', 'لے': 'le', 'لیتا': 'leta', 'لیتی': 'leti', 'لیتے': 'lete', 'لینا': 'lena', 'لینے': 'lene',
  'گیا': 'gaya', 'گئی': 'gayi', 'گئے': 'gaye', 'جا': 'ja', 'جاتا': 'jaata', 'جاتی': 'jaati', 'جاتے': 'jaate', 'جانا': 'jaana', 'جانے': 'jaane',
  'آیا': 'aaya', 'آئی': 'aayi', 'آئے': 'aaye', 'آتا': 'aata', 'آتی': 'aati', 'آتے': 'aate', 'آنا': 'aana', 'آنے': 'aane',
  'رہا': 'raha', 'رہی': 'rahi', 'رہے': 'rahe', 'رہتا': 'rahta', 'رہتی': 'rahti', 'رہتے': 'rahte', 'رہنا': 'rahna',
  'ملا': 'mila', 'ملی': 'mili', 'ملے': 'mile', 'ملتا': 'milta', 'ملتی': 'milti', 'ملتے': 'milte', 'ملنا': 'milna',
  'پوچھا': 'poocha', 'پوچھی': 'poochi', 'پوچھے': 'pooche', 'پوچھ': 'pooch',
  'پایا': 'paya', 'پائی': 'payi', 'پائے': 'paaye',
  'سمجھا': 'samjha', 'سمجھی': 'samjhi', 'سمجھے': 'samjhe',
  'رکھا': 'rakha', 'رکھی': 'rakhi', 'رکھے': 'rakhe', 'رکھ': 'rakh',
  'چھوڑا': 'chhoda', 'چھوڑی': 'chhodi', 'چھوڑ': 'chhod',
  'روکا': 'roka', 'روکی': 'roki', 'روکے': 'roke', 'روک': 'rok',
  'مانگا': 'manga', 'مانگی': 'mangi', 'مانگے': 'mange',
  'چاہا': 'chaha', 'چاہی': 'chahi', 'چاہے': 'chahe', 'چاہتا': 'chahta', 'چاہتی': 'chahti',
  'بتا': 'bata', 'بتایا': 'bataya', 'بتائی': 'batai', 'بتائے': 'batae',
  'کھایا': 'khaya', 'کھائی': 'khai', 'کھائے': 'khae', 'کھانا': 'khana',
  'پیا': 'piya', 'پی': 'pee', 'پیتے': 'peete', 'پینا': 'peena',
  'سویا': 'soya', 'سوئی': 'soi', 'سوئے': 'soe', 'سونا': 'sona',
  'جاگا': 'jaaga', 'جاگی': 'jaagi', 'جاگے': 'jaage',

  // Hadith, Religious, and General Nouns
  'اللہ': 'Allah', 'رسول': 'Rasool', 'نبی': 'Nabi', 'پیغمبر': 'Paighambar',
  'حدیث': 'hadith', 'احادیث': 'ahadeeth', 'روایت': 'riwayat', 'راوی': 'rawi', 'بیان': 'bayan',
  'قرآن': 'Quran', 'آیت': 'aayat', 'آیات': 'aayaat', 'سورت': 'surah',
  'نماز': 'Namaz', 'صلوۃ': 'Salah', 'روزہ': 'Roza', 'زکوۃ': 'Zakat', 'حج': 'Hajj', 'عمرہ': 'Umrah',
  'وضو': 'Wudhu', 'طہارت': 'taharat', 'غسل': 'ghusl', 'تیمم': 'tayammum',
  'سجدہ': 'sajdah', 'رکوع': 'ruku', 'قیام': 'qiyam', 'تکبیر': 'takbeer',
  'ایمان': 'Iman', 'اسلام': 'Islam', 'دین': 'Deen', 'شریعت': 'Shariat', 'سنت': 'Sunnah',
  'نیت': 'niyyat', 'اعمال': 'a\'maal', 'عمل': 'amal', 'دارومدار': 'daromadar', 'نتیجہ': 'nateeja',
  'ہجرت': 'hijrat', 'وطن': 'watan', 'ترک': 'tark', 'دولت': 'daulat', 'دنیا': 'dunya', 'آخرت': 'aakhirat',
  'عورت': 'aurat', 'عورتوں': 'aurton', 'مرد': 'mard', 'مردوں': 'mardon',
  'شادی': 'shadi', 'نکاح': 'nikah', 'غرض': 'gharaz', 'حاصل': 'haasil',
  'انسان': 'insaan', 'لوگ': 'log', 'لوگوں': 'logon', 'بندہ': 'bandah', 'بندوں': 'bandon',
  'چیز': 'cheez', 'چیزوں': 'cheezon', 'مطابق': 'mutabiq', 'تمام': 'tamam',
  'مسجد': 'masjid', 'مسجدنبوی': 'Masjid-e-Nabwi', 'منبر': 'mimbar', 'محراب': 'mihrab',
  'زبان': 'zaban', 'بات': 'baat', 'باتیں': 'baatein',
  'دل': 'dil', 'جان': 'jaan', 'روح': 'rooh', 'جسم': 'jism', 'ہاتھ': 'haath', 'پاؤں': 'paon', 'آنکھ': 'aankh', 'کان': 'kaan',
  'حق': 'haq', 'باطل': 'baatil', 'سچ': 'sach', 'جھوٹ': 'jhoot',
  'ثواب': 'sawab', 'گناہ': 'gunah', 'عذاب': 'azaab', 'رحمت': 'rehmat', 'مغفرت': 'maghfirat',
  'جنت': 'Jannah', 'جہنم': 'Jahannam', 'دوزخ': 'Dozakh', 'برکت': 'barkat', 'خیر': 'khair', 'شر': 'shar',
  'نیکی': 'naiki', 'بدی': 'badi', 'صبر': 'sabr', 'شکر': 'shukr', 'دعا': 'dua', 'ذکر': 'zikr', 'استغفار': 'istighfar',
  'صدقہ': 'sadaqah', 'خیرات': 'khairat', 'تقویٰ': 'taqwa', 'اخلاص': 'ikhlaas',
  'حضرت': 'Hazrat', 'امام': 'Imam', 'صحابہ': 'Sahaba', 'تابعی': 'Tabi\'ee',
  'وحی': 'wahi', 'فرشتہ': 'farishta', 'فرشتے': 'farishte', 'جبرائیل': 'Jibreel',
  'صبح': 'subah', 'شام': 'shaam', 'رات': 'raat', 'دن': 'din', 'وقت': 'waqt',
  'سال': 'saal', 'مہینہ': 'maheena', 'روز': 'roz',
  'فجر': 'Fajr', 'ظہر': 'Dhuhr', 'عصر': 'Asr', 'مغرب': 'Maghrib', 'عشاء': 'Isha',

  // Prominent Hadith Narrators & Personalities
  'عمر': 'Umar', 'ابوبکر': 'Abu Bakr', 'عثمان': 'Usman', 'علی': 'Ali',
  'عائشہ': 'Aisha', 'فاطمہ': 'Fatimah', 'خدیجہ': 'Khadijah',
  'ابوہریرہ': 'Abu Hurairah', 'انس': 'Anas', 'ابن': 'Ibn', 'بن': 'bin', 'بنت': 'bint',
  'خطاب': 'Khattab', 'حمیدی': 'Humaidi', 'سفیان': 'Sufyan',
  'یحییٰ': 'Yahya', 'سعید': 'Saeed', 'انصاری': 'Ansari', 'محمد': 'Muhammad',
  'ابراہیم': 'Ibrahim', 'تیمی': 'Taimi', 'علقمہ': 'Alqamah', 'وقاص': 'Waqqas', 'لیثی': 'Laisi',
  'بخاری': 'Bukhari', 'مسلم': 'Muslim', 'ترمذی': 'Tirmidhi', 'نسائی': 'Nasai',
};

/**
 * Transliterates a single word or token
 * @param {string} rawWord
 * @returns {string}
 */
function transliterateWord(rawWord) {
  if (!rawWord) return '';

  // Strip diacritics for dictionary lookup
  const cleanWord = rawWord.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');

  // 1. Direct dictionary lookup
  if (URDU_LEXICON[cleanWord]) return URDU_LEXICON[cleanWord];
  if (URDU_LEXICON[rawWord]) return URDU_LEXICON[rawWord];

  // 2. Prefix matching (e.g., be-, na-, ba-)
  for (const { prefix, roman } of PREFIXES) {
    if (cleanWord.startsWith(prefix) && cleanWord.length > prefix.length + 1) {
      const stem = cleanWord.slice(prefix.length);
      if (URDU_LEXICON[stem]) {
        return `${roman}${URDU_LEXICON[stem]}`;
      }
    }
  }

  // 3. Suffix matching (e.g., -on, -ein, -dar)
  for (const { suffix, roman } of SUFFIXES) {
    if (cleanWord.endsWith(suffix) && cleanWord.length > suffix.length + 1) {
      const stem = cleanWord.slice(0, -suffix.length);
      if (URDU_LEXICON[stem]) {
        return `${URDU_LEXICON[stem]}${roman}`;
      }
    }
  }

  // 4. Fallback syllable-based transliteration
  let res = '';
  let i = 0;
  const word = rawWord;

  while (i < word.length) {
    // Check two-char aspirated consonants (Do-chashmi he)
    const two = word.slice(i, i + 2);
    if (ASPIRATED_CONSONANTS[two]) {
      res += ASPIRATED_CONSONANTS[two];
      i += 2;
      continue;
    }

    const ch = word[i];
    
    // Tashdeed doubling
    if (ch === 'ّ' && res.length > 0) {
      res += res[res.length - 1];
      i++;
      continue;
    }

    if (CHAR_MAP[ch] !== undefined) {
      res += CHAR_MAP[ch];
    } else {
      res += ch;
    }
    i++;
  }

  // Polish final noon ghunna ('ں') at end of words
  if (res.endsWith('n') && res.length > 2 && !/[aeiou]n$/.test(res)) {
    res = res.slice(0, -1) + 'an';
  }

  return res;
}

/**
 * Main Transliteration Function
 * Convert Urdu Perso-Arabic text into readable Roman Urdu.
 *
 * @param {string} text - Raw Urdu Perso-Arabic text
 * @returns {string} - Natural, readable Roman Urdu
 */
export function transliterateUrdu(text) {
  if (!text || typeof text !== 'string') return '';

  const trimmed = text.trim();
  if (!trimmed) return '';

  // Check in-memory LRU cache first
  const cached = transliterationCache.get(trimmed);
  if (cached) return cached;

  // Return unchanged if input is already English / Latin script without Arabic/Urdu
  if (!/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(trimmed)) {
    return trimmed;
  }

  let processed = trimmed;

  // 1. Honorifics and liturgical expressions
  for (const { urdu, roman } of HONORIFICS) {
    processed = processed.replace(urdu, ` ${roman} `);
  }

  // 2. Standardize punctuation & Eastern Arabic numerals
  processed = processed
    .replace(/۔/g, ' . ')
    .replace(/،/g, ' , ')
    .replace(/؟/g, ' ? ')
    .replace(/؛/g, ' ; ')
    .replace(/[«»]/g, ' " ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // strip invisible joiners
    .replace(/۰/g, '0')
    .replace(/۱/g, '1')
    .replace(/۲/g, '2')
    .replace(/۳/g, '3')
    .replace(/۴/g, '4')
    .replace(/۵/g, '5')
    .replace(/۶/g, '6')
    .replace(/۷/g, '7')
    .replace(/۸/g, '8')
    .replace(/۹/g, '9');

  // 3. Tokenize by whitespace while preserving punctuation boundaries
  const tokens = processed.split(/\s+/).filter(Boolean);
  const romanTokens = tokens.map((token) => {
    // Already formatted honorific or numbers/punctuation
    if (/^\(.*\)$/.test(token) || /^[0-9.,!?;:"'()\-]+$/.test(token)) {
      return token;
    }

    // Capture leading/trailing punctuation attached to Urdu word
    const match = token.match(/^([^\u0600-\u06FF]*)([\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]+)([^\u0600-\u06FF]*)$/);
    if (match) {
      const [, pre, urduPart, post] = match;
      return `${pre}${transliterateWord(urduPart)}${post}`;
    }

    return transliterateWord(token);
  });

  // 4. Assemble and clean spacing
  let result = romanTokens
    .join(' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/([(\[])\s+/g, '$1')
    .replace(/\s+([)\]])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // 5. Capitalize first letter of sentences
  result = result.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, sep, char) => sep + char.toUpperCase());

  // Cache result for 48 hours
  transliterationCache.set(trimmed, result);

  return result;
}

export default transliterateUrdu;

import { QURAN_SURAHS } from './quranSurahs'
import { QURAN_PARAS, getParaForQuranPage } from './quranParas'

export interface QuranSearchResult {
  id: string
  type: 'page' | 'para' | 'surah' | 'ayah' | 'vocab'
  title: string
  arabicTitle?: string
  subtitle: string
  pageNumber: number
  surahNumber?: number
  surahName?: string
  ayahNumber?: number
  paraNumber?: number
  paraName?: string
  badgeText: string
  badgeColor: string
  matchedText?: string
  reference?: string
  vocabData?: any
}

/**
 * Standard Arabic Unicode normalization:
 * - Strips all tashkeel / harakat diacritics
 * - Normalizes Alefs (أ, إ, آ, ٱ -> ا)
 * - Normalizes Teh Marbuta (ة -> ه)
 * - Normalizes Yeh / Alef Maqsura (ى, ی -> ي)
 * - Normalizes Kaf (ک -> ك)
 * - Strips tatweel (ـ)
 */
export function normalizeArabicText(text: string): string {
  if (!text) return ''
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىی]/g, 'ي')
    .replace(/ک/g, 'ك')
    .replace(/ـ/g, '')
    .trim()
}

/**
 * Normalizes Latin / Roman transliterated queries
 */
export function normalizeLatinQuery(text: string): string {
  if (!text) return ''
  return text
    .toLowerCase()
    .replace(/['’`-]/g, '')
    .replace(/[^a-z0-9\s:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface FamousAyahEntry {
  title: string
  arabicTitle: string
  surahNumber: number
  surahName: string
  ayahNumber: number
  pageNumber: number
  meaning: string
  keywords: string[]
}

export const FAMOUS_AYAHS: FamousAyahEntry[] = [
  {
    title: 'Ayat al-Kursi (The Throne Verse)',
    arabicTitle: 'آية الكرسي',
    surahNumber: 2,
    surahName: 'Al-Baqarah',
    ayahNumber: 255,
    pageNumber: 42,
    meaning: 'Allah! There is no deity except Him, the Ever-Living, the Sustainer of existence...',
    keywords: ['kursi', 'throne', 'ayatul kursi', 'allah la ilaha', 'allahu la ilaha illa huwa'],
  },
  {
    title: 'Amanar-Rasul (Last Verses of Al-Baqarah)',
    arabicTitle: 'آمن الرسول',
    surahNumber: 2,
    surahName: 'Al-Baqarah',
    ayahNumber: 285,
    pageNumber: 49,
    meaning: 'The Messenger has believed in what was revealed to him from his Lord...',
    keywords: ['amanar rasul', 'last verses of baqarah', 'baqarah 285', 'baqarah 286'],
  },
  {
    title: 'Surah Al-Kahf (Opening 10 Verses)',
    arabicTitle: 'أوائل سورة الكهف',
    surahNumber: 18,
    surahName: 'Al-Kahf',
    ayahNumber: 1,
    pageNumber: 293,
    meaning: 'Protection from the trial of Dajjal; recitation on Friday...',
    keywords: ['kahf', 'friday', 'dajjal', 'cave', 'al kahf 10'],
  },
  {
    title: 'Surah Al-Mulk (The Sovereignty)',
    arabicTitle: 'سورة الملك',
    surahNumber: 67,
    surahName: 'Al-Mulk',
    ayahNumber: 1,
    pageNumber: 562,
    meaning: 'Blessed is He in whose hand is dominion... Intercessor in the grave.',
    keywords: ['mulk', 'tabarak', 'sovereignty', 'dominion', 'surah tabarak'],
  },
  {
    title: 'Surah Ya-Sin (Heart of the Quran)',
    arabicTitle: 'سورة يس',
    surahNumber: 36,
    surahName: 'Ya-Sin',
    ayahNumber: 1,
    pageNumber: 440,
    meaning: 'Ya-Sin. By the wise Qur\'an. Indeed you are from among the messengers.',
    keywords: ['yasin', 'yaseen', 'heart of quran', 'surah yasin'],
  },
  {
    title: 'Ayat ash-Shifa (Verses of Healing)',
    arabicTitle: 'آيات الشفاء',
    surahNumber: 17,
    surahName: 'Al-Isra',
    ayahNumber: 82,
    pageNumber: 290,
    meaning: 'And We send down of the Qur\'an that which is healing and mercy for the believers...',
    keywords: ['shifa', 'healing', 'cure', 'maraz', 'dawa'],
  },
  {
    title: 'Dua of Prophet Yunus (Ayat al-Kareema)',
    arabicTitle: 'دعاء يونس عليه السلام',
    surahNumber: 21,
    surahName: 'Al-Anbiya',
    ayahNumber: 87,
    pageNumber: 329,
    meaning: 'La ilaha illa anta subhanaka inni kuntu minaz-zalimeen...',
    keywords: ['yunus', 'fish', 'whale', 'la ilaha illa anta', 'mushkil', 'relief'],
  },
  {
    title: 'Dua of Prophet Musa (Rabbi Ishrah Li Sadri)',
    arabicTitle: 'دعاء موسى عليه السلام',
    surahNumber: 20,
    surahName: 'Taha',
    ayahNumber: 25,
    pageNumber: 313,
    meaning: 'My Lord, expand for me my breast and ease for me my task...',
    keywords: ['musa', 'rabbi ishrah', 'speech', 'ease my task'],
  },
  {
    title: 'Dua for Parents (Rabbir Hamhuma)',
    arabicTitle: 'دعاء للوالدين',
    surahNumber: 17,
    surahName: 'Al-Isra',
    ayahNumber: 24,
    pageNumber: 284,
    meaning: 'My Lord, have mercy upon them as they brought me up when I was small.',
    keywords: ['parents', 'walidain', 'mother', 'father', 'rabbir hamhuma'],
  },
  {
    title: 'Ayat an-Nur (The Verse of Light)',
    arabicTitle: 'آية النور',
    surahNumber: 24,
    surahName: 'An-Nur',
    ayahNumber: 35,
    pageNumber: 354,
    meaning: 'Allah is the Light of the heavens and the earth...',
    keywords: ['nur', 'light', 'allahu nurus samawati', 'lamp'],
  },
  {
    title: 'Ayat of Tawakkul & Provision (Talaq 2-3)',
    arabicTitle: 'ومن يتق الله يجعل له مخرجا',
    surahNumber: 65,
    surahName: 'At-Talaq',
    ayahNumber: 2,
    pageNumber: 558,
    meaning: 'And whoever fears Allah - He will make for him a way out and provide for him from where he does not expect.',
    keywords: ['tawakkul', 'provision', 'rizq', 'may yaqool', 'way out'],
  },
  {
    title: 'Surah Ar-Rahman (The Most Merciful)',
    arabicTitle: 'سورة الرحمن',
    surahNumber: 55,
    surahName: 'Ar-Rahman',
    ayahNumber: 1,
    pageNumber: 531,
    meaning: 'The Most Merciful. Taught the Qur\'an. Created man.',
    keywords: ['rahman', 'rehman', 'fabiayyi', 'favors', 'merciful'],
  },
  {
    title: 'Surah Al-Waqiah (The Inevitable Event)',
    arabicTitle: 'سورة الواقعة',
    surahNumber: 56,
    surahName: 'Al-Waqiah',
    ayahNumber: 1,
    pageNumber: 534,
    meaning: 'When the Occurrence occurs... Recited for protection against poverty.',
    keywords: ['waqiah', 'waqia', 'event', 'rizq', 'barakah'],
  },
  {
    title: 'Al-Mu\'awwidhatayn & Al-Ikhlas (The 3 Quls)',
    arabicTitle: 'المعوذات وسورة الإخلاص',
    surahNumber: 112,
    surahName: 'Al-Ikhlas',
    ayahNumber: 1,
    pageNumber: 604,
    meaning: 'Surah Al-Ikhlas, Al-Falaq, and An-Nas. The complete protection.',
    keywords: ['ikhlas', 'falaq', 'nas', 'quls', 'char qul', 'evil eye', 'nazar'],
  },
]

/**
 * Fast client-side query evaluator that searches across:
 * - Direct page numbers
 * - Paras / Juz (1 to 30)
 * - Surahs (1 to 114 by English, Roman Urdu, and normalized Arabic)
 * - Ayah references (e.g. 2:255, 18:10)
 * - Famous Ayahs and topics
 */
export function searchQuranIndex(
  rawQuery: string,
  options: { maxResults?: number } = {}
): QuranSearchResult[] {
  const maxResults = options.maxResults || 25
  const query = rawQuery.trim()
  if (!query) return []

  const results: QuranSearchResult[] = []
  const normQuery = normalizeLatinQuery(query)
  const normArabicQuery = normalizeArabicText(query)

  // 1. Direct Page Number Query (e.g. "45", "Page 120", "p 604")
  const pageMatch = query.match(/^(?:page\s*|p\.?\s*)?(\d{1,3})$/i)
  if (pageMatch) {
    const pageNum = parseInt(pageMatch[1], 10)
    if (pageNum >= 1 && pageNum <= 608) {
      const para = getParaForQuranPage(pageNum)
      results.push({
        id: `page-${pageNum}`,
        type: 'page',
        title: `Jump to Page ${pageNum}`,
        arabicTitle: `صفحة ${pageNum}`,
        subtitle: `Para ${para.number} (${para.name}) • ${para.startSurahName}`,
        pageNumber: pageNum,
        paraNumber: para.number,
        paraName: para.name,
        badgeText: `PAGE ${pageNum}`,
        badgeColor: 'bg-[#0E543F] text-white',
      })
    }
  }

  // 2. Direct Para / Juz Number Query (e.g. "Para 30", "Juz 1", "juz 25")
  const paraMatch = query.match(/^(?:para\s*|juz\s*|sipara\s*|j\s*)?(\d{1,2})$/i)
  if (paraMatch) {
    const paraNum = parseInt(paraMatch[1], 10)
    if (paraNum >= 1 && paraNum <= 30) {
      const p = QURAN_PARAS[paraNum - 1]
      if (p) {
        results.push({
          id: `para-${p.number}`,
          type: 'para',
          title: `Para ${p.number}: ${p.name}`,
          arabicTitle: p.arabicName,
          subtitle: `Starts at ${p.startSurahName} (v. ${p.startAyah}) • Pages ${p.startPage}–${p.endPage}`,
          pageNumber: p.startPage,
          paraNumber: p.number,
          paraName: p.name,
          surahNumber: p.startSurahNumber,
          surahName: p.startSurahName,
          badgeText: `PARA ${p.number}`,
          badgeColor: 'bg-amber-600 text-white',
        })
      }
    }
  }

  // 3. Ayah Reference Query (e.g. "2:255", "Surah 18 Ayah 10", "112:1")
  const ayahRefMatch = query.match(/(?:surah\s*)?(\d{1,3})\s*[:\s,\-]\s*(?:ayah\s*|verse\s*)?(\d{1,3})/i)
  if (ayahRefMatch) {
    const sNum = parseInt(ayahRefMatch[1], 10)
    const aNum = parseInt(ayahRefMatch[2], 10)

    const surah = QURAN_SURAHS.find((s) => s.number === sNum)
    if (surah && aNum >= 1 && aNum <= surah.totalVerses) {
      // Check famous Ayah exact mapping first
      const famous = FAMOUS_AYAHS.find((f) => f.surahNumber === sNum && f.ayahNumber === aNum)
      let resolvedPage = surah.startPage

      if (famous) {
        resolvedPage = famous.pageNumber
      } else if (surah.endPage > surah.startPage && surah.totalVerses > 1) {
        // Linear interpolation across Surah page bounds
        const pageSpan = surah.endPage - surah.startPage
        const estimatedOffset = Math.floor(((aNum - 1) / surah.totalVerses) * (pageSpan + 0.95))
        resolvedPage = Math.min(surah.endPage, surah.startPage + estimatedOffset)
      }

      const para = getParaForQuranPage(resolvedPage)

      results.push({
        id: `ayah-${sNum}-${aNum}`,
        type: 'ayah',
        title: `${surah.name} (${sNum}:${aNum})`,
        arabicTitle: surah.arabicName,
        subtitle: `Page ${resolvedPage} • Para ${para.number} (${para.name}) • Total ${surah.totalVerses} Verses`,
        pageNumber: resolvedPage,
        surahNumber: sNum,
        surahName: surah.name,
        ayahNumber: aNum,
        paraNumber: para.number,
        paraName: para.name,
        badgeText: `AYAH ${sNum}:${aNum}`,
        badgeColor: 'bg-purple-600 text-white',
        reference: `${surah.name} ${sNum}:${aNum}`,
      })
    }
  }

  // 4. Match Famous Ayahs by Topic / Keywords
  for (const f of FAMOUS_AYAHS) {
    const matchTitle = f.title.toLowerCase().includes(normQuery)
    const matchKeywords = f.keywords.some((k) => k.includes(normQuery) || normQuery.includes(k))
    const matchArabic = normalizeArabicText(f.arabicTitle).includes(normArabicQuery)

    if (matchTitle || matchKeywords || matchArabic) {
      if (!results.some((r) => r.id === `famous-${f.surahNumber}-${f.ayahNumber}`)) {
        const para = getParaForQuranPage(f.pageNumber)
        results.push({
          id: `famous-${f.surahNumber}-${f.ayahNumber}`,
          type: 'ayah',
          title: f.title,
          arabicTitle: f.arabicTitle,
          subtitle: `${f.surahName} (${f.surahNumber}:${f.ayahNumber}) • Page ${f.pageNumber} • Para ${para.number}`,
          pageNumber: f.pageNumber,
          surahNumber: f.surahNumber,
          surahName: f.surahName,
          ayahNumber: f.ayahNumber,
          paraNumber: para.number,
          paraName: para.name,
          badgeText: `SPECIAL AYAH`,
          badgeColor: 'bg-purple-700 text-white',
          matchedText: f.meaning,
          reference: `${f.surahName} ${f.surahNumber}:${f.ayahNumber}`,
        })
      }
    }
  }

  // 5. Match Surahs (by number, name, Arabic name, or English meaning)
  for (const s of QURAN_SURAHS) {
    const matchNum = s.number.toString() === normQuery
    const matchName = normalizeLatinQuery(s.name).includes(normQuery)
    const matchMeaning = s.meaning.toLowerCase().includes(normQuery)
    const matchArabic = normArabicQuery && normalizeArabicText(s.arabicName).includes(normArabicQuery)

    if (matchNum || matchName || matchMeaning || matchArabic) {
      if (!results.some((r) => r.id === `surah-${s.number}`)) {
        const para = getParaForQuranPage(s.startPage)
        results.push({
          id: `surah-${s.number}`,
          type: 'surah',
          title: `Surah #${s.number}: ${s.name}`,
          arabicTitle: s.arabicName,
          subtitle: `${s.meaning} • ${s.totalVerses} Verses • Starts Page ${s.startPage} (Para ${para.number})`,
          pageNumber: s.startPage,
          surahNumber: s.number,
          surahName: s.name,
          paraNumber: para.number,
          paraName: para.name,
          badgeText: `SURAH #${s.number}`,
          badgeColor: 'bg-[#0E543F] text-white',
        })
      }
    }
  }

  // 6. Match Paras / Juz (by name or Arabic title)
  for (const p of QURAN_PARAS) {
    const matchName = normalizeLatinQuery(p.name).includes(normQuery) || normalizeLatinQuery(p.romanUrduName).includes(normQuery)
    const matchArabic = normArabicQuery && normalizeArabicText(p.arabicName).includes(normArabicQuery)

    if (matchName || matchArabic) {
      if (!results.some((r) => r.id === `para-${p.number}`)) {
        results.push({
          id: `para-${p.number}`,
          type: 'para',
          title: `Para ${p.number}: ${p.name} (${p.romanUrduName})`,
          arabicTitle: p.arabicName,
          subtitle: `Starts at ${p.startSurahName} (v. ${p.startAyah}) • Pages ${p.startPage}–${p.endPage}`,
          pageNumber: p.startPage,
          paraNumber: p.number,
          paraName: p.name,
          surahNumber: p.startSurahNumber,
          surahName: p.startSurahName,
          badgeText: `PARA ${p.number}`,
          badgeColor: 'bg-amber-600 text-white',
        })
      }
    }
  }

  return results.slice(0, maxResults)
}

/**
 * Searches across the Top 600 Arabic Quran Vocabulary records:
 * - Arabic word
 * - Roman Urdu transliteration
 * - English meaning
 * - Urdu meaning
 * - Verse context
 */
export function searchVocabIndex(
  rawQuery: string,
  vocabWords: any[],
  maxResults = 30
): QuranSearchResult[] {
  const query = rawQuery.trim()
  if (!query || !vocabWords || vocabWords.length === 0) return []

  const normQuery = normalizeLatinQuery(query)
  const normArabic = normalizeArabicText(query)

  const results: QuranSearchResult[] = []

  for (const w of vocabWords) {
    const matchId = w.id.toString() === normQuery
    const matchTranslit = normalizeLatinQuery(w.transliteration || '').includes(normQuery)
    const matchMeaning = normalizeLatinQuery(w.meaning || '').includes(normQuery)
    const matchMeaningEng = normalizeLatinQuery(w.meaningEnglish || '').includes(normQuery)
    const matchMeaningUrdu = normalizeLatinQuery(w.meaningUrdu || '').includes(normQuery)
    const matchRef = normalizeLatinQuery(w.surahAyahRef || '').includes(normQuery)
    const matchArabic = normArabic && normalizeArabicText(w.arabic || '').includes(normArabic)

    if (matchId || matchTranslit || matchMeaning || matchMeaningEng || matchMeaningUrdu || matchRef || matchArabic) {
      results.push({
        id: `vocab-${w.id}`,
        type: 'vocab',
        title: `Word #${w.id}: ${w.transliteration} (${w.meaningEnglish || w.meaning})`,
        arabicTitle: w.arabic,
        subtitle: `Page ${w.pdfPage || w.pageIndex + 1} • Ref: ${w.surahAyahRef || 'Quran'} • ${w.repeats || ''}`,
        pageNumber: w.pdfPage || (w.pageIndex !== undefined ? w.pageIndex + 1 : 1),
        badgeText: `WORD #${w.id}`,
        badgeColor: 'bg-[#E2B755] text-[#0C382B]',
        matchedText: w.verseEnglish || w.meaning,
        reference: w.surahAyahRef,
        vocabData: w,
      })
    }

    if (results.length >= maxResults) break
  }

  return results
}

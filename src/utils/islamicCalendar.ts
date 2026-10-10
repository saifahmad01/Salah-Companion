export interface HijriDate {
  day: number
  month: number
  year: number
  monthNameEn: string
  monthNameAr: string
  dayNameAr: string
  dayNameEn: string
  specialEvent?: string
  specialEventAr?: string
  isSpecialDay?: boolean
  isWhiteDay?: boolean
  isJumuah?: boolean
}

export interface IslamicEvent {
  month: number
  day: number
  titleEn: string
  titleAr: string
  type: 'holiday' | 'sunnah' | 'fasting'
}

export const ISLAMIC_MONTHS = [
  { index: 1, nameEn: 'Muharram', nameAr: 'المُحَرَّم', isSacred: true },
  { index: 2, nameEn: 'Safar', nameAr: 'صَفَر', isSacred: false },
  { index: 3, nameEn: "Rabi' al-Awwal", nameAr: 'رَبِيع الأَوَّل', isSacred: false },
  { index: 4, nameEn: "Rabi' al-Thani", nameAr: 'رَبِيع الآخِر', isSacred: false },
  { index: 5, nameEn: 'Jumada al-Ula', nameAr: 'جُمَادَى الأُولَى', isSacred: false },
  { index: 6, nameEn: 'Jumada al-Akhirah', nameAr: 'جُمَادَى الآخِرَة', isSacred: false },
  { index: 7, nameEn: 'Rajab', nameAr: 'رَجَب', isSacred: true },
  { index: 8, nameEn: "Sha'ban", nameAr: 'شَعْبَان', isSacred: false },
  { index: 9, nameEn: 'Ramadan', nameAr: 'رَمَضَان', isSacred: false },
  { index: 10, nameEn: 'Shawwal', nameAr: 'شَوَّال', isSacred: false },
  { index: 11, nameEn: "Dhu al-Qi'dah", nameAr: 'ذُو القَعْدَة', isSacred: true },
  { index: 12, nameEn: 'Dhu al-Hijjah', nameAr: 'ذُو الحِجَّة', isSacred: true },
]

export const ISLAMIC_EVENTS: IslamicEvent[] = [
  { month: 1, day: 1, titleEn: 'Islamic New Year', titleAr: 'رأس السنة الهجرية', type: 'holiday' },
  { month: 1, day: 9, titleEn: 'Tasu’a Fast', titleAr: 'صوم تاسوعاء', type: 'fasting' },
  { month: 1, day: 10, titleEn: 'Day of Ashura', titleAr: 'يوم عاشوراء', type: 'holiday' },
  { month: 3, day: 12, titleEn: 'Mawlid an-Nabi ﷺ', titleAr: 'المولد النبوي الشريف', type: 'holiday' },
  { month: 7, day: 27, titleEn: 'Isra & Mi’raj', titleAr: 'الإسراء والمعراج', type: 'holiday' },
  { month: 8, day: 15, titleEn: 'Nisf Sha’ban', titleAr: 'ليلة النصف من شعبان', type: 'sunnah' },
  { month: 9, day: 1, titleEn: '1st Day of Ramadan', titleAr: 'بداية شهر رمضان المبارك', type: 'holiday' },
  { month: 9, day: 21, titleEn: 'Laylat al-Qadr 21st', titleAr: 'ليلة القدر (٢١)', type: 'sunnah' },
  { month: 9, day: 23, titleEn: 'Laylat al-Qadr 23rd', titleAr: 'ليلة القدر (٢٣)', type: 'sunnah' },
  { month: 9, day: 25, titleEn: 'Laylat al-Qadr 25th', titleAr: 'ليلة القدر (٢٥)', type: 'sunnah' },
  { month: 9, day: 27, titleEn: 'Laylat al-Qadr 27th', titleAr: 'ليلة القدر (٢٧)', type: 'holiday' },
  { month: 9, day: 29, titleEn: 'Laylat al-Qadr 29th', titleAr: 'ليلة القدر (٢٩)', type: 'sunnah' },
  { month: 10, day: 1, titleEn: 'Eid al-Fitr (Day 1)', titleAr: 'عيد الفطر المبارك', type: 'holiday' },
  { month: 10, day: 2, titleEn: 'Eid al-Fitr (Day 2)', titleAr: 'ثاني أيام عيد الفطر', type: 'holiday' },
  { month: 10, day: 3, titleEn: 'Eid al-Fitr (Day 3)', titleAr: 'ثالث أيام عيد الفطر', type: 'holiday' },
  { month: 12, day: 1, titleEn: 'First 10 Days of Dhul Hijjah', titleAr: 'أوائل ذي الحجة', type: 'sunnah' },
  { month: 12, day: 8, titleEn: 'Day of Tarwiyah (Hajj begins)', titleAr: 'يوم التروية', type: 'sunnah' },
  { month: 12, day: 9, titleEn: 'Day of Arafah', titleAr: 'يوم عرفة المبارك', type: 'holiday' },
  { month: 12, day: 10, titleEn: 'Eid al-Adha', titleAr: 'عيد الأضحى المبارك', type: 'holiday' },
  { month: 12, day: 11, titleEn: 'Tashreeq Day 1', titleAr: 'أيام التشريق (الأول)', type: 'holiday' },
  { month: 12, day: 12, titleEn: 'Tashreeq Day 2', titleAr: 'أيام التشريق (الثاني)', type: 'holiday' },
  { month: 12, day: 13, titleEn: 'Tashreeq Day 3', titleAr: 'أيام التشريق (الثالث)', type: 'holiday' },
]

export const ARABIC_DAYS = [
  { en: 'Sunday', ar: 'الأحد', shortEn: 'Sun', shortAr: 'أحد' },
  { en: 'Monday', ar: 'الإثنين', shortEn: 'Mon', shortAr: 'إثن' },
  { en: 'Tuesday', ar: 'الثلاثاء', shortEn: 'Tue', shortAr: 'ثلا' },
  { en: 'Wednesday', ar: 'الأربعاء', shortEn: 'Wed', shortAr: 'أرب' },
  { en: 'Thursday', ar: 'الخميس', shortEn: 'Thu', shortAr: 'خمي' },
  { en: 'Friday', ar: 'الجمعة', shortEn: 'Fri', shortAr: 'جمع', isJumuah: true },
  { en: 'Saturday', ar: 'السبت', shortEn: 'Sat', shortAr: 'سبت' },
]

// Convert Arabic digits to Western or vice versa
export function toArabicDigits(num: number | string): string {
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  return num.toString().replace(/\d/g, (d) => digits[parseInt(d, 10)])
}

/**
 * High-accuracy astronomical Gregorian to Julian Day
 */
export function gregorianToJulianDay(year: number, month: number, day: number): number {
  if (month < 3) {
    year -= 1
    month += 12
  }
  const a = Math.floor(year / 100)
  const b = 2 - a + Math.floor(a / 4)
  return (
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    b -
    1524.5
  )
}

/**
 * Julian Day to Gregorian Date
 */
export function julianDayToGregorian(jd: number): Date {
  const z = Math.floor(jd + 0.5)
  const a = Math.floor((z - 1867216.25) / 36524.25)
  const b = z + 1 + a - Math.floor(a / 4)
  const c = b + 1524
  const d = Math.floor((c - 122.1) / 365.25)
  const e = Math.floor(365.25 * d)
  const g = Math.floor((c - e) / 30.6001)
  const day = c - e - Math.floor(30.6001 * g)
  const month = g < 13.5 ? g - 1 : g - 13
  const year = month > 2.5 ? d - 4716 : d - 4715
  return new Date(year, month - 1, day, 12, 0, 0)
}

/**
 * Julian Day to Hijri Date
 */
export function julianDayToHijri(jd: number): { year: number; month: number; day: number } {
  const l = Math.floor(jd) - 1948440 + 10632
  const n = Math.floor((l - 1) / 10631)
  const lPrime = l - 10631 * n + 354
  const j =
    Math.floor((10985 - lPrime) / 5316) * Math.floor((50 * lPrime) / 17719) +
    Math.floor(lPrime / 5670) * Math.floor((43 * lPrime) / 15238)
  const lDoublePrime =
    lPrime -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29
  const m = Math.floor((24 * lDoublePrime) / 709)
  const d = lDoublePrime - Math.floor((709 * m) / 24)
  const y = 30 * n + j - 30

  return {
    year: y,
    month: m,
    day: d,
  }
}

/**
 * Hijri to Julian Day
 */
export function hijriToJulianDay(year: number, month: number, day: number): number {
  return (
    Math.floor((11 * year + 3) / 30) +
    354 * year +
    30 * month -
    Math.floor((month - 1) / 2) +
    day +
    1948440 -
    385
  )
}

/**
 * Convert Gregorian date to detailed HijriDate object
 */
export function getHijriFromGregorian(date: Date): HijriDate {
  // Use Intl if supported, fallback to astronomical calculation
  try {
    const parts = new Intl.DateTimeFormat('en-TN-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    }).formatToParts(date)

    const d = parseInt(parts.find((p) => p.type === 'day')?.value || 'NaN', 10)
    const m = parseInt(parts.find((p) => p.type === 'month')?.value || 'NaN', 10)
    const y = parseInt(parts.find((p) => p.type === 'year')?.value || 'NaN', 10)

    if (isNaN(d) || isNaN(m) || isNaN(y)) {
      throw new Error('Invalid parsed Hijri values')
    }

    const monthObj = ISLAMIC_MONTHS[m - 1] || ISLAMIC_MONTHS[0]
    const dayOfWeek = date.getDay()
    const dayObj = ARABIC_DAYS[dayOfWeek]

    // Check special event
    const event = ISLAMIC_EVENTS.find((e) => e.month === m && e.day === d)
    const isWhiteDay = d === 13 || d === 14 || d === 15

    return {
      day: d,
      month: m,
      year: y,
      monthNameEn: monthObj.nameEn,
      monthNameAr: monthObj.nameAr,
      dayNameEn: dayObj.en,
      dayNameAr: dayObj.ar,
      specialEvent: event?.titleEn,
      specialEventAr: event?.titleAr,
      isSpecialDay: !!event,
      isWhiteDay,
      isJumuah: dayOfWeek === 5,
    }
  } catch {
    // Astronomical Julian Day fallback
    const jd = gregorianToJulianDay(date.getFullYear(), date.getMonth() + 1, date.getDate())
    const h = julianDayToHijri(jd)
    const monthObj = ISLAMIC_MONTHS[h.month - 1] || ISLAMIC_MONTHS[0]
    const dayOfWeek = date.getDay()
    const dayObj = ARABIC_DAYS[dayOfWeek]
    const event = ISLAMIC_EVENTS.find((e) => e.month === h.month && e.day === h.day)

    return {
      day: h.day,
      month: h.month,
      year: h.year,
      monthNameEn: monthObj.nameEn,
      monthNameAr: monthObj.nameAr,
      dayNameEn: dayObj.en,
      dayNameAr: dayObj.ar,
      specialEvent: event?.titleEn,
      specialEventAr: event?.titleAr,
      isSpecialDay: !!event,
      isWhiteDay: h.day >= 13 && h.day <= 15,
      isJumuah: dayOfWeek === 5,
    }
  }
}

/**
 * Get days in Hijri month (29 or 30 days)
 */
export function getDaysInHijriMonth(year: number, month: number): number {
  const startJd = hijriToJulianDay(year, month, 1)
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const nextJd = hijriToJulianDay(nextYear, nextMonth, 1)
  const diff = nextJd - startJd
  return diff === 29 || diff === 30 ? diff : 30
}

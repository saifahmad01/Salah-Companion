export type PrayerStatus = 'ON_TIME' | 'LATE' | 'MISSED' | 'QADA'

export interface PrayerItem {
  id: string
  name: string
  time: string
  iconType: 'moon' | 'sun' | 'cloud-sun' | 'sunset' | 'night-moon'
  completed: boolean
  prayerStatus?: PrayerStatus | null
  rawDate?: Date
  windowEndDate?: Date
  statusBadge?: 'completed' | 'active' | 'upcoming' | 'passed'
  statusBadgeText?: string
  subtitle?: string
  windowText?: string
  isUpcoming?: boolean
  availableAtMessage?: string
}

export interface DeedItem {
  id: string
  title: string
  iconType: 'quran' | 'tasbih' | 'adhkar-morning' | 'help' | 'adhkar-evening' | 'parents'
  completed: boolean
}

export interface HadithData {
  arabic: string
  translation: string
  reference: string
  narrator?: string
  explanation?: string
}

export interface LessonData {
  title: string
  subtitle: string
  readTime: string
  difficulty: string
  thumbnailUrl: string
}

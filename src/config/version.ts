export interface AppReleaseMetadata {
  version: string
  buildNumber: number
  releaseDate: string
  releaseNotes: string[]
  apkDownloadUrl?: string | null
  minSupportedVersion?: string
  isMandatoryUpdate?: boolean
}

export const CURRENT_APP_VERSION = '1.0.0'
export const CURRENT_BUILD_NUMBER = 100
export const CURRENT_RELEASE_DATE = '2026-11-04'

export const DEFAULT_RELEASE_METADATA: AppReleaseMetadata = {
  version: CURRENT_APP_VERSION,
  buildNumber: CURRENT_BUILD_NUMBER,
  releaseDate: CURRENT_RELEASE_DATE,
  releaseNotes: [
    'Automated missed Salah tracking with astronomical sunset & sunrise deadlines',
    'Qada recovery management: 1-click fulfillment of elapsed prayers with authentic Hadith forgiveness reminders',
    'High-DPI offline Quran PDF reader with 30 Para navigation, quick jump, and page bookmarks',
    'Top 600 Arabic Vocabulary flashcards with review tracking and search',
    'Great Circle Qibla compass with EMA sensor smoothing and Kaaba alignment haptics',
    'OpenStreetMap Overpass nearby Mosque finder with distance routing',
    'Production Web Push and Capacitor native prayer start & 30-minute reminder alarms',
  ],
  apkDownloadUrl: null, // Populated via admin release management or production HTTPS build
  minSupportedVersion: '1.0.0',
  isMandatoryUpdate: false,
}

/**
 * Compare two semver strings: e.g. "1.0.1" > "1.0.0" -> 1, "1.0.0" === "1.0.0" -> 0, etc.
 */
export function compareSemver(v1: string, v2: string): number {
  const p1 = (v1 || '0.0.0').replace(/^v/, '').split('.').map(Number)
  const p2 = (v2 || '0.0.0').replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0
    const num2 = p2[i] || 0
    if (num1 > num2) return 1
    if (num1 < num2) return -1
  }
  return 0
}

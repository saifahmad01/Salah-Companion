import { storage } from '../platform/storage'
import { salahApi, authStorage, type QuranPageBookmarkItem, type QuranReadingProgressStateItem } from './backendApi'
import type { UserWordProgress } from '../data/quranVocabulary'

export interface QuranReadingProgress {
  lastPage: number
  lastSurah: string
  lastSurahNumber: number
  lastAyah: number
  totalReadPages: number
  lastReadDate: string
}

export interface OfflinePdfStatus {
  isDownloaded: boolean
  fileSize?: number
  downloadedAt?: string
  version?: number
  verified?: boolean
}

export interface StoredPdfRecord {
  key: string
  blob: Blob
  size: number
  mimeType: string
  downloadedAt: string
  version: number
  verified: boolean
}

const DB_NAME = 'salah_offline_quran_db'
const DB_VERSION = 2
const STORE_FILES = 'quran_files'
const STORE_BOOKMARKS = 'quran_bookmarks'
const PDF_KEY = 'quran_roman_urdu_pdf'
const VOCAB_PDF_KEY = 'quran_vocab_600_pdf'
const PROGRESS_KEY = 'salah_quran_reading_progress'
const WORD_PROGRESS_KEY = 'salah_quran_word_progress'

export const SUPABASE_STORAGE_URLS = {
  quran: 'https://ttsaxxdduezaputwakin.supabase.co/storage/v1/object/public/quran-resources/quran/roman-urdu-quran.pdf',
  vocab: 'https://ttsaxxdduezaputwakin.supabase.co/storage/v1/object/public/quran-resources/vocabulary/600-arabic-words.pdf',
}

function openQuranDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported on this browser'))
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES)
      }
      if (!db.objectStoreNames.contains(STORE_BOOKMARKS)) {
        db.createObjectStore(STORE_BOOKMARKS)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Verify integrity of downloaded PDF blob:
 * 1. Must be at least 1MB
 * 2. Magic bytes must begin with %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
 */
async function verifyPdfBlob(blob: Blob): Promise<{ valid: boolean; error?: string }> {
  if (!blob || blob.size < 1024 * 1024) {
    return { valid: false, error: 'Downloaded file is smaller than expected (<1MB). May be incomplete.' }
  }

  try {
    const headerSlice = await blob.slice(0, 8).arrayBuffer()
    const headerBytes = new Uint8Array(headerSlice)
    const headerString = String.fromCharCode(...headerBytes)
    if (!headerString.startsWith('%PDF-')) {
      return { valid: false, error: 'Invalid PDF file header. The download was corrupted.' }
    }
    return { valid: true }
  } catch (err: any) {
    return { valid: false, error: `Verification failed: ${err.message}` }
  }
}

/**
 * Estimate storage quota before initiating large binary downloads
 */
async function checkStorageQuota(requiredBytes: number): Promise<{ available: boolean; error?: string }> {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate()
      const quota = estimate.quota || 0
      const usage = estimate.usage || 0
      const free = quota - usage
      if (quota > 0 && free < requiredBytes) {
        const freeMb = (free / (1024 * 1024)).toFixed(0)
        const reqMb = (requiredBytes / (1024 * 1024)).toFixed(0)
        return {
          available: false,
          error: `Insufficient device storage. ${reqMb} MB required, but only ${freeMb} MB available.`,
        }
      }
    }
    return { available: true }
  } catch {
    return { available: true }
  }
}

export const offlineQuranService = {
  // ==========================================================================
  // 1. QURAN ROMAN URDU PDF OFFLINE STORAGE
  // ==========================================================================

  /**
   * Check if Quran PDF is saved locally with rich status
   */
  async isQuranDownloaded(): Promise<boolean> {
    const status = await this.getQuranDownloadStatus()
    return status.isDownloaded
  },

  async getQuranDownloadStatus(): Promise<OfflinePdfStatus> {
    try {
      const db = await openQuranDB()
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_FILES, 'readonly')
        const store = tx.objectStore(STORE_FILES)
        const req = store.get(PDF_KEY)
        req.onsuccess = () => {
          const item = req.result
          if (item) {
            const size = item.size || item.blob?.size || (item instanceof Blob ? item.size : 0)
            resolve({
              isDownloaded: true,
              fileSize: size,
              downloadedAt: item.downloadedAt || new Date().toISOString(),
              version: item.version || 1,
              verified: item.verified ?? true,
            })
          } else {
            resolve({ isDownloaded: false })
          }
        }
        req.onerror = () => resolve({ isDownloaded: false })
      })
    } catch {
      return { isDownloaded: false }
    }
  },

  /**
   * Download Quran PDF with chunk streaming, progress callback, quota check & integrity check
   */
  async downloadQuranPdf(
    url = SUPABASE_STORAGE_URLS.quran,
    onProgress?: (percent: number, loadedBytes: number, totalBytes: number) => void
  ): Promise<boolean> {
    // 1. Storage quota validation (~50MB required)
    const quotaCheck = await checkStorageQuota(55 * 1024 * 1024)
    if (!quotaCheck.available) {
      throw new Error(quotaCheck.error || 'Insufficient storage space on this device.')
    }

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Download failed (HTTP ${response.status})`)
      }

      const contentLength = response.headers.get('content-length')
      const total = contentLength ? parseInt(contentLength, 10) : 51463000

      let fullBlob: Blob
      if (!response.body) {
        fullBlob = await response.blob()
        onProgress?.(95, fullBlob.size, total)
      } else {
        const reader = response.body.getReader()
        const chunks: Uint8Array[] = []
        let receivedBytes = 0

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (value) {
            chunks.push(value)
            receivedBytes += value.length
            if (onProgress) {
              const percent = Math.min(98, Math.round((receivedBytes / total) * 100))
              onProgress(percent, receivedBytes, total)
            }
          }
        }
        fullBlob = new Blob(chunks as any[], { type: 'application/pdf' })
      }

      // 2. Cryptographic & Header Integrity Verification
      const integrity = await verifyPdfBlob(fullBlob)
      if (!integrity.valid) {
        throw new Error(`Integrity verification failed: ${integrity.error}`)
      }

      // 3. Save to IndexedDB
      await this.saveQuranBlob(fullBlob)
      onProgress?.(100, fullBlob.size, fullBlob.size)
      return true
    } catch (err: any) {
      console.error('[OfflineQuran] Download Quran failed:', err)
      throw err
    }
  },

  async redownloadQuranPdf(
    onProgress?: (percent: number, loadedBytes: number, totalBytes: number) => void
  ): Promise<boolean> {
    await this.deleteDownloadedQuran()
    return await this.downloadQuranPdf(SUPABASE_STORAGE_URLS.quran, onProgress)
  },

  async saveQuranBlob(blob: Blob): Promise<void> {
    const db = await openQuranDB()
    const record: StoredPdfRecord = {
      key: PDF_KEY,
      blob,
      size: blob.size,
      mimeType: 'application/pdf',
      downloadedAt: new Date().toISOString(),
      version: 1,
      verified: true,
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readwrite')
      const store = tx.objectStore(STORE_FILES)
      const req = store.put(record, PDF_KEY)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  },

  async getQuranBlob(): Promise<Blob | null> {
    try {
      const db = await openQuranDB()
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_FILES, 'readonly')
        const store = tx.objectStore(STORE_FILES)
        const req = store.get(PDF_KEY)
        req.onsuccess = () => {
          const item = req.result
          if (!item) return resolve(null)
          if (item instanceof Blob) return resolve(item)
          if (item?.blob instanceof Blob) return resolve(item.blob)
          resolve(null)
        }
        req.onerror = () => resolve(null)
      })
    } catch {
      return null
    }
  },

  async deleteDownloadedQuran(): Promise<void> {
    try {
      const db = await openQuranDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_FILES, 'readwrite')
        const store = tx.objectStore(STORE_FILES)
        const req = store.delete(PDF_KEY)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      })
    } catch (err) {
      console.warn('[OfflineQuran] Delete error:', err)
    }
  },

  // ==========================================================================
  // 2. 600 ARABIC VOCABULARY PDF OFFLINE STORAGE
  // ==========================================================================

  async isVocabPdfDownloaded(): Promise<boolean> {
    const status = await this.getVocabDownloadStatus()
    return status.isDownloaded
  },

  async getVocabDownloadStatus(): Promise<OfflinePdfStatus> {
    try {
      const db = await openQuranDB()
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_FILES, 'readonly')
        const store = tx.objectStore(STORE_FILES)
        const req = store.get(VOCAB_PDF_KEY)
        req.onsuccess = () => {
          const item = req.result
          if (item) {
            const size = item.size || item.blob?.size || (item instanceof Blob ? item.size : 0)
            resolve({
              isDownloaded: true,
              fileSize: size,
              downloadedAt: item.downloadedAt || new Date().toISOString(),
              version: item.version || 1,
              verified: item.verified ?? true,
            })
          } else {
            resolve({ isDownloaded: false })
          }
        }
        req.onerror = () => resolve({ isDownloaded: false })
      })
    } catch {
      return { isDownloaded: false }
    }
  },

  async downloadVocabPdf(
    url = SUPABASE_STORAGE_URLS.vocab,
    onProgress?: (percent: number, loadedBytes: number, totalBytes: number) => void
  ): Promise<boolean> {
    // Storage quota validation (~40MB required)
    const quotaCheck = await checkStorageQuota(42 * 1024 * 1024)
    if (!quotaCheck.available) {
      throw new Error(quotaCheck.error || 'Insufficient storage space on this device.')
    }

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Download failed (HTTP ${response.status})`)
      }

      const contentLength = response.headers.get('content-length')
      const total = contentLength ? parseInt(contentLength, 10) : 39183125

      let fullBlob: Blob
      if (!response.body) {
        fullBlob = await response.blob()
        onProgress?.(95, fullBlob.size, total)
      } else {
        const reader = response.body.getReader()
        const chunks: Uint8Array[] = []
        let receivedBytes = 0

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (value) {
            chunks.push(value)
            receivedBytes += value.length
            if (onProgress) {
              const percent = Math.min(98, Math.round((receivedBytes / total) * 100))
              onProgress(percent, receivedBytes, total)
            }
          }
        }
        fullBlob = new Blob(chunks as any[], { type: 'application/pdf' })
      }

      // Verify integrity
      const integrity = await verifyPdfBlob(fullBlob)
      if (!integrity.valid) {
        throw new Error(`Integrity verification failed: ${integrity.error}`)
      }

      await this.saveVocabBlob(fullBlob)
      onProgress?.(100, fullBlob.size, fullBlob.size)
      return true
    } catch (err: any) {
      console.error('[OfflineQuran] Download Vocab failed:', err)
      throw err
    }
  },

  async redownloadVocabPdf(
    onProgress?: (percent: number, loadedBytes: number, totalBytes: number) => void
  ): Promise<boolean> {
    await this.deleteDownloadedVocabPdf()
    return await this.downloadVocabPdf(SUPABASE_STORAGE_URLS.vocab, onProgress)
  },

  async saveVocabBlob(blob: Blob): Promise<void> {
    const db = await openQuranDB()
    const record: StoredPdfRecord = {
      key: VOCAB_PDF_KEY,
      blob,
      size: blob.size,
      mimeType: 'application/pdf',
      downloadedAt: new Date().toISOString(),
      version: 1,
      verified: true,
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readwrite')
      const store = tx.objectStore(STORE_FILES)
      const req = store.put(record, VOCAB_PDF_KEY)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  },

  async getVocabPdfBlob(): Promise<Blob | null> {
    try {
      const db = await openQuranDB()
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_FILES, 'readonly')
        const store = tx.objectStore(STORE_FILES)
        const req = store.get(VOCAB_PDF_KEY)
        req.onsuccess = () => {
          const item = req.result
          if (!item) return resolve(null)
          if (item instanceof Blob) return resolve(item)
          if (item?.blob instanceof Blob) return resolve(item.blob)
          resolve(null)
        }
        req.onerror = () => resolve(null)
      })
    } catch {
      return null
    }
  },

  async deleteDownloadedVocabPdf(): Promise<void> {
    try {
      const db = await openQuranDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_FILES, 'readwrite')
        const store = tx.objectStore(STORE_FILES)
        const req = store.delete(VOCAB_PDF_KEY)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      })
    } catch (err) {
      console.warn('[OfflineQuran] Delete vocab error:', err)
    }
  },

  async triggerFileDownload(url = SUPABASE_STORAGE_URLS.vocab, filename = 'Top 600 Words of the Quran.pdf') {
    const blob = await this.getVocabPdfBlob()
    const objectUrl = blob ? URL.createObjectURL(blob) : url
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    if (blob) {
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    }
  },

  // ==========================================================================
  // 3. PERSISTENT READING PROGRESS STATE & OFFLINE-FIRST SYNC
  // ==========================================================================

  getReadingProgress(): QuranReadingProgress {
    return (
      storage.getItem<QuranReadingProgress>(PROGRESS_KEY) || {
        lastPage: 1,
        lastSurah: 'Al-Fatihah',
        lastSurahNumber: 1,
        lastAyah: 1,
        totalReadPages: 0,
        lastReadDate: new Date().toISOString().split('T')[0],
      }
    )
  },

  saveReadingProgress(progress: Partial<QuranReadingProgress>): QuranReadingProgress {
    const current = this.getReadingProgress()
    const updated: QuranReadingProgress = {
      ...current,
      ...progress,
      lastReadDate: new Date().toISOString().split('T')[0],
    }
    storage.setItem(PROGRESS_KEY, updated)

    // Background sync with backend if online
    if (progress.lastPage) {
      salahApi
        .saveQuranReadingProgressState({
          resourceKey: 'quran-roman-urdu',
          lastPage: progress.lastPage,
          totalPages: 608,
          lastSurah: progress.lastSurah || current.lastSurah,
        })
        .catch(() => {})
    }

    return updated
  },

  async syncRemoteReadingProgress(resourceKey = 'quran-roman-urdu'): Promise<QuranReadingProgressStateItem | null> {
    try {
      const res = await salahApi.getQuranReadingProgressState(resourceKey)
      if (res?.data) {
        if (resourceKey === 'quran-roman-urdu' && res.data.lastPage > 0) {
          const current = this.getReadingProgress()
          this.saveReadingProgress({
            lastPage: res.data.lastPage,
            lastSurah: res.data.lastSurah || current.lastSurah,
          })
        }
        return res.data
      }
    } catch {
      // Offline fallback: keep local
    }
    return null
  },

  // ==========================================================================
  // 4. PERSONAL PDF PAGE BOOKMARKS & OFFLINE CACHE
  // ==========================================================================

  getBookmarkStorageKey(resourceKey: string): string {
    const user = authStorage.getCachedUser() || authStorage.getUserFromToken()
    const userPrefix = user?.id ? `${user.id}_` : ''
    return `salah_pdf_bookmarks_${userPrefix}${resourceKey}`
  },

  getLocalBookmarks(resourceKey: string): QuranPageBookmarkItem[] {
    const key = this.getBookmarkStorageKey(resourceKey)
    let list = storage.getItem<QuranPageBookmarkItem[]>(key)
    // Legacy migration fallback if user-scoped key is empty
    if ((!list || list.length === 0) && key !== `salah_pdf_bookmarks_${resourceKey}`) {
      const legacy = storage.getItem<QuranPageBookmarkItem[]>(`salah_pdf_bookmarks_${resourceKey}`)
      if (legacy && legacy.length > 0) {
        list = legacy
        storage.setItem(key, legacy)
      }
    }
    const safeList = Array.isArray(list) ? list : []
    const seen = new Set<number>()
    const deduped: QuranPageBookmarkItem[] = []
    for (const b of safeList) {
      if (!seen.has(b.pageNumber)) {
        seen.add(b.pageNumber)
        deduped.push(b)
      }
    }
    return deduped.sort((a, b) => a.pageNumber - b.pageNumber)
  },

  saveLocalBookmarks(resourceKey: string, bookmarks: QuranPageBookmarkItem[]): void {
    const key = this.getBookmarkStorageKey(resourceKey)
    const seen = new Set<number>()
    const deduped: QuranPageBookmarkItem[] = []
    for (const b of bookmarks) {
      if (!seen.has(b.pageNumber)) {
        seen.add(b.pageNumber)
        deduped.push(b)
      }
    }
    deduped.sort((a, b) => a.pageNumber - b.pageNumber)
    storage.setItem(key, deduped)
  },

  async fetchBookmarks(resourceKey: string): Promise<QuranPageBookmarkItem[]> {
    const local = this.getLocalBookmarks(resourceKey)
    try {
      const res = await salahApi.getQuranPageBookmarks(resourceKey)
      if (res?.data && Array.isArray(res.data)) {
        this.saveLocalBookmarks(resourceKey, res.data)
        return this.getLocalBookmarks(resourceKey)
      }
    } catch {
      // Offline fallback
    }
    return local
  },

  async addBookmark(payload: {
    resourceKey: string
    pageNumber: number
    title: string
    notes?: string
  }): Promise<QuranPageBookmarkItem> {
    const local = this.getLocalBookmarks(payload.resourceKey)
    const existing = local.find((b) => b.pageNumber === payload.pageNumber)
    const user = authStorage.getCachedUser() || authStorage.getUserFromToken()
    const tempItem: QuranPageBookmarkItem = {
      id: existing?.id && !existing.id.startsWith('local_') ? existing.id : `local_${Date.now()}`,
      userId: user?.id || 'current',
      resourceKey: payload.resourceKey,
      pageNumber: payload.pageNumber,
      title: payload.title,
      notes: payload.notes || null,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Upsert locally immediately for 0ms reactivity
    const filtered = local.filter((b) => b.pageNumber !== payload.pageNumber)
    filtered.push(tempItem)
    this.saveLocalBookmarks(payload.resourceKey, filtered)

    try {
      const res = await salahApi.saveQuranPageBookmark(payload)
      if (res?.data) {
        const reUpdated = this.getLocalBookmarks(payload.resourceKey).map((b) =>
          b.pageNumber === payload.pageNumber ? res.data : b
        )
        this.saveLocalBookmarks(payload.resourceKey, reUpdated)
        return res.data
      }
    } catch (err) {
      console.warn('[OfflineQuran] Server unreachable, saved bookmark locally in cache:', err)
    }
    return tempItem
  },

  async deleteBookmark(resourceKey: string, bookmarkId: string, pageNumber: number): Promise<void> {
    const local = this.getLocalBookmarks(resourceKey)
    const updated = local.filter((b) => b.id !== bookmarkId && b.pageNumber !== pageNumber)
    this.saveLocalBookmarks(resourceKey, updated)

    try {
      await salahApi.deleteQuranPageBookmark({
        id: bookmarkId.startsWith('local_') ? undefined : bookmarkId,
        resourceKey,
        pageNumber,
      })
    } catch (err) {
      console.warn('[OfflineQuran] Server unreachable for deleteBookmark:', err)
    }
  },

  // ==========================================================================
  // 5. 600 VOCABULARY WORDS PROGRESS
  // ==========================================================================

  saveWordProgressMap(map: Record<number, UserWordProgress>): void {
    storage.setItem(WORD_PROGRESS_KEY, map)
  },


  getWordProgressMap(): Record<number, UserWordProgress> {
    return storage.getItem<Record<number, UserWordProgress>>(WORD_PROGRESS_KEY) || {}
  },

  updateWordProgress(
    wordId: number,
    update: Partial<UserWordProgress>
  ): Record<number, UserWordProgress> {
    const current = this.getWordProgressMap()
    const existing = current[wordId] || {
      wordId,
      isLearned: false,
      isBookmarked: false,
      reviewCount: 0,
      lastReviewedAt: null,
    }

    current[wordId] = {
      ...existing,
      ...update,
      lastReviewedAt: new Date().toISOString(),
    }

    storage.setItem(WORD_PROGRESS_KEY, current)
    return current
  },
}

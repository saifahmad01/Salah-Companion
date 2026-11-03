import { storage } from '../platform/storage'
import type { UserWordProgress } from '../data/quranVocabulary'

export interface QuranReadingProgress {
  lastPage: number
  lastSurah: string
  lastSurahNumber: number
  lastAyah: number
  totalReadPages: number
  lastReadDate: string
}

const DB_NAME = 'salah_offline_quran_db'
const DB_VERSION = 1
const STORE_NAME = 'quran_files'
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
      return reject(new Error('IndexedDB not supported'))
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export const offlineQuranService = {
  /**
   * Check if Quran PDF is saved locally for offline use
   */
  async isQuranDownloaded(): Promise<boolean> {
    try {
      const db = await openQuranDB()
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const req = store.get(PDF_KEY)
        req.onsuccess = () => resolve(!!req.result)
        req.onerror = () => resolve(false)
      })
    } catch {
      return false
    }
  },

  /**
   * Download Quran PDF with progress callback and store in IndexedDB
   */
  async downloadQuranPdf(
    url = SUPABASE_STORAGE_URLS.quran,
    onProgress?: (percent: number, loadedBytes: number, totalBytes: number) => void
  ): Promise<boolean> {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`)
      }

      const contentLength = response.headers.get('content-length')
      const total = contentLength ? parseInt(contentLength, 10) : 0

      if (!response.body) {
        const blob = await response.blob()
        await this.saveQuranBlob(blob)
        onProgress?.(100, blob.size, blob.size)
        return true
      }

      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let receivedBytes = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          chunks.push(value)
          receivedBytes += value.length
          if (total > 0 && onProgress) {
            const percent = Math.min(100, Math.round((receivedBytes / total) * 100))
            onProgress(percent, receivedBytes, total)
          }
        }
      }

      const fullBlob = new Blob(chunks as any[], { type: 'application/pdf' })
      await this.saveQuranBlob(fullBlob)
      onProgress?.(100, receivedBytes, total || receivedBytes)
      return true
    } catch (err) {
      console.error('[OfflineQuran] Download error:', err)
      throw err
    }
  },

  /**
   * Save PDF blob to IndexedDB
   */
  async saveQuranBlob(blob: Blob): Promise<void> {
    const db = await openQuranDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.put(blob, PDF_KEY)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  },

  /**
   * Retrieve PDF blob from IndexedDB
   */
  async getQuranBlob(): Promise<Blob | null> {
    try {
      const db = await openQuranDB()
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const req = store.get(PDF_KEY)
        req.onsuccess = () => resolve(req.result || null)
        req.onerror = () => resolve(null)
      })
    } catch {
      return null
    }
  },

  /**
   * Delete downloaded Quran from storage
   */
  async deleteDownloadedQuran(): Promise<void> {
    try {
      const db = await openQuranDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const req = store.delete(PDF_KEY)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      })
    } catch (err) {
      console.warn('[OfflineQuran] Delete error:', err)
    }
  },

  /**
   * Check if 600 Words Vocabulary PDF is saved offline
   */
  async isVocabPdfDownloaded(): Promise<boolean> {
    try {
      const db = await openQuranDB()
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const req = store.get(VOCAB_PDF_KEY)
        req.onsuccess = () => resolve(!!req.result)
        req.onerror = () => resolve(false)
      })
    } catch {
      return false
    }
  },

  /**
   * Download 600 Words Vocabulary PDF with progress tracking
   */
  async downloadVocabPdf(
    url = SUPABASE_STORAGE_URLS.vocab,
    onProgress?: (percent: number, loadedBytes: number, totalBytes: number) => void
  ): Promise<boolean> {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`)
      }

      const contentLength = response.headers.get('content-length')
      const total = contentLength ? parseInt(contentLength, 10) : 0

      if (!response.body) {
        const blob = await response.blob()
        await this.saveVocabBlob(blob)
        onProgress?.(100, blob.size, blob.size)
        return true
      }

      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let receivedBytes = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          chunks.push(value)
          receivedBytes += value.length
          if (total > 0 && onProgress) {
            const percent = Math.min(100, Math.round((receivedBytes / total) * 100))
            onProgress(percent, receivedBytes, total)
          }
        }
      }

      const fullBlob = new Blob(chunks as any[], { type: 'application/pdf' })
      await this.saveVocabBlob(fullBlob)
      onProgress?.(100, receivedBytes, total || receivedBytes)
      return true
    } catch (err) {
      console.error('[OfflineQuran] Vocab download error:', err)
      throw err
    }
  },

  async saveVocabBlob(blob: Blob): Promise<void> {
    const db = await openQuranDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.put(blob, VOCAB_PDF_KEY)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  },

  async getVocabPdfBlob(): Promise<Blob | null> {
    try {
      const db = await openQuranDB()
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const req = store.get(VOCAB_PDF_KEY)
        req.onsuccess = () => resolve(req.result || null)
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
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const req = store.delete(VOCAB_PDF_KEY)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      })
    } catch (err) {
      console.warn('[OfflineQuran] Delete vocab error:', err)
    }
  },

  /**
   * Helper to trigger device download of the PDF file
   */
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

  /**
   * Reading Progress Persistence & Synchronization
   */
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
    return updated
  },

  /**
   * 600 Quranic Vocabulary Words Progress
   */
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

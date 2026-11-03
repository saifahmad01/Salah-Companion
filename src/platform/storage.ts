/**
 * Cross-platform storage abstraction layer
 * Uses localStorage with robust error handling and JSON serialization
 */

export const storage = {
  getItem<T = string>(key: string, defaultValue: T | null = null): T | null {
    try {
      const value = localStorage.getItem(key)
      if (value === null) return defaultValue
      try {
        return JSON.parse(value) as T
      } catch {
        return value as unknown as T
      }
    } catch (err) {
      console.warn(`[Storage] Failed to read key "${key}":`, err)
      return defaultValue
    }
  },

  setItem<T>(key: string, value: T): void {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value)
      localStorage.setItem(key, serialized)
    } catch (err) {
      console.error(`[Storage] Failed to write key "${key}":`, err)
    }
  },

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch (err) {
      console.error(`[Storage] Failed to remove key "${key}":`, err)
    }
  },

  clear(): void {
    try {
      localStorage.clear()
    } catch (err) {
      console.error('[Storage] Failed to clear storage:', err)
    }
  },
}

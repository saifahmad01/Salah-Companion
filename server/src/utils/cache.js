/**
 * High-performance In-Memory TTL & LRU Cache with automatic garbage collection
 * Designed for caching immutable external API responses (e.g., Hadiths)
 */
export class InMemoryCache {
  /**
   * @param {number} defaultTtlSeconds Default time-to-live in seconds (default: 86400 = 24 hours)
   * @param {number} maxSize Maximum number of cached items before LRU eviction (default: 500)
   * @param {number} cleanupIntervalSeconds Cleanup interval in seconds (default: 600 = 10 mins)
   */
  constructor(defaultTtlSeconds = 86400, maxSize = 500, cleanupIntervalSeconds = 600) {
    this.defaultTtlMs = defaultTtlSeconds * 1000;
    this.maxSize = maxSize;
    this.store = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
    };

    // Periodic sweep to remove expired keys and prevent memory growth
    this.cleanupTimer = setInterval(() => {
      this.purgeExpired();
    }, cleanupIntervalSeconds * 1000);

    // Ensure timer doesn't prevent Node process from exiting
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Retrieve cached item if not expired, and refresh LRU position
   * @param {string} key
   * @returns {any | null}
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      return null;
    }

    // Refresh LRU order: delete and re-set
    this.store.delete(key);
    this.store.set(key, entry);

    this.stats.hits++;
    return entry.value;
  }

  /**
   * Store item with optional custom TTL and enforce maxSize with LRU eviction
   * @param {string} key
   * @param {any} value
   * @param {number} [ttlSeconds]
   */
  set(key, value, ttlSeconds) {
    const ttlMs = ttlSeconds !== undefined ? ttlSeconds * 1000 : this.defaultTtlMs;

    // If key already exists, delete it first to reset insertion order
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxSize) {
      // Evict oldest entry (first item in Map)
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
        this.stats.evictions++;
      }
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
    this.stats.sets++;
  }

  /**
   * Check if active (unexpired) key exists
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Delete specific key
   * @param {string} key
   * @returns {boolean}
   */
  delete(key) {
    return this.store.delete(key);
  }

  /**
   * Purge all expired keys
   */
  purgeExpired() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.store.clear();
  }

  /**
   * Return cache metrics
   */
  getMetrics() {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      size: this.store.size,
      maxSize: this.maxSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      hitRate: totalRequests > 0 ? ((this.stats.hits / totalRequests) * 100).toFixed(2) + '%' : '0%',
    };
  }

  /**
   * Destroy timer on shutdown
   */
  destroy() {
    clearInterval(this.cleanupTimer);
  }
}

// Global default cache instance (TTL 24 hours, max 500 items)
export const hadithCache = new InMemoryCache(86400, 500, 600);

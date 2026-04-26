interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export class CacheManager {
  private static instance: CacheManager
  private cache: Map<string, CacheEntry<any>> = new Map()
  private pending: Map<string, Promise<any>> = new Map()
  private readonly DEFAULT_TTL = 15 * 60 * 1000
  private cleanupCounter = 0
  private readonly CLEANUP_INTERVAL = 50

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  /** Create a fresh, independent instance — for testing only */
  static createFresh(): CacheManager {
    return new CacheManager()
  }

  get<T>(key: string): T | null {
    this.maybeCleanup()

    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key)
      return null
    }

    return entry.value as T
  }

  set<T>(key: string, value: T, ttl?: number): void {
    this.maybeCleanup()

    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + (ttl ?? this.DEFAULT_TTL),
    }

    this.cache.set(key, entry as CacheEntry<any>)
  }

  has(key: string): boolean {
    this.maybeCleanup()

    const entry = this.cache.get(key)

    if (!entry) {
      return false
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
    this.pending.clear()
  }

  invalidatePattern(pattern: string): void {
    const keysToDelete: string[] = []

    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach((key) => this.cache.delete(key))
  }

  /**
   * Returns the cached value if present and fresh, otherwise calls `fetchFn`,
   * caches the result, and returns it. Deduplicates concurrent calls for the
   * same key so only one in-flight request exists at a time.
   */
  async getOrFetch<T>(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Dedup: reuse in-flight promise if one already exists for this key
    const pending = this.pending.get(key)
    if (pending) {
      return pending as Promise<T>
    }

    const promise = fetchFn()
      .then((value) => {
        this.set(key, value, ttl)
        return value
      })
      .finally(() => {
        this.pending.delete(key)
      })

    this.pending.set(key, promise)
    return promise
  }

  private maybeCleanup(): void {
    this.cleanupCounter++
    if (this.cleanupCounter >= this.CLEANUP_INTERVAL) {
      this.cleanupCounter = 0
      this.cleanup()
    }
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() > entry.expiresAt
  }

  private cleanup(): void {
    const keysToDelete: string[] = []

    this.cache.forEach((entry, key) => {
      if (this.isExpired(entry)) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach((key) => this.cache.delete(key))
  }
}

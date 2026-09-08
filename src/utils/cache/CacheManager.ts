interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export class CacheManager {
  private static instance: CacheManager
  private cache = new Map<string, CacheEntry<unknown>>()
  private pending = new Map<string, Promise<unknown>>()
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
    const entry = this.getEntry(key)
    return entry ? (entry.value as T) : null
  }

  /** Explicit writes supersede any in-flight fetch for the same key. */
  set<T>(key: string, value: T, ttl?: number): void {
    this.maybeCleanup()

    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + (ttl ?? this.DEFAULT_TTL),
    }

    this.pending.delete(key)
    this.cache.set(key, entry)
  }

  has(key: string): boolean {
    return this.getEntry(key) !== undefined
  }

  /** Invalidation detaches pending work; existing callers still receive its outcome. */
  delete(key: string): void {
    this.cache.delete(key)
    this.pending.delete(key)
  }

  clear(): void {
    this.cache.clear()
    this.pending.clear()
  }

  invalidatePattern(pattern: string): void {
    // Pending-only keys matter too: the first response may not have arrived yet.
    const keys = new Set([...this.cache.keys(), ...this.pending.keys()])
    for (const key of keys) {
      if (key.includes(pattern)) this.delete(key)
    }
  }

  /**
   * Returns the cached value if present and fresh, otherwise calls `fetchFn`,
   * caches the result, and returns it. Deduplicates concurrent calls for the
   * same key until it is invalidated or explicitly set. Invalidated requests
   * can finish for their original callers, but cannot change the cache or
   * detach a newer request.
   */
  async getOrFetch<T>(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T> {
    const entry = this.getEntry(key)
    if (entry) {
      return entry.value as T
    }

    // Dedup: reuse in-flight promise if one already exists for this key
    const pending = this.pending.get(key)
    if (pending) {
      return pending as Promise<T>
    }

    // Register before invoking the fetcher, including fetchers that throw synchronously.
    const promise = Promise.resolve()
      .then(fetchFn)
      .then((value) => {
        if (this.pending.get(key) === promise) {
          this.set(key, value, ttl)
        }
        return value
      })
      .finally(() => {
        if (this.pending.get(key) === promise) {
          this.pending.delete(key)
        }
      })

    this.pending.set(key, promise)
    return promise
  }

  private getEntry(key: string): CacheEntry<unknown> | undefined {
    this.maybeCleanup()
    const entry = this.cache.get(key)
    if (entry && this.isExpired(entry)) {
      this.cache.delete(key)
      return undefined
    }
    return entry
  }

  private maybeCleanup(): void {
    this.cleanupCounter++
    if (this.cleanupCounter >= this.CLEANUP_INTERVAL) {
      this.cleanupCounter = 0
      this.cleanup()
    }
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() >= entry.expiresAt
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

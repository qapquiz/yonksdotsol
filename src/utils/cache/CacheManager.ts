interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export class CacheManager {
  private static instance: CacheManager
  private cache: Map<string, CacheEntry<any>> = new Map()
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

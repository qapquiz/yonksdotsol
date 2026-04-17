# Caching Strategy for Yonksdotsol (Expo + Solana dApp)

## Table of Contents

1. [Overview](#overview)
2. [Current State Analysis](#current-state-analysis)
3. [In-Memory Caching Approaches](#in-memory-caching-approaches)
4. [Persistent Caching Solutions](#persistent-caching-solutions)
5. [Cache Invalidation Strategies](#cache-invalidation-strategies)
6. [Performance Considerations](#performance-considerations)
7. [Implementation Roadmap](#implementation-roadmap)

---

## Overview

This document outlines a comprehensive caching strategy for the Yonksdotsol Solana dApp, focusing on:

- **Token metadata caching** (symbols, decimals, prices, icons)
- **Position data caching** (initial deposits, transaction history)
- **RPC response caching** (reducing blockchain queries)
- **Cross-component data sharing** (avoiding duplicate requests)

**Key Requirements:**

- Cache by public key (position addresses, token mints)
- Time-based expiration for price data
- Memory-efficient storage for mobile constraints
- TypeScript type safety throughout
- Seamless integration with existing hooks

---

## Current State Analysis

### Identified Performance Issues

1. **No Caching Layer**: Every component fetches data independently
   - `useTokenData()` called for every position card
   - Same tokens fetched multiple times across different positions
   - No shared cache between components

2. **Heavy RPC Operations**:
   - `getInitialDeposits()` fetches transaction signatures AND parses transactions
   - Each position requires 100+ signature fetches
   - Transaction parsing is CPU-intensive

3. **No Stale-While-Revalidate**:
   - No stale data fallback during loading
   - Poor offline experience

4. **Memory Inefficiency**:
   - No size limits on cached data
   - All data kept in memory indefinitely

### Data Flow Analysis

```
Wallet Connect
    ↓
fetchPositions() → Map<string, PositionInfo>
    ↓
For each Position:
    ├─ useTokenData(tokenXMint, tokenYMint) → RPC call
    ├─ useTokenData(tokenYMint, tokenXMint) → RPC call (duplicate!)
    └─ useInitialDeposits() → Multiple RPC calls (signatures + transactions)
```

---

## In-Memory Caching Approaches

### Option 1: React Context + Custom Hook (Recommended)

**Pros:**

- Native React integration
- Type-safe with TypeScript
- Easy to implement
- Automatic re-renders on cache updates
- No external dependencies

**Cons:**

- Limited to app lifecycle (cleared on restart)
- Not shared across app sessions

### Option 2: Global Singleton Cache

**Pros:**

- Simple to implement
- Fast lookups
- Can integrate with persistent layer

**Cons:**

- Manual cache invalidation needed
- No React integration (manual re-renders)

### Option 3: Query Library (TanStack Query)

**Pros:**

- Built-in caching, deduplication, invalidation
- Background refetching
- Stale-while-revalidate
- Excellent TypeScript support
- React integration

**Cons:**

- External dependency (~45KB)
- Learning curve
- May be overkill for simple use cases

**Recommendation**: Start with Option 1, migrate to Option 3 if complexity grows.

---

## Persistent Caching Solutions

### Recommended Stack

| Solution                 | Use Case                                | TTL     | Storage Limit |
| ------------------------ | --------------------------------------- | ------- | ------------- |
| **Expo SecureStore**     | User preferences, session data          | Session | N/A           |
| **Expo File System**     | Large data, images, transaction history | 1-24h   | Disk space    |
| **MMKV**                 | High-frequency reads, simple key-value  | 1-24h   | ~100MB        |
| **SQLite (expo-sqlite)** | Complex queries, relational data        | 1-7d    | ~50MB         |

### Expo MMKV (Recommended for Production)

```typescript
// npm install react-native-mmkv

import { MMKV } from 'react-native-mmkv'

// Initialize storage
const storage = new MMKV({
  id: 'yonksdotsol-cache',
  encryptionKey: 'your-encryption-key',
})

// Type-safe storage
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // milliseconds
}

export function setItem<T>(key: string, value: T, ttl: number) {
  const entry: CacheEntry<T> = {
    data: value,
    timestamp: Date.now(),
    ttl,
  }
  storage.set(key, JSON.stringify(entry))
}

export function getItem<T>(key: string): T | null {
  const value = storage.getString(key)
  if (!value) return null

  const entry: CacheEntry<T> = JSON.parse(value)
  const isExpired = Date.now() - entry.timestamp > entry.ttl

  if (isExpired) {
    storage.delete(key)
    return null
  }

  return entry.data
}

export function removeItem(key: string) {
  storage.delete(key)
}

export function clearAll() {
  storage.clearAll()
}
```

---

## Cache Invalidation Strategies

### 1. Time-Based Expiration (TTL)

**Use Cases:**

- Token prices (short TTL: 30-60 seconds)
- Token metadata (medium TTL: 1-24 hours)
- Position initial deposits (long TTL: 7 days - immutable)

**Implementation:**

```typescript
// Cache TTL constants
export const CACHE_TTL = {
  TOKEN_PRICE: 30 * 1000, // 30 seconds
  TOKEN_METADATA: 24 * 60 * 60 * 1000, // 24 hours
  POSITION_DEPOSITS: 7 * 24 * 60 * 60 * 1000, // 7 days
  TRANSACTION_HISTORY: 24 * 60 * 60 * 1000, // 24 hours
} as const

// Example: Cache key generator
export function getCacheKey(prefix: string, identifier: string, params?: Record<string, unknown>): string {
  const paramString = params ? JSON.stringify(params) : ''
  return `${prefix}:${identifier}${paramString ? `:${paramString}` : ''}`
}
```

### 2. Event-Based Invalidation

**Use Cases:**

- Position updates (liquidity added/removed)
- Price changes (user manual refresh)
- Wallet switch

**Implementation:**

```typescript
import { EventEmitter } from 'events'

class CacheInvalidator extends EventEmitter {
  invalidatePosition(positionPublicKey: string) {
    this.emit('position:invalidate', positionPublicKey)
  }

  invalidateToken(tokenMint: string) {
    this.emit('token:invalidate', tokenMint)
  }

  invalidateAll() {
    this.emit('cache:clear')
  }
}

export const cacheInvalidator = new CacheInvalidator()
```

### 3. Version-Based Invalidation

**Use Cases:**

- App updates requiring fresh data
- Schema changes

**Implementation:**

```typescript
const CACHE_VERSION = 'v1'

export function getVersionedKey(key: string): string {
  return `${CACHE_VERSION}:${key}`
}

export function migrateCache() {
  // Clear old version cache on app update
  const currentVersion = storage.getString('cache:version')
  if (currentVersion !== CACHE_VERSION) {
    clearAll()
    storage.set('cache:version', CACHE_VERSION)
  }
}
```

---

## Performance Considerations

### Memory Management

**Cache Size Limits:**

```typescript
interface CacheConfig {
  maxItems: number
  maxSizeBytes: number
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxItems: 1000, // Max cached items
  maxSizeBytes: 50 * 1024 * 1024, // 50MB
}
```

**LRU (Least Recently Used) Eviction:**

```typescript
class LRUCache<T> {
  private cache = new Map<string, { value: T; lastAccess: number }>()
  private maxItems: number

  constructor(maxItems: number = 100) {
    this.maxItems = maxItems
  }

  set(key: string, value: T): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxItems) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      value,
      lastAccess: Date.now(),
    })
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    // Update last access time
    entry.lastAccess = Date.now()
    return entry.value
  }
}
```

### Optimization Strategies

**1. Request Deduplication**

```typescript
const pendingRequests = new Map<string, Promise<any>>()

export async function deduplicatedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  // Return existing request if in flight
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!
  }

  const promise = fetcher().finally(() => {
    pendingRequests.delete(key)
  })

  pendingRequests.set(key, promise)
  return promise
}
```

**2. Batch Requests**

```typescript
// Instead of fetching each position individually
export async function fetchPositionsBatch(
  positionPublicKeys: string[],
  batch size: number = 10
): Promise<Map<string, PositionInfo>> {
  const results = new Map<string, PositionInfo>()

  for (let i = 0; i < positionPublicKeys.length; i += batchSize) {
    const batch = positionPublicKeys.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(pk => fetchSinglePosition(pk))
    )

    batchResults.forEach((result, index) => {
      results.set(batch[index], result)
    })
  }

  return results
}
```

**3. Compression for Large Data**

```typescript
import * as lzString from 'lz-string'

export function compress(data: unknown): string {
  return lzString.compress(JSON.stringify(data))
}

export function decompress<T>(compressed: string): T {
  return JSON.parse(lzString.decompress(compressed))
}
```

### React Performance

**1. Memoization**

```typescript
import { memo, useMemo, useCallback } from 'react'

// Memo expensive calculations
const chartData = useMemo(() => {
  return generateLiquidityChartData(positionData.positionBinData, positionData.lowerBinId, positionData.upperBinId)
}, [positionData.positionBinData, positionData.lowerBinId, positionData.upperBinId])

// Memo event handlers
const handleRefresh = useCallback(() => {
  if (account?.address) {
    getPositions(connection, new PublicKey(account.address))
  }
}, [connection, account?.address, getPositions])

// Memo components that don't change often
const PositionCard = memo(function PositionCardComponent({ position }: Props) {
  // Component implementation
})
```

**2. Virtualization for Long Lists**

```typescript
import { FlatList } from 'react-native'

<FlatList
  data={positionsArray}
  renderItem={({ item }) => <PositionCard position={item} />}
  keyExtractor={(item) => item.publicKey.toString()}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={5}
  removeClippedSubviews={true}
  showsVerticalScrollIndicator={false}
/>
```

---

## Implementation Roadmap

### Phase 1: In-Memory Caching (Week 1)

**Goals:**

- Implement React Context-based cache
- Add token metadata caching
- Implement request deduplication
- Add TTL support

**Implementation:**

```typescript
// src/cache/CacheContext.tsx
import { createContext, useContext, useState, useCallback } from 'react'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

interface CacheContextValue {
  get: <T>(key: string) => T | null
  set: <T>(key: string, data: T, ttl: number) => void
  invalidate: (key: string) => void
  clear: () => void
}

const CacheContext = createContext<CacheContextValue | null>(null)

export function CacheProvider({ children }: { children: React.ReactNode }) {
  const [cache] = useState<Map<string, CacheEntry<unknown>>>(new Map())

  const get = useCallback(<T,>(key: string): T | null => {
    const entry = cache.get(key)
    if (!entry) return null

    const isExpired = Date.now() - entry.timestamp > entry.ttl
    if (isExpired) {
      cache.delete(key)
      return null
    }

    return entry.data as T
  }, [cache])

  const set = useCallback(<T,>(key: string, data: T, ttl: number) => {
    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }, [cache])

  const invalidate = useCallback((key: string) => {
    cache.delete(key)
  }, [cache])

  const clear = useCallback(() => {
    cache.clear()
  }, [cache])

  return (
    <CacheContext.Provider value={{ get, set, invalidate, clear }}>
      {children}
    </CacheContext.Provider>
  )
}

export function useCache() {
  const context = useContext(CacheContext)
  if (!context) {
    throw new Error('useCache must be used within CacheProvider')
  }
  return context
}
```

**Update useTokenData hook:**

```typescript
// src/hooks/positions/useTokenData.ts (updated)
import { useEffect, useState } from 'react'
import { fetchTokenPriceData, type TokenInfo } from '../../tokens'
import { useCache } from '../../cache/CacheContext'
import { CACHE_TTL } from '../../cache/constants'

export function useTokenData(tokenXMint: string, tokenYMint: string) {
  const cache = useCache()
  const [tokenXInfo, setTokenXInfo] = useState<TokenInfo | null>(null)
  const [tokenYInfo, setTokenYInfo] = useState<TokenInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let isMounted = true
    const cacheKeyX = `token:${tokenXMint}`
    const cacheKeyY = `token:${tokenYMint}`

    // Check cache first
    const cachedX = cache.get<TokenInfo>(cacheKeyX)
    const cachedY = cache.get<TokenInfo>(cacheKeyY)

    if (cachedX && cachedY) {
      setTokenXInfo(cachedX)
      setTokenYInfo(cachedY)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    Promise.all([cachedX || fetchTokenPriceData(tokenXMint), cachedY || fetchTokenPriceData(tokenYMint)])
      .then(([xData, yData]) => {
        if (isMounted) {
          setTokenXInfo(xData)
          setTokenYInfo(yData)

          // Cache the results
          if (!cachedX) {
            cache.set(cacheKeyX, xData, CACHE_TTL.TOKEN_METADATA)
          }
          if (!cachedY) {
            cache.set(cacheKeyY, yData, CACHE_TTL.TOKEN_METADATA)
          }

          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch token data'))
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [tokenXMint, tokenYMint, cache])

  return {
    tokenXInfo,
    tokenYInfo,
    isLoading,
    error,
  }
}
```

### Phase 2: Persistent Storage (Week 2)

**Goals:**

- Add MMKV integration
- Implement write-through caching
- Add cache hydration on app start

**Implementation:**

```typescript
// src/cache/PersistentCache.ts
import { MMKV } from 'react-native-mmkv'
import { useCache } from './CacheContext'

const storage = new MMKV({
  id: 'yonksdotsol-persistent',
  encryptionKey: process.env.EXPO_PUBLIC_CACHE_ENCRYPTION_KEY,
})

export async function hydrateFromStorage(cache: ReturnType<typeof useCache>) {
  const allKeys = storage.getAllKeys()

  for (const key of allKeys) {
    try {
      const value = storage.getString(key)
      if (value) {
        const entry = JSON.parse(value)
        const isExpired = Date.now() - entry.timestamp > entry.ttl

        if (!isExpired) {
          cache.set(key.replace('persistent:', ''), entry.data, entry.ttl)
        } else {
          storage.delete(key)
        }
      }
    } catch (error) {
      console.error(`Failed to hydrate cache entry ${key}:`, error)
    }
  }
}

export function writeToStorage<T>(key: string, data: T, ttl: number) {
  const entry = {
    data,
    timestamp: Date.now(),
    ttl,
  }
  storage.set(`persistent:${key}`, JSON.stringify(entry))
}
```

### Phase 3: Advanced Caching (Week 3)

**Goals:**

- Implement stale-while-revalidate
- Add LRU eviction
- Implement cache warming

**Implementation:**

```typescript
// src/hooks/useCachedData.ts
import { useState, useEffect, useCallback } from 'react'
import { useCache } from '../cache/CacheContext'

interface UseCachedDataOptions<T> {
  fetcher: () => Promise<T>
  cacheKey: string
  ttl: number
  staleWhileRevalidate?: boolean
  enabled?: boolean
}

export function useCachedData<T>({
  fetcher,
  cacheKey,
  ttl,
  staleWhileRevalidate = false,
  enabled = true,
}: UseCachedDataOptions<T>) {
  const cache = useCache()
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isStale, setIsStale] = useState(false)

  const fetchData = useCallback(async () => {
    if (!enabled) return

    try {
      const result = await fetcher()
      cache.set(cacheKey, result, ttl)
      setData(result)
      setIsStale(false)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'))
    } finally {
      setIsLoading(false)
    }
  }, [fetcher, cacheKey, ttl, cache, enabled])

  useEffect(() => {
    if (!enabled) return

    const cached = cache.get<T>(cacheKey)

    if (cached) {
      setData(cached)
      setIsLoading(false)

      if (staleWhileRevalidate) {
        setIsStale(true)
        fetchData()
      }
    } else {
      setIsLoading(true)
      fetchData()
    }
  }, [cacheKey, enabled, staleWhileRevalidate, cache, fetchData])

  const refetch = useCallback(() => {
    setIsLoading(true)
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, isStale, refetch }
}
```

### Phase 4: Monitoring & Metrics (Week 4)

**Goals:**

- Add cache hit/miss tracking
- Implement cache size monitoring
- Add performance metrics

**Implementation:**

```typescript
// src/cache/CacheMetrics.ts
interface CacheMetrics {
  hits: number
  misses: number
  sets: number
  deletes: number
  clears: number
  evictions: number
  currentSize: number
  currentItems: number
}

class CacheMetricsTracker {
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    clears: 0,
    evictions: 0,
    currentSize: 0,
    currentItems: 0,
  }

  recordHit() {
    this.metrics.hits++
  }

  recordMiss() {
    this.metrics.misses++
  }

  recordSet(size: number) {
    this.metrics.sets++
    this.metrics.currentSize += size
    this.metrics.currentItems++
  }

  recordDelete(size: number) {
    this.metrics.deletes++
    this.metrics.currentSize -= size
    this.metrics.currentItems--
  }

  recordEviction() {
    this.metrics.evictions++
  }

  getMetrics(): Readonly<CacheMetrics> {
    return { ...this.metrics }
  }

  getHitRate(): number {
    const total = this.metrics.hits + this.metrics.misses
    return total === 0 ? 0 : this.metrics.hits / total
  }

  reset() {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      clears: 0,
      evictions: 0,
      currentSize: 0,
      currentItems: 0,
    }
  }
}

export const cacheMetrics = new CacheMetricsTracker()
```

---

## Complete Implementation Example

### Token Data Cache with All Features

```typescript
// src/hooks/positions/useTokenDataWithCache.ts
import { useEffect, useState } from 'react'
import { fetchTokenPriceData, type TokenInfo } from '../../tokens'
import { useCache } from '../../cache/CacheContext'
import { CACHE_TTL } from '../../cache/constants'
import { cacheMetrics } from '../../cache/CacheMetrics'

interface TokenDataCacheEntry extends TokenInfo {
  __cached: boolean
  __timestamp: number
}

export function useTokenData(tokenXMint: string, tokenYMint: string) {
  const cache = useCache()
  const [tokenXInfo, setTokenXInfo] = useState<TokenInfo | null>(null)
  const [tokenYInfo, setTokenYInfo] = useState<TokenInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isStale, setIsStale] = useState(false)

  useEffect(() => {
    let isMounted = true
    const cacheKeyX = `token:${tokenXMint}`
    const cacheKeyY = `token:${tokenYMint}`

    // Check cache first
    const cachedX = cache.get<TokenDataCacheEntry>(cacheKeyX)
    const cachedY = cache.get<TokenDataCacheEntry>(cacheKeyY)

    const bothCached = cachedX && cachedY

    if (bothCached) {
      setTokenXInfo(cachedX)
      setTokenYInfo(cachedY)
      setIsLoading(false)
      setIsStale(true) // Mark as stale for background refresh

      // Record metrics
      cacheMetrics.recordHit()
      cacheMetrics.recordHit()

      // Background refresh (stale-while-revalidate)
      refreshTokensInBackground()
      return
    }

    // Record metrics for misses
    if (!cachedX) cacheMetrics.recordMiss()
    if (!cachedY) cacheMetrics.recordMiss()

    setIsLoading(true)
    setIsStale(false)
    setError(null)

    Promise.all([cachedX || fetchTokenPriceData(tokenXMint), cachedY || fetchTokenPriceData(tokenYMint)])
      .then(([xData, yData]) => {
        if (isMounted) {
          setTokenXInfo(xData)
          setTokenYInfo(yData)

          // Cache the results
          if (!cachedX) {
            cache.set(cacheKeyX, xData, CACHE_TTL.TOKEN_METADATA)
          }
          if (!cachedY) {
            cache.set(cacheKeyY, yData, CACHE_TTL.TOKEN_METADATA)
          }

          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch token data'))
          setIsLoading(false)
        }
      })

    // Background refresh function
    async function refreshTokensInBackground() {
      try {
        const [freshX, freshY] = await Promise.all([fetchTokenPriceData(tokenXMint), fetchTokenPriceData(tokenYMint)])

        if (isMounted) {
          // Update cache
          cache.set(cacheKeyX, freshX, CACHE_TTL.TOKEN_METADATA)
          cache.set(cacheKeyY, freshY, CACHE_TTL.TOKEN_METADATA)

          // Update state
          setTokenXInfo(freshX)
          setTokenYInfo(freshY)
          setIsStale(false)
        }
      } catch (err) {
        console.error('Background refresh failed:', err)
        // Don't show error to user, keep cached data
      }
    }

    return () => {
      isMounted = false
    }
  }, [tokenXMint, tokenYMint, cache])

  return {
    tokenXInfo,
    tokenYInfo,
    isLoading,
    error,
    isStale,
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// src/cache/__tests__/CacheContext.test.ts
import { renderHook, act } from '@testing-library/react-native'
import { CacheProvider, useCache } from '../CacheContext'

describe('CacheContext', () => {
  it('should store and retrieve data', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CacheProvider>{children}</CacheProvider>
    )

    const { result } = renderHook(() => useCache(), { wrapper })

    act(() => {
      result.current.set('test-key', { foo: 'bar' }, 60000)
    })

    const cached = result.current.get<{ foo: string }>('test-key')
    expect(cached?.foo).toBe('bar')
  })

  it('should expire data after TTL', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CacheProvider>{children}</CacheProvider>
    )

    const { result } = renderHook(() => useCache(), { wrapper })

    act(() => {
      result.current.set('test-key', { foo: 'bar' }, 100) // 100ms TTL
    })

    // Should be available immediately
    expect(result.current.get('test-key')).toBeTruthy()

    // Wait for expiration
    act(() => {
      jest.advanceTimersByTime(150)
    })

    // Should be expired
    expect(result.current.get('test-key')).toBeNull()
  })
})
```

### Integration Tests

```typescript
// src/hooks/__tests__/useTokenDataWithCache.test.ts
import { renderHook, waitFor } from '@testing-library/react-native'
import { CacheProvider } from '../../cache/CacheContext'
import { useTokenData } from '../useTokenDataWithCache'

describe('useTokenData with cache', () => {
  it('should return cached data immediately', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CacheProvider>{children}</CacheProvider>
    )

    const { result, rerender } = renderHook(
      ({ tokenXMint, tokenYMint }) => useTokenData(tokenXMint, tokenYMint),
      {
        wrapper,
        initialProps: { tokenXMint: 'mint1', tokenYMint: 'mint2' }
      }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const firstResult = result.current.tokenXInfo

    // Re-render with same tokens - should use cache
    rerender({ tokenXMint: 'mint1', tokenYMint: 'mint2' })

    // Should not be loading (cache hit)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.tokenXInfo).toEqual(firstResult)
  })
})
```

---

## Best Practices Summary

### DO ✓

1. **Cache immutable data aggressively**: Position initial deposits don't change
2. **Use short TTL for prices**: 30-60 seconds keeps UI responsive
3. **Implement stale-while-revalidate**: Users see cached data immediately
4. **Deduplicate requests**: Multiple components requesting same token = 1 RPC call
5. **Monitor cache performance**: Track hit/miss rates to optimize
6. **Use TypeScript strictly**: Type-safe cache entries prevent bugs
7. **Encrypt sensitive data**: Use MMKV encryption for wallet-related data
8. **Clear cache on logout**: Remove user-specific data on wallet disconnect

### DON'T ✗

1. **Don't cache everything**: Not all data needs caching
2. **Don't ignore TTL**: Stale data causes UI inconsistencies
3. **Don't cache in-memory only**: Users lose data on app restart
4. **Don't cache large objects**: Use compression or split into smaller entries
5. **Don't forget error handling**: Cache failures shouldn't break the app
6. **Don't cache user PII**: Respect privacy regulations
7. **Don't over-engineer**: Start simple, add complexity as needed
8. **Don't forget cleanup**: Clear old cache entries to prevent bloat

---

## Performance Benchmarks

### Expected Improvements

| Metric                           | Before | After   | Improvement |
| -------------------------------- | ------ | ------- | ----------- |
| Initial load time (10 positions) | ~8s    | ~1s     | 87.5%       |
| Token metadata fetches           | 20+    | 2-4     | 80%         |
| RPC calls per session            | 150+   | 30-40   | 73%         |
| Offline experience               | None   | Partial | ✅          |
| Memory usage                     | ~50MB  | ~55MB   | +10%        |
| Cache hit rate                   | 0%     | 85%+    | ✅          |

---

## References

### Recommended Libraries

1. **MMKV**: `react-native-mmkv` - High-performance key-value storage
2. **TanStack Query**: `@tanstack/react-query` - Advanced data fetching & caching
3. **Zustand**: `zustand` - Lightweight state management
4. **LZ-String**: `lz-string` - Fast compression library

### Expo Documentation

- Expo MMKV: https://docs.expo.dev/versions/latest/sdk/mmkv/
- Expo File System: https://docs.expo.dev/versions/latest/sdk/filesystem/
- Expo SecureStore: https://docs.expo.dev/versions/latest/sdk/securestore/

### React Native Best Practices

- React.memo for expensive renders
- useMemo for expensive calculations
- useCallback for stable function references
- Virtual lists for large datasets

---

## Conclusion

This caching strategy provides a comprehensive approach to optimizing your Solana dApp's performance while maintaining type safety and code quality. The phased implementation allows you to:

1. **Start simple** with in-memory caching
2. **Add persistence** for better offline support
3. **Enhance functionality** with advanced features
4. **Monitor performance** to guide optimizations

The key is to balance between performance gains and implementation complexity, ensuring your users get a fast, responsive experience without over-engineering the solution.

**Next Steps:**

1. Review and approve this strategy
2. Begin Phase 1 implementation
3. Test thoroughly before production deployment
4. Monitor metrics and iterate based on real-world usage

---

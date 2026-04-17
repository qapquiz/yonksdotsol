# Caching Quick Start Guide

Ready-to-use code snippets for implementing caching in Yonksdotsol.

## Installation

```bash
# MMKV for persistent caching
bun add react-native-mmkv

# Optional: TanStack Query for advanced caching
bun add @tanstack/react-query
```

---

## Step 1: Cache Constants

Create `src/cache/constants.ts`:

```typescript
// src/cache/constants.ts
export const CACHE_TTL = {
  // Token data TTL values
  TOKEN_PRICE: 30 * 1000, // 30 seconds - prices change frequently
  TOKEN_METADATA: 24 * 60 * 60 * 1000, // 24 hours - symbols, decimals rarely change

  // Position data TTL values
  POSITION_DEPOSITS: 7 * 24 * 60 * 60 * 1000, // 7 days - initial deposits are immutable
  TRANSACTION_HISTORY: 24 * 60 * 60 * 1000, // 24 hours - transaction history

  // RPC data TTL values
  RPC_RESPONSE: 5 * 60 * 1000, // 5 minutes - general RPC responses
} as const

export const CACHE_KEYS = {
  TOKEN: 'token',
  POSITION: 'position',
  TRANSACTION: 'transaction',
} as const

// Cache key generator with support for multiple parameters
export function getCacheKey(prefix: string, identifier: string, params?: Record<string, unknown>): string {
  if (params) {
    const paramString = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join(':')
    return `${prefix}:${identifier}:${paramString}`
  }
  return `${prefix}:${identifier}`
}
```

---

## Step 2: Cache Context

Create `src/cache/CacheContext.tsx`:

```typescript
// src/cache/CacheContext.tsx
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { cacheMetrics } from './CacheMetrics'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

interface CacheContextValue {
  get: <T>(key: string) => T | null
  set: <T>(key: string, data: T, ttl: number) => void
  invalidate: (key: string) => void
  invalidatePattern: (pattern: string) => void
  clear: () => void
}

const CacheContext = createContext<CacheContextValue | null>(null)

interface CacheProviderProps {
  children: ReactNode
}

export function CacheProvider({ children }: CacheProviderProps) {
  const [cache] = useState<Map<string, CacheEntry<unknown>>>(new Map())

  const get = useCallback(<T,>(key: string): T | null => {
    const entry = cache.get(key)
    if (!entry) {
      cacheMetrics.recordMiss()
      return null
    }

    const isExpired = Date.now() - entry.timestamp > entry.ttl
    if (isExpired) {
      cache.delete(key)
      cacheMetrics.recordMiss()
      return null
    }

    cacheMetrics.recordHit()
    return entry.data as T
  }, [cache])

  const set = useCallback(<T,>(key: string, data: T, ttl: number) => {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl
    }
    cache.set(key, entry)
    cacheMetrics.recordSet()
  }, [cache])

  const invalidate = useCallback((key: string) => {
    cache.delete(key)
  }, [cache])

  const invalidatePattern = useCallback((pattern: string) => {
    const regex = new RegExp(pattern)
    for (const key of cache.keys()) {
      if (regex.test(key)) {
        cache.delete(key)
      }
    }
  }, [cache])

  const clear = useCallback(() => {
    cache.clear()
    cacheMetrics.recordClear()
  }, [cache])

  return (
    <CacheContext.Provider value={{ get, set, invalidate, invalidatePattern, clear }}>
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

---

## Step 3: Cache Metrics

Create `src/cache/CacheMetrics.ts`:

```typescript
// src/cache/CacheMetrics.ts
interface CacheMetrics {
  hits: number
  misses: number
  sets: number
  deletes: number
  clears: number
  evictions: number
}

class CacheMetricsTracker {
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    clears: 0,
    evictions: 0,
  }

  recordHit() {
    this.metrics.hits++
  }

  recordMiss() {
    this.metrics.misses++
  }

  recordSet() {
    this.metrics.sets++
  }

  recordDelete() {
    this.metrics.deletes++
  }

  recordClear() {
    this.metrics.clears++
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
    }
  }

  getSummary(): string {
    return `Cache Metrics:
- Hits: ${this.metrics.hits}
- Misses: ${this.metrics.misses}
- Hit Rate: ${(this.getHitRate() * 100).toFixed(2)}%
- Total Sets: ${this.metrics.sets}
- Total Deletes: ${this.metrics.deletes}
- Total Clears: ${this.metrics.clears}
- Evictions: ${this.metrics.evictions}`
  }
}

export const cacheMetrics = new CacheMetricsTracker()
```

---

## Step 4: Updated useTokenData Hook

Update `src/hooks/positions/useTokenData.ts`:

```typescript
// src/hooks/positions/useTokenData.ts
import { useEffect, useState } from 'react'
import { fetchTokenPriceData, type TokenInfo } from '../../tokens'
import { useCache } from '../../cache/CacheContext'
import { CACHE_TTL, CACHE_KEYS, getCacheKey } from '../../cache/constants'
import { cacheMetrics } from '../../cache/CacheMetrics'

export function useTokenData(tokenXMint: string, tokenYMint: string) {
  const cache = useCache()
  const [tokenXInfo, setTokenXInfo] = useState<TokenInfo | null>(null)
  const [tokenYInfo, setTokenYInfo] = useState<TokenInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let isMounted = true
    const cacheKeyX = getCacheKey(CACHE_KEYS.TOKEN, tokenXMint)
    const cacheKeyY = getCacheKey(CACHE_KEYS.TOKEN, tokenYMint)

    // Check cache first
    const cachedX = cache.get<TokenInfo>(cacheKeyX)
    const cachedY = cache.get<TokenInfo>(cacheKeyY)

    // If both tokens are cached, use them immediately
    if (cachedX && cachedY) {
      setTokenXInfo(cachedX)
      setTokenYInfo(cachedY)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    // Fetch only uncached tokens
    const fetchPromises = [
      cachedX ? Promise.resolve(cachedX) : fetchTokenPriceData(tokenXMint),
      cachedY ? Promise.resolve(cachedY) : fetchTokenPriceData(tokenYMint),
    ]

    Promise.all(fetchPromises)
      .then(([xData, yData]) => {
        if (isMounted) {
          setTokenXInfo(xData)
          setTokenYInfo(yData)

          // Cache only the newly fetched data
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

---

## Step 5: Updated useInitialDeposits Hook

Update `src/hooks/positions/useInitialDeposits.ts`:

```typescript
// src/hooks/positions/useInitialDeposits.ts
import { useState, useEffect } from 'react'
import { createSolanaRpc } from '@solana/kit'
import { getInitialDeposits, type InitialDepositsResult } from '../../utils/positions/transaction-parser'
import { useCache } from '../../cache/CacheContext'
import { CACHE_TTL, CACHE_KEYS, getCacheKey } from '../../cache/constants'
import type { InitialDepositsResult } from '../../utils/positions/transaction-parser'

interface UseInitialDepositsProps {
  rpcUrl: string
  positionPublicKey: string
  tokenXDecimals: number
  tokenYDecimals: number
  enabled?: boolean
}

interface UseInitialDepositsResult {
  initialDeposits: InitialDepositsResult | null
  isLoading: boolean
  error: Error | null
}

export function useInitialDeposits({
  rpcUrl,
  positionPublicKey,
  tokenXDecimals,
  tokenYDecimals,
  enabled = true,
}: UseInitialDepositsProps): UseInitialDepositsResult {
  const cache = useCache()
  const [state, setState] = useState<UseInitialDepositsResult>({
    initialDeposits: null,
    isLoading: false,
    error: null,
  })

  useEffect(() => {
    let isMounted = true
    const cacheKey = getCacheKey(CACHE_KEYS.POSITION, positionPublicKey, {
      type: 'initial_deposits',
      tokenXDecimals,
      tokenYDecimals,
    })

    const fetchDeposits = async () => {
      if (!enabled) return

      // Check cache first
      const cached = cache.get<InitialDepositsResult>(cacheKey)
      if (cached) {
        setState({
          initialDeposits: cached,
          isLoading: false,
          error: null,
        })
        return
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        const rpc = createSolanaRpc(rpcUrl)
        const result = await getInitialDeposits(rpc, positionPublicKey, tokenXDecimals, tokenYDecimals)

        if (isMounted && result) {
          // Cache the result - initial deposits are immutable
          cache.set(cacheKey, result, CACHE_TTL.POSITION_DEPOSITS)

          setState({
            initialDeposits: result,
            isLoading: false,
            error: null,
          })
        }
      } catch (error) {
        if (isMounted) {
          setState({
            initialDeposits: null,
            isLoading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          })
        }
      }
    }

    fetchDeposits()

    return () => {
      isMounted = false
    }
  }, [rpcUrl, positionPublicKey, tokenXDecimals, tokenYDecimals, enabled, cache])

  return state
}
```

---

## Step 6: Update App Root

Update `src/app/_layout.tsx` to include CacheProvider:

```typescript
// src/app/_layout.tsx
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { CacheProvider } from '../cache/CacheContext'

export default function RootLayout() {
  return (
    <CacheProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="positions/index" />
      </Stack>
      <StatusBar style="auto" />
    </CacheProvider>
  )
}
```

---

## Step 7: Debug Component (Optional)

Create `src/components/Debug/CacheMetrics.tsx` for monitoring:

```typescript
// src/components/Debug/CacheMetrics.tsx
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { cacheMetrics } from '../../cache/CacheMetrics'

export function CacheMetricsDisplay() {
  const [metrics, setMetrics] = useState(() => cacheMetrics.getMetrics())
  const [hitRate, setHitRate] = useState(() => cacheMetrics.getHitRate())

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(cacheMetrics.getMetrics())
      setHitRate(cacheMetrics.getHitRate())
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <View className="bg-black/50 p-2 rounded-lg">
      <Text className="text-xs text-white">
        Cache Hit Rate: {(hitRate * 100).toFixed(1)}%
      </Text>
      <Text className="text-xs text-gray-400">
        Hits: {metrics.hits} | Misses: {metrics.misses}
      </Text>
    </View>
  )
}
```

---

## Step 8: Cache Invalidation Helper

Create `src/cache/invalidation.ts`:

```typescript
// src/cache/invalidation.ts
import { useCache } from './CacheContext'
import { CACHE_KEYS } from './constants'

export function useCacheInvalidation() {
  const cache = useCache()

  const invalidatePosition = useCallback(
    (positionPublicKey: string) => {
      cache.invalidatePattern(`^${CACHE_KEYS.POSITION}:${positionPublicKey}`)
    },
    [cache],
  )

  const invalidateToken = useCallback(
    (tokenMint: string) => {
      cache.invalidate(`^${CACHE_KEYS.TOKEN}:${tokenMint}`)
    },
    [cache],
  )

  const invalidateAllPositions = useCallback(() => {
    cache.invalidatePattern(`^${CACHE_KEYS.POSITION}:`)
  }, [cache])

  const invalidateAllTokens = useCallback(() => {
    cache.invalidatePattern(`^${CACHE_KEYS.TOKEN}:`)
  }, [cache])

  const clearAll = useCallback(() => {
    cache.clear()
  }, [cache])

  return {
    invalidatePosition,
    invalidateToken,
    invalidateAllPositions,
    invalidateAllTokens,
    clearAll,
  }
}
```

---

## Step 9: Update Position Fetching

Update `src/app/index.tsx` to invalidate cache on wallet switch:

```typescript
// src/app/index.tsx (partial update)
import { useCacheInvalidation } from '../cache/invalidation'

export default function App() {
  // ... existing code ...

  const { clearAll } = useCacheInvalidation()

  // Update useEffect to clear cache when wallet changes
  useEffect(() => {
    if (account?.address === undefined) {
      setPositions(new Map())
      setIsLoadingPositions(false)
      clearAll() // Clear cache on disconnect
      return
    }

    getPositions(connection, new PublicKey(account.address))
  }, [connection, account?.address, getPositions, clearAll])

  // ... rest of the code ...
}
```

---

## Step 10: Add Cache Debug to Dev

Add to `src/app/index.tsx` for development:

```typescript
// src/app/index.tsx
import { CacheMetricsDisplay } from '../components/Debug/CacheMetrics'

// In your JSX, add:
{__DEV__ && <CacheMetricsDisplay />}
```

---

## Usage Examples

### Example 1: Manual Cache Invalidation

```typescript
import { useCacheInvalidation } from '../cache/invalidation'

function MyComponent() {
  const { invalidatePosition, invalidateToken } = useCacheInvalidation()

  const handlePositionUpdate = async () => {
    // After updating a position
    await updatePosition()

    // Invalidate cache for this position
    invalidatePosition(positionPublicKey)
  }

  return <Button onPress={handlePositionUpdate}>Update Position</Button>
}
```

### Example 2: Clearing All Cache

```typescript
import { useCacheInvalidation } from '../cache/invalidation'

function SettingsScreen() {
  const { clearAll } = useCacheInvalidation()

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', onPress: clearAll, style: 'destructive' }
      ]
    )
  }

  return <Button onPress={handleClearCache}>Clear Cache</Button>
}
```

### Example 3: Direct Cache Access

```typescript
import { useCache } from '../cache/CacheContext'

function MyComponent() {
  const cache = useCache()

  const getCachedToken = (mint: string) => {
    const key = getCacheKey(CACHE_KEYS.TOKEN, mint)
    return cache.get<TokenInfo>(key)
  }

  const cacheToken = (mint: string, data: TokenInfo) => {
    const key = getCacheKey(CACHE_KEYS.TOKEN, mint)
    cache.set(key, data, CACHE_TTL.TOKEN_METADATA)
  }

  // ... component code ...
}
```

---

## Testing

Run the following to verify your caching implementation:

```bash
# Check TypeScript types
bun run tsc --noEmit

# Run linter
bun run lint

# Run formatter
bun run fmt

# Build app
bun run build
```

---

## Expected Performance Improvements

After implementing caching, you should see:

- **First load**: ~8s → ~2s (75% improvement)
- **Subsequent loads**: ~8s → ~0.5s (93% improvement)
- **Token reuse**: 20+ requests → 1 request per token
- **Position deposits**: Fetched once, cached for 7 days
- **RPC calls**: Reduced by 70-80%

---

## Troubleshooting

### Cache not working?

1. Verify CacheProvider wraps your app
2. Check console for cache metrics
3. Ensure hooks use `useCache()`
4. Verify TTL values are appropriate

### Stale data?

1. Check TTL constants in `src/cache/constants.ts`
2. Implement manual invalidation for user actions
3. Add refresh controls for critical data

### Memory issues?

1. Check cache size with metrics
2. Reduce TTL for large datasets
3. Implement LRU eviction if needed

---

## Next Steps

1. ✅ Implement in-memory caching (above)
2. 🔄 Add persistent caching with MMKV
3. 🔄 Implement stale-while-revalidate
4. 🔄 Add background refetching
5. 🔄 Implement cache warming on app start
6. 🔄 Add analytics for cache performance

---

## Additional Resources

- Full strategy: `docs/CACHING_STRATEGY.md`
- React Context docs: https://react.dev/reference/react/useContext
- MMKV docs: https://github.com/mrousavy/react-native-mmkv
- TanStack Query (optional): https://tanstack.com/query/latest

# Caching Implementation Summary

## Executive Summary

This document provides a quick overview of the caching strategy for Yonksdotsol, highlighting key recommendations and implementation details.

---

## Current Issues Identified

1. **No Caching Layer**: Every position card independently fetches token data
2. **Heavy RPC Usage**: Each position requires 100+ signature fetches + transaction parsing
3. **Duplicate Requests**: Same tokens fetched multiple times across positions
4. **Poor Offline Experience**: No stale data fallback during loading
5. **Memory Inefficiency**: No size limits or eviction policies

---

## Recommended Approach

### Phase 1: In-Memory Caching (Immediate)

**Components:**

- React Context-based cache with TypeScript
- TTL-based expiration
- Request deduplication
- Cache metrics tracking

**Benefits:**

- Reduces initial load time from ~8s to ~2s
- Cuts RPC calls by 70-80%
- Easy to implement (no external dependencies)
- Type-safe with full TypeScript support

**Files to Create:**

```
src/cache/
├── constants.ts          # TTL values and cache keys
├── CacheContext.tsx      # React context provider
├── CacheMetrics.ts       # Performance tracking
└── invalidation.ts       # Cache invalidation helpers
```

**Files to Update:**

```
src/hooks/positions/useTokenData.ts
src/hooks/positions/useInitialDeposits.ts
src/app/_layout.tsx       # Add CacheProvider
src/app/index.tsx         # Add cache invalidation
```

---

## Cache Configuration

### TTL Values (Time-to-Live)

| Data Type           | TTL        | Reason                          |
| ------------------- | ---------- | ------------------------------- |
| Token prices        | 30 seconds | Prices change frequently        |
| Token metadata      | 24 hours   | Symbols, decimals rarely change |
| Position deposits   | 7 days     | Initial deposits are immutable  |
| Transaction history | 24 hours   | Historical data                 |
| RPC responses       | 5 minutes  | General RPC data                |

### Cache Key Strategy

```typescript
// Format: {prefix}:{identifier}:{params}
token:So11111111111111111111111111111111111111112
position:7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU:type:initial_deposits
```

---

## Performance Expectations

| Metric                      | Before | After | Improvement |
| --------------------------- | ------ | ----- | ----------- |
| Initial load (10 positions) | ~8s    | ~2s   | 75%         |
| Subsequent loads            | ~8s    | ~0.5s | 93%         |
| Token metadata fetches      | 20+    | 2-4   | 80%         |
| RPC calls per session       | 150+   | 30-40 | 73%         |
| Cache hit rate              | 0%     | 85%+  | ✅          |

---

## Implementation Steps

### Step 1: Setup (15 minutes)

```bash
# No external dependencies required for Phase 1
# Create cache directory
mkdir -p src/cache
```

### Step 2: Create Cache Files (30 minutes)

Copy the code from `CACHING_QUICK_START.md`:

1. `src/cache/constants.ts` - TTL values
2. `src/cache/CacheContext.tsx` - Cache provider
3. `src/cache/CacheMetrics.ts` - Metrics tracking
4. `src/cache/invalidation.ts` - Invalidation helpers

### Step 3: Update Hooks (20 minutes)

1. Update `useTokenData.ts` to use cache
2. Update `useInitialDeposits.ts` to use cache

### Step 4: Integrate Provider (10 minutes)

Add `CacheProvider` to `src/app/_layout.tsx`

### Step 5: Add Invalidation (15 minutes)

Update `src/app/index.tsx` to clear cache on wallet switch

**Total Time: ~1.5 hours**

---

## Code Patterns

### Basic Cache Usage

```typescript
import { useCache } from '../cache/CacheContext'
import { CACHE_TTL, CACHE_KEYS, getCacheKey } from '../cache/constants'

function MyComponent() {
  const cache = useCache()

  // Get cached data
  const cached = cache.get<TokenInfo>(getCacheKey(CACHE_KEYS.TOKEN, mint))

  // Set cached data
  cache.set(getCacheKey(CACHE_KEYS.TOKEN, mint), data, CACHE_TTL.TOKEN_METADATA)

  // Invalidate specific key
  cache.invalidate(getCacheKey(CACHE_KEYS.TOKEN, mint))

  // Invalidate pattern (all tokens)
  cache.invalidatePattern(`^${CACHE_KEYS.TOKEN}:`)
}
```

### Hook with Caching

```typescript
import { useEffect, useState } from 'react'
import { useCache } from '../cache/CacheContext'
import { CACHE_TTL, getCacheKey } from '../cache/constants'

function useMyData(id: string) {
  const cache = useCache()
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const cacheKey = getCacheKey('data', id)
    const cached = cache.get(cacheKey)

    if (cached) {
      setData(cached)
      setIsLoading(false)
      return
    }

    fetchData(id).then((result) => {
      cache.set(cacheKey, result, CACHE_TTL.TOKEN_METADATA)
      setData(result)
      setIsLoading(false)
    })
  }, [id, cache])

  return { data, isLoading }
}
```

### Cache Invalidation

```typescript
import { useCacheInvalidation } from '../cache/invalidation'

function MyComponent() {
  const { invalidatePosition, invalidateToken, clearAll } = useCacheInvalidation()

  const handleUpdate = async () => {
    await updatePosition()
    invalidatePosition(positionPublicKey)
  }

  return <Button onPress={handleUpdate}>Update</Button>
}
```

---

## Best Practices

### DO ✅

1. **Cache aggressively for immutable data**: Position initial deposits don't change
2. **Use appropriate TTL**: Short for prices (30s), long for metadata (24h)
3. **Check cache before fetching**: Always check cache first
4. **Implement deduplication**: Prevent duplicate requests for same data
5. **Monitor hit rates**: Track cache performance
6. **Clear on logout**: Remove user-specific data on wallet disconnect
7. **Type-safe caching**: Use TypeScript generics
8. **Pattern invalidation**: Invalidate groups of related data

### DON'T ✗

1. **Don't cache everything**: Only cache frequently accessed data
2. **Don't ignore TTL**: Stale data causes UI inconsistencies
3. **Don't cache in-memory only**: Users lose data on app restart (add MMKV later)
4. **Don't cache large objects**: Use compression or split into smaller entries
5. **Don't forget error handling**: Cache failures shouldn't break the app
6. **Don't cache PII**: Respect privacy regulations
7. **Don't over-engineer**: Start simple, add complexity as needed
8. **Don't forget cleanup**: Implement LRU eviction if needed

---

## Testing Checklist

- [ ] TypeScript compiles without errors
- [ ] Linter passes
- [ ] Code formatted with Prettier
- [ ] Cache provider wraps app correctly
- [ ] Hooks use cache properly
- [ ] Cache hit rate improves (check metrics)
- [ ] Manual invalidation works
- [ ] Cache clears on wallet disconnect
- [ ] No memory leaks (monitor metrics)

---

## Monitoring

### Add Debug Component (Development Only)

```typescript
// src/components/Debug/CacheMetrics.tsx
import { cacheMetrics } from '../../cache/CacheMetrics'

export function CacheMetricsDisplay() {
  const metrics = cacheMetrics.getMetrics()
  const hitRate = cacheMetrics.getHitRate()

  return (
    <View>
      <Text>Hit Rate: {(hitRate * 100).toFixed(1)}%</Text>
      <Text>Hits: {metrics.hits} | Misses: {metrics.misses}</Text>
    </View>
  )
}
```

### Log Cache Metrics

```typescript
// Log periodically in development
if (__DEV__) {
  setInterval(() => {
    console.log(cacheMetrics.getSummary())
  }, 10000) // Every 10 seconds
}
```

---

## Future Enhancements

### Phase 2: Persistent Storage (Week 2)

**Goal:** Survive app restarts

**Implementation:**

- Add `react-native-mmkv` for persistent caching
- Implement cache hydration on app start
- Add write-through caching

**Benefits:**

- Offline-first experience
- Faster subsequent app launches
- Reduced initial API calls

### Phase 3: Advanced Features (Week 3)

**Goal:** Better user experience

**Implementation:**

- Stale-while-revalidate pattern
- Background refetching
- LRU eviction policy
- Cache warming on app start

**Benefits:**

- Instant UI updates
- Always-fresh data
- Better memory management

### Phase 4: Analytics (Week 4)

**Goal:** Data-driven optimization

**Implementation:**

- Track cache performance over time
- Identify slow endpoints
- Optimize TTL values
- Monitor memory usage

**Benefits:**

- Data-driven decisions
- Proactive performance tuning
- Better user experience

---

## Troubleshooting

### Issue: Cache Not Working

**Symptoms:** Still seeing slow loads, high RPC calls

**Solutions:**

1. Verify `CacheProvider` wraps app in `_layout.tsx`
2. Check hooks import and use `useCache()`
3. Verify cache keys are correct
4. Check console for cache metrics

### Issue: Stale Data

**Symptoms:** UI shows old prices/data

**Solutions:**

1. Check TTL values in `constants.ts`
2. Implement manual invalidation on user actions
3. Add refresh controls for critical data
4. Consider background refetching

### Issue: Memory Issues

**Symptoms:** App crashes, slow performance

**Solutions:**

1. Check cache size with metrics
2. Reduce TTL for large datasets
3. Implement LRU eviction
4. Clear cache periodically

---

## References

### Documentation

- Full Strategy: `docs/CACHING_STRATEGY.md`
- Quick Start: `docs/CACHING_QUICK_START.md`
- Summary: `docs/CACHING_SUMMARY.md` (this file)

### Key Files

- `src/cache/constants.ts` - TTL configuration
- `src/cache/CacheContext.tsx` - Cache provider
- `src/cache/CacheMetrics.ts` - Metrics tracking
- `src/hooks/positions/useTokenData.ts` - Token data hook
- `src/hooks/positions/useInitialDeposits.ts` - Position data hook

### External Resources

- React Context: https://react.dev/reference/react/useContext
- MMKV (persistent): https://github.com/mrousavy/react-native-mmkv
- TanStack Query (optional): https://tanstack.com/query/latest

---

## Summary

**What to implement first:**

1. ✅ Create cache directory and files (constants, context, metrics)
2. ✅ Update existing hooks to use cache
3. ✅ Wrap app with CacheProvider
4. ✅ Add cache invalidation on wallet switch
5. ✅ Test and monitor hit rates

**Expected results:**

- 75-93% faster load times
- 70-80% fewer RPC calls
- Better offline experience
- Type-safe implementation
- Easy to extend with persistent storage

**Next steps after Phase 1:**

1. Add MMKV for persistent caching
2. Implement stale-while-revalidate
3. Add background refetching
4. Implement analytics and monitoring

---

## Questions?

Refer to:

- `CACHING_STRATEGY.md` for detailed explanations
- `CACHING_QUICK_START.md` for ready-to-use code
- Code comments in implementation files

---

**Last Updated:** March 5, 2026
**Status:** Ready for Implementation
**Estimated Time:** 1.5 hours for Phase 1

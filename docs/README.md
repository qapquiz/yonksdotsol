# Caching Documentation

This directory contains comprehensive documentation for implementing caching strategies in the Yonksdotsol Expo + Solana dApp.

---

## Quick Start

**New to caching?** Start here:  
📖 **[CACHING_SUMMARY.md](./CACHING_SUMMARY.md)** - Executive summary with quick implementation guide

**Ready to code?** Use this guide:  
💻 **[CACHING_QUICK_START.md](./CACHING_QUICK_START.md)** - Ready-to-use code snippets

**Want deep details?** Read this:  
📚 **[CACHING_STRATEGY.md](./CACHING_STRATEGY.md)** - Comprehensive strategy with examples

---

## Document Overview

### 1. CACHING_SUMMARY.md

**Quick reference guide for implementation**

- Executive summary of caching strategy
- Current issues identified
- Recommended approach (Phase 1-4)
- Performance expectations
- Implementation steps with time estimates
- Code patterns and examples
- Best practices checklist
- Troubleshooting guide

**Best for:** Getting started quickly, understanding the big picture

---

### 2. CACHING_QUICK_START.md

**Step-by-step implementation guide with ready-to-use code**

- Installation instructions
- Complete code for all cache files
- Hook updates with caching
- Integration steps
- Usage examples
- Testing checklist
- Performance benchmarks

**Best for:** Implementation, copy-paste code, practical examples

---

### 3. CACHING_STRATEGY.md

**Comprehensive strategy document**

- Detailed analysis of current state
- In-memory caching approaches (3 options)
- Persistent caching solutions (4 options)
- Cache invalidation strategies (3 types)
- Performance considerations (5 areas)
- Implementation roadmap (4 phases)
- Testing strategies
- Complete implementation examples
- References and resources

**Best for:** Deep understanding, architecture decisions, long-term planning

---

## File Structure After Implementation

```
src/
├── cache/
│   ├── constants.ts          # TTL values and cache keys
│   ├── CacheContext.tsx      # React context provider
│   ├── CacheMetrics.ts       # Performance tracking
│   └── invalidation.ts       # Cache invalidation helpers
├── components/
│   └── Debug/
│       └── CacheMetrics.tsx  # Development metrics display (optional)
├── hooks/
│   └── positions/
│       ├── useTokenData.ts          # Updated with caching
│       └── useInitialDeposits.ts    # Updated with caching
└── app/
    ├── _layout.tsx          # Updated with CacheProvider
    └── index.tsx            # Updated with cache invalidation
```

---

## Implementation Phases

### Phase 1: In-Memory Caching (Immediate)

**Time:** ~1.5 hours  
**Files:** Create 4 new files, update 4 existing files

**Benefits:**

- 75-93% faster load times
- 70-80% fewer RPC calls
- No external dependencies

**Documentation:** Start with [CACHING_QUICK_START.md](./CACHING_QUICK_START.md)

---

### Phase 2: Persistent Storage (Week 2)

**Time:** ~4 hours  
**Dependencies:** `react-native-mmkv`

**Benefits:**

- Survive app restarts
- Offline-first experience
- Faster app launches

**Documentation:** See Phase 2 in [CACHING_STRATEGY.md](./CACHING_STRATEGY.md#phase-2-persistent-storage-week-2)

---

### Phase 3: Advanced Features (Week 3)

**Time:** ~6 hours

**Features:**

- Stale-while-revalidate
- Background refetching
- LRU eviction
- Cache warming

**Documentation:** See Phase 3 in [CACHING_STRATEGY.md](./CACHING_STRATEGY.md#phase-3-advanced-caching-week-3)

---

### Phase 4: Analytics (Week 4)

**Time:** ~4 hours

**Features:**

- Performance tracking
- Hit rate monitoring
- Memory usage analysis
- Optimization insights

**Documentation:** See Phase 4 in [CACHING_STRATEGY.md](./CACHING_STRATEGY.md#phase-4-monitoring--metrics-week-4)

---

## Cache Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         User Request                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
                  ┌────────────────┐
                  │ Check Cache    │
                  │ (useCache hook)│
                  └───────┬────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
         CACHE HIT                 CACHE MISS
              │                       │
              ▼                       ▼
     ┌──────────────┐        ┌──────────────┐
     │ Return Data   │        │ Fetch from   │
     │ Immediately  │        │ RPC/API      │
     └──────┬───────┘        └──────┬───────┘
            │                       │
            │                       ▼
            │              ┌──────────────┐
            │              │ Cache Data   │
            │              │ with TTL     │
            │              └──────┬───────┘
            │                     │
            │                     ▼
            │              ┌──────────────┐
            └─────────────►│ Return Data  │
                           │ to UI        │
                           └──────────────┘

Background Refresh (Stale-While-Revalidate):
```

```
Cached Data → Display Immediately
                ↓
         Fetch Fresh Data
                ↓
         Update Cache
                ↓
         Update UI
```

---

## Key Concepts

### TTL (Time-to-Live)

How long data remains valid in cache before expiring.

| Data Type           | TTL    | Why               |
| ------------------- | ------ | ----------------- |
| Token prices        | 30s    | Change frequently |
| Token metadata      | 24h    | Rarely change     |
| Position deposits   | 7 days | Immutable         |
| Transaction history | 24h    | Historical data   |

### Cache Keys

Unique identifiers for cached data.

Format: `{prefix}:{identifier}:{params}`

Examples:

- `token:So11111111111111111111111111111111111111112`
- `position:7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU:type:initial_deposits`

### Invalidation

Removing cached data when it becomes stale.

Methods:

- **Time-based**: Automatic expiration via TTL
- **Event-based**: Manual invalidation on user actions
- **Pattern-based**: Invalidate groups of related data

---

## Performance Metrics

### Expected Improvements

| Metric                      | Before | After | Improvement |
| --------------------------- | ------ | ----- | ----------- |
| Initial load (10 positions) | ~8s    | ~2s   | 75%         |
| Subsequent loads            | ~8s    | ~0.5s | 93%         |
| Token metadata fetches      | 20+    | 2-4   | 80%         |
| RPC calls per session       | 150+   | 30-40 | 73%         |
| Cache hit rate              | 0%     | 85%+  | ✅          |

### Monitoring

Track these metrics to ensure cache effectiveness:

- **Hit Rate**: Percentage of requests served from cache (target: >85%)
- **Misses**: Requests that required fetching
- **Sets**: New cache entries created
- **Evictions**: Entries removed due to TTL or size limits

---

## Common Patterns

### 1. Basic Caching Hook

```typescript
function useMyData(id: string) {
  const cache = useCache()
  const [data, setData] = useState(null)

  useEffect(() => {
    const key = getCacheKey('data', id)
    const cached = cache.get(key)

    if (cached) {
      setData(cached)
      return
    }

    fetchData(id).then((result) => {
      cache.set(key, result, TTL)
      setData(result)
    })
  }, [id, cache])

  return { data }
}
```

### 2. Cache Invalidation

```typescript
function MyComponent() {
  const { invalidatePosition } = useCacheInvalidation()

  const handleUpdate = async () => {
    await updatePosition()
    invalidatePosition(positionId)
  }
}
```

### 3. Pattern Invalidation

```typescript
// Invalidate all tokens
cache.invalidatePattern(`^${CACHE_KEYS.TOKEN}:`)

// Invalidate all positions
cache.invalidatePattern(`^${CACHE_KEYS.POSITION}:`)
```

---

## Troubleshooting

### Cache Not Working

1. Verify `CacheProvider` wraps app
2. Check hooks import and use `useCache()`
3. Verify cache keys are correct
4. Check console for cache metrics

### Stale Data

1. Check TTL values in `constants.ts`
2. Implement manual invalidation
3. Add refresh controls
4. Consider background refetching

### Memory Issues

1. Check cache size with metrics
2. Reduce TTL for large datasets
3. Implement LRU eviction
4. Clear cache periodically

---

## Best Practices

### DO ✅

1. Cache aggressively for immutable data
2. Use appropriate TTL values
3. Check cache before fetching
4. Implement deduplication
5. Monitor hit rates
6. Clear on logout
7. Use TypeScript generics
8. Implement pattern invalidation

### DON'T ✗

1. Don't cache everything
2. Don't ignore TTL
3. Don't cache in-memory only (for critical data)
4. Don't cache large objects
5. Don't forget error handling
6. Don't cache PII
7. Don't over-engineer
8. Don't forget cleanup

---

## Additional Resources

### React Native / Expo

- [React Context](https://react.dev/reference/react/useContext)
- [useMemo](https://react.dev/reference/react/useMemo)
- [useCallback](https://react.dev/reference/react/useCallback)

### Caching Libraries

- [MMKV](https://github.com/mrousavy/react-native-mmkv) - High-performance key-value storage
- [TanStack Query](https://tanstack.com/query/latest) - Advanced data fetching & caching
- [Zustand](https://github.com/pmndrs/zustand) - Lightweight state management

### Solana Specific

- [Solana RPC Best Practices](https://docs.solana.com/developing/clients/rpc-api)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)

---

## Questions?

1. **Getting started?** → Read [CACHING_SUMMARY.md](./CACHING_SUMMARY.md)
2. **Implementing now?** → Follow [CACHING_QUICK_START.md](./CACHING_QUICK_START.md)
3. **Deep dive?** → Study [CACHING_STRATEGY.md](./CACHING_STRATEGY.md)
4. **Need help?** → Check troubleshooting section in each document

---

## Version History

- **v1.0** (2026-03-05): Initial caching strategy documentation

---

## Contributing

When updating these documents:

1. Keep examples current with code changes
2. Update performance metrics based on real data
3. Add new patterns as they're discovered
4. Maintain consistency across all documents
5. Update version history

---

**Last Updated:** March 5, 2026  
**Maintainer:** Development Team  
**Status:** Active

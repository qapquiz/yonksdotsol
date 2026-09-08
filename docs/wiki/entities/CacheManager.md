---
title: CacheManager
type: entity
location: src/utils/cache/CacheManager.ts
created: 2026-04-18
updated: 2026-09-08
tags: [caching, performance, singleton]
related:
  - Caching Strategy
  - Connection
---

# CacheManager

Centralized caching system with TTL, request dedup, and pattern invalidation.

## Location

`src/utils/cache/CacheManager.ts`

## Responsibilities

- Shared caching for token info, display-only OHLCV, and per-pool PnL
- Request deduplication via `getOrFetch`
- TTL-based expiration
- Pattern-based invalidation
- Preventing invalidated requests from restoring stale entries or replacing newer results

## API

```typescript
const cache = CacheManager.getInstance()

// Get or fetch with dedup
const data = await cache.getOrFetch(key, fetchFn, ttlMs)

// Direct get/set
const value = cache.get(key)
cache.set(key, value, ttlMs)

// Invalidation
cache.delete(key)
cache.invalidatePattern('prefix:')
cache.clear()
```

## Cache Keys

Generated inline in `src/services/data.ts` and `src/services/positionPipeline.ts`:

| Key Pattern                | TTL   | Description             |
| -------------------------- | ----- | ----------------------- |
| `token_data:{mint}`        | 60s   | Token metadata          |
| `pnl:{pool}:{wallet}`      | 15min | Position PnL (per pool) |
| `ohlcv:{pool}:{timeframe}` | 60s   | Display-only candles    |

## Request Dedup

When multiple calls request the same key simultaneously:

1. First caller creates the promise
2. Subsequent callers share the same fetch outcome
3. Only one actual fetch occurs

## Invalidation During Requests

`delete(key)`, `clear()`, and `invalidatePattern(pattern)` remove both cached entries and matching pending requests from the manager. Pattern matching uses a literal substring, including keys whose first fetch has not finished.

An invalidated fetch can still resolve or reject for its original callers. It cannot write back into the cache or remove a newer pending request. A subsequent `getOrFetch` starts fresh work. An explicit `set` also supersedes any pending fetch for that key.

The implementation checks the identity of the pending promise before committing or cleaning up. Callers do not need generation counters to protect the cache. UI owners still need to discard obsolete results when their wallet or selection changes; cache invalidation does not cancel network requests or consumers' promise handlers.

## Values and Expiration

- An entry expires when `Date.now() >= expiresAt`; a zero TTL is immediately expired.
- `getOrFetch` caches successful `null` and `undefined` results just like other values.
- `get` retains its existing `T | null` interface. Use `has` when you need to distinguish a cached `null` from a missing entry.
- Rejected fetches are not cached, and later calls can retry. Concurrent synchronous failures are deduplicated too.
- `get`, `has`, and `getOrFetch` use the same internal entry lookup and expiration rule.

## Testing

Use `CacheManager.createFresh()` for isolation. Regression tests in `src/__tests__/stores/CacheManager.test.ts` control promise completion order and time directly, covering invalidation, explicit writes, failure/retry, deduplication, and TTL edges.

## See Also

- [[Caching Strategy]] — Overall caching approach
- [[Connection]] — Connection used for fetches
- [[SettingsStore]] — Theme stored separately (not in CacheManager)

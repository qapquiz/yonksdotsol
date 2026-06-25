---
title: CacheManager
type: entity
location: src/utils/cache/CacheManager.ts
created: 2026-04-18
updated: 2026-04-18
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

- All caching goes through this singleton
- Request deduplication via `getOrFetch`
- TTL-based expiration
- Pattern-based invalidation

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

| Key Pattern           | TTL   | Description             |
| --------------------- | ----- | ----------------------- |
| `token_data:{mint}`   | 60s   | Token metadata          |
| `pnl:{pool}:{wallet}` | 15min | Position PnL (per pool) |

## Request Dedup

When multiple calls request the same key simultaneously:

1. First caller creates the promise
2. Subsequent callers receive the same promise
3. Only one actual fetch occurs

## See Also

- [[Caching Strategy]] — Overall caching approach
- [[Connection]] — Connection used for fetches
- [[SettingsStore]] — Theme stored separately (not in CacheManager)

---
title: Caching Strategy
type: concept
created: 2026-04-18
updated: 2026-04-18
tags: [caching, performance, architecture]
related:
  - CacheManager
  - Connection
  - PositionInfo
---

# Caching Strategy

Centralized, TTL-based caching with request deduplication.

## Overview

All caching in the app goes through [[CacheManager]] — no ad-hoc `Map` caches in modules. This ensures:

- Consistent TTL enforcement
- Request deduplication
- Single invalidation point

## Architecture

```
CacheManager (singleton)
    │
    ├─→ Token data         key: "token_data:{mint}"        TTL: 60s
    ├─→ UPNL data          key: "upnl_per_position:{addr}" TTL: 15min
    ├─→ OHLCV prices       key: "ohlcv:{pool}:{bucket}"    TTL: 1hr
    └─→ Pyth prices        key: "pyth_price:{sym}:{bucket}" TTL: 1hr
```

## Request Deduplication

Via `getOrFetch(key, fetchFn, ttl)`:

1. First caller for a key creates the fetch promise
2. Subsequent callers for the same key receive the same promise
3. Only one actual fetch occurs
4. Result is cached for all callers

This prevents thundering herd when multiple components request the same data.

## Invalidation Strategies

| Method | Use Case |
|--------|----------|
| `delete(key)` | Single key |
| `invalidatePattern(prefix:)` | All keys with prefix |
| `clear()` | Nuclear option |

Example — invalidate all UPNL data when wallet changes:

```typescript
CacheManager.getInstance().invalidatePattern('upnl_per_position:')
```

## See Also

- [[CacheManager]] — Implementation details
- [[Connection]] — Used for fetches
- [[Position Architecture]] — Positions use caching

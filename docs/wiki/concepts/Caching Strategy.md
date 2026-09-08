---
title: Caching Strategy
type: concept
created: 2026-04-18
updated: 2026-09-08
tags: [caching, performance, architecture]
related:
  - CacheManager
  - Connection
  - PositionInfo
---

# Caching Strategy

Centralized, TTL-based caching with request deduplication.

## Overview

Token info, display-only OHLCV, and per-pool PnL caching go through [[CacheManager]]. Widget summaries deliberately fetch server totals without this cache (ADR 0002). Shared caching provides:

- Consistent TTL enforcement
- Request deduplication
- Single invalidation point

## Architecture

```
CacheManager (singleton)
    │
    ├─→ Token info        key: "token_data:{mint}"          TTL: 60s
    ├─→ OHLCV             key: "ohlcv:{pool}:{timeframe}"   TTL: 60s
    └─→ Position PnL      key: "pnl:{pool}:{wallet}"         TTL: 15min
```

## Request Deduplication

Via `getOrFetch(key, fetchFn, ttl)`:

1. First caller for a key creates the fetch promise
2. Subsequent callers for the same key share the fetch outcome
3. Only one actual fetch occurs
4. The result is cached only if the request is still current

This prevents thundering herd when multiple components request the same data.

## Invalidation Strategies

| Method                       | Use Case                            |
| ---------------------------- | ----------------------------------- |
| `delete(key)`                | Single key                          |
| `invalidatePattern(pattern)` | Keys containing a literal substring |
| `clear()`                    | All cached and pending keys         |

Example — invalidate a wallet's PnL when refreshing or changing wallets:

```typescript
pipeline.invalidateWallet(walletAddress)
```

Invalidation also detaches matching requests already in flight, even before they have written an entry. Their original callers still receive the outcome, but a late completion cannot repopulate the cache or interfere with a newer request. `set` similarly supersedes pending work. UI request ownership remains the consuming hook's responsibility.

## Adding a Cached Query

1. Keep cache key construction in the owning data module, with every input that changes the result in the key.
2. Put the entire logical fetch inside `getOrFetch`, including all required pages. [[DlmmApi]] exposes `fetchAllPositionPnL` for this purpose.
3. Let fetch failures reject so partial results are not cached. Successful empty or `null` results are cached for their TTL.
4. Reuse the existing invalidation methods; callers need no additional cache generation bookkeeping.

Expiry is inclusive at the TTL deadline. All cache reads share one freshness rule.

## See Also

- [[CacheManager]] — Implementation details
- [[Connection]] — Used for fetches
- [[Position Architecture]] — Positions use caching

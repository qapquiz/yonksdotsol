---
title: Caching Strategy
type: concept
created: 2026-04-18
updated: 2026-09-09
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

## Widget Refresh Snapshots

`src/widgets/syncPortfolioWidget.ts` owns a separate MMKV snapshot for refresh feedback. It stores the last successful nonempty summary with its wallet address and wallet revision. A revision changes on every connect, switch, or disconnect, so reconnecting the same address cannot reuse a previous session. Empty results and wallet transitions remove obsolete snapshots; legacy snapshots without a wallet identity are discarded.

This snapshot does not replace API fetching. Manual, foreground, and background refreshes share the coordinator and update every installed widget instance. A persisted request ID prevents older successes or failures from replacing newer results, including across headless module loads. Wallet identity and request ordering are checked before saving and again inside the native draw callback, after Android's asynchronous widget lookup.

`useWidgetSync` subscribes to persisted wallet changes and bypasses its normal debounce for them. Disconnect draws the connect-wallet message; connecting replaces old numbers with an updating state before fetching. Unmount removes the subscription and cancels pending timers. Regression tests exercise these transitions through the real hook and task entry points with mocked native storage, widget draws, and HTTP.

[[PositionLiquidityWidget]] uses a separate `position-widget` MMKV instance for JSON-safe per-position snapshots and selections. Each widget's selection is an actual position address scoped to the wallet revision. Refresh replaces the complete position list, including empty results. Navigation is local and reads the latest snapshot at draw time; it does not supersede a pending refresh. Both widget types share the guarded native renderer in `src/widgets/renderWidgets.ts`.

## See Also

- [[CacheManager]] — Implementation details
- [[Connection]] — Used for fetches
- [[Position Architecture]] — Positions use caching

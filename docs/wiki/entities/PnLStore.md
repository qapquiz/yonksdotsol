---
title: PnLStore
type: entity
location: src/stores/pnlStore.ts
created: 2026-04-18
updated: 2026-04-18
tags: [zustand, state, pnl, positions]
related:
  - PositionInfo
  - CacheManager
  - Connection
---

# PnLStore

Zustand store for profit/loss data across positions.

## Location

`src/stores/pnlStore.ts`

## State Shape

```typescript
interface PnLStore {
  // Pool PnL data
  fetchPoolPnL: (poolAddress: string, walletAddress: string) => Promise<void>
  // Selectors for accessing data
}
```

## Selectors

```typescript
// Get PnL for a specific position
const positionPnL = usePnLStore(selectPositionPnL(poolAddress, positionAddress, walletAddress))

// Get summary for a pool
const poolSummary = usePnLStore(selectPoolPnLSummary(poolAddress, walletAddress))

// Check if pool data exists
const hasData = usePnLStore(selectHasPoolData(walletAddress, poolAddresses))
```

## Orchestration

PnL fetching is orchestrated in `src/app/positions/index.tsx` to avoid duplicate fetches:

```typescript
const fetchPoolPnL = usePnLStore((state) => state.fetchPoolPnL)
useEffect(() => {
  if (wallet && poolAddresses.length > 0) {
    poolAddresses.forEach((poolAddress) => {
      fetchPoolPnL(poolAddress, wallet)
    })
  }
}, [wallet, poolAddresses, fetchPoolPnL])
```

## See Also

- [[PositionInfo]] — PnL calculated per position
- [[CacheManager]] — UPNL data cached with 15min TTL
- [[Connection]] — Connection used for PnL fetching

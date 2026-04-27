---
title: usePositionsPage
type: entity
location: src/hooks/usePositionsPage.ts
created: 2026-04-28
updated: 2026-04-28
tags: [hook, positions, data-fetching, state]
related:
  - useWalletLifecycle
  - computePositionViewData
  - PnLStore
  - CacheManager
  - Connection
---

# usePositionsPage

Main data orchestration hook for the positions page.

## Location

`src/hooks/usePositionsPage.ts`

## Responsibilities

- Fetches all DLMM positions for a wallet
- Fetches token price data for position mints
- Orchestrates PnL fetching per pool
- Computes resolved position view models
- Manages wallet change cache invalidation
- Provides pull-to-refresh with 30s cooldown

## Returned Data

```typescript
interface PositionsPageResult {
  positions: ResolvedPosition[]      // Full view models ready for render
  summary: PortfolioSummaryData | null
  hasPnLData: boolean
  outOfRangeCount: number
  poolAddresses: string[]
  positionCount: number
  loading: boolean                   // True during initial skeleton load
  tokenDataReady: boolean            // Prevents FlashList blank frame
  refresh: () => void                // Throttled refresh
  walletResolved: boolean
  walletAddress?: string
}
```

## Wallet Change Handling

When wallet changes:
1. Invalidates old wallet's PnL store data
2. Invalidates old wallet's cache entries via pattern `:${prevWallet}`
3. Fetches positions for new wallet

## Refresh Cooldown

Manual refresh enforces a 30-second cooldown and invalidates PnL cache for fresh data.

## Key Relationships

- Uses [[Connection]] via `getSharedConnection()`
- Uses [[CacheManager]] for cache invalidation
- Uses [[PnLStore]] for profit/loss data
- Depends on [[computePositionViewData]] for view model generation
- Consumed by `PositionsList` and `App`

## See Also

- [[useWalletLifecycle]] — provides wallet state
- [[computePositionViewData]] — pure view model transformer
- [[CacheManager]] — caching system
- [[PnLStore]] — PnL state management

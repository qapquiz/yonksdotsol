---
title: usePositionsPage
type: entity
location: src/hooks/usePositionsPage.ts
created: 2026-04-28
updated: 2026-09-21
tags: [hook, positions, data-fetching, state]
related:
  - useWalletLifecycle
  - computePositionViewData
  - CacheManager
  - Connection
  - Refresh Lifecycle
  - LastUpdatedStamp
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
- Provides throttled refresh: pull, stamp tap, 60s foreground interval, and foreground-return (all sharing one 30s cooldown)
- Tracks `lastUpdatedAt` freshness stamp

## Returned Data

```typescript
interface PositionsPageResult {
  positions: ResolvedPosition[] // Full view models ready for render
  summary: PortfolioSummaryData | null
  hasPnLData: boolean
  outOfRangeCount: number
  poolAddresses: string[]
  positionCount: number
  loading: boolean // True during initial skeleton load
  tokenDataReady: boolean // Prevents FlashList blank frame
  solUsdPrice: number | null // Live SOL→USD for the display toggle
  lastUpdatedAt: number | null // Epoch ms of last successful load; null hides the stamp
  refresh: (options?: { silent?: boolean }) => void // Throttled refresh
  walletReady: boolean
  walletAddress?: string
}
```

## Wallet Change Handling

When wallet changes:

1. Invalidates old wallet's PnL store data
2. Invalidates old wallet's cache entries via pattern `:${prevWallet}`
3. Fetches positions for new wallet

## Refresh Lifecycle

All triggers — pull, stamp tap, the 60s foreground interval, and the
foreground-return listener — share one 30s cooldown and one success handler
(`applyPortfolioResult`). Silent refreshes skip skeleton/spinner and log
`positions.refreshed` with their source. Full details in
[[Refresh Lifecycle]].

## Key Relationships

- Uses [[Connection]] via `getSharedConnection()`
- Uses [[CacheManager]] for cache invalidation
- Depends on [[computePositionViewData]] for view model generation
- Consumed by `PositionsList` and `App`
- Feeds `lastUpdatedAt` to [[LastUpdatedStamp]]

## See Also

- [[useWalletLifecycle]] — provides wallet state
- [[computePositionViewData]] — pure view model transformer
- [[CacheManager]] — caching system
- [[Refresh Lifecycle]] — trigger/cooldown strategy this hook implements

# RFC-02: Collapse Position Data Pipeline into `usePositionsPage`

## Problem

The positions page (`src/app/positions/index.tsx`) spends 70+ lines orchestrating 5 separate modules to produce a renderable position list:

1. `usePositionFetch(walletAddress)` → raw DLMM positions
2. Extract unique mints → pass to `useBatchTokenData`
3. `useBatchTokenData({ mints, enabled })` → token price data
4. `usePnLStore.fetchPoolPnL` per pool in a `useEffect`
5. Each `PositionCard` reads PnL via Zustand selector, calls `computePositionViewData`

The seams between these hooks are where bugs hide — loading state desynchronization, stale token data after position refresh, PnL not loading for new pools. The page component knows about `poolAddresses`, `uniqueMints`, `outOfRangeCount`, and FlashList data construction — all accidental complexity from the data layer's shallowness.

**Modules involved**: `app/positions/index.tsx`, `hooks/positions/usePositionFetch.ts`, `hooks/positions/useBatchTokenData.ts`, `stores/pnlStore.ts`, `utils/positions/computePositionViewData.ts`, `components/positions/PositionCard.tsx`, `components/positions/PortfolioSummary.tsx`

**What's tested**: Each hook in isolation (`usePositionFetch.test.ts`, `useBatchTokenData.test.ts`), the PnL store (`pnlStore.test.ts`), the pure computation (`computePositionViewData.test.ts`).

**What's NOT tested**: The 70-line orchestration in the page component. The integration between position fetch → token resolution → PnL fetch → view model computation. This is the most complex code path in the app and it has zero tests.

## Proposed Interface

### Single hook

```ts
// src/hooks/usePositionsPage.ts

export interface PositionsPageResult {
  /** Fully resolved position view models (token data + PnL baked in) */
  positions: PositionViewModel[]
  /** Aggregated portfolio summary */
  summary: PortfolioSummaryData | null
  /** Count of out-of-range positions */
  outOfRangeCount: number
  /** True during initial skeleton load */
  loading: boolean
  /** True during pull-to-refresh */
  refreshing: boolean
  /** Pull-to-refresh handler */
  refresh: () => void
}

export interface PortfolioSummaryData {
  totalPnlSol: number
  totalPnlPercent: number
  totalValueSol: number
  totalInitialDepositSol: number
  totalUnclaimedFeesSol: number
  positionCount: number
}

/**
 * Single entry point for the positions page.
 * Internally orchestrates: fetch positions → resolve tokens → fetch PnL → compute view models.
 */
export function usePositionsPage(walletAddress: string | undefined, deps?: PositionPipelineDeps): PositionsPageResult
```

### Dependency injection for testing

```ts
export interface PositionPipelineDeps {
  fetchPositions?: (wallet: string) => Promise<Map<string, PositionInfo>>
  fetchTokenPrices?: (mints: string[]) => Promise<Map<string, TokenInfo>>
  fetchPoolPnL?: (pool: string, wallet: string) => Promise<PositionPnLData[] | null>
}
```

### Usage example

**Before** (70+ lines in positions/index.tsx):

```tsx
// Extract mints, pool addresses, trigger PnL fetches, build listData, count out-of-range...
const positionsEntries = useMemo(() => Array.from(positions.entries()), [positions])
const poolAddresses = useMemo(() => positionsEntries.map(([addr]) => addr), [positionsEntries])
const uniqueMints = useMemo(() => {
  /* extract from positions */
}, [positionsArray])
const { tokenData } = useBatchTokenData({ mints: uniqueMints, enabled: positionsArray.length > 0 })
useEffect(() => {
  poolAddresses.forEach((p) => fetchPoolPnL(p, wallet))
}, [wallet, poolAddresses])
// ... 40 more lines of listData construction, renderItem, skeleton/empty logic
```

**After** (~15 lines):

```tsx
import { usePositionsPage } from '../hooks/usePositionsPage'

function PositionsList({ walletAddress }: { walletAddress?: string }) {
  const { positions, summary, outOfRangeCount, loading, refreshing, refresh } = usePositionsPage(walletAddress)

  if (loading) return <PositionsSkeleton />
  if (positions.length === 0) return <EmptyState />

  return (
    <FlashList
      data={buildListItems(positions, summary, outOfRangeCount)}
      renderItem={renderItem}
      refreshing={refreshing}
      onRefresh={refresh}
    />
  )
}
```

### What changes in downstream components

- **PositionCard** becomes pure presentational: receives `PositionViewModel` (already computed), no more Zustand store access, no more `computePositionViewData` call.
- **PortfolioSummary** receives `PortfolioSummaryData` as a prop instead of reading from `pnlStore` directly.

### What complexity it hides

| Hidden concern                                   | Current location                        |
| ------------------------------------------------ | --------------------------------------- |
| Position → mint extraction → batch token fetch   | Page component + `useBatchTokenData`    |
| Per-pool PnL fetch orchestration                 | Page component `useEffect` + `pnlStore` |
| View model computation per position              | `PositionCard` internal `useMemo`       |
| Portfolio aggregation                            | `PortfolioSummary` internal selectors   |
| Out-of-range counting                            | Page component `useMemo`                |
| Loading state merging (positions + tokens + PnL) | Scattered across 3 hooks                |
| Wallet change → cache invalidation cascade       | `usePositionFetch` + `pnlStore`         |
| Throttled refresh                                | `usePositionFetch` internal ref         |

## Dependency Strategy

**Category: In-process + Local-substitutable**

- **In-process**: The pipeline composes pure functions (`computePositionViewData`, `computePoolPnLSummary`) with React hooks — all in-process, no I/O at the boundary.
- **Local-substitutable**: External data sources (DLMM SDK, metcomet, RPC) are injected via `PositionPipelineDeps`. Tests provide fake implementations that return fixture data.

### Internal composition

The hook composes the existing modules internally — it doesn't rewrite them:

```
usePositionsPage(walletAddress, deps?)
  ├── usePositionFetch(walletAddress, { fetchFn: deps?.fetchPositions })
  │     → positions: Map<string, PositionInfo>
  ├── extract mints from positions (useMemo)
  ├── useBatchTokenData equivalent (internal, uses deps?.fetchTokenPrices)
  │     → tokenData: Map<string, TokenInfo>
  ├── PnL fetching per pool (useEffect, uses deps?.fetchPoolPnL)
  │     → pnlData per pool
  ├── compute view models (useMemo over positions × tokens × pnl)
  │     → PositionViewModel[]
  └── compute summary (useMemo over all PnL data)
        → PortfolioSummaryData
```

The existing hooks (`usePositionFetch`, `useBatchTokenData`) and store (`pnlStore`) may remain as internal implementation details, or their logic may be inlined if the hook replaces them entirely.

## Testing Strategy

### New boundary tests to write

- **Initial load flow**: wallet connects → positions load → tokens resolve → PnL fetches → view models computed
- **Loading states**: skeleton while loading, empty state when no positions, data rendering when complete
- **Pull-to-refresh**: refresh cascades through all layers, refreshing flag lifecycle
- **Wallet disconnect**: positions cleared, loading reset
- **Wallet swap**: cache invalidation, new wallet's positions load
- **Partial failure**: token fetch fails for one mint → other positions still render
- **Out-of-range counting**: verify count matches positions with `inRange === false`
- **Summary aggregation**: verify totals match sum of individual position PnL data

### Old tests to delete

- **`usePositionFetch.test.ts`** (270 lines): Replaced by boundary tests on `usePositionsPage`. The position fetch logic is now internal to the pipeline.
- **`useBatchTokenData.test.ts`** (155 lines): Same — token batch fetching is internalized.
- **`pnlStore.test.ts`** selector tests (`selectPoolPnLSummary`, `selectPositionPnL`): Replaced by pipeline boundary tests. The store's fetch/dedup tests remain.

### Test environment needs

- `@testing-library/react` `renderHook` (already in use)
- Fake implementations of `PositionPipelineDeps` returning fixture data
- `vitest` fake timers (already in use for throttle testing)

## Implementation Recommendations

### What the module should own

- The complete data pipeline from wallet address to renderable view models
- Loading and refreshing state management
- Cache invalidation cascading on wallet change
- Throttled refresh logic

### What it should hide

- The number and order of data fetches (positions → tokens → PnL)
- The existence of `CacheManager`, `pnlStore`, and individual hooks
- View model computation (moved from `PositionCard` into the pipeline)

### What it should expose

- `PositionsPageResult`: positions, summary, loading states, refresh handler
- `PositionPipelineDeps`: for test injection
- `PortfolioSummaryData`: summary shape (may be re-exported from this module)

### How callers should migrate

1. Create `src/hooks/usePositionsPage.ts` composing the existing hooks
2. Replace `positions/index.tsx` orchestration with `usePositionsPage(walletAddress)`
3. Simplify `PositionCard` to accept `PositionViewModel` directly (remove store access + computation)
4. Simplify `PortfolioSummary` to accept `PortfolioSummaryData` as props
5. Once stable, mark `usePositionFetch` and `useBatchTokenData` as internal-only (or inline their logic)
6. Move PnL aggregation logic from `pnlStore` selectors into the pipeline's `useMemo`

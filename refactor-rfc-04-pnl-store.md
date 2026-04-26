# RFC-04: Extract Pure Aggregation from PnL Store

## Problem

`pnlStore.ts` is a 200+ line Zustand store that mixes three concerns:

1. **Data fetching** — `fetchPoolPnL` calls `fetchPositionPnL` from `metcomet`, with its own TTL cache and request deduplication (duplicating what `CacheManager` already provides)
2. **State storage** — storing raw `PositionPnLData[]` per pool+wallet combination
3. **Aggregation logic** — `selectPoolPnLSummary` (60 lines of pure math) and `selectPositionPnL` are pure functions trapped behind Zustand selectors

The problems:

- Testing `selectPoolPnLSummary` requires setting up Zustand state via `usePnLStore.setState(...)` — a 400-line test file where half the tests are wrestling with store mechanics instead of testing the math
- The store has its own TTL cache (`TTL_MS = 60_000`) and pending dedup (`pendingPoolPnL`) that duplicate `CacheManager`'s `getOrFetch` functionality
- `fetchPoolPnL` directly imports `fetchPositionPnL` from `metcomet` and reads `env.heliusApiKey` — the store is coupled to the external SDK and config

**Modules involved**: `stores/pnlStore.ts`, `config/env.ts`, `metcomet` (external library)

**Dependency category**: In-process (aggregation) + True External/Mock (`metcomet`)

## Proposed Interface

### 1. Pure aggregation functions (new file)

```ts
// src/utils/positions/pnlAggregation.ts

export interface PoolPnLSummary {
  totalPnlSol: number
  totalPnlPercent: number
  totalValueSol: number
  totalInitialDepositSol: number
  totalUnclaimedFeesSol: number
}

/**
 * Aggregate PnL data across multiple positions into a portfolio summary.
 * Pure function — no store, no async, no side effects.
 */
export function computePoolPnLSummary(positions: PositionPnLData[]): PoolPnLSummary

/**
 * Find PnL data for a specific position within a list.
 * Pure function.
 */
export function findPositionPnL(positions: PositionPnLData[], positionAddress: string): PositionPnLData | null

/**
 * Check if any positions exist in the PnL data.
 */
export function hasAnyPnLData(positions: PositionPnLData[]): boolean
```

### 2. Simplified PnL store

```ts
// src/stores/pnlStore.ts (simplified)

interface PnLStore {
  poolPnLData: Record<string, PositionPnLData[]>
  fetchPoolPnL: (poolAddress: string, walletAddress: string) => Promise<PositionPnLData[] | null>
  invalidateWallet: (walletAddress: string) => void
  clearAll: () => void
}

// Uses CacheManager for caching instead of rolling its own TTL + dedup
// Delegates aggregation to pnlAggregation.ts functions
```

### Usage example

**Before** (testing aggregation requires Zustand):

```ts
// pnlStore.test.ts — 30 lines of setup to test math
usePnLStore.setState({
  poolPnLData: {
    'pool1:wallet1': {
      positions: [{ ...mockData, pnlSol: 0.5 }],
      timestamp: Date.now(),
    },
  },
})
const selector = selectPoolPnLSummary('wallet1', ['pool1'])
const result = selector(usePnLStore.getState())
expect(result.totalPnlSol).toBeCloseTo(0.5)
```

**After** (testing aggregation is a pure function call):

```ts
// pnlAggregation.test.ts — 5 lines
const result = computePoolPnLSummary([{ ...mockData, pnlSol: 0.5 /* ... */ }])
expect(result.totalPnlSol).toBeCloseTo(0.5)
```

**Before** (store does its own caching):

```ts
// pnlStore.ts
const cached = state.poolPnLData[cacheKey]
if (cached && Date.now() - cached.timestamp < TTL_MS) return cached.positions
const existingRequest = state.pendingPoolPnL[cacheKey]
if (existingRequest) return existingRequest
// ... 20 more lines of dedup/cache logic
```

**After** (store delegates to CacheManager):

```ts
// pnlStore.ts (simplified)
fetchPoolPnL: async (poolAddress, walletAddress) => {
  if (!env.heliusApiKey) return null
  const cacheKey = `pnl:${poolAddress}:${walletAddress}`
  return CacheManager.getInstance().getOrFetch(
    cacheKey,
    () => fetchPositionPnL({ poolAddress, user: walletAddress, status: 'open' }).then((r) => r?.positions ?? []),
    CACHE_TTL.PNL_DATA,
  )
}
```

## Dependency Strategy

### Aggregation functions: In-process

- `computePoolPnLSummary`, `findPositionPnL`, `hasAnyPnLData` are pure functions
- Zero dependencies — take arrays, return values
- Testable with plain vitest, no React, no Zustand, no mocks

### Store: True External (Mock)

- `fetchPoolPnL` wraps the `metcomet` library — external SDK
- In tests, the `metcomet` module is already mocked via `vi.mock('metcomet')`
- After simplification, the store becomes a thin wrapper: cache lookup → API call → store result

### Cache dedup: Delegated to CacheManager

- Remove the store's `pendingPoolPnL` map and `TTL_MS` constant
- Use `CacheManager.getOrFetch` which already handles dedup + TTL
- This eliminates the duplication between the store's cache logic and CacheManager

## Testing Strategy

### New boundary tests to write

**`pnlAggregation.test.ts`** — pure function tests:

- `computePoolPnLSummary`: empty array → zeros
- `computePoolPnLSummary`: single position → correct totals
- `computePoolPnLSummary`: multiple positions → correct aggregation
- `computePoolPnLSummary`: weighted PnL% calculation with different deposit sizes
- `computePoolPnLSummary`: missing/optional fields handled gracefully
- `findPositionPnL`: found, not found, empty array
- `hasAnyPnLData`: empty, non-empty

**`pnlStore.test.ts`** — simplified store tests:

- `fetchPoolPnL`: returns null without API key
- `fetchPoolPnL`: fetches and caches via CacheManager
- `fetchPoolPnL`: returns cached data on second call
- `invalidateWallet`: clears wallet-specific entries
- `clearAll`: resets everything

### Old tests to delete

From `pnlStore.test.ts`:

- **`selectPositionPnL` tests** (~30 lines): Replaced by `findPositionPnL` tests
- **`selectPoolPnLSummary` tests** (~60 lines): Replaced by `computePoolPnLSummary` tests
- **`selectHasPoolData` tests** (~20 lines): Replaced by `hasAnyPnLData` tests
- **Dedup tests** (~30 lines): Now handled by CacheManager's existing tests

**Net change**: ~140 lines of selector tests move to simpler pure function tests. Store test file shrinks from 401 lines to ~150.

### Test environment needs

- No changes to test setup
- `pnlAggregation.test.ts` needs no mocks at all — just fixture data

## Implementation Recommendations

### What the module should own

- `pnlAggregation.ts`: owns all PnL aggregation math (weighted averages, SOL value parsing, fee summation)
- `pnlStore.ts`: owns only state storage + thin fetch wrapper

### What it should hide

- TTL constants and dedup logic (delegated to CacheManager)
- The `metcomet` library import (only pnlStore knows about it)
- Aggregation implementation details (callers just call `computePoolPnLSummary`)

### What it should expose

- `pnlAggregation.ts`: `computePoolPnLSummary`, `findPositionPnL`, `hasAnyPnLData`, `PoolPnLSummary`
- `pnlStore.ts`: `usePnLStore`, `fetchPoolPnL`, `invalidateWallet`, `clearAll`

### How callers should migrate

1. Create `src/utils/positions/pnlAggregation.ts` with the three pure functions extracted from `pnlStore.ts` selectors
2. Update `PortfolioSummary` to use `computePoolPnLSummary` directly instead of `selectPoolPnLSummary`
3. Update `PositionCard` to use `findPositionPnL` instead of `selectPositionPnL`
4. Simplify `pnlStore` to use `CacheManager.getOrFetch` instead of manual TTL + dedup
5. Delete the old selector functions and their `timestamp` wrapper type from the store
6. Move `selectHasPoolData` logic to `hasAnyPnLData` in the aggregation module
7. Note: If RFC-02 (usePositionsPage) is implemented, this migration happens inside that hook — components never touch either the store or the aggregation functions directly

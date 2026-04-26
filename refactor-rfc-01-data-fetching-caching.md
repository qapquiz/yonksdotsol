# RFC-01: Deepen Data Fetching & Caching into a DataService

## Problem

The codebase has three data sources (token metadata, OHLCV candles, historical SOL prices) that all follow the same pattern spread across 6+ files:

```
pure fetch function → CacheManager.getInstance().getOrFetch(key, fn, ttl)
```

Each source repeats this dance with its own cache key generator (`cacheKeys.ts`), TTL constant (`config/cache.ts`), and cached wrapper. The `CacheManager` is a **singleton accessed via `getInstance()`** — a hidden global dependency that:

- Makes the cached wrappers (`fetchTokenPriceData`, `fetchPoolPriceAtTimestamp`, `fetchHistoricalSOLPrice`) **untestable** without module-level mocking
- Forces `usePositionFetch` to reach into cache internals for invalidation (`CacheManager.getInstance().invalidatePattern(...)`)
- Duplicates the same wiring pattern 3 times with no shared abstraction

**Modules involved**: `tokens/index.ts`, `utils/cache/CacheManager.ts`, `utils/cache/cacheKeys.ts`, `config/cache.ts`, `utils/positions/meteora-ohlcv.ts`, `utils/positions/pyth-benchmarks.ts`, `config/connection.ts`

**What's tested**: Pure fetch functions (6 tests in `dataFetching.test.ts`), CacheManager mechanics (217-line test suite).

**What's NOT tested**: The cached wrappers that compose pure fetch + CacheManager — the functions every consumer actually calls.

## Proposed Interface

### Service shape

```ts
// src/services/data.ts

export interface TokenService {
  /** Fetch token metadata + price for a single mint (cached) */
  getPrice(mint: string): Promise<TokenInfo>
  /** Batch-fetch token prices for multiple mints (cached, parallel) */
  getPrices(mints: string[]): Promise<Map<string, TokenInfo>>
}

export interface PriceService {
  /** Fetch OHLCV candle closest to timestamp for a pool (cached) */
  getPoolPrice(poolAddress: string, timestamp: number, timeframe?: string): Promise<number | null>
  /** Fetch historical SOL price from Pyth (cached) */
  getHistoricalSOLPrice(timestamp: number): Promise<number | null>
}

export interface DataServices {
  tokens: TokenService
  prices: PriceService
}

/** Create the data services. Pass a fresh CacheManager for testing. */
export function createDataServices(cache?: CacheManager): DataServices
```

### Usage example

**Before** (3 files, singleton coupling):

```ts
import { fetchTokenPriceData } from '../tokens'
import { fetchPoolPriceAtTimestamp } from '../utils/positions/meteora-ohlcv'
import { fetchHistoricalSOLPrice } from '../utils/positions/pyth-benchmarks'

const tokenInfo = await fetchTokenPriceData(mint)
const price = await fetchPoolPriceAtTimestamp(pool, ts)
const solPrice = await fetchHistoricalSOLPrice(ts)
```

**After** (1 import, injectable):

```ts
import { createDataServices } from '../services/data'

const data = createDataServices()
const tokenInfo = await data.tokens.getPrice(mint)
const price = await data.prices.getPoolPrice(pool, ts)
const solPrice = await data.prices.getHistoricalSOLPrice(ts)
```

**Testing** (no singleton, no mocking):

```ts
const cache = new CacheManager() // fresh instance
const data = createDataServices(cache)
// Call twice — second call hits cache, fetcher called once
```

### What complexity it hides

| Hidden concern                            | Where it lives now                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| Cache key generation                      | `cacheKeys.ts` — callers never see `getTokenDataKey`, `getOHLCVKey`, etc.            |
| TTL constants                             | `config/cache.ts` — internalized as defaults                                         |
| CacheManager singleton lifecycle          | Factory owns it; tests inject fresh instances                                        |
| Pure fetch vs. cached wrapper distinction | Eliminated — every call is cached                                                    |
| Per-module import paths                   | Single import from one service barrel                                                |
| Batch token fetching with error isolation | `getPrices` internalizes `Promise.allSettled` logic currently in `useBatchTokenData` |

## Dependency Strategy

**Category: In-process** (pure computation + in-memory state)

- **CacheManager** stays as-is — becomes an implementation detail injected by the factory. Production callers never import it directly.
- **Pure fetch functions** (`fetchTokenFromRpc`, `fetchOHLCVPriceAtTimestamp`, `fetchHistoricalSOLPriceFromApi`) remain as internal implementations, not exported from the service module. They stay testable via direct import from their original locations during the transition, then become private to the service.
- **Connection singleton** remains inside the pure fetch functions — unchanged.

Migration path:

1. Create `src/services/data.ts` wrapping existing functions
2. Migrate callers (`useBatchTokenData`, `usePositionFetch`, any direct imports) to use `DataServices`
3. Remove cached wrapper exports from `tokens/index.ts`, `meteora-ohlcv.ts`, `pyth-benchmarks.ts`
4. Delete `cacheKeys.ts` (absorbed into service internals)

## Testing Strategy

### New boundary tests to write

- **TokenService.getPrice**: cache miss → fetch → store → cache hit on second call
- **TokenService.getPrices**: batch fetch with partial failures (Promise.allSettled behavior)
- **PriceService.getPoolPrice**: cache miss → fetch → null result not cached
- **PriceService.getHistoricalSOLPrice**: same pattern
- **Invalidation**: verify `cache.invalidatePattern` still works through the service

### Old tests to delete

- **`CacheManager.test.ts`**: Keep as-is — it tests the cache engine, which remains.
- **`dataFetching.test.ts`**: Keep the pure fetch function tests (`fetchTokenFromRpc`, `fetchOHLCVPriceAtTimestamp`, `fetchHistoricalSOLPriceFromApi`). Delete or migrate any tests that touched cached wrappers.

### Test environment needs

- Fresh `CacheManager` instance per test (no singleton reset hacks)
- Global `fetch` stubs (already established in `dataFetching.test.ts`)

## Implementation Recommendations

### What the module should own

- Cache key conventions for all data types
- TTL policies per data type
- The fetch → cache → return orchestration
- Batch fetching with error isolation

### What it should hide

- CacheManager class and its singleton lifecycle
- Individual cache key generator functions
- The distinction between "pure fetch" and "cached wrapper"

### What it should expose

- `DataServices` interface with `tokens` and `prices` sub-services
- `createDataServices(cache?)` factory function
- Domain types: `TokenInfo` (re-exported from tokens for convenience)

### How callers should migrate

1. `useBatchTokenData` → replace `fetchTokenPriceData` calls with `services.tokens.getPrices(mints)`. The hook may simplify to a thin wrapper or be inlined.
2. `usePositionFetch` → replace `CacheManager.getInstance().invalidatePattern(...)` with a service method like `services.invalidateWallet(walletAddress)`.
3. Direct imports of `fetchTokenPriceData`, `fetchPoolPriceAtTimestamp`, `fetchHistoricalSOLPrice` → replaced with service method calls.

# Plan 013: Owned DLMM data layer — in-repo API client, widget fast path, drop metcomet

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 78fb920..HEAD -- src/services/positionPipeline.ts src/services/dlmmApi.ts src/widgets/updatePortfolioWidget.tsx src/utils/positions/pnlAggregation.ts src/utils/positions/computePositionViewData.ts src/__tests__/setup.ts src/__tests__/services/positionPipeline.test.ts src/__tests__/utils/pnlAggregation.test.ts src/__tests__/utils/computePositionViewData.test.ts package.json`
> `src/services/dlmmApi.ts` should not exist yet. If any other in-scope file
> changed since this plan was written, compare the "Current state" excerpts
> against the live code before proceeding; on a mismatch, treat it as a STOP
> condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MEDIUM (the Android widget's data source changes; the in-app list path is behavior-preserving)
- **Depends on**: none
- **Supersedes**: plan 006 (same widget fast path, achieved in-repo instead of via a published metcomet release)
- **Category**: architecture + tech-debt
- **Planned at**: commit `78fb920`, 2026-09-03 (baseline verified: `tsgo` 0, `lint:check` 0, `fmt:check` 0, `test` 146/146 in 12 files, clean tree)
- **Issue**: (none)

## Why this matters

The app depends on the `metcomet` npm package (v0.3.5) for exactly **one
runtime function** (`fetchPositionPnL`) and **one type**
(`PositionPnLData`). metcomet is a ~770-line bundle of typed `fetch` wrappers
over Meteora's public DLMM Data API — an API that is now **officially
documented** (`https://docs.meteora.ag/llms.txt`, `api-reference/dlmm/...`,
plus an OpenAPI spec). The app already proved the owned-client pattern:
`src/services/ohlcv.ts` hand-rolls a typed client against the same base URL.

This plan replaces the dependency with an owned transport module and uses the
opportunity to fix the widget's data path, which today runs the **entire
on-chain pipeline** (SDK position scan + per-mint RPC prices + N per-pool PnL
calls + client-side aggregation) to produce 7 summary numbers that the
`/portfolio/open` endpoint already computes server-side in 1–2 paginated
calls — with zero RPC, zero SDK, zero Helius.

Three wins, one vertical slice:

1. **Dependency hygiene** — drop `metcomet`; own the ~200-line client, its
   types (transcribed from the official schema), and its error semantics
   (typed errors instead of silent `null`s).
2. **Widget fast path** — the widget reads server-aggregated totals.
   Headless refreshes get faster and stop failing when RPC is flaky.
3. **One join point going forward** — this is pass 1 of the "owned data
   layer" rethink; the full `src/data/` re-layering (transports / domain /
   queries) is explicitly a follow-up plan (see Maintenance notes).

### Relationship to existing plans

- **006 is SUPERSEDED** by this plan. Its goal (widget reads the
  server-aggregated open-portfolio summary) is delivered here, but via the
  in-repo client rather than metcomet's `fetchOpenPortfolioSummary` (plan
  005's library feature — it stays published in metcomet, now unconsumed by
  this app).
- **007's dependency changes** from 006 to 013. Its mechanics are unchanged:
  it still teaches the headless widget to read the persisted
  `displayCurrency`. It gets *easier* after 013 — the API path returns USD
  and SOL side by side (`balances` / `balancesSol`), so no derived conversion
  is needed for the USD variant.
- **011 (background-sync range snapshots) is unaffected**: the pipeline keeps
  `loadPortfolio` and its shape; only its PnL transport swaps underneath.

## Current state

### metcomet usage, exhaustively (16 references)

Runtime — `src/services/positionPipeline.ts` lines 1–4:

```ts
import type { PositionInfo } from '@meteora-ag/dlmm'
import DLMM from '@meteora-ag/dlmm'
import type { PositionPnLData } from 'metcomet'
import { fetchPositionPnL } from 'metcomet'
```

… and inside `fetchAllPnL` (the only runtime call site):

```ts
          const positions = await this.cache.getOrFetch(
            pnlCacheKey(poolAddress, walletAddress),
            () =>
              fetchPositionPnL({ poolAddress, user: walletAddress, status: 'open' }).then((r) => r?.positions ?? []),
            CACHE_TTL.UPNL_PER_POSITION,
          )
```

Type-only — `src/utils/positions/pnlAggregation.ts` line 1 and
`src/utils/positions/computePositionViewData.ts` line 2:

```ts
import type { PositionPnLData } from 'metcomet'
```

Tests — `src/__tests__/utils/pnlAggregation.test.ts` line 2 and
`src/__tests__/utils/computePositionViewData.test.ts` line 2 (same type-only
import); `src/__tests__/services/positionPipeline.test.ts` line 2 (type-only)
plus its mock at lines 32–35:

```ts
// Mock metcomet
vi.mock('metcomet', () => ({
  fetchPositionPnL: vi.fn(),
}))
```

… and four `await import('metcomet')` sites at lines 190, 250, 413, 470, each
followed by `vi.mocked(fetchPositionPnL).mockResolvedValue({...})` or
`mockRejectedValue(new Error('API error'))`. **No test relies on metcomet's
null-return semantics** (the closest, line 250, mocks a *rejection*, which
the new client preserves).

Global test mock — `src/__tests__/setup.ts` lines 30–33:

```ts
// Mock metcomet
vi.mock('metcomet', () => ({
  fetchPositionPnL: vi.fn(),
}))
```

### Widget data path

`src/widgets/updatePortfolioWidget.tsx` line 6:

```ts
import { createPositionPipeline } from '../services/positionPipeline'
```

… and the function at ~line 341 (the only pipeline usage in the file):

```ts
export async function fetchPortfolioSummary(walletAddress: string): Promise<PortfolioSummary | null> {
  const pipeline = createPositionPipeline()
  const result = await pipeline.fetchPortfolioSummary(walletAddress)

  if (!result) {
    return null
  }

  return {
    totalPnlSol: result.totalPnlSol,
    totalPnlPercent: result.totalPnlPercent,
    totalValueSol: result.totalValueSol,
    totalInitialDepositSol: result.totalInitialDepositSol,
    totalUnclaimedFeesSol: result.totalUnclaimedFeesSol,
    positionCount: result.positionCount,
    outOfRangeCount: result.outOfRangeCount,
    feesTvl24h: result.feesTvl24h ?? null,
  }
}
```

`PortfolioSummary` (same file, lines 53–62) is:

```ts
export interface PortfolioSummary {
  totalPnlSol: number
  totalPnlPercent: number
  totalValueSol: number
  totalInitialDepositSol: number
  totalUnclaimedFeesSol: number
  positionCount: number
  outOfRangeCount: number
  feesTvl24h: number | null
}
```

Both call sites already wrap `fetchPortfolioSummary` in try/catch with an
error-widget fallback — `src/widgets/portfolioWidgetTaskHandler.tsx` (lines
32–38: `catch (e)` → `buildErrorWidget('Failed to load portfolio data')`) and
`src/hooks/useWidgetSync.ts` (lines 38–49: `catch (e)` → error widget). So
the new client may **throw** on failure; callers handle it.

### The API endpoints (officially documented)

Base URL: `https://dlmm.datapi.meteora.ag` (same as `src/services/ohlcv.ts`'s
`METEORA_DLMM_API`).

1. `GET /positions/{poolAddress}/pnl?user=<wallet>&status=open` →
   `PositionPnLResponse` (paginated). Used per-pool by the pipeline.
2. `GET /portfolio/open?user=<wallet>&page=N&page_size=M` →
   `OpenPortfolioResponse` (paginated, `hasNext` flag). Returns per-pool
   aggregates **plus server-computed `total`** (`TotalMetrics`), `solPrice`,
   and `totalCount`. Per pool it carries `totalDepositSol`,
   `positionsOutOfRange[]`, `feePerTvl24h` (API percentage scale: `"1.31"` =
   1.31% daily), `balancesSol`.

Wire shapes below are transcribed verbatim from metcomet 0.3.5's types
(which match the documented schema). `PositionPnLData` is **field-for-field
identical** to metcomet's, so type-only consumers are unchanged semantically.

### Client-side aggregation semantics (for reference, unchanged in-app)

`src/utils/positions/pnlAggregation.ts` `computePoolPnLSummary` computes the
in-app summary from per-position PnL data: deposits−withdrawals net cost
basis, deposit-weighted pnl%, position-value-weighted `feesTvl24h`. The
**in-app** summary keeps using it. Only the **widget** switches to server
totals. The weighting difference is documented in ADR 0002 (Step 6).

### Repo conventions

- Formatting: `oxfmt` — no semicolons, single quotes, 2-space indent,
  trailing commas, 120 col. `bun run fmt` / `fmt:check`.
- Type-check: `tsgo --noEmit` (NEVER `tsc`).
- Lint: `bun run lint:check`. Tests: `bun run test` (Vitest; baseline
  146/146).
- Import groups: react → third-party → relative, alphabetical within group;
  `import type` for type-only imports.

## Commands you will need

| Purpose   | Command                          | Expected on success |
|-----------|----------------------------------|---------------------|
| Format    | `bun run fmt`                    | exit 0              |
| Typecheck | `tsgo --noEmit` (or `npx tsgo --noEmit`) | exit 0, no errors   |
| Tests     | `bun run test`                   | all pass (146 baseline + 9 new = 155; record actual) |
| Lint      | `bun run lint:check`             | exit 0              |
| Remove dep| `bun remove metcomet`            | exit 0, lockfile updated |

## Reconciliation

**2026-09-03 (during execution).** Two deviations, both mechanical:

1. **Step 3's relative specifier was wrong for the source files.** From
   `src/utils/positions/`, the correct import is `'../../services/dlmmApi'`
   (two levels up), not `'../services/dlmmApi'` (which resolves to
   `src/utils/services/` and fails `tsgo` with TS2307). The test-file
   specifiers in the plan were already correct. Step 3's text above is
   corrected inline.
2. **Step 4's setup.ts change is a DELETE, not a swap.** A global
   `vi.mock('../services/dlmmApi', ...)` in setup.ts shadows the real module
   inside `dlmmApi.test.ts` itself (its 9 tests fail with undefined exports).
   The old metcomet global mock existed because metcomet was a heavy
   third-party graph; the owned client is a light leaf module (its only
   import is the pure formatters util), so the global mock is removed and
   consumers mock locally where isolation is needed
   (positionPipeline.test.ts already does). Full suite: 155/155.

Also noted against Done criteria: `grep -rn "metcomet" src/` will show ONE
match after this plan — the provenance comment in `dlmmApi.ts`'s header
(documenting what the file replaced). The criterion's intent — no code
depends on metcomet — is verified by `grep "from 'metcomet'"` / `require`:
zero matches, plus `bun.lock` and `package.json` clean after Step 6.

## Scope

**In scope** (the only files you should modify/create):
- `src/services/dlmmApi.ts` — **create** (full content in Step 1)
- `src/__tests__/services/dlmmApi.test.ts` — **create** (full content in Step 1)
- `src/services/positionPipeline.ts` — swap PnL transport
- `src/utils/positions/pnlAggregation.ts` — type-only import swap
- `src/utils/positions/computePositionViewData.ts` — type-only import swap
- `src/__tests__/utils/pnlAggregation.test.ts` — type-only import swap
- `src/__tests__/utils/computePositionViewData.test.ts` — type-only import swap
- `src/__tests__/services/positionPipeline.test.ts` — mock/module-specifier swap
- `src/__tests__/setup.ts` — global mock swap
- `src/widgets/updatePortfolioWidget.tsx` — widget fast path
- `package.json` + `bun.lock` — via `bun remove metcomet`
- `docs/adr/0002-widget-summary-from-server-totals.md` — **create** (full content in Step 6)
- `plans/README.md` — status row update at completion

**Out of scope** (do NOT touch, even though they look related):
- `src/services/data.ts`, `ohlcv.ts`, `mockPortfolio.ts`, `mockOhlcv.ts` —
  the existing DataServices facade stays exactly as-is in this plan. The full
  re-layering is a follow-up plan.
- `src/tasks/widgetBackgroundSync.ts` — the alert path still uses
  `pipeline.loadPortfolio` (plan 011's territory).
- `src/hooks/useWidgetSync.ts` / `usePositionsPage.ts` — consumers of the
  unchanged exported signatures.
- `src/config/cache.ts`, `CacheManager` — no caching is added to the widget
  summary path (see Maintenance notes).
- `docs/wiki/**` — wiki pages referencing metcomet / pipeline data sources
  get a doc pass later (extends plan 008's territory).
- Any change to PnL *semantics* (ADR 0001) or to `computePoolPnLSummary`.
- Removing the `heliusApiKey` gate in `fetchAllPnL` (behavior-preserving
  pass; see Maintenance notes).

## Git workflow

- Branch: `advisor/013-owned-data-layer` (or as directed by the dispatcher).
- Commit per logical unit (grouping suggested per step); conventional
  commits, lowercase imperative, e.g. `feat: add owned dlmm api client`,
  `refactor: swap metcomet for in-repo dlmm api client`,
  `feat: widget summary from /portfolio/open server totals`,
  `chore: remove metcomet dependency`.
- Do NOT push or open a PR. Do NOT self-merge (see 012's lesson in
  `plans/README.md`).

## Steps

### Step 1: Create the owned API client + its tests

Create `src/services/dlmmApi.ts` with EXACTLY this content:

```ts
// ─── Meteora DLMM Data API client (owned, in-repo) ───────────────────
//
// Thin typed transport over the officially documented DLMM Data API:
//   https://docs.meteora.ag/api-reference/dlmm/pools/pool.md
//   https://docs.meteora.ag/api-reference/dlmm/portfolio/...
//   https://docs.meteora.ag/api-reference/dlmm/positions/...
//
// Replaces the `metcomet` dependency: same endpoints, owned wire types,
// explicit errors (no silent nulls). Wire types are transcribed from the
// documented response schema; money values arrive as strings and are
// converted to numbers only at the rollup layer, never in the transport.

import { parseFeePerTvl24h } from '../utils/positions/formatters'

export const DLMM_API_BASE = 'https://dlmm.datapi.meteora.ag'

// ─── Errors ──────────────────────────────────────────────────────────

/** Raised on network failure or non-OK responses. Callers catch and degrade. */
export class DlmmApiError extends Error {
  readonly status: number | null

  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = 'DlmmApiError'
    this.status = status
  }
}

async function requestJson<T>(url: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
  } catch (cause) {
    throw new DlmmApiError(`DLMM API network error: ${String(cause)}`)
  }
  if (!response.ok) {
    throw new DlmmApiError(`DLMM API ${response.status} for ${url}`, response.status)
  }
  return (await response.json()) as T
}

// ─── Wire types: GET /positions/{pool}/pnl ───────────────────────────

export interface TokenAmount {
  amount: string
  amountSol: string | null
  usd: string
}

export interface TotalUsd {
  usd: string
  sol: string | null
}

export interface TokenPairWithTotal {
  tokenX: TokenAmount
  tokenY: TokenAmount
  total: TotalUsd
}

export interface UnrealizedPnL {
  balances: number
  balancesSol: string | null
  balanceTokenX: TokenAmount
  balanceTokenY: TokenAmount
  unclaimedFeeTokenX: TokenAmount
  unclaimedFeeTokenY: TokenAmount
  unclaimedRewardTokenX: TokenAmount
  unclaimedRewardTokenY: TokenAmount
}

export interface PositionPnLData {
  positionAddress: string
  minPrice: string
  maxPrice: string
  lowerBinId: number
  upperBinId: number
  feePerTvl24h: string
  isClosed: boolean
  pnlUsd: string
  pnlPctChange: string
  pnlSol: number | null
  pnlSolPctChange: number | null
  allTimeDeposits: TokenPairWithTotal
  allTimeWithdrawals: TokenPairWithTotal
  allTimeFees: TokenPairWithTotal
  unrealizedPnl: UnrealizedPnL | null
  isOutOfRange: boolean | null
  poolActiveBinId: number | null
  poolActivePrice: string | null
  createdAt: number | null
  closedAt: number | null
}

export interface PositionPnLResponse {
  positions: PositionPnLData[]
  tokenX: string | null
  tokenY: string | null
  tokenXPrice: string
  tokenYPrice: string
  rewardTokenX: string | null
  rewardTokenY: string | null
  rewardTokenXPrice: string
  rewardTokenYPrice: string
  solPrice: string | null
  totalCount: number
  page: number
  pageSize: number
  hasNext: boolean
}

export interface FetchPositionPnLParams {
  poolAddress: string
  user: string
  status?: 'open' | 'closed' | 'all'
  page?: number
  page_size?: number
}

export async function fetchPositionPnL(params: FetchPositionPnLParams): Promise<PositionPnLResponse> {
  const url = new URL(`${DLMM_API_BASE}/positions/${params.poolAddress}/pnl`)
  url.searchParams.set('user', params.user)
  if (params.status) url.searchParams.set('status', params.status)
  if (params.page) url.searchParams.set('page', String(params.page))
  if (params.page_size) url.searchParams.set('page_size', String(params.page_size))
  return requestJson<PositionPnLResponse>(url.toString())
}

// ─── Wire types: GET /portfolio/open ─────────────────────────────────

export interface TotalMetrics {
  balances: string
  balancesSol: string | null
  unclaimedFees: string
  unclaimedFeesSol: string | null
  pnl: string
  pnlPctChange: string
  pnlSol: string | null
  pnlSolPctChange: string | null
}

export interface PoolOpenPortfolioItem {
  poolAddress: string
  binStep: number
  baseFee: number
  tokenXMint: string
  tokenYMint: string
  tokenXIcon: string
  tokenYIcon: string
  tokenX: string
  tokenY: string
  rewardX: string
  rewardY: string
  balances: string
  balancesSol: string | null
  unclaimedFees: string
  unclaimedFeesSol: string | null
  feePerTvl24h: string
  pnl: string
  pnlPctChange: string
  pnlSol: string | null
  pnlSolPctChange: string | null
  totalDeposit: string
  totalDepositSol: string | null
  openPositionCount: number
  listPositions: string[]
  positionsOutOfRange: string[]
  outOfRange: boolean | null
  poolPrice: number | null
  poolStateUpdatedAtSlot: number | null
  poolStateUpdatedAtBlockTime: number | null
}

export interface OpenPortfolioResponse {
  pools: PoolOpenPortfolioItem[]
  total: TotalMetrics
  solPrice: string | null
  totalCount: number
  page: number
  pageSize: number
  hasNext: boolean
}

export interface FetchOpenPortfolioParams {
  user: string
  page?: number
  page_size?: number
}

export async function fetchOpenPortfolio(params: FetchOpenPortfolioParams): Promise<OpenPortfolioResponse> {
  const url = new URL(`${DLMM_API_BASE}/portfolio/open`)
  url.searchParams.set('user', params.user)
  if (params.page) url.searchParams.set('page', String(params.page))
  if (params.page_size) url.searchParams.set('page_size', String(params.page_size))
  return requestJson<OpenPortfolioResponse>(url.toString())
}

// ─── Aggregated open-portfolio summary (paginated walker) ────────────

export interface OpenPortfolioSummary {
  /** All pools across every page, in server order */
  pools: PoolOpenPortfolioItem[]
  /** Server-aggregated totals (USD + SOL numeraires), string-typed as sent */
  total: TotalMetrics
  /** SOL price the server used for SOL conversions, when available */
  solPrice: number | null
  /** Server-reported total open position count (last page wins; server keeps it global) */
  totalCount: number
  /** Σ pool `totalDepositSol` across pages (gross historical deposits, SOL) */
  totalInitialDepositSol: number
  /** Σ `positionsOutOfRange.length` across pages */
  outOfRangeCount: number
  /** Pool-value-weighted 24h fees/TVL, daily ratio (0.0131 = 1.31%); null when no weight */
  feesTvl24h: number | null
}

const SUMMARY_PAGE_SIZE = 50
const MAX_SUMMARY_PAGES = 10

/**
 * Walk every page of /portfolio/open and roll up the three fields the
 * server doesn't aggregate (gross deposits, out-of-range count, weighted
 * fees/TVL). One call replaces the widget's full on-chain pipeline.
 * Throws DlmmApiError on transport failure.
 */
export async function fetchOpenPortfolioSummary(params: FetchOpenPortfolioParams): Promise<OpenPortfolioSummary> {
  const page_size = params.page_size ?? SUMMARY_PAGE_SIZE

  let pools: PoolOpenPortfolioItem[] = []
  let total: TotalMetrics | null = null
  let solPrice: number | null = null
  let totalCount = 0
  let page = params.page ?? 1

  for (let fetched = 0; fetched < MAX_SUMMARY_PAGES; fetched++) {
    const response = await fetchOpenPortfolio({ ...params, page, page_size })
    pools = pools.concat(response.pools ?? [])
    total = response.total
    solPrice = response.solPrice != null ? Number(response.solPrice) : null
    totalCount = response.totalCount
    if (!response.hasNext) break
    page += 1
  }

  if (!total) {
    throw new DlmmApiError('DLMM API /portfolio/open returned no data')
  }

  let totalInitialDepositSol = 0
  let outOfRangeCount = 0
  let weightedFeeSum = 0
  let feeWeightSum = 0

  for (const pool of pools) {
    if (pool.totalDepositSol) totalInitialDepositSol += parseFloat(pool.totalDepositSol)
    outOfRangeCount += pool.positionsOutOfRange?.length ?? 0

    const ratio = parseFeePerTvl24h(pool.feePerTvl24h)
    const weight = pool.balancesSol ? parseFloat(pool.balancesSol) : 0
    if (ratio != null && weight > 0) {
      weightedFeeSum += ratio * weight
      feeWeightSum += weight
    }
  }

  return {
    pools,
    total,
    solPrice,
    totalCount,
    totalInitialDepositSol,
    outOfRangeCount,
    feesTvl24h: feeWeightSum > 0 ? weightedFeeSum / feeWeightSum : null,
  }
}
```

Create `src/__tests__/services/dlmmApi.test.ts` with EXACTLY this content:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DLMM_API_BASE,
  DlmmApiError,
  fetchOpenPortfolio,
  fetchOpenPortfolioSummary,
  fetchPositionPnL,
  type PoolOpenPortfolioItem,
} from '../../services/dlmmApi'

// ─── fetch stub ──────────────────────────────────────────────────────

const fetchMock = vi.fn()

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(body) }
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ─── Fixtures ────────────────────────────────────────────────────────

function poolItem(overrides: Partial<PoolOpenPortfolioItem>): PoolOpenPortfolioItem {
  return {
    poolAddress: 'POOL',
    binStep: 10,
    baseFee: 0.0025,
    tokenXMint: 'SOL_MINT',
    tokenYMint: 'USDC_MINT',
    tokenXIcon: '',
    tokenYIcon: '',
    tokenX: 'SOL',
    tokenY: 'USDC',
    rewardX: '',
    rewardY: '',
    balances: '30',
    balancesSol: '0.2',
    unclaimedFees: '0',
    unclaimedFeesSol: '0',
    feePerTvl24h: '0',
    pnl: '0',
    pnlPctChange: '0',
    pnlSol: '0',
    pnlSolPctChange: '0',
    totalDeposit: '100',
    totalDepositSol: '0.5',
    openPositionCount: 1,
    listPositions: ['pos0'],
    positionsOutOfRange: [],
    outOfRange: false,
    poolPrice: 150,
    poolStateUpdatedAtSlot: 1,
    poolStateUpdatedAtBlockTime: 1,
    ...overrides,
  }
}

function openPage(pools: PoolOpenPortfolioItem[], opts?: { hasNext?: boolean; page?: number }) {
  return jsonResponse({
    pools,
    total: {
      balances: '30',
      balancesSol: '0.2',
      unclaimedFees: '1',
      unclaimedFeesSol: '0.0066',
      pnl: '5',
      pnlPctChange: '20',
      pnlSol: '0.0333',
      pnlSolPctChange: '20',
    },
    solPrice: '150',
    totalCount: pools.length,
    page: opts?.page ?? 1,
    pageSize: 50,
    hasNext: opts?.hasNext ?? false,
  })
}

// ─── fetchPositionPnL ────────────────────────────────────────────────

describe('fetchPositionPnL', () => {
  it('builds the documented URL with query params', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ positions: [], hasNext: false }))
    await fetchPositionPnL({ poolAddress: 'POOL', user: 'WALLET', status: 'open' })
    expect(fetchMock.mock.calls[0][0]).toBe(`${DLMM_API_BASE}/positions/POOL/pnl?user=WALLET&status=open`)
  })

  it('throws DlmmApiError with status on non-OK responses', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 500))
    const err = await fetchPositionPnL({ poolAddress: 'POOL', user: 'WALLET' }).catch((e) => e)
    expect(err).toBeInstanceOf(DlmmApiError)
    expect(err.status).toBe(500)
  })

  it('throws DlmmApiError with null status on network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'))
    const err = await fetchPositionPnL({ poolAddress: 'POOL', user: 'WALLET' }).catch((e) => e)
    expect(err).toBeInstanceOf(DlmmApiError)
    expect(err.status).toBeNull()
  })
})

// ─── fetchOpenPortfolio ──────────────────────────────────────────────

describe('fetchOpenPortfolio', () => {
  it('builds the documented URL with page params', async () => {
    fetchMock.mockResolvedValue(openPage([]))
    await fetchOpenPortfolio({ user: 'WALLET', page: 2, page_size: 50 })
    expect(fetchMock.mock.calls[0][0]).toBe(`${DLMM_API_BASE}/portfolio/open?user=WALLET&page=2&page_size=50`)
  })
})

// ─── fetchOpenPortfolioSummary ───────────────────────────────────────

describe('fetchOpenPortfolioSummary', () => {
  it('returns a single page with server totals surfaced', async () => {
    fetchMock.mockResolvedValue(openPage([poolItem({ poolAddress: 'A' })]))
    const summary = await fetchOpenPortfolioSummary({ user: 'WALLET' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(summary.totalCount).toBe(1)
    expect(summary.total.pnlSol).toBe('0.0333') // strings pass through untouched
    expect(summary.solPrice).toBe(150) // numbers are converted
  })

  it('walks pagination until hasNext is false', async () => {
    fetchMock
      .mockResolvedValueOnce(openPage([poolItem({ poolAddress: 'A' })], { hasNext: true, page: 1 }))
      .mockResolvedValueOnce(openPage([poolItem({ poolAddress: 'B' })], { hasNext: false, page: 2 }))

    const summary = await fetchOpenPortfolioSummary({ user: 'WALLET' })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toContain('page=2&page_size=50')
    expect(summary.pools.map((p) => p.poolAddress)).toEqual(['A', 'B'])
    expect(summary.totalCount).toBe(1) // last page's server-global count
  })

  it('rolls up deposits, out-of-range count, and pool-value-weighted fees/TVL', async () => {
    fetchMock.mockResolvedValue(
      openPage([
        poolItem({
          poolAddress: 'A',
          totalDepositSol: '1.5',
          positionsOutOfRange: ['pos1'],
          feePerTvl24h: '1.00', // → 0.01 ratio
          balancesSol: '0.2',
        }),
        poolItem({
          poolAddress: 'B',
          totalDepositSol: '2.25',
          positionsOutOfRange: ['pos2', 'pos3'],
          feePerTvl24h: '2.00', // → 0.02 ratio
          balancesSol: '0.6',
        }),
      ]),
    )
    const summary = await fetchOpenPortfolioSummary({ user: 'WALLET' })

    expect(summary.totalInitialDepositSol).toBe(3.75)
    expect(summary.outOfRangeCount).toBe(3)
    // (0.01×0.2 + 0.02×0.6) / 0.8
    expect(summary.feesTvl24h).toBeCloseTo(0.0175, 10)
  })

  it('maps an empty portfolio to zeroed rollups and null fees/TVL', async () => {
    fetchMock.mockResolvedValue(openPage([]))
    const summary = await fetchOpenPortfolioSummary({ user: 'WALLET' })

    expect(summary.totalCount).toBe(0)
    expect(summary.pools).toEqual([])
    expect(summary.totalInitialDepositSol).toBe(0)
    expect(summary.outOfRangeCount).toBe(0)
    expect(summary.feesTvl24h).toBeNull()
  })

  it('throws DlmmApiError when a page request fails', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 503))
    const err = await fetchOpenPortfolioSummary({ user: 'WALLET' }).catch((e) => e)
    expect(err).toBeInstanceOf(DlmmApiError)
    expect(err.status).toBe(503)
  })
})
```

**Verify**:
- `tsgo --noEmit` → exit 0 (new file is unused so far — unused exports are
  fine; if lint flags the unused import of `parseFeePerTvl24h` it will not,
  since it is used inside `fetchOpenPortfolioSummary`).
- `bun run test` → 146 + 9 new all pass (155 total).
- `bun run fmt` then `bun run fmt:check` → exit 0.

### Step 2: Swap the pipeline's PnL transport

In `src/services/positionPipeline.ts`, replace lines 3–4:

```ts
import type { PositionPnLData } from 'metcomet'
import { fetchPositionPnL } from 'metcomet'
```

with:

```ts
import type { PositionPnLData } from './dlmmApi'
import { fetchPositionPnL } from './dlmmApi'
```

…and in `fetchAllPnL`, change the one call site from
`.then((r) => r?.positions ?? [])` to `.then((r) => r.positions ?? [])`
(the client now throws instead of returning `null`; the surrounding
try/catch preserves the per-pool best-effort behavior exactly).

Do NOT change: the `heliusApiKey` gate, the cache key
(`pnl:${pool}:${wallet}`), `CACHE_TTL.UPNL_PER_POSITION`, or anything else.

**Verify**:
- `grep -n "metcomet" src/services/positionPipeline.ts` → no matches.
- `grep -n "dlmmApi" src/services/positionPipeline.ts` → 2 matches (both imports).
- `tsgo --noEmit` → exit 0.

### Step 3: Swap the type-only imports

In these four files, change `from 'metcomet'` → `from '../../services/dlmmApi'`
(source files use `'../services/dlmmApi'`):

- `src/utils/positions/pnlAggregation.ts` line 1 → `from '../../services/dlmmApi'`
- `src/utils/positions/computePositionViewData.ts` line 2 → `from '../../services/dlmmApi'`
- `src/__tests__/utils/pnlAggregation.test.ts` line 2
- `src/__tests__/utils/computePositionViewData.test.ts` line 2

**Verify**:
- `grep -rn "metcomet" src/utils/ src/__tests__/utils/` → no matches.
- `tsgo --noEmit` → exit 0.
- `bun run test` → all pass.

### Step 4: Swap the test mocks

1. `src/__tests__/services/positionPipeline.test.ts`:
   - Line 2: `import type { PositionPnLData } from 'metcomet'` → `from '../../services/dlmmApi'`
   - Lines 32–35: `vi.mock('metcomet', () => ({...}))` → `vi.mock('../../services/dlmmApi', () => ({ fetchPositionPnL: vi.fn() }))` (update the `// Mock metcomet` comment to `// Mock the DLMM API client`)
   - Lines 190, 250, 413, 470: `await import('metcomet')` → `await import('../../services/dlmmApi')` — nothing else at these sites changes (verified: they use `mockResolvedValue` with full response objects and `mockRejectedValue`; none rely on metcomet's null-return semantics).
2. `src/__tests__/setup.ts` lines 30–33: DELETE the `vi.mock('metcomet', ...)`
   block entirely (see Reconciliation — a global dlmmApi mock would shadow
   the real module inside `dlmmApi.test.ts`; the owned client is a light leaf
   module, consumers mock locally). Leave a short NOTE comment where the
   block was, per the reconciliation text.

**Verify**:
- `grep -rn "metcomet" src/` → **no matches**.
- `tsgo --noEmit` → exit 0.
- `bun run test` → 146/146 pass (no behavior change — this is the invariant
  of Steps 2–4).

**Suggested commit**: Steps 2–4 together (`refactor: swap metcomet for the in-repo dlmm api client`) — the tree is green between commits.

### Step 5: Widget fast path

In `src/widgets/updatePortfolioWidget.tsx`:

1. Replace the import on line 6:

```ts
import { createPositionPipeline } from '../services/positionPipeline'
```

with:

```ts
import { fetchOpenPortfolioSummary } from '../services/dlmmApi'
```

2. Replace the `fetchPortfolioSummary` function (exact current text in
   "Current state") with:

```ts
export async function fetchPortfolioSummary(walletAddress: string): Promise<PortfolioSummary | null> {
  const summary = await fetchOpenPortfolioSummary({ user: walletAddress })

  if (summary.totalCount === 0) {
    return null
  }

  return {
    totalPnlSol: summary.total.pnlSol != null ? Number(summary.total.pnlSol) : 0,
    totalPnlPercent: summary.total.pnlPctChange != null ? Number(summary.total.pnlPctChange) : 0,
    totalValueSol: summary.total.balancesSol != null ? Number(summary.total.balancesSol) : 0,
    totalInitialDepositSol: summary.totalInitialDepositSol,
    totalUnclaimedFeesSol: summary.total.unclaimedFeesSol != null ? Number(summary.total.unclaimedFeesSol) : 0,
    positionCount: summary.totalCount,
    outOfRangeCount: summary.outOfRangeCount,
    feesTvl24h: summary.feesTvl24h,
  }
}
```

The `PortfolioSummary` interface, `buildWidgetTree`, the error paths in
`portfolioWidgetTaskHandler.tsx` / `useWidgetSync.ts`, and the last-rendered
cache are all unchanged. Failures now surface as `DlmmApiError` → existing
catch blocks → existing error widget.

Semantics notes for the reviewer:
- `positionCount` becomes the server's `totalCount` (was: count of resolved
  SDK positions — same population, both = open positions).
- `totalValueSol` / `totalUnclaimedFeesSol` become the server's SOL totals
  (were: client-aggregated from per-position data). Both derive from the
  same per-event server data; small rounding differences vs. the in-app
  summary are expected and accepted (ADR 0002).
- `feesTvl24h` weighting changes from position-value-weighted to
  pool-value-weighted (the API exposes balances per pool, not per position,
  on this endpoint). Documented in ADR 0002.
- `totalInitialDepositSol` becomes the server's Σ gross `totalDepositSol`.
  The in-app summary uses a net cost basis (deposits − withdrawals), so the
  widget may read higher for wallets with withdrawals. This matches plan
  005's design; recorded in ADR 0002.

**Verify**:
- `grep -n "createPositionPipeline" src/widgets/updatePortfolioWidget.tsx` → no matches.
- `grep -n "fetchOpenPortfolioSummary" src/widgets/updatePortfolioWidget.tsx` → 2 matches (import + call).
- `tsgo --noEmit` → exit 0. `bun run lint:check` → exit 0. `bun run test` → all pass.

**Suggested commit**: `feat: widget summary from /portfolio/open server totals`.

### Step 6: ADR + remove metcomet

1. Create `docs/adr/0002-widget-summary-from-server-totals.md` with EXACTLY
   this content:

```markdown
# Widget summary numeration comes from server totals

The Android widget's portfolio summary (and any future consumer that needs
only aggregates) reads the server-aggregated `total` from the DLMM Data API
`/portfolio/open` endpoint via the in-repo client
(`src/services/dlmmApi.ts`), not from the on-chain pipeline and not from
client-side aggregation. The **in-app** portfolio summary keeps its
client-side aggregation (`computePoolPnLSummary`) because it already needs
per-position data for the cards.

This capability exists because the widget previously ran the entire pipeline
(SDK scan + per-mint RPC prices + N per-pool PnL calls) in a headless task to
produce 7 numbers the server already computes. It was first built as a
metcomet library feature (plan 005) and is now owned in-repo (plan 013);
plan 006 was superseded before landing.

## Considered Options

- **Full pipeline in the widget (previous)** — rejected: slow headless
  refreshes, RPC-dependent, N+M HTTP/RPC calls for 7 numbers.
- **metcomet helper (plan 005/006)** — superseded: a cross-repo release
  cycle for one call, for an API that is now officially documented.
- **Server totals for widget, client aggregation in-app (chosen).**
- **Server totals everywhere** — rejected for now: the in-app summary shares
  its fetch with the position cards; switching it saves no calls (same
  conclusion as the Pass 2 note on plan 006).

## Consequences

- Two summary numeration paths exist **deliberately**: in-app =
  position-value-weighted, net cost basis (deposits − withdrawals);
  widget = server totals + cross-page rollups (pool-value-weighted
  fees/TVL, gross deposits). The two may differ slightly for wallets with
  withdrawals or heterogeneous pools; both derive from the same per-event
  server data, and PnL semantics are unchanged (ADR 0001).
- The widget data path has **no RPC, SDK, or Helius dependency** — it works
  whenever the DLMM Data API is reachable.
- The owned client replaces `metcomet` for this app; its error semantics
  (typed `DlmmApiError`, no silent nulls) are the app's own contract.
```

2. Run `bun remove metcomet`.

**Verify**:
- `test -f docs/adr/0002-widget-summary-from-server-totals.md` → succeeds.
- `grep -rn "metcomet" src/ package.json bun.lock` → **no matches**.
- `tsgo --noEmit` → exit 0. `bun run lint:check` → exit 0. `bun run fmt:check` → exit 0. `bun run test` → all pass.
- `bun run build` → exit 0 (dependency change — the full build IS required this time).

**Suggested commit**: `chore: remove metcomet, add server-totals ADR`.

### Step 7: Update the plans index

In `plans/README.md`:
1. Flip the 013 status row to DONE with the actual gate results.
2. (Already done by the plan author at write time: 006 marked SUPERSEDED,
   007's dependency re-pointed, 013 row added. If those edits are missing,
   add them — see the "013" section under Dependency notes.)

## Test plan

- **New**: `src/__tests__/services/dlmmApi.test.ts` (9 tests: URL
  construction, typed errors on non-OK + network failure, pagination
  walking, rollup math incl. weighting, empty-portfolio mapping).
- **Invariant**: the existing 146 tests pass **unchanged** through Steps
  2–4 — the pipeline's observable behavior is identical (same endpoint, same
  cache keys, same best-effort semantics; only the module providing the
  transport changes).
- **Not covered by tests** (accepted, type-checked only): the 10-line widget
  mapping in Step 5. Writing widget tests would require mocking
  `react-native-android-widget` + `createMMKV`; the risky rollup logic lives
  in `dlmmApi.ts` and is fully tested there.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -rn "metcomet" src/ package.json bun.lock` returns no matches
- [ ] `test -f src/services/dlmmApi.ts` and `test -f src/__tests__/services/dlmmApi.test.ts` succeed
- [ ] `grep -n "createPositionPipeline" src/widgets/updatePortfolioWidget.tsx` returns no matches
- [ ] `grep -n "fetchOpenPortfolioSummary" src/widgets/updatePortfolioWidget.tsx` returns 2 matches
- [ ] `grep -n "from './dlmmApi'" src/services/positionPipeline.ts` returns 2 matches
- [ ] `test -f docs/adr/0002-widget-summary-from-server-totals.md` succeeds
- [ ] `tsgo --noEmit` exits 0
- [ ] `bun run lint:check` exits 0
- [ ] `bun run fmt:check` exits 0
- [ ] `bun run test` exits 0 (146 baseline + 9 new = 155; record the actual count)
- [ ] `bun run build` exits 0
- [ ] No files outside the in-scope list are modified (`git status` / `git diff --stat`)
- [ ] `plans/README.md` status row updated (unless reviewer maintains the index)

## STOP conditions

Stop and report back (do not improvise) if:

- The drift check shows any in-scope file changed since `78fb920` and the
  "Current state" excerpts no longer match live code.
- `bun remove metcomet` fails or leaves `metcomet` in `bun.lock`.
- After Step 4, any of the 146 baseline tests fails — the swap is supposed
  to be behavior-identical; a failure means a hidden metcomet dependency.
- The widget file's `fetchPortfolioSummary` does not match the "Current
  state" excerpt (e.g. the interface or call sites changed).
- `bun run build` fails for a reason not clearly attributable to the
  metcomet removal (import graph, Metro resolution).
- You find a **runtime** (non-type) metcomet usage this plan's recon missed —
  report it; do not silently extend scope.

## Maintenance notes

- **The `heliusApiKey` gate in `fetchAllPnL` is kept** (no key → no PnL
  fetch → `hasPnLData: false`) even though the API client needs no key. It
  now acts purely as a user-facing feature flag. Dropping it would give
  keyless users PnL for free — a product decision for a separate plan.
- **No caching on the widget summary path.** Widget refreshes are
  user/background-triggered and infrequent; the pipeline path keeps its
  15-min PnL cache. Revisit when the `queries/` layer (below) lands.
- **This is pass 1 of the owned-data-layer rethink.** Follow-up candidates,
  in rough priority: (a) re-layer the main list path into
  `src/data/{api,chain,domain,queries}` with the dependency rule
  `queries → domain ← transports` (the join itself is unchanged semantics);
  (b) `/positions/{addr}/history` claims/deposits timeline feature
  (API-only); (c) plan 011's lightweight range snapshots — now could use
  `/portfolio/open`'s `positionsOutOfRange` instead of any pipeline call.
- **Docs debt created**: wiki pages that mention metcomet or the widget's
  pipeline data source (e.g. `Connection Lifecycle`, `Testing.md`) are now
  stale. Fold into plan 008's doc pass or a small follow-up.
- **metcomet 0.4.0** (`fetchOpenPortfolioSummary`, plan 005) remains
  published but unconsumed by this app. If no other consumer emerges,
  consider deprecating the library.

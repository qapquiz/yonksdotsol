# Plan 009: Add a non-interactive price-movement chart with the position's min/max range band

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 7496775..HEAD -- src/components/positions/PositionCard.tsx src/components/positions/LiquidityBarChart.tsx src/app/positions/index.tsx src/utils/positions/computePositionViewData.ts src/config/cache.ts src/utils/cache/CacheManager.ts src/services/data.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2 (feature)
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction (feature)
- **Planned at**: commit `7496775`, 2026-06-22

## Why this matters

Today each position card shows a **liquidity shape** (how the LP's liquidity is
distributed across bins) but nothing about **where the market price has been
moving relative to the position's range**. An LP's most decision-relevant
question — "is the price drifting toward the edge of my range, about to push me
out of range?" — is invisible. The data to answer it already exists:

- The position's **min/max price range** is already computed as
  `vm.liquidityShape.binDistribution[0].price` / `[last].price` (the liquidity
  chart already uses these for its axis labels).
- The market's **recent price history** is a free public endpoint:
  `GET https://dlmm.datapi.meteora.ag/pools/{pairAddress}/ohlcv?timeframe=24h`
  returns ~10 daily OHLCV candles in the **same token-unit price convention** as
  `bin.pricePerToken` (verified during recon — see "Price convention" below).

This plan overlays the two: a price line over the last ~10 days, with a shaded
band marking the position's `[min, max]` range. It is **non-interactive** (no
tooltip/pan/zoom) — a static, glanceable read. It lands as a new sibling
sub-component inside `PositionCard`, directly below the existing
`LiquidityBarChart`, matching the established in-card chart pattern.

## Current state

All excerpts are from commit `7496775`. Confirm each before editing.

**`PositionCard` composes the card and already renders `LiquidityBarChart`.**
`src/components/positions/PositionCard.tsx` (full current file):

```tsx
import { memo } from 'react'
import { View } from 'react-native'
import type { TokenInfo } from '../../tokens'
import type { PositionViewModel } from '../../utils/positions/computePositionViewData'
import { LiquidityBarChart } from './LiquidityBarChart'
import PositionCardSkeleton from './PositionCardSkeleton'
import { PositionFooter } from './PositionFooter'
import { PositionHeader } from './PositionHeader'

interface PositionCardProps {
  vm: PositionViewModel
  tokenXInfo: TokenInfo | null
  tokenYInfo: TokenYInfo | null
  /** Live SOL→USD price; forwarded to PositionHeader for the uPnL line */
  solUsdPrice: number | null
}

function PositionCardComponent({ vm, tokenXInfo, tokenYInfo, solUsdPrice }: PositionCardProps) {
  if (!tokenXInfo && !tokenYInfo) {
    return <PositionCardSkeleton />
  }

  return (
    <View className="bg-app-surface rounded-3xl p-5 mb-4 border border-app-border">
      <PositionHeader ... />
      <LiquidityBarChart liquidityShape={vm.liquidityShape} currentPrice={vm.currentPrice} />
      <PositionFooter ... />
    </View>
  )
}

export default memo(PositionCardComponent)
```

**The list renderer passes `vm`, token info, and `solUsdPrice` — but NOT
`poolAddress`.** `src/app/positions/index.tsx` `renderItem`:

```tsx
const renderItem = useCallback(
  ({ item }: { item: (typeof listData)[number] }) => {
    const r = item.resolved
    return <PositionCard vm={r.vm} tokenXInfo={r.tokenXInfo} tokenYInfo={r.tokenYInfo} solUsdPrice={solUsdPrice} />
  },
  [solUsdPrice],
)
```

`r` is a `ResolvedPosition`, which **does** carry `poolAddress`
(`src/services/positionPipeline.ts`, `ResolvedPosition.poolAddress: string`).
So the only plumbing change is forwarding it.

**The exemplar chart — `LiquidityBarChart` — hand-rolls SVG with
`react-native-svg`.** `src/components/positions/LiquidityBarChart.tsx` is the
exact pattern to copy for the new component:

- `import { Line, Rect, Svg } from 'react-native-svg'`
- `const [containerWidth, setContainerWidth] = useState(0)` + an `onLayout`
  handler to measure width, then compute bar geometry in a `useMemo`.
- `CHART_HEIGHT = 120`, `CHART_PADDING`, a `BAR_GAP_RATIO`.
- Hardcoded palette hex values (NOT Uniwind tokens): `BAR_COLOR_ACTIVE = '#22d3ee'`
  (cyan-400, the in-range/active color), `BAR_COLOR_BELOW = '#10b981'`,
  `BAR_COLOR_DEFAULT = '#3f3f46'`, `GRID_LINE_COLOR = 'rgba(63,63,70,0.3)'`.
- A container `View` styled `className="bg-app-bg/50 rounded-xl p-4 mb-6 border border-app-border/50"`,
  a header row (muted `tracking-widest` label + a price chip), the `<Svg>`,
  a min/max axis-label row, and a legend row.
- An empty-state branch when `chartData.length === 0`.
- Wrapped in `memo()`.

**The position's min/max prices are already on the view model.**
`src/utils/positions/computePositionViewData.ts` defines:

```ts
export interface ChartBinData {
  binId: number
  positionXAmountInSOL: number
  positionYAmountInSOL: number
  price: number // = Number(bin.pricePerToken) — token X per token Y, in token units
}
export interface LiquidityShape {
  positionAddress: string
  pairAddress: string
  binRange: { minBinId: number; maxBinId: number; totalBins: number }
  binDistribution: ChartBinData[] // ascending by binId → ascending by price
  tokenTotals: { tokenX: number; tokenY: number }
  currentActiveId: number
}
```

`generateLiquidityChartData` iterates `lowerBinId..upperBinId` ascending, and
bin price is monotonic in binId, so **`binDistribution` is sorted by price
ascending**. Therefore the position's range is exactly:

```ts
const priceMin = liquidityShape.binDistribution[0]?.price   // lower edge
const priceMax = liquidityShape.binDistribution[binDistribution.length - 1]?.price // upper edge
```

`LiquidityBarChart` already reads exactly `[0]` and `[last]` for its own min/max
axis labels (`minPrice`/`maxPrice` `useMemo`s) — reuse the same reads.

**Caching is `CacheManager.getOrFetch(key, fn, ttl)` with in-flight dedup.**
`src/utils/cache/CacheManager.ts`. TTLs live in `src/config/cache.ts`:

```ts
export const CACHE_TTL = {
  UPNL_PER_POSITION: 15 * 60 * 1000,
  TOKEN_DATA: 60 * 1000, // 1 minute
}
```

Add a `PRICE_HISTORY` entry here. Because the key includes the pool address,
multiple positions in the same pool share one fetch (dedup + cache).

**Data hooks follow `usePositionsPage`.** `src/hooks/usePositionsPage.ts` shows
the house pattern: `useEffect` keyed on the inputs, set loading → call the
service → set state, track `walletReady`/mounted concerns. Per `AGENTS.md` hook
rules: "Always include cleanup in `useEffect` for async operations; track
mounted state to avoid state updates after unmount."

## Price convention (read carefully — this is the #1 correctness risk)

There are **two different price conventions** in this codebase. Do not mix them:

1. **Token-unit price** = `bin.pricePerToken` = `ChartBinData.price` = the
   Meteora REST `current_price` = the OHLCV `close`. This is "token X per token
   Y" in token units (e.g. for a SOL/USDC pool, ≈ the SOL price in USDC terms,
   because USDC≈$1). **The chart axis and the range band use ONLY this.**
2. **USD price** = `vm.currentPrice` (the `"$X.XX"` string), computed in
   `computePositionViewData.ts` as
   `tokenXInfo.price_info.price_per_token / tokenYInfo.price_info.price_per_token`.
   **Do NOT plot this on the chart** — it is a different number and would put the
   line off the band's scale.

Recon verified convention 1 aligns across sources: for pool
`ARwi1S4DaiTG5DX7S4M4ZsrXqpMD1MrTmbu9ue2tpmEq` (USDC/USDT), `/pools/{addr}`
`current_price` = `1.0008` and the OHLCV `close` ≈ `1.0009` (same axis), both =
`tokenX.price / tokenY.price`.

## OHLCV endpoint contract (verified during recon)

```
GET https://dlmm.datapi.meteora.ag/pools/{pairAddress}/ohlcv?timeframe=24h
```

- **Only `timeframe` is honored.** `type=`, `limit=` are ignored. Returns a
  **fixed 10 most-recent candles** (there is no way to get more or a custom
  window from this endpoint).
- Valid `timeframe` values observed: `1h` (10 hourly candles ≈ last ~10h), `4h`
  (≈ last ~1.7 days), `24h` (10 daily candles ≈ last ~10 days). **`15m` and `1d`
  are INVALID** → HTTP 400 / empty body. Use `24h` (the default).
- Response shape:

```json
{
  "start_time": 1781308800,
  "end_time": 1782086400,
  "timeframe": "24h",
  "data": [
    { "timestamp": 1781308800, "timestamp_str": "2026-06-13T00:00:00+00:00",
      "open": 1.0003, "high": 1.0004, "low": 1.0002, "close": 1.0002, "volume": 44062.41 }
  ]
}
```

- Public endpoint, **no API key, no auth**. Rate limit 30 req/s (plenty; we make
  one call per distinct pool, cached 5 min).
- **Before coding Step 1**, re-verify the contract is unchanged: run the `curl`
  in Step 1's Verify. If the shape differs, STOP and report.

## Conventions to honor

- **Formatting**: no semicolons, single quotes, 2-space, trailing commas — run
  `bun run fmt` (oxfmt). Do NOT use `tsc`; type-check with `tsgo --noEmit`.
- **Components**: functional + `memo()`, props `interface` above the component,
  Uniwind `className` for layout. For raw chart drawing use `react-native-svg`
  primitives exactly as `LiquidityBarChart` does — **do not** introduce
  `react-native-svg-charts` or `d3-shape` (both are phantom type-decls in
  `src/types/charts.d.ts`; `d3-shape` is not even a dependency — see
  `package.json`). Hand-roll straight-segment polylines.
- **Palette**: match `LiquidityBarChart`'s hardcoded-hex style. Reuse cyan
  `#22d3ee` for the range band (it is the existing in-range/active color), and a
  neutral light tone (e.g. `#e4e4e7` zinc-200, or `#fafafa`) for the price line
  so it reads against the band.
- **Services/hooks**: mirror `src/services/solPrice.ts` (small pure fetch +
  `console.error` + return null on failure) and `src/hooks/usePositionsPage.ts`
  (effect-driven fetch with mounted-safety).
- **Caching**: `CacheManager.getInstance().getOrFetch(key, fn, ttl)`.
- **Naming** (from `AGENTS.md` / `UBIQUITOUS_LANGUAGE.md`): call it a **Pool**
  in UI text; the on-chain key is **pair address** (the variable `poolAddress`
  on `ResolvedPosition` already carries it).

## Commands you will need

| Purpose    | Command                                   | Expected on success |
|------------|-------------------------------------------|---------------------|
| Typecheck  | `tsgo --noEmit`                           | exit 0, no errors   |
| Lint fix   | `bun run lint`                            | exit 0              |
| Lint check | `bun run lint:check`                      | exit 0              |
| Format     | `bun run fmt`                             | exit 0              |
| Fmt check  | `bun run fmt:check`                       | exit 0              |
| Tests      | `bun run test`                            | all pass            |
| One test   | `bun run test -- priceHistory` / `priceChart` | matches pass    |
| Build      | `bun run build`                           | exit 0              |

(All verified against `AGENTS.md`. Do **not** use `tsc`.)

## Scope

**In scope** (the only files you should modify or create):
- `src/services/priceHistory.ts` (create) — pure OHLCV fetch + types
- `src/hooks/usePriceHistory.ts` (create) — `usePriceHistory(poolAddress, timeframe)`
- `src/utils/positions/priceChart.ts` (create) — pure domain/scaling util
- `src/components/positions/PriceMovementChart.tsx` (create) — the chart component
- `src/components/positions/PositionCard.tsx` (edit) — render the chart, accept `poolAddress`
- `src/app/positions/index.tsx` (edit) — forward `poolAddress` to `PositionCard`
- `src/config/cache.ts` (edit) — add `PRICE_HISTORY` TTL
- `src/__tests__/services/priceHistory.test.ts` (create)
- `src/__tests__/utils/priceChart.test.ts` (create)

**Out of scope** (do NOT touch, even though they look related):
- `src/components/positions/LiquidityBarChart.tsx` — the sibling chart; leave it.
- `src/utils/positions/computePositionViewData.ts` — the range prices already
  exist on `liquidityShape`; no view-model change is needed.
- Any **position detail screen / routing** — a separate, larger effort (the
  `plans/README.md` "rejected" section notes a tap-through detail screen was
  deferred). This plan deliberately renders the chart in-card.
- `d3-shape` / `react-native-svg-charts` — do not add dependencies; hand-roll SVG.
- `metcomet`, the widget, `solPrice.ts`, the SOL/USD toggle (Plan 003). The price
  axis is token-unit only; the USD toggle does not apply to it.
- `src/types/charts.d.ts` — leave the phantom type-decls alone.

## Git workflow

- Branch: `advisor/009-position-price-chart`
- Commit per logical unit (suggested: 1. service+util+tests; 2. hook; 3. component;
  4. wire into PositionCard + list). Match existing message style — see
  `git log --oneline -15` (short imperative summaries).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Verify the OHLCV contract, then add the service + TTL

First re-confirm the endpoint shape hasn't drifted (this is a STOP gate):

```sh
curl -sS "https://dlmm.datapi.meteora.ag/pools/ARwi1S4DaiTG5DX7S4M4ZsrXqpMD1MrTmbu9ue2tpmEq/ohlcv?timeframe=24h" \
  | head -c 400
```

Expected: JSON with `timeframe:"24h"` and a `data:[{timestamp,open,high,low,close,volume}, ...]`
array of ~10 entries. If the shape differs, STOP and report.

Then create `src/services/priceHistory.ts`:

```ts
import { CACHE_TTL } from '../config/cache'
import { CacheManager } from '../utils/cache/CacheManager'

const METEORA_DLMM_API = 'https://dlmm.datapi.meteora.ag'

export interface OhlcvCandle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface OhlcvResponse {
  start_time: number
  end_time: number
  timeframe: string
  data: OhlcvCandle[]
}

function ohlcvCacheKey(poolAddress: string, timeframe: string): string {
  return `ohlcv:${poolAddress}:${timeframe}`
}

/**
 * Pure fetch — calls the public Meteora DLMM OHLCV endpoint and parses the
 * response. No caching, no singleton. Throws on non-2xx or malformed JSON.
 * Prices are token X per token Y in token units (same convention as the
 * SDK's bin.pricePerToken) — do NOT confuse with the USD vm.currentPrice.
 */
export async function fetchPoolOhlcv(poolAddress: string, timeframe: string): Promise<OhlcvCandle[]> {
  const url = `${METEORA_DLMM_API}/pools/${encodeURIComponent(poolAddress)}/ohlcv?timeframe=${encodeURIComponent(timeframe)}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`OHLCV fetch failed: ${response.status}`)
  }
  const json = (await response.json()) as OhlcvResponse
  return json.data ?? []
}

/**
 * Cached, dedup'd OHLCV fetch keyed by pool address + timeframe. Multiple
 * positions in the same pool share one request.
 */
export async function getCachedPoolOhlcv(
  poolAddress: string,
  timeframe: string,
  cache: CacheManager = CacheManager.getInstance(),
): Promise<OhlcvCandle[]> {
  return cache.getOrFetch(
    ohlcvCacheKey(poolAddress, timeframe),
    () => fetchPoolOhlcv(poolAddress, timeframe),
    CACHE_TTL.PRICE_HISTORY,
  )
}
```

Add the TTL to `src/config/cache.ts`:

```ts
export const CACHE_TTL = {
  UPNL_PER_POSITION: 15 * 60 * 1000,
  TOKEN_DATA: 60 * 1000, // 1 minute
  PRICE_HISTORY: 5 * 60 * 1000, // 5 minutes
}
```

**Verify**: `tsgo --noEmit` → exit 0.

### Step 2: Add the pure scaling util + its test

Create `src/utils/positions/priceChart.ts`:

```ts
import type { OhlcvCandle } from '../../services/priceHistory'

export interface PriceChartDomain {
  yMin: number
  yMax: number
}

/**
 * Compute the y-axis domain as the union of the position's [bandMin, bandMax]
 * range and the candle low/high extremes, with ~8% padding so neither the band
 * edges nor the line touch the chart border. Returns null if there is nothing
 * to plot (no candles and no band).
 */
export function computePriceChartDomain(
  candles: OhlcvCandle[],
  bandMin: number | null,
  bandMax: number | null,
): PriceChartDomain | null {
  const lows = candles.map((c) => c.low)
  const highs = candles.map((c) => c.high)
  const candidates = [...lows, ...highs]
  if (bandMin != null) candidates.push(bandMin)
  if (bandMax != null) candidates.push(bandMax)

  const finite = candidates.filter((v) => Number.isFinite(v) && v > 0)
  if (finite.length === 0) return null

  let lo = Math.min(...finite)
  let hi = Math.max(...finite)
  if (lo === hi) {
    // Degenerate single-value domain: pad symmetrically.
    const pad = Math.max(lo * 0.01, 1e-9)
    return { yMin: lo - pad, yMax: hi + pad }
  }
  const pad = (hi - lo) * 0.08
  return { yMin: lo - pad, yMax: hi + pad }
}

/** Token-unit axis label, matching LiquidityBarChart's toPrecision(6) style. */
export function formatAxisPrice(p: number): string {
  return Number.isFinite(p) ? p.toPrecision(6) : '-'
}
```

Create `src/__tests__/utils/priceChart.test.ts` covering:
- union of band + candle extremes (e.g. band [0.5,2.0], candles low≈0.9/high≈1.1 → domain padded around [0.5,2.0])
- band-only (no candles) → domain from band, padded
- candles-only (band null/null) → domain from candle low/high, padded
- degenerate all-equal → symmetric pad, no NaN
- empty (no candles, no band) → `null`
- non-finite / zero filtered out

Use the existing util tests as the structural pattern: see
`src/__tests__/utils/computePositionViewData.test.ts` and
`src/__tests__/utils/formatters.test.ts`.

**Verify**:
- `tsgo --noEmit` → exit 0
- `bun run test -- priceChart` → all new tests pass

### Step 3: Add the data hook

Create `src/hooks/usePriceHistory.ts`. Model it on `usePositionsPage`'s
effect-driven, mounted-safe pattern:

```ts
import { useEffect, useState } from 'react'
import { getCachedPoolOhlcv, type OhlcvCandle } from '../services/priceHistory'

export interface UsePriceHistoryResult {
  candles: OhlcvCandle[]
  loading: boolean
  error: boolean
}

/**
 * Fetch cached OHLCV candles for a pool. Best-effort: on any failure returns
 * error:true with empty candles (the chart renders its empty state).
 */
export function usePriceHistory(poolAddress: string, timeframe = '24h'): UsePriceHistoryResult {
  const [candles, setCandles] = useState<OhlcvCandle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(false)
    getCachedPoolOhlcv(poolAddress, timeframe)
      .then((data) => {
        if (!mounted) return
        setCandles(data)
        setLoading(false)
      })
      .catch((e) => {
        console.error('usePriceHistory: failed to fetch OHLCV:', e)
        if (!mounted) return
        setCandles([])
        setError(true)
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [poolAddress, timeframe])

  return { candles, loading, error }
}
```

**Verify**: `tsgo --noEmit` → exit 0. (No standalone hook test required — the
fetch logic is covered by the service test in Step 4; RN hook tests aren't set
up in this repo.)

### Step 4: Add the service test

Create `src/__tests__/services/priceHistory.test.ts`. Mock `global.fetch`
following the style in `src/__tests__/utils/dataFetching.test.ts` and
`src/__tests__/services/data.test.ts`. Cover:
- happy path: `fetchPoolOhlcv` with a mocked `{ data: [candle, candle] }`
  response returns the candles array.
- non-2xx (`status: 400`) → throws.
- response with `data: []` → returns `[]`.
- response missing `data` → returns `[]` (the `?? []` guard).
- network error (fetch rejects) → propagates.
- `getCachedPoolOhlcv` with an injected `CacheManager.createFresh()` returns the
  candles and does not re-fetch on a second call within TTL (assert the mock
  fetch was called once across two `getCachedPoolOhlcv` calls).

**Verify**:
- `tsgo --noEmit` → exit 0
- `bun run test -- priceHistory` → all new tests pass

### Step 5: Build the chart component

Create `src/components/positions/PriceMovementChart.tsx`. Copy the **structure**
of `LiquidityBarChart.tsx` verbatim (same imports, `onLayout` width measurement,
`CHART_HEIGHT = 120`, container `className`, header/axis/legend rows, empty
state, `memo()`), then swap the SVG body. Props:

```ts
interface PriceMovementChartProps {
  poolAddress: string
  liquidityShape: LiquidityShape | null
}
```

Derive, in `useMemo`:

```ts
const dist = liquidityShape?.binDistribution
const priceMin = dist && dist.length ? dist[0].price : null
const priceMax = dist && dist.length ? dist[dist.length - 1].price : null
```

Call `const { candles, loading, error } = usePriceHistory(poolAddress)` and
`const domain = useMemo(() => computePriceChartDomain(candles, priceMin, priceMax), [candles, priceMin, priceMax])`.

Render rules (inside `<Svg width={chartWidth} height={CHART_HEIGHT}>`):

1. **Range band** (the "max/min area for our position") — draw it first so the
   line sits on top. Only when `domain` and `priceMin`/`priceMax` are present:
   - a translucent full-width `<Rect>` from `y(priceMin)` to `y(priceMax)`,
     `fill="rgba(34,211,238,0.10)"`;
   - two dashed `<Line>`s at `y(priceMin)` and `y(priceMax)`,
     `stroke="#22d3ee" strokeWidth="1" strokeDasharray="4 3"`.
2. **Grid lines** — copy `LiquidityBarChart`'s 0/25/50/75/100% horizontal
   `<Line>`s at `GRID_LINE_COLOR = 'rgba(63,63,70,0.3)'`.
3. **Price line** — a `<Polyline>` (from `react-native-svg`) through
   `(x(i), y(close_i))` for each candle, `stroke="#e4e4e7" strokeWidth="2"
   fill="none"`. Use straight segments (no curve). `x(i) = i * step`,
   `step = chartWidth / max(candles.length - 1, 1)`.
4. **Last-close dot** — a `<Circle>` (`r="3" fill="#e4e4e7"`) at the final point
   (optional but cheap; helps the "current price" read).

Where `y(price) = CHART_PADDING.top + (chartInnerHeight) * (yMax - price) / (yMax - yMin)`
(inverted because SVG y grows downward), and `chartInnerHeight = CHART_HEIGHT -
top - bottom`.

Header row: left label `PRICE · 10D` (muted, `tracking-widest`); right shows the
last close as a chip (like `LiquidityBarChart`'s `currentPrice` chip), formatted
with `formatAxisPrice(lastClose)`. **Use the OHLCV last close here, NOT
`vm.currentPrice`** (see "Price convention").

Axis row: left `formatAxisPrice(priceMin)`, right `formatAxisPrice(priceMax)`
(mirror `LiquidityBarChart`'s min/max row).

Legend row: cyan swatch = "Your Range", `#e4e4e7` swatch = "Price".

Empty / loading / error states — reuse the same container shell and show, in the
120px area:
- `loading` → `<Text>Loading…</Text>` centered (muted).
- `error || candles.length === 0` → `<Text>Price history unavailable</Text>`.
- `liquidityShape` null / empty → `<Text>No range data</Text>`.

(Keep these dead simple — do not pull in `ShimmerBlock` unless trivial.)

**Verify**: `tsgo --noEmit` → exit 0. (No component render test — the repo tests
services/utils/hooks, not RN components. The scaling logic is covered by the
Step 2 util test; visual correctness is a manual check in Done criteria.)

### Step 6: Wire it into the card and the list

Edit `src/components/positions/PositionCard.tsx`:
- Import `PriceMovementChart`.
- Add `poolAddress: string` to `PositionCardProps`.
- Render `<PriceMovementChart poolAddress={poolAddress} liquidityShape={vm.liquidityShape} />`
  **directly below** `<LiquidityBarChart ... />` (above `PositionFooter`).

Edit `src/app/positions/index.tsx` `renderItem`:
- Add `poolAddress={r.poolAddress}` to `<PositionCard ... />`.

**Verify**:
- `tsgo --noEmit` → exit 0
- `bun run lint` → exit 0; `bun run lint:check` → exit 0
- `bun run fmt` → exit 0; `bun run fmt:check` → exit 0
- `bun run build` → exit 0
- `bun run test` → all pass (existing + the new priceHistory/priceChart tests)
- `git status` → only in-scope files modified

## Test plan

- `src/__tests__/services/priceHistory.test.ts` — `fetchPoolOhlcv` parse/throw,
  empty handling, `getCachedPoolOhlcv` caching/dedup. Pattern:
  `src/__tests__/utils/dataFetching.test.ts`.
- `src/__tests__/utils/priceChart.test.ts` — `computePriceChartDomain` union /
  band-only / candles-only / degenerate / empty; `formatAxisPrice`. Pattern:
  `src/__tests__/utils/computePositionViewData.test.ts`.
- **Manual** (dev client, `EXPO_PUBLIC_DEV_MOCK=0` with a real wallet, or
  `EXPO_PUBLIC_DEV_MOCK=1` — see Maintenance notes): on a position card, confirm
  the price line renders over a cyan shaded band; for an **in-range** position
  the last-close dot sits **inside** the band; for an **out-of-range** position
  it sits **outside**. Confirm a second card in the same pool does not trigger a
  second network request (cache).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `curl` in Step 1 returns the documented OHLCV shape
- [ ] `tsgo --noEmit` exits 0
- [ ] `bun run lint:check` exits 0
- [ ] `bun run fmt:check` exits 0
- [ ] `bun run test` exits 0; new tests `priceHistory` + `priceChart` exist and pass
- [ ] `bun run build` exits 0
- [ ] No files outside the in-scope list are modified (`git status --short`)
- [ ] `PriceMovementChart` reads the OHLCV `close` for the line/last-close chip
      — NOT `vm.currentPrice` (grep the new component for `vm.currentPrice` →
      no matches)
- [ ] `plans/README.md` status row for 009 updated

## STOP conditions

Stop and report back (do not improvise) if:

- The OHLCV `curl` in Step 1 returns a shape other than
  `{start_time,end_time,timeframe,data:[{timestamp,open,high,low,close,volume}]}`,
  or returns fewer/zero candles for `timeframe=24h` on a known-active pool.
- Any "Current state" excerpt doesn't match the live code (drift since `7496775`).
- For a **known in-range** position, the OHLCV last `close` does **not** fall
  within `[priceMin, priceMax]` from `liquidityShape.binDistribution`. This would
  mean the price conventions are misaligned (e.g. one is `tokenX/tokenY` and the
  other is the reciprocal) — STOP rather than blindly inverting; report both
  numbers so the operator can decide.
- `ResolvedPosition` has no `poolAddress` field (it does today; if absent, the
  plumbing in Step 6 needs a different source — report).
- A step's verification fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file.

## Maintenance notes

For the human/agent who owns this code after the change lands:

- **OHLCV window is fixed at 10 candles.** The Meteora endpoint ignores
  `type`/`limit` and caps at 10 most-recent candles for the given `timeframe`.
  If a longer/shorter history is ever wanted, this needs a different source (the
  deleted Plan-002 `PriceService` used Meteora OHLCV + Pyth benchmarks; Pyth is
  the historical-price path for arbitrary windows — do not revive it casually).
- **The band is the position's CURRENT bin range**, recomputed from
  `liquidityShape` each render. It does **not** show the range the position had
  historically — if a position was resized, the band reflects the current
  `[lowerBinId, upperBinId]` only.
- **Dev-mock mode** (`EXPO_PUBLIC_DEV_MOCK=1`): mock positions use fake
  `poolAddress`es, so the OHLCV fetch will 404 and the chart shows its "Price
  history unavailable" empty state. That is acceptable. If a populated chart is
  wanted in dev-mock, extend `src/services/mockPortfolio.ts` to carry mock
  candles and short-circuit the hook — a follow-up, not part of this plan.
- **Performance**: one OHLCV call per distinct pool, cached 5 min and
  in-flight-deduped. For large portfolios this adds up to N pools × (1 call /
  5min). If pool counts grow large, consider raising `PRICE_HISTORY` TTL or
  making the chart lazy (fetch on scroll-into-view) — out of scope here.
- **What a reviewer should scrutinize**: (1) the price-convention correctness
  (the Step "STOP" gate — line must sit inside the band for in-range positions);
  (2) that no `vm.currentPrice` (USD) leaks onto the token-unit axis;
  (3) mounted-safety in the hook; (4) that `LiquidityBarChart` and
  `computePositionViewData` were not touched.
- **Placement decision**: this plan renders the chart **in-card**, directly
  below `LiquidityBarChart`. If the project later builds a **position detail
  screen** (tap-through; currently deferred per `plans/README.md`), this chart is
  a natural citizen there — the component is already self-contained
  (`PriceMovementChart` takes `poolAddress` + `liquidityShape`) and can be moved
  with no rewrite.

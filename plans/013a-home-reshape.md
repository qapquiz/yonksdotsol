# Plan 013a: Phase A — Reshape the home first-fold (urgency hero + triage queue)

> **Parent:** [`013-at-a-glance-triage.md`](./013-at-a-glance-triage.md) (direction
> plan). This is the step-by-step executor plan for **Phase A** only — the core
> unbuilt value of the at-a-glance redesign. Read the parent's "Settled decisions"
> and "Chosen defaults" first; do not re-litigate them.
>
> **Executor instructions**: Follow step by step. Run every verification command
> and confirm the expected result before moving on. Honor the STOP conditions. If
> anything in "Current state" no longer matches, STOP and report. Update the
> status row for `013a` in `plans/README.md` when done.
>
> **Drift check (run first)**:
> `git diff --stat 7496775..HEAD -- src/utils/positions/computePositionViewData.ts src/utils/positions/formatters.ts src/hooks/usePositionsPage.ts src/hooks/usePoolOhlcv.ts src/components/positions/PortfolioSummary.tsx src/app/positions/index.tsx src/services/data.ts src/services/ohlcv.ts src/services/positionPipeline.ts`
> On any in-scope file change, compare "Current state" excerpts to live code; on
> mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED (new computations + an IA flip; the all-clear path must stay
  byte-identical)
- **Depends on**: `013` (design) — settled decisions + defaults live there
- **Category**: direction (feature), phase A of 013

## Why this matters

The app's home fold currently leads with a **PnL hero** — it answers "how am I
doing overall," which is the *reassurance* user's question. The settled user is
an **active triage LP** whose job is "what needs my attention now." Phase A flips
the fold: when anything is bleeding or about to bleed, a **foregone-fee urgency
hero** ("$X/hr not earning") plus a **two-tier triage queue** own the screen, and
PnL is demoted to a quiet secondary line. When all is clear, the current PnL hero
returns unchanged — graceful degradation, no settings, no tabs.

The proactive crown jewel — **near-edge** detection — lives here too, but only on
this fresh on-open fetch (never on the 30-min-stale widget/push, per the
freshness principle in 013).

## Current state (confirm before editing)

From commit `7496775`. Confirm each.

**The view model exposes values as formatted strings only — no numerics.** This
is the data-model gap Phase A closes. From
`src/utils/positions/computePositionViewData.ts`:

```ts
export interface PositionViewModel {
  totalValue: string                 // "$X.XX"
  inRange: boolean
  currentPrice: string
  unrealizedFeesDisplay: string
  claimedFeesDisplay: string
  unrealizedFeesValue: string        // "$X.XX"
  claimedFeesValue: string
  liquidityShape: LiquidityShape | null
  pnlSol: number | null
  pnlSolPctChange: number | null
  feesTvl24h: number | null          // ratio: 0.0131 = 1.31% daily
}
```

The numeric USD value is computed by the file-local `calculateTokenPairUSD(...)`
and formatted away:

```ts
const totalValue =
  positionData && hasTokenData
    ? formatUSD(calculateTokenPairUSD(BigInt(positionData.totalXAmount), BigInt(positionData.totalYAmount), tokenXInfo, tokenYInfo))
    : '$0.00'
// ...
const unrealizedFeesValue =
  tokenXInfo && tokenYInfo && positionData
    ? formatUSD(calculateTokenPairUSD(BigInt(positionData.feeX.toString()), BigInt(positionData.feeY.toString()), tokenXInfo, tokenYInfo))
    : '$0.00'
```

**Near-edge inputs are already on `LiquidityShape`** (same file):

```ts
export interface LiquidityShape {
  positionAddress: string
  pairAddress: string
  binRange: { minBinId: number; maxBinId: number; totalBins: number }
  binDistribution: ChartBinData[]   // each: { binId, positionXAmountInSOL, positionYAmountInSOL, price }
  tokenTotals: { tokenX: number; tokenY: number }
  currentActiveId: number
}
```

**`ResolvedPosition`** (from `src/services/positionPipeline.ts`, re-exported by
`usePositionsPage`) carries everything Phase A needs — confirm the live shape:

```ts
// inferred from consumers (positions/index.tsx, widgetBackgroundSync.ts):
{ id: string; poolAddress: string; vm: PositionViewModel; tokenXInfo: TokenInfo | null; tokenYInfo: TokenInfo | null; ... }
```

**The orchestration hook** `src/hooks/usePositionsPage.ts` returns
`positions: ResolvedPosition[]` (plus `summary`, `solUsdPrice`, `positionCount`,
`outOfRangeCount`, …). It is the data source for the home list. Phase A computes
triage from its `positions` — it does **not** add fetches to this hook.

**OHLCV access for velocity** — `usePoolOhlcv` wraps
`createDataServices().ohlcv.getOhlcv(pairAddress, timeframe)` (returns
`OhlcvSeries` with `candles: OhlcvCandle[]`). Each `OhlcvCandle` has
`{ timestamp, open, high, low, close, volume }`. Candles are in **Token X / Token
Y ratio units — the same axis as `binDistribution[].price`**, so time-to-edge
needs no conversion. `CacheManager` dedupes per pool + TTL (one fetch per pool
even with many positions).

**The component to branch** — `src/components/positions/PortfolioSummary.tsx`.
Props today:

```ts
interface PortfolioSummaryProps {
  summary: PortfolioSummaryData | null
  hasData: boolean
  positionCount: number
  solUsdPrice: number | null
}
```

It renders the PnL hero (bare, instrument scale) + supporting stats. The body
reads `displayCurrency` / `setDisplayCurrency` from the settings store and uses
the file-local `SummaryValue` + `SolValue` renderers.

**The list that hosts it** — `src/app/positions/index.tsx`. `PositionsList`
renders a `LegendList`; `PortfolioSummary` is in `listHeader`, followed by an
out-of-range banner:

```tsx
{outOfRangeCount > 0 && (
  <View className="flex-row items-center gap-2 mb-4 px-1">
    <View className="w-4 h-4 rounded-full bg-app-secondary-dim items-center justify-center">
      <Text className="text-app-secondary text-[10px] font-sans-bold">!</Text>
    </View>
    <Text className="text-app-secondary text-xs font-sans-bold">
      {outOfRangeCount} {outOfRangeCount === 1 ? 'position' : 'positions'} out of range
    </Text>
  </View>
)}
```

Phase A removes this banner — the triage queue's "Bleeding now" tier supersedes
it (and in all-clear mode there is nothing out of range anyway).

## Conventions to honor

- **Formatting**: no semicolons, single quotes, 2-space, trailing commas, arrow
  parens always (`oxfmt`). `bun run fmt` after editing.
- **Pure logic** under `src/utils/...`: all inputs as args, returns data, no side
  effects, unit-tested (`pnlAggregation.ts`, `outOfRange.ts`).
- **Components**: functional + `memo()`, props interface above the component,
  Uniwind classes, `font-sans-bold` for bold (never `font-bold`).
- **Semantic color** (settled in 013): bleeding → **`app-negative`** (loss
  signal); near-edge → **`app-secondary`** (caution). Never raw Tailwind palette.
- **Currency**: the urgency hero honors the existing `displayCurrency` toggle
  exactly like the PnL hero.
- **Naming** (`UBIQUITOUS_LANGUAGE.md`): "Out of range", "uPnL", "Unrealized
  fees". Use `inRange`/`outOfRange`.
- **Display-only OHLCV**: per ADR 0001, OHLCV never feeds PnL/value. Time-to-edge
  is a *display estimate only* — it does not change any stored figure.

## Commands

| Purpose | Command | Expected |
|---|---|---|
| Type check | `tsgo --noEmit` | exit 0 (do NOT use `tsc`) |
| Lint (check) | `bun run lint:check` | exit 0 |
| Format | `bun run fmt` | exit 0 |
| Tests (all) | `bun run test` | all pass |
| Tests (one file) | `bun run test -- <path>` | all pass |
| Build / prebuild | `bun run build` | exit 0 |

`tsgo` via `bunx tsgo --noEmit` if not on PATH.

## Scope

**In scope:**
- `src/utils/positions/computePositionViewData.ts` — add `totalValueUsd` +
  `unrealizedFeesUsd` (Step 1).
- `src/utils/positions/formatters.ts` — add two foregone-rate formatters (Step 2).
- `src/utils/positions/triage.ts` — **create**; pure module (Step 3).
- `src/__tests__/utils/triage.test.ts` — **create** (Step 4).
- `src/__tests__/utils/formatters.test.ts` — extend for the new formatters (Step 2).
- `src/hooks/useTriage.ts` — **create** (Step 5).
- `src/components/positions/TriageView.tsx` — **create**; urgency hero + queue (Step 6).
- `src/components/positions/PortfolioSummary.tsx` — add triage branch (Step 7).
- `src/app/positions/index.tsx` — call `useTriage`, pass props, remove banner (Step 7).
- `src/services/mockPortfolio.ts` — **only if** the mock VMs are built via
  `computePositionViewData` (then the new fields come for free; verify, do not
  hand-edit mocks).

**Out of scope (Phase B/C/D or never — do NOT pull in):**
- Claimable-fees push trigger (Phase B). Widget changes (Phase C). Polish (Phase D).
- Tap-to-scroll from a queue item to its card (deferred to Phase D — queue items
  are display-only in Phase A).
- Per-pool / user-configurable near-edge thresholds — `NEAR_EDGE_BIN_THRESHOLD`
  is a hard-coded constant.
- A better foregone-rate basis than `feesTvl24h × value` (pool-level rate applied
  per-position — a first-order estimate; future enhancement).
- Any change to `usePositionsPage` fetch logic, `PositionPipeline`, or the widget.

## Git workflow

- Branch: `advisor/013a-home-reshape`
- Commit per step; conventional-commit messages, e.g.
  `feat(triage): add foregone-fee urgency hero + two-tier queue`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1 — Data-model prerequisite: numeric value fields (A.0)

In `src/utils/positions/computePositionViewData.ts`:

1. Add two fields to the `PositionViewModel` interface (alongside the existing
   formatted strings — do not remove them; `PositionHeader`/`PositionFooter`
   still use the strings):

   ```ts
     /** Raw numeric total position value in USD (for triage math). */
     totalValueUsd: number
     /** Raw numeric unrealized (unclaimed) fees in USD. */
     unrealizedFeesUsd: number
   ```

2. Capture the numeric USD values before formatting. Replace the `totalValue`
   computation:

   ```ts
     const totalValueUsd =
       positionData && hasTokenData
         ? calculateTokenPairUSD(
             BigInt(positionData.totalXAmount),
             BigInt(positionData.totalYAmount),
             tokenXInfo,
             tokenYInfo,
           )
         : 0
     const totalValue = positionData && hasTokenData ? formatUSD(totalValueUsd) : '$0.00'
   ```

   and the `unrealizedFeesValue` computation:

   ```ts
     const unrealizedFeesUsd =
       tokenXInfo && tokenYInfo && positionData
         ? calculateTokenPairUSD(
             BigInt(positionData.feeX.toString()),
             BigInt(positionData.feeY.toString()),
             tokenXInfo,
             tokenYInfo,
           )
         : 0
     const unrealizedFeesValue =
       tokenXInfo && tokenYInfo && positionData ? formatUSD(unrealizedFeesUsd) : '$0.00'
   ```

3. Add both to the returned object:

   ```ts
     return {
       totalValue,
       totalValueUsd,
       // ...
       unrealizedFeesValue,
       unrealizedFeesUsd,
       // ...
     }
   ```

**Verify**: `tsgo --noEmit` → exit 0. (If any consumer required these fields and
they're now mandatory, this is where it surfaces — fix by reading the missing
value off the VM; do not paper over with optional accessors.)

### Step 2 — Foregone-rate formatters + tests

In `src/utils/positions/formatters.ts`, add two pure formatters (testable, no UI):

```ts
/** "$X.XX/hr" with a true minus sign for the urgency hero (USD mode). */
export function formatForegoneRateUsdPerHour(usdPerHour: number): string {
  if (!Number.isFinite(usdPerHour) || usdPerHour <= 0) return '$0.00/hr'
  return `−$${usdPerHour.toFixed(2)}/hr`
}

/** "X.XXXX SOL/hr" for the urgency hero (SOL mode); USD value converted via the live SOL price. */
export function formatForegoneRateSolPerHour(usdPerHour: number, solUsdPrice: number | null): string {
  if (!Number.isFinite(usdPerHour) || usdPerHour <= 0) return '0.0000 SOL/hr'
  if (solUsdPrice == null || !Number.isFinite(solUsdPrice) || solUsdPrice <= 0) return '— SOL/hr'
  const sol = usdPerHour / solUsdPrice
  return `−${sol.toFixed(4)} SOL/hr`
}
```

Note: the leading glyph is the Unicode minus `−` (U+2212), matching the
instrument-scale feel; the value itself is `Math.abs`-free because the input is
already non-negative (a foregone *rate*) and the sign is purely presentational.

**Verify**: `tsgo --noEmit` → exit 0. Then extend
`src/__tests__/utils/formatters.test.ts` with cases for both formatters
(zero/negative → `$0.00/hr`; positive USD; SOL with null price → `—`; SOL
positive). **Verify**: `bun run test -- src/__tests__/utils/formatters.test.ts`
→ all pass.

### Step 3 — Pure triage module: `src/utils/positions/triage.ts`

**Create** `src/utils/positions/triage.ts`. All pure, all unit-tested (Step 4).
Import `LiquidityShape` from `./computePositionViewData` and `OhlcvCandle` from
`../../services/ohlcv`.

```ts
import type { OhlcvCandle } from '../../services/ohlcv'
import type { LiquidityShape } from './computePositionViewData'

// ── Defaults (settled in plan 013; tunable) ──────────────────────────
/** A position is "near" its edge when the active bin is within this many bins. */
export const NEAR_EDGE_BIN_THRESHOLD = 2
/** Ignore price drift slower than 0.05% of price over the velocity window. */
const VELOCITY_EPSILON_FRACTION = 0.0005
/** Trailing candle window for the velocity estimate. */
const VELOCITY_WINDOW = 6

// ── Foregone-fee urgency rate ────────────────────────────────────────
export interface ForegoneRateInput {
  totalValueUsd: number
  feesTvl24h: number | null // daily ratio (0.0131 = 1.31%/day)
  inRange: boolean
}

/**
 * $/hr a position is not earning while out of range.
 * Pool-level feesTvl24h applied to the position's value, ÷ 24 → hourly.
 * 0 when in range or when either input is missing. First-order estimate.
 */
export function foregoneFeeRateUsdPerHour(p: ForegoneRateInput): number {
  if (p.inRange || p.feesTvl24h == null || !Number.isFinite(p.totalValueUsd)) return 0
  return (p.totalValueUsd * p.feesTvl24h) / 24
}

// ── Near-edge detection (trigger = bins-from-edge; reliable, no modeling) ──
export interface NearEdgeInput {
  liquidityShape: LiquidityShape | null
}

/** Bins from the active bin to the position's nearest edge. null if no shape or out of range. */
export function binsFromEdge(s: NearEdgeInput): number | null {
  const shape = s.liquidityShape
  if (!shape) return null
  const { minBinId, maxBinId } = shape.binRange
  const active = shape.currentActiveId
  if (active < minBinId || active > maxBinId) return null // out of range → not "near", it's bleeding
  return Math.min(active - minBinId, maxBinId - active)
}

export function isNearEdge(s: NearEdgeInput): boolean {
  const d = binsFromEdge(s)
  return d !== null && d <= NEAR_EDGE_BIN_THRESHOLD
}

// ── Time-to-edge (display only; gated by isNearEdge so it can't cry wolf) ──
/**
 * Hours until price crosses the nearest edge, from recent OHLCV drift.
 * Returns null when: no shape, out of range, < 2 candles, velocity below
 * epsilon, or price moving AWAY from the edge. Never returns a scary number
 * from noise — callers pair with isNearEdge().
 *
 * Display-only estimate (ADR 0001); does not feed any stored figure.
 */
export function timeToEdgeHours(args: { liquidityShape: LiquidityShape | null; candles: OhlcvCandle[] }): number | null {
  const shape = args.liquidityShape
  const candles = args.candles
  if (!shape || candles.length < 2) return null

  const { minBinId, maxBinId } = shape.binRange
  const active = shape.currentActiveId
  if (active < minBinId || active > maxBinId) return null

  const approachingLower = active - minBinId <= maxBinId - active
  const edgeBinId = approachingLower ? minBinId : maxBinId
  const edgeBin = shape.binDistribution.find((b) => b.binId === edgeBinId)
  if (!edgeBin || !Number.isFinite(edgeBin.price) || edgeBin.price <= 0) return null
  const edgePrice = edgeBin.price

  const last = candles[candles.length - 1]
  const currentPrice = last.close
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return null

  const n = Math.min(candles.length - 1, VELOCITY_WINDOW)
  const recent = candles[candles.length - 1 - n]
  const dtSec = last.timestamp - recent.timestamp
  if (dtSec <= 0) return null
  const velocity = (currentPrice - recent.close) / (dtSec / 3600) // price-units/hour, signed
  if (!Number.isFinite(velocity)) return null

  // towardEdgeRate > 0 means price is moving toward the respective edge.
  const towardEdgeRate = approachingLower ? -velocity : velocity
  const epsilon = currentPrice * VELOCITY_EPSILON_FRACTION
  if (towardEdgeRate <= epsilon) return null // stable, or moving away

  const distance = approachingLower ? currentPrice - edgePrice : edgePrice - currentPrice
  if (distance <= 0) return null // already at/past the edge

  const hours = distance / towardEdgeRate
  return Number.isFinite(hours) && hours > 0 ? hours : null
}

// ── Two-tier triage aggregator ───────────────────────────────────────
export interface TriagePositionInput {
  positionId: string
  pairAddress: string
  totalValueUsd: number
  feesTvl24h: number | null
  inRange: boolean
  liquidityShape: LiquidityShape | null
}

export type TriageTier = 'bleeding' | 'near-edge'

export interface TriageItem {
  positionId: string
  tier: TriageTier
  /** $/hr not earning. 0 for near-edge items (they are still earning). */
  foregoneUsdPerHour: number
  binsFromEdge: number | null
  timeToEdgeHours: number | null
}

export interface TriageResult {
  /** Bleeding-first, then near-edge. */
  items: TriageItem[]
  /** Sum of bleeding-tier foregone rates — the urgency hero number. */
  totalForegoneUsdPerHour: number
}

/**
 * Build the two-tier triage result + aggregate urgency rate.
 * Tier 1 "Bleeding now" = out-of-range, sorted by foregoneUsdPerHour desc.
 * Tier 2 "About to bleed" = in range AND near-edge, sorted by timeToEdgeHours
 * asc (nulls last). totalForegoneUsdPerHour excludes near-edge (still earning).
 */
export function computeTriage(
  positions: TriagePositionInput[],
  candlesByPool: Record<string, OhlcvCandle[]>,
): TriageResult {
  const bleeding: TriageItem[] = []
  const nearEdge: TriageItem[] = []
  let totalForegoneUsdPerHour = 0

  for (const p of positions) {
    if (!p.inRange) {
      const foregone = foregoneFeeRateUsdPerHour(p)
      totalForegoneUsdPerHour += foregone
      bleeding.push({ positionId: p.positionId, tier: 'bleeding', foregoneUsdPerHour: foregone, binsFromEdge: null, timeToEdgeHours: null })
    } else if (isNearEdge({ liquidityShape: p.liquidityShape })) {
      const candles = p.pairAddress ? (candlesByPool[p.pairAddress] ?? []) : []
      nearEdge.push({
        positionId: p.positionId,
        tier: 'near-edge',
        foregoneUsdPerHour: 0,
        binsFromEdge: binsFromEdge({ liquidityShape: p.liquidityShape }),
        timeToEdgeHours: timeToEdgeHours({ liquidityShape: p.liquidityShape, candles }),
      })
    }
  }

  bleeding.sort((a, b) => b.foregoneUsdPerHour - a.foregoneUsdPerHour)
  nearEdge.sort((a, b) => {
    if (a.timeToEdgeHours == null && b.timeToEdgeHours == null) return 0
    if (a.timeToEdgeHours == null) return 1
    if (b.timeToEdgeHours == null) return -1
    return a.timeToEdgeHours - b.timeToEdgeHours
  })

  return { items: [...bleeding, ...nearEdge], totalForegoneUsdPerHour }
}
```

**Verify**: `tsgo --noEmit` → exit 0.

### Step 4 — Unit tests for `triage.ts`

**Create** `src/__tests__/utils/triage.test.ts` (vitest globals enabled — no need
to import `describe`/`it`/`expect`). Cover:

- `foregoneFeeRateUsdPerHour`: in-range → 0; null `feesTvl24h` → 0; out-of-range
  with `value=1000, feesTvl24h=0.0131` → `1000*0.0131/24` (assert within epsilon).
- `binsFromEdge`: null shape → null; out-of-range active id → null; in-range →
  `min(active−min, max−active)` (test both edges).
- `isNearEdge`: at threshold (2) → true; at 3 → false; out-of-range → false.
- `timeToEdgeHours`: < 2 candles → null; stable price (velocity ≈ 0) → null;
  moving away from edge → null; moving toward edge at a known rate → finite
  positive hours (construct a small synthetic candle series + shape).
- `computeTriage`: empty → `{ items: [], totalForegoneUsdPerHour: 0 }`; a
  bleeding position contributes to the total and appears in tier 1; a near-edge
  position appears in tier 2 and does NOT add to the total; ranking — bleeding
  sorted by rate desc, near-edge sorted by hours asc with nulls last; mixed.

Build synthetic `LiquidityShape` / `OhlcvCandle` literals in the test file (they
are plain data). **Verify**: `bun run test -- src/__tests__/utils/triage.test.ts`
→ all pass.

### Step 5 — `useTriage` hook

**Create** `src/hooks/useTriage.ts`. Consumes `ResolvedPosition[]`, fetches
OHLCV **only for pools with a near-edge candidate**, and returns the
`TriageResult` (progressively: bleeding tier immediate; near-edge fills in as
candles arrive).

```ts
import { useEffect, useMemo, useRef, useState } from 'react'
import { createDataServices } from '../services/data'
import type { OhlcvCandle, OhlcvTimeframe } from '../services/ohlcv'
import type { ResolvedPosition } from '../services/positionPipeline'
import { computeTriage, isNearEdge, type TriageResult } from '../utils/positions/triage'

/** Shorter than the chart's 4h default — we want hours-scale velocity. */
const TRIAGE_VELOCITY_TIMEFRAME: OhlcvTimeframe = '1h'

export interface UseTriageResult {
  triage: TriageResult | null
  /** true while near-edge OHLCV velocity data is still loading */
  velocityLoading: boolean
}

export function useTriage(positions: ResolvedPosition[]): UseTriageResult {
  // Pools that have ≥1 near-edge candidate — only these need an OHLCV fetch.
  const candidatePools = useMemo(() => {
    const set = new Set<string>()
    for (const p of positions) {
      if (isNearEdge({ liquidityShape: p.vm.liquidityShape })) {
        const addr = p.vm.liquidityShape?.pairAddress ?? p.poolAddress
        if (addr) set.add(addr)
      }
    }
    return Array.from(set)
  }, [positions])

  const [candlesByPool, setCandlesByPool] = useState<Record<string, OhlcvCandle[]>>({})
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (candidatePools.length === 0) {
      setCandlesByPool({})
      return
    }
    let active = true
    const svcs = createDataServices()
    Promise.all(
      candidatePools.map((addr) =>
        svcs.ohlcv
          .getOhlcv(addr, TRIAGE_VELOCITY_TIMEFRAME)
          .then((series) => [addr, series.candles] as const)
          .catch(() => [addr, [] as OhlcvCandle[]] as const),
      ),
    ).then((entries) => {
      if (!active || !mountedRef.current) return
      const map: Record<string, OhlcvCandle[]> = {}
      for (const [addr, candles] of entries) map[addr] = candles
      setCandlesByPool(map)
    })
    return () => {
      active = false
    }
  }, [candidatePools])

  const triage = useMemo(
    () =>
      computeTriage(
        positions.map((p) => ({
          positionId: p.id,
          pairAddress: p.vm.liquidityShape?.pairAddress ?? p.poolAddress,
          totalValueUsd: p.vm.totalValueUsd,
          feesTvl24h: p.vm.feesTvl24h,
          inRange: p.vm.inRange,
          liquidityShape: p.vm.liquidityShape,
        })),
        candlesByPool,
      ),
    [positions, candlesByPool],
  )

  const velocityLoading =
    candidatePools.length > 0 && Object.keys(candlesByPool).length < candidatePools.length

  return { triage, velocityLoading }
}
```

Notes for the executor:
- `createDataServices().ohlcv.getOhlcv` is the same call `usePoolOhlcv` makes —
  `CacheManager` dedupes per pool + TTL, so multiple near-edge positions in one
  pool share a single fetch.
- If `ResolvedPosition` does not expose `poolAddress` or `vm.liquidityShape` as
  shown, STOP and report (drift) — do not guess an alternate accessor.
- The `eslint-disable-next-line react-hooks/set-state-in-effect` is **not** needed
  here (no setState before the async boundary), matching the hook style.

**Verify**: `tsgo --noEmit` → exit 0. `bun run lint:check` → exit 0.

### Step 6 — `TriageView` component (urgency hero + two-tier queue)

**Create** `src/components/positions/TriageView.tsx`. Renders the triage-mode
fold: an instrument-scale urgency hero + the two-tier queue. Reuse `TokenIcons`
for per-item pair icons and `usePixelFont` for the hero number. Colors:
bleeding → `app-negative`, near-edge → `app-secondary` (settled in 013).

```tsx
import { memo } from 'react'
import { Text, View } from 'react-native'
import type { ResolvedPosition } from '../../services/positionPipeline'
import { useSettingsStore } from '../../stores/settingsStore'
import { usePixelFont } from '../../hooks/useFontConfig'
import { formatForegoneRateSolPerHour, formatForegoneRateUsdPerHour } from '../../utils/positions/formatters'
import type { TriageItem, TriageResult } from '../../utils/positions/triage'
import { TokenIcons } from '../ui/TokenIcons'

interface TriageViewProps {
  triage: TriageResult
  positions: ResolvedPosition[]
  solUsdPrice: number | null
  velocityLoading: boolean
}

function formatHours(h: number | null): string {
  if (h == null || !Number.isFinite(h)) return ''
  if (h < 1) return `${Math.round(h * 60)}m to edge`
  if (h < 24) return `${h.toFixed(1)}h to edge`
  return `${Math.round(h / 24)}d to edge`
}

function TriageRow({
  item,
  position,
  solUsdPrice,
}: {
  item: TriageItem
  position: ResolvedPosition | undefined
  solUsdPrice: number | null
}) {
  const pixelFont = usePixelFont()
  const displayCurrency = useSettingsStore((s) => s.displayCurrency)
  const isBleeding = item.tier === 'bleeding'
  const valueClass = isBleeding ? 'text-app-negative' : 'text-app-secondary'
  const label =
    isBleeding
      ? formatForegoneRateUsdPerHour(item.foregoneUsdPerHour) // USD; SOL variant below
      : formatHours(item.timeToEdgeHours) || 'Near edge'

  return (
    <View className="flex-row items-center justify-between py-2.5">
      <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
        <TokenIcons tokenXInfo={position?.tokenXInfo ?? null} tokenYInfo={position?.tokenYInfo ?? null} />
        <Text className="text-app-text font-sans-bold text-sm" numberOfLines={1}>
          {position?.tokenXInfo?.symbol} / {position?.tokenYInfo?.symbol}
        </Text>
      </View>
      <Text className={`${valueClass} text-sm`} style={{ fontFamily: pixelFont }}>
        {isBleeding && displayCurrency === 'SOL'
          ? formatForegoneRateSolPerHour(item.foregoneUsdPerHour, solUsdPrice)
          : label}
      </Text>
    </View>
  )
}

function TriageViewComponent({ triage, positions, solUsdPrice, velocityLoading }: TriageViewProps) {
  const pixelFont = usePixelFont()
  const displayCurrency = useSettingsStore((s) => s.displayCurrency)
  const byId = new Map(positions.map((p) => [p.id, p]))

  const bleeding = triage.items.filter((i) => i.tier === 'bleeding')
  const nearEdge = triage.items.filter((i) => i.tier === 'near-edge')

  const heroText =
    displayCurrency === 'SOL'
      ? formatForegoneRateSolPerHour(triage.totalForegoneUsdPerHour, solUsdPrice)
      : formatForegoneRateUsdPerHour(triage.totalForegoneUsdPerHour)

  return (
    <View className="pt-3 pb-4 mb-2">
      {/* HERO — urgency rate */}
      <Text className="text-app-text-muted text-[10px] font-sans-bold tracking-wider mb-2">
        {triage.items.length} {triage.items.length === 1 ? 'POSITION' : 'POSITIONS'} NEED ATTENTION
      </Text>
      <View className="flex-row items-baseline mb-1">
        <Text className="text-4xl text-app-negative" style={{ fontFamily: pixelFont }}>
          {heroText}
        </Text>
      </View>
      <Text className="text-app-negative opacity-70 text-xs font-sans-bold mb-4">Not earning fees</Text>

      {/* TIER 1 — Bleeding now */}
      {bleeding.length > 0 && (
        <View className="mb-3">
          <Text className="text-app-negative text-[10px] font-sans-bold tracking-wider mb-1">BLEEDING NOW</Text>
          {bleeding.map((item) => (
            <TriageRow key={item.positionId} item={item} position={byId.get(item.positionId)} solUsdPrice={solUsdPrice} />
          ))}
        </View>
      )}

      {/* TIER 2 — About to bleed */}
      {nearEdge.length > 0 && (
        <View>
          <Text className="text-app-secondary text-[10px] font-sans-bold tracking-wider mb-1">
            ABOUT TO BLEED{velocityLoading ? '  ···' : ''}
          </Text>
          {nearEdge.map((item) => (
            <TriageRow key={item.positionId} item={item} position={byId.get(item.positionId)} solUsdPrice={solUsdPrice} />
          ))}
        </View>
      )}
    </View>
  )
}

export const TriageView = memo(TriageViewComponent)
```

Notes:
- Queue items are **display-only** in Phase A (no tap-to-scroll — deferred to D).
- The "···" after "ABOUT TO BLEED" while `velocityLoading` signals the
  time-to-edge numbers are still resolving.
- If `TokenIcons`' prop names differ from `tokenXInfo`/`tokenYInfo`, match the
  live signature in `src/components/ui/TokenIcons.tsx`.

**Verify**: `tsgo --noEmit` → exit 0. `bun run lint:check` → exit 0.

### Step 7 — Wire triage into `PortfolioSummary` + the list

**7a. `src/components/positions/PortfolioSummary.tsx`** — add a triage branch
that renders `TriageView`, and keep the entire existing return as the all-clear
path (byte-for-byte). Extend the props interface:

```ts
interface PortfolioSummaryProps {
  summary: PortfolioSummaryData | null
  hasData: boolean
  positionCount: number
  solUsdPrice: number | null
  /** Triage result; when non-null with items, switches the fold to urgency mode. */
  triage: TriageResult | null
  /** Positions, for the triage queue to resolve pair labels/icons. */
  positions: ResolvedPosition[]
  /** True while near-edge OHLCV velocity is still loading. */
  velocityLoading: boolean
}
```

At the top of `PortfolioSummaryComponent` (after the existing hooks, before the
skeleton/null guards), add the triage branch — it takes precedence over
everything:

```tsx
  if (triage && triage.items.length > 0) {
    return (
      <TriageView
        triage={triage}
        positions={positions}
        solUsdPrice={solUsdPrice}
        velocityLoading={velocityLoading}
      />
    )
  }
```

Add the imports: `TriageView` and `type { TriageResult }` from
`../../utils/positions/triage`, and `type { ResolvedPosition }` from
`../../services/positionPipeline` (or from `../../hooks/usePositionsPage`'s
re-export — match the existing import style in the file). **Do not otherwise
touch the existing render** — the all-clear path is the regression anchor.

**7b. `src/app/positions/index.tsx`** — compute triage and pass it through;
remove the now-redundant out-of-range banner.

1. Import `useTriage` and call it at the top of `PositionsList`:
   ```ts
   const { triage, velocityLoading } = useTriage(positions)
   ```
2. Pass the new props to `<PortfolioSummary ...>` in `listHeader`:
   ```tsx
   <PortfolioSummary
     summary={summary}
     hasData={hasPnLData}
     positionCount={positionCount}
     solUsdPrice={solUsdPrice}
     triage={triage}
     positions={positions}
     velocityLoading={velocityLoading}
   />
   ```
3. Remove the `outOfRangeCount > 0` banner block from `listHeader` (the
   "Bleeding now" tier supersedes it). Update the `listHeader` `useMemo` deps
   array to drop `outOfRangeCount` if it is no longer referenced there.

**Verify**: `tsgo --noEmit` → exit 0. `bun run lint:check` → exit 0.

### Step 8 — Format and full verification

```bash
bun run fmt
tsgo --noEmit
bun run lint:check
bun run fmt:check
bun run test
bun run build
```

All must exit 0 / all tests pass.

## Test plan

- **`src/__tests__/utils/triage.test.ts`** (new, Step 4): foregone-rate math,
  bins-from-edge, near-edge threshold, time-to-edge edge cases (stable → null,
  away-from-edge → null, finite estimate), two-tier ranking, aggregate excludes
  near-edge.
- **`src/__tests__/utils/formatters.test.ts`** (extend, Step 2): both new
  foregone-rate formatters, incl. SOL with null price.
- **Existing tests must still pass** unchanged — Step 1 adds VM fields without
  removing the formatted strings, so `PositionHeader`/`PositionFooter` and any VM
  snapshots are unaffected. If a test constructs a `PositionViewModel` literal
  and now fails on missing fields, add the two new fields (`0`) to that fixture —
  this is in scope.
- **Manual (record in PR):** with a wallet that has an out-of-range position,
  confirm triage mode shows the urgency hero in `app-negative` + a "Bleeding now"
  row; with all positions healthy, confirm the all-clear PnL hero is visually
  identical to today (check both SOL and USD modes); confirm a near-edge
  position eventually shows an "Xh to edge" value after OHLCV loads.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `tsgo --noEmit`, `bun run lint:check`, `bun run fmt:check`, `bun run test`,
      `bun run build` all exit 0
- [ ] `src/__tests__/utils/triage.test.ts` exists and passes
- [ ] `src/__tests__/utils/formatters.test.ts` covers the two new formatters
- [ ] `PositionViewModel` has numeric `totalValueUsd` + `unrealizedFeesUsd` and
      the formatted strings are unchanged
- [ ] All-clear mode renders the current PnL hero unchanged (SOL + USD)
- [ ] Triage mode appears only when `triage.items.length > 0`; hero uses
      `app-negative`; near-edge tier uses `app-secondary`
- [ ] The out-of-range banner is removed from `positions/index.tsx`
- [ ] No files outside the in-scope list are modified (plus regenerated
      `android/` from `bun run build` if it runs prebuild)

## STOP conditions

Stop and report (do not improvise) if:
- Any "Current state" excerpt does not match live code (drift since `7496775`).
- `ResolvedPosition` does not expose `id`, `poolAddress`, `vm`, `tokenXInfo`,
  `tokenYInfo` as assumed — the hook and view depend on them.
- `PositionViewModel` no longer has `liquidityShape`, `inRange`, or `feesTvl24h`,
  or `LiquidityShape` loses `binRange`/`currentActiveId`/`binDistribution` — the
  triage math depends on them.
- `createDataServices().ohlcv.getOhlcv` or `OhlcvCandle` shape changes so
  `timeToEdgeHours` cannot be computed — report rather than guess a new format.
- `TokenIcons`'s prop signature differs from `tokenXInfo`/`tokenYInfo`.
- `bun run build` fails in `expo prebuild` for a reason unrelated to your edits.

## Maintenance notes

- **Foregone-rate is an estimate.** It applies a *pool-level* `feesTvl24h` to
  each position's value (assuming the position would earn the pool-average rate
  if in range). A concentrated/uneven position earns differently. First-order;
  documented in `triage.ts`. A per-position fee-accrual basis is a future
  enhancement, not this phase.
- **Time-to-edge is the model-risk surface.** Always paired with the
  `isNearEdge()` bin-distance trigger, so a bad velocity estimate cannot invent a
  spurious tier-2 item. If velocity proves noisy in practice, raise
  `VELOCITY_EPSILON_FRACTION` or `VELOCITY_WINDOW` rather than loosening the
  null-guards.
- **Progressive render is intentional.** The bleeding tier appears immediately
  (needs only `vm` fields); near-edge items show "Near edge" until OHLCV
  resolves, then fill in `Xh to edge` and re-sort. `velocityLoading` drives the
  "···" cue.
- **All-clear regression is sacred.** The current PnL hero (pixel font,
  instrument scale) is the brand identity and the reassurance the product still
  owes when nothing is wrong. The all-clear branch must stay byte-identical; any
  future refactor must preserve it.
- **Phase A is the prerequisite for B and C.** Phase B (claimable-fees push) and
  Phase C (widget urgency mirror) both consume `totalValueUsd` /
  `unrealizedFeesUsd` added in Step 1 — do not change their semantics without
  updating those phases.

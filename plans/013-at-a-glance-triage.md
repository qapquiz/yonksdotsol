# Plan 013: At-a-glance triage redesign

> **Executor instructions**: This is a **direction/design plan**, not a line-by-line
> implementation plan. It captures the product decisions from a `/grilling` session
> and breaks the work into four independently-shippable **phases**. Before
> starting any phase, read this file in full, run the drift check, and confirm the
> "Current state" excerpts still match. Each phase has its own Scope and Done
> criteria; elaborate a phase into a step-by-step executor plan (à la Plan 001)
> when you dispatch it. Honor the STOP conditions. Update the status row in
> `plans/README.md` per phase.
>
> **Drift check (run first)**:
> `git diff --stat 7496775..HEAD -- src/utils/positions/computePositionViewData.ts src/components/positions/PortfolioSummary.tsx src/components/positions/PositionCard.tsx src/widgets/updatePortfolioWidget.tsx src/utils/alerts/outOfRange.ts src/stores/alertStore.ts src/tasks/widgetBackgroundSync.ts src/services/ohlcv.ts`
> If any in-scope file changed since this plan was written, compare "Current
> state" excerpts against live code before proceeding; on a mismatch, STOP.

## Status

- **Priority**: P1 (Phase A) / P2 (B, C) / P3 (D)
- **Effort**: L overall — A: L, B: S, C: M, D: S
- **Risk**: MED (Phase A is the bulk; introduces new computations + an IA flip)
- **Depends on**: none (builds on the DONE Plan 001 alert infrastructure)
- **Category**: direction (feature)
- **Origin**: `/grilling` session — "What should I improve to make this the best
  at-a-glance app for Meteora?" Every decision below was stress-tested and
  settled with the product owner.

## The thesis (one line)

For an **active LP rebalancer**, be the **fastest path to the triage answer** on
a phone — beat Meteora's first-party UI on *time-to-answer*, not feature parity —
by making the glance say **how urgently must I act**, not just *how am I doing*.

## Settled decisions (do not re-litigate)

**Foundations**
- **User:** active triage LP, 3–20 DLMM positions, rebalancer. Job = "what needs
  my attention now."
- **Bar:** beat Meteora on time-to-answer via a mobile-native glance moat.
  Explicitly *not* chasing feature parity.
- **Fences (held):** Android-primary, single-wallet, pull-based, **no server, no
  real-time push.**

**Push (already exists from Plan 001 — reactive only)**
- `expo-notifications` + `src/utils/alerts/outOfRange.ts` + `widgetBackgroundSync`
  (30-min) + `alertStore` edge-detection + opt-in setting + Android
  HIGH-importance channel.
- **Add:** claimable-fees trigger (reactive, 30-min, edge-detected).
- **Stay** at 30-min. No server.

**The glance design**
- **Hero = foregone-fee urgency rate** ("$X/hr not earning"), aggregated from
  out-of-range positions. PnL demoted to a quiet secondary line.
- **Queue = two tiers:** "Bleeding now" (out-of-range, by $/hr foregone ↓) →
  "About to bleed" (near-edge, by time-to-edge ↑).
- **Near-edge: trigger ≠ display.** Trigger = bins-from-edge (boolean, reliable);
  display = time-to-edge (OHLCV drift) headline + % from edge secondary.
- **State machine:** triage owns the fold when anything is bleeding/near-edge;
  **PnL reclaims the hero automatically when all clear.** One surface, two modes,
  driven by state — no tabs, no settings.

**The freshness principle (governs every tie)**
> The staleness of the channel decides how far a signal may travel.

| Signal | Robustness | Allowed on |
|---|---|---|
| Reactive urgency (out-of-range $/hr, claimable fees) | Staleness-robust | every surface — widget, push, app |
| Proactive (near-edge time-to-edge) | Freshness-bound | app-on-open only (fresh fetch) |

Therefore: **push = reactive** (out-of-range ✓ + claimable-fees to add, 30-min);
**widget = reactive mirror** (urgency hero + top bleeding item, no near-edge — a
30-min-stale prediction isn't honest); **app home (reshaped) = the only place
proactive near-edge appears**, because that is where the fetch is fresh.

## Chosen defaults (sane defaults picked by the planner; tunable)

1. **Claimable-fees threshold.** Notify when
   `unrealizedFeesUsd >= max(0.5% × totalValueUsd, $5)`, **edge-detected with
   hysteresis**: fire once when fees cross *up* through the threshold; suppress
   until fees drop below **50% of the threshold** (the drop signals the user
   claimed on Meteora's UI), then re-arm. Rationale: 0.5% of value ≈ ~9 hrs of
   fees in a typical 1.3%/day pool — material, not twitchy; the $5 floor kills
   noise on tiny positions; hysteresis is what actually prevents 30-min spam
   (continuous accrual would otherwise fire every tick). **Tunable later** (per-
   pool override or user setting) — not in this plan's scope.
2. **Near-edge trigger K.** A position is "near" when its nearest bin edge is
   **≤ 2 bins** from the active bin (`min(activeId − minBinId, maxBinId −
   activeId) ≤ 2`). Rationale: bin step varies by pool (0.25%–1%+), so the
   trigger only *gates* entry into the "About to bleed" tier; the **time-to-edge
   display** carries the real urgency. K=2 gives a small buffer without crying
   wolf. **Tunable.**

## Current state (confirm before editing)

From commit `7496775`. The view model is the key gap — it exposes values as
**formatted strings only**, no numerics. From
`src/utils/positions/computePositionViewData.ts`:

```ts
export interface PositionViewModel {
  totalValue: string                 // "$X.XX" — formatted, no raw number
  inRange: boolean
  currentPrice: string
  unrealizedFeesDisplay: string      // "X TOK / Y TOK"
  claimedFeesDisplay: string
  unrealizedFeesValue: string        // "$X.XX" — formatted, no raw number
  claimedFeesValue: string
  liquidityShape: LiquidityShape | null
  pnlSol: number | null
  pnlSolPctChange: number | null
  feesTvl24h: number | null          // ratio: 0.0131 = 1.31% daily
}
```

The numeric USD value is computed internally by `calculateTokenPairUSD(...)` but
**formatted away** before reaching the VM. Phase A exposes it.

**Near-edge inputs are already present** on `LiquidityShape`:

```ts
export interface LiquidityShape {
  binRange: { minBinId: number; maxBinId: number; totalBins: number }
  binDistribution: ChartBinData[]   // each has binId + price (Token X / Token Y ratio)
  currentActiveId: number
  // ...
}
```

So `min(activeId − minBinId, maxBinId − activeId)` is the bins-from-edge distance
— no new fetch needed.

**`feesTvl24h` is a DAILY ratio** (`parseFeePerTvl24h` divides the API percentage
by 100), so `positionValueUsd × feesTvl24h` ≈ daily foregone fees for an
out-of-range position; ÷ 24 → per hour. Pool-level rate applied per-position — a
first-order estimate; document the assumption in code.

**OHLCV for velocity already exists** — `src/services/ohlcv.ts`
(`fetchPoolOhlcv`, `DEFAULT_OHLCV_TIMEFRAME = '4h'`) + `usePoolOhlcv` hook. Candles
are in Token X / Token Y ratio units — **same axis as `binDistribution[].price`**,
so no conversion to compute time-to-edge. Per-pool, so multiple positions in one
pool share a fetch.

**The alert detector to extend** — `src/utils/alerts/outOfRange.ts` exposes a
pure `detectOutOfRangeAlerts(current, previous)` + side-effectful
`sendOutOfRangeNotifications(alerts)`. `alertStore` persists per-wallet state
under `out_of_range_state`. Phase B adds a sibling fees detector + state under a
new key, mirroring this exact pattern.

**The widget's reactive surface to mirror** —
`src/widgets/updatePortfolioWidget.tsx` renders `PortfolioSummaryWidget` from a
`PortfolioSummary` (PnL hero + value + deposited/unclaimed/24h-fees-TVL +
out-of-range callout), dark-only, headless. Phase C flips its hero to urgency
when bleeding, keeps PnL as the all-clear fallback.

**The component to reshape** — `src/components/positions/PortfolioSummary.tsx`
currently leads with a bare PnL hero at instrument scale; `src/app/positions/index.tsx`
lays it out above the cards list with the out-of-range banner beneath it.

## Conventions to honor

- **Formatting**: no semicolons, single quotes, 2-space, trailing commas, arrow
  parens always (`oxfmt`). Run `bun run fmt` after editing.
- **Pure logic** under `src/utils/...`: all inputs as args, returns data, no side
  effects, unit-tested — see `src/utils/positions/pnlAggregation.ts` and
  `outOfRange.ts`.
- **Naming** (from `UBIQUITOUS_LANGUAGE.md`): "Out of range", "uPnL",
  "Unrealized fees" (NOT "pending"/"earned"). Use `outOfRange`/`inRange`.
- **State**: zustand `persist` over MMKV for preferences; raw `createMMKV({ id })`
  for KV snapshots (`alertStore`).
- **Components**: functional + `memo()`, props interface above component, Uniwind
  utility classes, `font-sans-bold` for bold (never `font-bold`).
- **Semantic color**: profit/in-range/selected → `app-primary`; loss/error →
  `app-negative`; out-of-range/caution → `app-secondary`. Never raw Tailwind.
  The urgency/"bleeding" state uses **`app-negative`** (it's a loss signal), the
  near-edge/"about to bleed" state uses **`app-secondary`** (caution). Keep this
  mapping consistent with the existing out-of-range banner.
- **Currency**: the urgency hero honors the existing `displayCurrency` toggle
  (SOL/USD) exactly like the PnL hero — USD mode shows `$X.XX/hr`, SOL mode shows
  `X.XXXX SOL/hr` (USD foregone ÷ `solUsdPrice`).

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

## Scope (overall)

**In scope across phases:**
- `src/utils/positions/computePositionViewData.ts` — add numeric `totalValueUsd`
  + `unrealizedFeesUsd` (Phase A prerequisite).
- `src/utils/positions/triage.ts` — **create** (Phase A); pure foregone-rate +
  near-edge + time-to-edge + two-tier ranking.
- `src/components/positions/PortfolioSummary.tsx` + `TriageQueue.tsx` (**create**)
  + `src/app/positions/index.tsx` — Phase A UI + state machine.
- `src/utils/alerts/claimableFees.ts` — **create** (Phase B); pure detector +
  sender mirroring `outOfRange.ts`.
- `src/stores/alertStore.ts` — add fees-threshold hysteresis state (Phase B).
- `src/tasks/widgetBackgroundSync.ts` — invoke the fees detector (Phase B).
- `src/widgets/updatePortfolioWidget.tsx` — reactive urgency mirror (Phase C).
- Tests under `src/__tests__/utils/` for every new pure function.

**Out of scope (deferred — do NOT pull these in):**
- A server, FCM, real-time push, sub-15-min polling. (Fence held.)
- iOS lock-screen widgets / Live Activities. (Android-primary fence.)
- Multi-wallet / watch-any-address. (Single-wallet fence.)
- Actionable flows (claim/rebalance/withdraw) — read-only remains.
- Concentration-risk / volatility-modeling triage signals (taxonomy #5 — rabbit
  hole). uPnL/IL-bleed-rate push (taxonomy #4) — needs persisted time-series we
  don't store.
- User-configurable thresholds / per-pool K overrides (defaults are hard-coded
  constants, marked tunable).
- The Explore tab and Pool detail depth view (Phase D polish only, light touch).

## Dependency order

**Phase A is a prerequisite for B and C** (both consume the numeric VM fields A
adds). B and C are independent of each other and may parallelize after A. D last.

Recommended: **A → (B ∥ C) → D**.

---

## Phase A — Reshape the home first-fold (P1, the core unbuilt value)

> **Step-by-step executor plan:** [`013a-home-reshape.md`](./013a-home-reshape.md). This
> section is the design summary; 013a is what an executor runs.

The whole thesis lives here: the glance flips from "how am I doing overall"
(PnL hero) to "how urgently must I act" (foregone-fee urgency), with a ranked
triage queue beneath, and PnL yielding automatically when nothing's wrong.

### A.0 — Data-model prerequisite: numeric value fields

Extend `PositionViewModel` with raw numerics alongside the existing formatted
strings (do not remove the strings — `PositionHeader`/`PositionFooter` still use them):

```ts
export interface PositionViewModel {
  // ...existing fields...
  /** Raw numeric total position value in USD (for triage math). */
  totalValueUsd: number
  /** Raw numeric unrealized (unclaimed) fees in USD. */
  unrealizedFeesUsd: number
}
```

In `computePositionViewData`, capture the `calculateTokenPairUSD(...)` results
before formatting and assign them. Both are `0` when token data is absent (same
condition that already yields `'$0.00'`).

### A.1 — Pure triage module: `src/utils/positions/triage.ts`

All pure, all unit-tested. Define:

```ts
export interface ForegoneRateInput {
  positionId: string
  totalValueUsd: number
  feesTvl24h: number | null      // daily ratio
  inRange: boolean
}

/** $/hr a position is not earning while out of range. 0 when in range or no data. */
export function foregoneFeeRateUsdPerHour(p: ForegoneRateInput): number
// = p.inRange || !p.feesTvl24h ? 0 : p.totalValueUsd * p.feesTvl24h / 24

export interface NearEdgeInput {
  positionId: string
  liquidityShape: LiquidityShape | null
}

/** bins from the active bin to the position's nearest edge; null if no shape / out of range. */
export function binsFromEdge(s: NearEdgeInput): number | null
// = min(activeId - minBinId, maxBinId - activeId) when in range; null otherwise

export const NEAR_EDGE_BIN_THRESHOLD = 2
export function isNearEdge(s: NearEdgeInput): boolean
// = (binsFromEdge(s) ?? Infinity) <= NEAR_EDGE_BIN_THRESHOLD

/**
 * Hours until price crosses the nearest edge, from recent OHLCV drift.
 * Returns null when velocity is negligible / away-from-edge / data missing.
 * Gated to never false-alarm: callers pair with isNearEdge().
 */
export function timeToEdgeHours(args: {
  liquidityShape: LiquidityShape | null
  candles: OhlcvCandle[]          // recent, Token X / Token Y ratio units
}): number | null
```

`timeToEdgeHours` guidance: estimate velocity from the candle closes (e.g. slope
of a short rolling regression, or median |Δclose|/Δt over the last ~12 candles);
compute the edge price from `binDistribution` at the approaching boundary;
`hours = (edgePrice − currentPrice) / velocityPerHour`, signed toward the edge.
Return **null** if `|velocity|` is below a small epsilon (price stable) or the
sign points away from the edge — never return a scary number from noise. Pick a
**shorter OHLCV timeframe** (e.g. `'1h'`, last ~12–24 candles) than the chart's
`'4h'` default, since you want hours-scale velocity.

Then the two-tier aggregator:

```ts
export type TriageTier = 'bleeding' | 'near-edge'

export interface TriageItem {
  positionId: string
  tier: TriageTier
  foregoneUsdPerHour: number   // 0 for near-edge items (still earning)
  binsFromEdge: number | null
  timeToEdgeHours: number | null
}

export interface TriageResult {
  items: TriageItem[]                 // bleeding-first, then near-edge; see ranking
  totalForegoneUsdPerHour: number     // sum of bleeding-tier rates — the hero number
}

/** Build the triage result + the aggregate urgency rate from the portfolio. */
export function computeTriage(positions: Array<ForegoneRateInput & NearEdgeInput & {
  timeToEdgeHours?: number | null
}>): TriageResult
```

**Ranking rule (settled):** Tier 1 "Bleeding now" = out-of-range positions, sorted
by `foregoneUsdPerHour` desc. Tier 2 "About to bleed" = in-range AND `isNearEdge`,
sorted by `timeToEdgeHours` asc (nulls last). `totalForegoneUsdPerHour` = sum of
Tier 1 only (near-edge items contribute 0 — they are still earning).

### A.2 — UI: state machine in `PortfolioSummary` + new `TriageQueue`

The fold has **two modes**, driven solely by whether `computeTriage` yields any
items:

- **Triage mode** (`items.length > 0`): hero = `totalForegoneUsdPerHour` at
  instrument scale in `app-negative` ("−$X.XX/hr not earning", or SOL per the
  toggle) + a count; beneath it the new `TriageQueue` (two tiers, each item shows
  token pair, the tier-specific number, and a tap target to the existing card);
  PnL collapses to a single quiet secondary line.
- **All-clear mode** (`items.length === 0`): the **current** PnL-hero layout,
  byte-for-byte. This is the graceful fallback — reassurance returns on its own.

`TriageQueue` reuses existing tokens: `app-negative` for the bleeding tier,
`app-secondary` for the near-edge tier (matches the out-of-range banner). Keep it
scannable — one line per item, no charts in the queue (the card below already has
them). Tap scrolls to / highlights the matching position card.

Wire `computeTriage` in `usePositionsPage` (or a small `useTriage` hook) so it
recomputes from the loaded portfolio + the per-pool OHLCV needed for
`timeToEdgeHours`. The OHLCV fetch is per-pool and already cached — share it across
positions in the same pool; only fetch for pools that have a near-edge candidate
(don't fetch OHLCV for pools where no position is near its edge).

### A.3 — Phase A done criteria

- [ ] `tsgo --noEmit`, `lint:check`, `fmt:check`, `test`, `build` all exit 0
- [ ] New unit tests cover `foregoneFeeRateUsdPerHour`, `binsFromEdge`,
      `isNearEdge`, `timeToEdgeHours` (incl. stable-price → null, away-from-edge
      → null), and `computeTriage` ranking (bleeding-first; near-edge sorted by
      hours; `totalForegoneUsdPerHour` excludes near-edge)
- [ ] All-clear mode is visually identical to the current PnL hero (regression-
      check the SOL path and the USD path)
- [ ] Triage mode appears only when items exist; hero uses `app-negative`
- [ ] No files outside Phase A's scope are modified

---

## Phase B — Claimable-fees push trigger (P2, reactive, 30-min)

Extend the Plan 001 push system with a second reactive trigger. **Depends on A.0**
(needs `unrealizedFeesUsd` + `totalValueUsd`).

### B.1 — Pure detector: `src/utils/alerts/claimableFees.ts`

Mirror `outOfRange.ts` exactly in structure. Pure detector + side-effectful
sender.

```ts
export interface ClaimableFeesSnapshot {
  positionId: string
  unrealizedFeesUsd: number
  totalValueUsd: number
}

export const FEES_THRESHOLD_PCT = 0.005   // 0.5% of position value
export const FEES_THRESHOLD_FLOOR_USD = 5 // absolute floor

export function feesThresholdUsd(totalValueUsd: number): number
// = max(totalValueUsd * FEES_THRESHOLD_PCT, FEES_THRESHOLD_FLOOR_USD)

export interface ClaimableFeesAlert { positionId: string }

export interface FeesDetectionResult {
  alerts: ClaimableFeesAlert[]
  nextState: Record<string, { threshold: number; armed: boolean }>
}

/**
 * Edge-detected with hysteresis. Fire when fees cross UP through the threshold
 * AND the position is currently armed. Arm/disarm: a position starts disarmed;
 * crossing up fires once and disarms; crossing below 50% of the threshold
 * (user claimed) re-arms. previous === null → record state, emit nothing
 * (no notification storm on connect).
 */
export function detectClaimableFeesAlerts(
  current: ClaimableFeesSnapshot[],
  previous: Record<string, { threshold: number; armed: boolean }> | null,
): FeesDetectionResult
```

Sender `sendClaimableFeesNotifications(alerts)` mirrors
`sendOutOfRangeNotifications` — own channel (`'claimable-fees'`,
`AndroidImportance.HIGH`), collapses to one count-based notification, best-effort,
swallows errors.

### B.2 — Persist hysteresis state in `alertStore`

Add `getFeesState(wallet)` / `setFeesState(wallet, state)` / `clearFeesState(wallet)`
under a new MMKV key (`claimable_fees_state`), mirroring the `RangeStateMap`
accessors. Call `clearFeesState` from `useWalletLifecycle.handleDisconnect`
alongside the existing `clearRangeState` (Plan 012 pattern).

### B.3 — Wire into the background task

In `widgetBackgroundSync.ts`, the alert block already runs a `loadPortfolio` for
range snapshots. Reuse that same portfolio object to build
`ClaimableFeesSnapshot[]` and run `detectClaimableFeesAlerts`, gated on the same
`alertsEnabled` setting (one toggle covers both triggers — do not add a second
setting in this phase). Wrap in the existing try/catch.

### B.4 — Phase B done criteria

- [ ] All gates green
- [ ] Detector unit tests: first-run silence, cross-up fires once + disarms,
      re-arms at 50% drop, floor protects tiny positions, multiple simultaneous
- [ ] `clearFeesState` wired into disconnect
- [ ] Single `alertsEnabled` toggle drives both triggers; no new setting added

---

## Phase C — Widget reactive urgency mirror (P2)

**Depends on A.0** (needs `totalValueUsd` for the foregone rate). Flip the widget
hero to urgency when bleeding; keep PnL as the all-clear fallback. **No near-edge
on the widget** — 30-min-stale `timeToEdgeHours` is not honest (freshness
principle).

### C.1 — Extend the widget summary

The headless `fetchPortfolioSummary` already builds a `PortfolioSummary` from the
pipeline. Add `totalForegoneUsdPerHour: number` and `topBleedingItem?: { pair:
string; rate: number }` to it (computed via the same `foregoneFeeRateUsdPerHour`
from `triage.ts` — reuse, don't reimplement). `topBleedingItem` is the single
highest-rate out-of-range position.

### C.2 — Render

In `PortfolioSummaryWidget`: when `totalForegoneUsdPerHour > 0`, hero = "−$X.XX/hr
not earning" in `C.negative` + one line for `topBleedingItem` ("SOL/USDC •
−$0.12/hr"). When `=== 0`, render the current PnL hero unchanged (all-clear
fallback). Honor `displayCurrency` (read from the persisted store exactly as
Plan 007 does for the SOL/USD toggle). The existing out-of-range callout can stay
or fold into the top-bleeding line — pick the less cluttered option.

### C.3 — Phase C done criteria

- [ ] All gates green
- [ ] All-clear widget render unchanged from today (regression-check SOL + USD)
- [ ] Urgency hero appears only when `totalForegoneUsdPerHour > 0`
- [ ] No near-edge / time-to-edge rendered on the widget (staleness gate honored)

---

## Phase D — Polish (P3)

Light touch on the surfaces that stay: position cards, Explore, Pool detail.
Deferred until A–C land so polish targets the final IA, not the old one. Likely
items (elaborate when dispatched): consistent urgency color usage across
card/footer, queue↔card scroll linkage, skeleton states for the triage hero, and
verifying the all-clear PnL hero still matches `PortfolioSummarySkeleton`.

## Test plan (overall)

- **`src/__tests__/utils/triage.test.ts`** (new, Phase A): foregone-rate math,
  bins-from-edge, near-edge threshold, time-to-edge edge cases (stable → null,
  away-from-edge → null, finite estimate), two-tier ranking, aggregate excludes
  near-edge.
- **`src/__tests__/utils/claimableFees.test.ts`** (new, Phase B): hysteresis
  state machine, floor, first-run silence, multi-position.
- **Existing tests must still pass** unchanged — Phase A adds VM fields but does
  not remove the formatted strings, so `PositionHeader`/`PositionFooter` tests are
  unaffected.
- **Manual (record in PR):** on-device, verify triage mode appears for an
  out-of-range position, all-clear mode when none, the widget flips, and a fees
  notification fires once on threshold cross (then not again until a simulated
  claim drops fees).

## Done criteria (overall — all phases)

- [ ] Every phase's own done criteria met
- [ ] All gates green at the final commit: `tsgo --noEmit`, `lint:check`,
      `fmt:check`, `test`, `build`
- [ ] No out-of-scope files modified
- [ ] `plans/README.md` status row updated per phase (A/B/C/D)

## STOP conditions

Stop and report (do not improvise) if:
- Any "Current state" excerpt does not match live code (drift since `7496775`).
- `PositionViewModel` no longer exposes `liquidityShape`, `inRange`, or
  `feesTvl24h`, or `LiquidityShape` loses `binRange`/`currentActiveId` — the
  triage math depends on them.
- `fetchPoolOhlcv` / `OhlcvCandle` shape changes such that `timeToEdgeHours`
  cannot be computed — report rather than guess a new candle format.
- The background task no longer exposes a `loadPortfolio` path with per-position
  `vm` (Phase B depends on it) — same root cause Plan 011 flags; reconcile.
- The widget is no longer dark-only / headless-renderable as today (Phase C).

## Maintenance notes

- **Foregone-rate is an estimate.** It applies a *pool-level* `feesTvl24h` to each
  position's value, assuming the position would earn the pool-average rate if in
  range. A concentrated/uneven position earns differently. The number is
  first-order; document this in the `triage.ts` docstring and never present it as
  exact. A better basis (per-position fee accrual) is a future enhancement, not
  this plan.
- **Time-to-edge is the model-risk surface.** Always pair the display with the
  `isNearEdge()` bin-distance trigger so a bad velocity estimate cannot invent a
  spurious "About to bleed" item. If velocity proves noisy in practice, tighten
  the epsilon / require more candles before reporting non-null.
- **Hysteresis is load-bearing for fees push.** Without it, continuous accrual
  fires every 30 min. Do not "simplify" the detector to a stateless threshold.
- **One toggle, two triggers.** Phase B reuses `alertsEnabled`. If product later
  wants fees alerts independent of range alerts, that is a settings change, not a
  detector change — keep the detectors decoupled from the toggle.
- **Freshness principle is the rule of thumb.** Any future signal added to the
  taxonomy asks one question: is it robust to a 30-min-stale read? If yes, it may
  travel to widget/push; if no, app-on-open only. Don't let a stale prediction
  leak onto the widget.
- **All-clear regression.** The current PnL hero is the brand identity (pixel
  font, instrument scale). The all-clear mode must preserve it exactly — that is
  the reassurance the product still owes when nothing is wrong.

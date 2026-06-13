# Plan 003: Add a SOL/USD display toggle for portfolio values

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 86a1d22..HEAD -- src/stores/settingsStore.ts src/hooks/usePositionsPage.ts src/services/data.ts src/utils/positions/formatters.ts src/components/positions/PortfolioSummary.tsx src/components/positions/PositionHeader.tsx src/components/positions/PositionCard.tsx src/app/positions/index.tsx src/tokens/index.ts src/services/mockPortfolio.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none (lands cleanly whether or not Plan 002 has run; see
  Maintenance notes)
- **Category**: direction (feature)
- **Planned at**: commit `86a1d22`, 2026-06-13

## Why this matters

Yonks displays portfolio values in **inconsistent units today**: the per-position
card total value is already USD (`formatUSD`), but the portfolio summary (PnL,
value, deposited, unclaimed fees) and every uPnL line are SOL. Users who think
in dollars — most retail LPs — cannot get a USD read on the numbers that matter
most (total PnL, total value). The USD price data is already in the app: every
`TokenInfo` carries `price_info.price_per_token` in USD, and the wrapped-SOL mint
price gives a live SOL→USD rate that the existing `TokenService` can fetch and
cache. This plan adds an opt-in SOL/USD toggle (default SOL, preserving current
behavior) that converts the SOL-native summary and PnL figures using the live
SOL price.

## Current state

All excerpts are from commit `86a1d22`. Confirm each before editing.

**The wrapped-SOL mint constant already exists** in `src/services/mockPortfolio.ts:26`:

```ts
SOL: 'So11111111111111111111111111111111111111112',
```

with a `price_info.price_per_token` field (the mock SOL USD price, used at
`mockPortfolio.ts:245` as `TOKENS.SOL.price_info.price_per_token`). This plan
promotes that mint string to a shared constant.

**`TokenService.getPrice(mint)` returns USD-priced token info, cached 60s.**
`src/services/data.ts:24-30`:

```ts
export interface TokenService {
  /** Fetch token metadata + price for a single mint (cached) */
  getPrice(mint: string): Promise<TokenInfo>
  /** Batch-fetch token prices for multiple mints (cached, parallel, error-isolated) */
  getPrices(mints: string[]): Promise<Map<string, TokenInfo>>
}
```

`TokenInfo.price_info.price_per_token` is a USD number (`src/tokens/index.ts:22`,
`currency: 'USD'`). So fetching the wrapped-SOL mint yields a live SOL→USD price.

**Portfolio summary values are SOL-native.** They come from `metcomet` via
`src/utils/positions/pnlAggregation.ts`. Note the `/200` fallback hack at
`pnlAggregation.ts:48` and `:85` (a rough USD→SOL conversion when `balancesSol`
is missing) — leave it; this plan does not touch aggregation.

**`PortfolioSummary` renders SOL with a custom tiny-value formatter.**
`src/components/positions/PortfolioSummary.tsx` defines `formatSmallValue` and a
`SolValue` component, then renders fields like:

```tsx
<SolValue value={Math.abs(totalPnlSol)} className={`text-2xl ${pnlColorClass}`} fontFamily={pixelFont} />
// ...
<SolValue value={totalValueSol} className="text-app-text text-sm" fontFamily={pixelFont} />
```

with literal `<Text ...>SOL</Text>` unit labels.

**The per-position uPnL line is SOL.** `src/components/positions/PositionHeader.tsx:55-62`:

```tsx
{upnlValue != null && upnlPercentage != null
  ? upnlIsSol
    ? formatUPNLDisplaySol(upnlValue, upnlPercentage)
    : formatUPNLDisplay(upnlValue, upnlPercentage)
  : '+0.0000 SOL (+0.00%)'}
```

`formatUPNLDisplaySol` and `formatUPNLDisplay` both already exist in
`src/utils/positions/formatters.ts`. The USD variant (`formatUPNLDisplay`)
produces `+/-X.XX (+/-Y.YY%)`.

**Formatters already present** (`src/utils/positions/formatters.ts`):

```ts
export function formatUSD(value: number): string { /* $X,XXX.XX */ }
export function formatUPNLDisplaySol(upnl, percent): string { /* +/-X.XXXX SOL (+/-Y.YY%) */ }
export function formatUPNLDisplay(upnl, percent): string { /* +/-$X.XX (+/-Y.YY%) */ }
```

**Settings store** (`src/stores/settingsStore.ts`) is a zustand `persist` store
over MMKV. The toggle lives here. (If Plan 001 has already landed, the store also
has `alertsEnabled`; just add `displayCurrency` alongside. If 001 has not landed,
add it alongside `theme`/`pixelFont`.)

**`usePositionsPage` is the data hook** threaded App → PositionsList → cards.
`src/hooks/usePositionsPage.ts` returns `PositionsPageResult` and already fetches
the portfolio on wallet change + refresh. The new `solUsdPrice` is fetched here.

## Conventions to honor

- **Formatting**: no semicolons, single quotes, 2-space, trailing commas — `oxfmt`.
- **Components**: functional + `memo()`, props interface above the component,
  Uniwind classes. For the toggle, mirror the small `Pressable` styling already
  used in `FontPicker.tsx` (selected = `bg-app-primary-dim border-app-primary`).
- **Settings**: zustand `persist` over MMKV (`settingsStore.ts`).
- **Pure helpers** go in `src/utils/positions/formatters.ts`.
- **Currency domain language**: use `displayCurrency: 'SOL' | 'USD'`. Do not
  introduce "fiat"/"native" synonyms.

## Commands you will need

| Purpose          | Command                                              | Expected on success |
|------------------|------------------------------------------------------|---------------------|
| Type check       | `tsgo --noEmit` (or `bunx tsgo --noEmit`)            | exit 0, no errors (do NOT use `tsc`) |
| Lint (check)     | `bun run lint:check`                                 | exit 0 |
| Format           | `bun run fmt`                                        | exit 0 |
| Tests (all)      | `bun run test`                                       | all pass |
| Tests (filter)   | `bun run test -- src/__tests__/utils/formatters.test.ts` | all pass |
| Build / prebuild | `bun run build`                                      | exit 0 |

## Scope

**In scope** (the only files you should modify or create):
- `src/tokens/index.ts` — export `WRAPPED_SOL_MINT` constant
- `src/services/mockPortfolio.ts` — import the constant instead of the local literal (dedup; optional but recommended)
- `src/services/solPrice.ts` — **create**; `getCurrentSolUsdPrice()` via the token service
- `src/utils/positions/formatters.ts` — add `DisplayCurrency` type + `formatUsdFromSol`
- `src/stores/settingsStore.ts` — add `displayCurrency` + `setDisplayCurrency`
- `src/hooks/usePositionsPage.ts` — fetch + expose `solUsdPrice`
- `src/app/positions/index.tsx` — thread `solUsdPrice` to `PortfolioSummary` and `PositionCard`
- `src/components/positions/PortfolioSummary.tsx` — render the SOL/USD toggle + convert values
- `src/components/positions/PositionCard.tsx` — accept + pass `displayCurrency`/`solUsdPrice` to `PositionHeader`
- `src/components/positions/PositionHeader.tsx` — convert the uPnL line
- `src/__tests__/utils/formatters.test.ts` — add tests for `formatUsdFromSol`
- `src/__tests__/stores/settingsStore.test.ts` — add tests for `displayCurrency`
- `src/widgets/updatePortfolioWidget.tsx` — **optional/deferrable** (Step 9): USD variant for the widget

**Out of scope** (do NOT touch):
- `src/utils/positions/pnlAggregation.ts` — aggregation stays SOL-native; the `/200` hack stays.
- `src/utils/positions/computePositionViewData.ts` — `PositionViewModel.totalValue` stays USD; do not convert the per-position total value (see Maintenance notes for the known inconsistency).
- `src/services/positionPipeline.ts` — no pipeline changes; SOL price is fetched through the existing token service, not the pipeline.
- Plan 002's historical-price code. This plan uses the *current* SOL price only.

## Git workflow

- Branch: `advisor/003-usd-display-toggle`
- Commit per step; conventional-commit style (e.g.
  `feat: add SOL/USD display toggle for portfolio summary`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the wrapped-SOL mint constant

In `src/tokens/index.ts`, add near the top (before `fetchTokenFromRpc`):

```ts
/** Wrapped SOL mint — used to fetch a live SOL→USD price via the token service. */
export const WRAPPED_SOL_MINT = 'So11111111111111111111111111111111111111112'
```

In `src/services/mockPortfolio.ts`, replace the local `SOL` mint literal (line ~26)
with an import of `WRAPPED_SOL_MINT` so there is one source of truth. Keep the
mock's `price_info` as-is.

**Verify**: `tsgo --noEmit` → exit 0.

### Step 2: Add the SOL-price service

Create `src/services/solPrice.ts`. It uses the existing `TokenService` (singleton
cache, 60s TTL) to read the wrapped-SOL USD price.

```ts
import { WRAPPED_SOL_MINT, type TokenInfo } from '../tokens'
import { createDataServices } from './data'

/**
 * Fetch the current SOL→USD price via the wrapped-SOL mint token info.
 * Uses the shared CacheManager-backed token service (60s TTL), so repeated
 * calls are cheap. Returns null on any failure.
 */
export async function getCurrentSolUsdPrice(): Promise<number | null> {
  try {
    const { tokens } = createDataServices()
    const info: TokenInfo = await tokens.getPrice(WRAPPED_SOL_MINT)
    const price = info?.price_info?.price_per_token
    return typeof price === 'number' && Number.isFinite(price) ? price : null
  } catch (e) {
    console.error('solPrice: failed to fetch SOL price:', e)
    return null
  }
}
```

**Verify**: `tsgo --noEmit` → exit 0.

### Step 3: Add the formatter helper

In `src/utils/positions/formatters.ts`, add (alongside the existing `formatUSD`):

```ts
export type DisplayCurrency = 'SOL' | 'USD'

/** Convert a SOL-denominated amount to a USD string. Null/missing price → $0.00. */
export function formatUsdFromSol(solAmount: number, solUsdPrice: number | null): string {
  if (solUsdPrice == null || !Number.isFinite(solAmount) || !Number.isFinite(solUsdPrice)) {
    return '$0.00'
  }
  return formatUSD(solAmount * solUsdPrice)
}
```

**Verify**: `tsgo --noEmit` → exit 0.

### Step 4: Add the `displayCurrency` setting

In `src/stores/settingsStore.ts`, mirror the existing `pixelFont`/`setPixelFont`
pair exactly:

```ts
import type { DisplayCurrency } from '../utils/positions/formatters'
export type { DisplayCurrency }

interface SettingsState {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  pixelFont: string
  setPixelFont: (id: string) => void
  // New:
  displayCurrency: DisplayCurrency
  setDisplayCurrency: (currency: DisplayCurrency) => void
}
```

```ts
// in the (set, get) => ({ ... }) initializer:
displayCurrency: 'SOL',
setDisplayCurrency: (displayCurrency) => set({ displayCurrency }),
```

(zustand `persist` merges the new field automatically; no migration.)

**Verify**: `tsgo --noEmit` → exit 0.

### Step 5: Expose `solUsdPrice` from `usePositionsPage`

In `src/hooks/usePositionsPage.ts`:

1. Import `getCurrentSolUsdPrice` from `../services/solPrice`.
2. Add `const [solUsdPrice, setSolUsdPrice] = useState<number | null>(null)`.
3. In the wallet-change effect (the `if (currentAddress !== null && currentAddress !== prevAddress)` branch), after `pipeline.loadPortfolio(...).then(...)`, also call:
   ```ts
   getCurrentSolUsdPrice().then(setSolUsdPrice).catch(() => setSolUsdPrice(null))
   ```
   Do the same inside `refresh` so pull-to-refresh updates the SOL price too.
4. Add `solUsdPrice` to `PositionsPageResult` and to every `return { ... }` in
   the hook (the live return, the devMock connected return, and the devMock
   disconnected return). For devMock, also fetch via `getCurrentSolUsdPrice()`
   so the USD path is testable in mock mode — call it in a `useEffect` that runs
   once on mount and store in the same state. (If that proves awkward, returning
   `null` in devMock is acceptable — note it in the PR.)
5. Reset `solUsdPrice` to `null` on disconnect (the `currentAddress === null &&
   prevAddress !== null` branch).

**Verify**: `tsgo --noEmit` → exit 0.

### Step 6: Thread `solUsdPrice` through the list

In `src/app/positions/index.tsx`:

1. Add `solUsdPrice: number | null` to `PositionsListProps`.
2. Pass `solUsdPrice={pageData.solUsdPrice}` from `App` (in `src/app/index.tsx`,
   where `<PositionsList ... />` is rendered).
3. Forward `solUsdPrice` to `<PortfolioSummary>` and `<PositionCard>` from
   `renderItem`/`listHeader`. (`displayCurrency` is read directly from the
   settings store inside each component — do not thread it as a prop.)

Update `PortfolioSummaryProps` and `PositionCardProps` to accept
`solUsdPrice: number | null`.

**Verify**: `tsgo --noEmit` → exit 0.

### Step 7: Render the toggle + USD conversion in `PortfolioSummary`

In `src/components/positions/PortfolioSummary.tsx`:

1. Read the setting: `const displayCurrency = useSettingsStore((s) => s.displayCurrency)`
   and `const setDisplayCurrency = useSettingsStore((s) => s.setDisplayCurrency)`.
   Import `formatUsdFromSol` and `DisplayCurrency` from formatters, and
   `useSettingsStore`.
2. Add a small segmented control in the header row (next to the "PORTFOLIO
   SUMMARY" label / count badge) — two `Pressable`s, "SOL" and "USD". Mirror the
   selected/unselected styling from `FontPicker.tsx` (selected:
   `bg-app-primary-dim border-app-primary text-app-primary`). Keep it compact.
3. Define a local helper to render a value in the active currency:
   ```ts
   const fmt = (sol: number) =>
     displayCurrency === 'USD' ? formatUsdFromSol(sol, solUsdPrice) : undefined
   ```
   In SOL mode, keep using the existing `<SolValue value={...} />` component and
   the `SOL` unit labels unchanged. In USD mode, replace the `<SolValue>` with a
   `<Text>` showing `formatUsdFromSol(sol, solUsdPrice)` and change the unit label
   from `SOL` to nothing (the `$` is already in the formatted value). Apply this
   to the four summary figures: PnL (absolute), total value, deposited,
   unclaimed fees.
   - For the PnL percent line, the percentage is currency-independent — leave it
     as-is in both modes.
4. If `displayCurrency === 'USD'` and `solUsdPrice === null`, the formatted
   values fall back to `$0.00` (per `formatUsdFromSol`). Optionally show a tiny
   "—" or a muted note; a silent `$0.00` fallback is acceptable for v1.

Keep the component `memo()`-wrapped. Extract a small `ValueDisplay` sub-component
if it keeps the render readable, but do not change the SOL path's appearance.

**Verify**: `tsgo --noEmit` → exit 0. `bun run lint:check` → exit 0.

### Step 8: Convert the per-position uPnL line

In `src/components/positions/PositionCard.tsx`, accept `solUsdPrice` and pass it
plus nothing else to `PositionHeader` (`displayCurrency` is read in the header
directly from the store). Update `PositionCardProps`.

In `src/components/positions/PositionHeader.tsx`:

1. Read `const displayCurrency = useSettingsStore((s) => s.displayCurrency)`.
2. In the uPnL `Text`, compute the USD value when needed:
   ```ts
   const upnlForDisplay =
     upnlValue != null && upnlPercentage != null
       ? displayCurrency === 'USD' && solUsdPrice != null
         ? formatUPNLDisplay(upnlValue * solUsdPrice, upnlPercentage)
         : formatUPNLDisplaySol(upnlValue, upnlPercentage)
       : displayCurrency === 'USD'
         ? '+$0.00 (+0.00%)'
         : '+0.0000 SOL (+0.00%)'
   ```
   Note: `upnlIsSol` is currently always `true` from `PositionCard`; keep using
   `formatUPNLDisplaySol` for the SOL branch and `formatUPNLDisplay` for USD.
3. Accept `solUsdPrice: number | null` on `PositionHeaderProps`.

Do **not** change `totalValue` — it is already USD (`vm.totalValue`) and is left
as-is in both modes (see Maintenance notes).

**Verify**: `tsgo --noEmit` → exit 0. `bun run lint:check` → exit 0.

### Step 9 (OPTIONAL / DEFERRABLE): Widget USD variant

If you want the home-screen widget to honor the toggle too, edit
`src/widgets/updatePortfolioWidget.tsx`:

1. Read the setting headlessly: `useSettingsStore.getState().displayCurrency`
   (the store is MMKV-persisted, readable in the headless task).
2. In `fetchPortfolioSummary`, after building the SOL summary, also call
   `getCurrentSolUsdPrice()` and, when `displayCurrency === 'USD'`, convert the
   four SOL fields (`totalPnlSol`, `totalValueSol`, `totalInitialDepositSol`,
   `totalUnclaimedFeesSol`) by multiplying, and change the " SOL" unit labels in
   `PortfolioSummaryWidget` to omit the suffix (USD values carry `$`). Leave
   `totalPnlPercent` unchanged.

This step is self-contained and can be deferred to a follow-up without affecting
the in-app toggle. If you skip it, leave `updatePortfolioWidget.tsx` untouched
and note "widget USD deferred" in the PR.

**Verify** (if done): `tsgo --noEmit` → exit 0.

### Step 10: Tests + format + full verification

Add tests:

- `src/__tests__/utils/formatters.test.ts` — add cases for `formatUsdFromSol`:
  normal conversion (`1.5 SOL * 100 = $150.00`), null price → `$0.00`,
  non-finite → `$0.00`, zero SOL → `$0.00`. Follow the existing file's style.
- `src/__tests__/stores/settingsStore.test.ts` — add: default is `'SOL'`,
  `setDisplayCurrency('USD')` flips it.

Then:

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

- **`src/__tests__/utils/formatters.test.ts`** (extend): `formatUsdFromSol`
  happy path, null price, non-finite, zero.
- **`src/__tests__/stores/settingsStore.test.ts`** (extend): `displayCurrency`
  default + setter, mirroring the existing `pixelFont`/`theme` tests.
- **Existing tests unchanged and passing.** No production math in
  `pnlAggregation.ts` or `computePositionViewData.ts` changes.
- **Manual (record in PR):** toggle SOL↔USD in the summary; confirm the four
  summary figures and the per-position uPnL line switch units and that the
  percentage is unchanged. Confirm SOL mode looks identical to today (pixel-perfect
  regression check on `SolValue`).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `tsgo --noEmit` exits 0
- [ ] `bun run test` exits 0; new `formatUsdFromSol` and `displayCurrency` tests pass
- [ ] `bun run lint:check` and `bun run fmt:check` exit 0
- [ ] `bun run build` exits 0
- [ ] `grep -rn "WRAPPED_SOL_MINT" src/` → defined in `src/tokens/index.ts` and used (no other raw `'So111...'` literals remain except optionally inside the constant definition)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any "Current state" excerpt does not match the live code (drift since `86a1d22`).
- `TokenService.getPrice` for the wrapped-SOL mint does not return a usable
  `price_info.price_per_token` (e.g. the RPC returns a different shape for wSOL) —
  report the actual response shape rather than guessing a parse.
- `useSettingsStore.getState()` is not readable in the widget's headless context
  (Step 9) — if so, skip Step 9 and report; do not invent a different persistence path.
- Threading `solUsdPrice` reveals that `PositionsList`/`PositionCard` props have
  changed in a way that conflicts with these steps.

## Maintenance notes

- **Known inconsistency (intentional, not fixed here):** the per-position card
  `totalValue` (`vm.totalValue`) is already USD and is **not** converted by this
  plan. So in SOL mode a card shows a USD total value alongside a SOL uPnL — that
  is the *pre-existing* state, preserved to keep this plan low-risk. A follow-up
  could make `totalValue` currency-aware (USD→SOL via `totalValueUsd /
  solUsdPrice`), but that touches `computePositionViewData.ts` and is out of
  scope here. Reviewers: do not "fix" this in the same PR.
- **Interaction with Plan 002:** none. Plan 002 deletes the *historical* SOL
  price path (Pyth benchmarks); this plan uses the *current* SOL price via the
  token service. They are independent and can land in either order. If 002 has
  not run, `PriceService` still exists but this plan does not use it.
- **Interaction with Plan 001:** none hard dependency. If 001 has landed, the
  settings store also has `alertsEnabled`; this plan just adds `displayCurrency`
  alongside it. The toggle UI deliberately lives *inside* `PortfolioSummary`
  (contextual), not in 001's `SettingsSheet`, so 003 does not require 001.
- **SOL price freshness:** 60s TTL via the token cache. On a slow/failing RPC,
  `solUsdPrice` is `null` and USD mode falls back to `$0.00`. That is acceptable
  for v1; a follow-up could show a "price unavailable" state.
- **Reviewer scrutiny:** confirm the SOL-mode render is byte-for-byte unchanged
  (regression), that the percentage line never gets currency-converted, and that
  the widget (if Step 9 done) reads the store headlessly without subscribing.

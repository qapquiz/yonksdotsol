# Plan 007: Make the widget follow the app's SOL/USD currency toggle

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 7496775..HEAD -- src/widgets/updatePortfolioWidget.tsx src/stores/settingsStore.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/006-widget-source-open-portfolio.md` (both edit `src/widgets/updatePortfolioWidget.tsx`; do this after 006 to avoid conflicts)
- **Category**: direction (feature parity with the app)
- **Planned at**: app commit `7496775`, 2026-06-14

## Why this matters

The app has a SOL/USD segmented toggle (`PortfolioSummary.tsx` →
`CurrencyToggle` → `useSettingsStore.displayCurrency`) that the home-screen
widget completely ignores: the widget is hardcoded to render `"<number> SOL"`
on every value. Users who set USD in the app see SOL on the widget and vice
versa. This plan makes the widget read the same persisted preference and
render in the user's chosen currency, so the widget matches the app.

Scope is deliberately minimal: read the preference, fetch one spot SOL price,
and switch the 4 value renderings + the suffix labels. The percentage is left
unchanged (see "Why the percentage is not touched" below).

**Lineage:** this plan completes the **deferred Step 9 (widget USD variant)** of
the already-DONE in-app toggle plan `plans/003-usd-display-toggle.md`. That
plan shipped the in-app SOL/USD toggle but explicitly marked the headless-widget
USD variant as OPTIONAL/DEFERRED; this is that follow-up.

## Current state

**The widget is SOL-only.** In `src/widgets/updatePortfolioWidget.tsx`, every
value site renders a hardcoded `" SOL"` `TextWidget`, e.g.:

```tsx
<TextWidget text=" SOL" style={{ fontSize: 10, color: COLORS.textMuted }} />
```

The render entry points are:

```ts
export function buildWidgetTree(summary: PortfolioSummary | null): WidgetRepresentation { ... }
export function buildErrorWidget(message: string): WidgetRepresentation { ... }
```

`buildWidgetTree` delegates to `<PortfolioSummaryWidget summary={...} lastUpdated={...} />`, which contains the 4 value sites:
1. PnL value (`pnlSolDisplay` + `" SOL"`)
2. VALUE stat (`valueDisplay` + `" SOL"`)
3. DEPOSITED stat (`depositedDisplay` + `" SOL"`)
4. UNCLAIMED FEES stat (`feesDisplay` + `" SOL"`)

**The app's settings store persists to MMKV** — `src/stores/settingsStore.ts`:

```ts
import { createMMKV } from 'react-native-mmkv'
const mmkv = createMMKV({ id: 'settings' })
// ... zustand persist with createJSONStorage(() => storage), name: 'settings-store'
// state field: displayCurrency: DisplayCurrency  ('SOL' | 'USD'), default 'SOL'
```

**Non-React read precedent** — `src/stores/walletStore.ts` already exposes a
plain function for use in the headless widget task handler:

```ts
export function getStoredWalletAddress(): string | undefined {
  const val = mmkv.getString(WALLET_ADDRESS_KEY)
  return val && val.length > 0 ? val : undefined
}
```

This plan mirrors that pattern for `displayCurrency`.

**SOL price** — `src/services/solPrice.ts` exports `getCurrentSolUsdPrice(): Promise<number | null>`. It uses `createDataServices()` (CacheManager-backed, no React), so it is headless-safe and already used elsewhere outside React.

**Number formatting** — `src/utils/positions/formatters.ts` exports:
```ts
export function formatUSD(value: number): string  // "$1,234.56"
export function formatUsdFromSol(solAmount: number, solUsdPrice: number | null): string  // null price → "$0.00"
```

**Repo conventions**: no semicolons, single quotes, 2-space, trailing commas, arrow parens, `import type`, Uniwind/`react-native-android-widget` primitives (`FlexWidget`, `TextWidget`). Verification: `tsgo --noEmit`, `bun run lint`, `bun run fmt`, `bun run build`, `bun run test`.

## Commands you will need

| Purpose    | Command            | Expected on success |
|------------|--------------------|---------------------|
| Type-check | `tsgo --noEmit`    | exit 0, no errors   |
| Lint       | `bun run lint`     | exit 0              |
| Format     | `bun run fmt`      | files formatted     |
| Build      | `bun run build`    | exit 0              |
| Tests      | `bun run test`     | all pass            |

## Scope

**In scope** (the only files you should modify):
- `src/stores/settingsStore.ts` — add a non-React `getStoredDisplayCurrency()` helper.
- `src/widgets/updatePortfolioWidget.tsx` — thread `displayCurrency` + `solUsdPrice` through `buildWidgetTree` / `PortfolioSummaryWidget` and render USD or SOL at the 4 value sites.

**Out of scope** (do NOT touch):
- `src/widgets/portfolioWidgetTaskHandler.tsx` — it already calls `fetchPortfolioSummary`; you MAY add a 1-line read of the currency + price and pass them to `buildWidgetTree`, but do not restructure the handler. (This file is in scope only for the two wiring lines described in Step 3.)
- The percentage rendering — see "Why the percentage is not touched" in Maintenance notes. Leave it.
- The app's in-app `PortfolioSummary.tsx` toggle — it already works; do not touch it.
- Color/theme handling — widget already has a fixed `COLORS` dark-theme constant; do not add light mode.

## Git workflow

- Branch: `feat/widget-usd-toggle`
- Commit style: conventional commits. Example: `feat: widget follows app SOL/USD currency toggle`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add `getStoredDisplayCurrency()` to the settings store

In `src/stores/settingsStore.ts`, mirror the `walletStore` precedent. The
zustand `persist` middleware stores the state under key `'settings-store'` as
JSON of shape `{ state: { ... }, version: number }`. Read defensively:

```ts
export function getStoredDisplayCurrency(): DisplayCurrency {
  try {
    const raw = mmkv.getString('settings-store')
    if (!raw) return 'SOL'
    const parsed = JSON.parse(raw) as { state?: { displayCurrency?: DisplayCurrency } }
    const val = parsed?.state?.displayCurrency
    return val === 'USD' ? 'USD' : 'SOL'
  } catch {
    return 'SOL'
  }
}
```

Place it at module scope (not inside the store). Add `export` and reuse the
existing `mmkv` instance already declared at the top of the file. Do not
create a second MMKV instance.

**Verify**: `tsgo --noEmit` → exit 0.

### Step 2: Add a local USD/SOL formatter to the widget

In `src/widgets/updatePortfolioWidget.tsx`, near the existing `formatSolValue` helper, add:

```ts
import { getStoredDisplayCurrency } from '../stores/settingsStore'
import { getCurrentSolUsdPrice } from '../services/solPrice'
import type { DisplayCurrency } from '../utils/positions/formatters'

/** Format a SOL-denominated amount in the chosen currency. Returns [text, suffix]. */
function formatCurrencyValue(
  solValue: number,
  displayCurrency: DisplayCurrency,
  solUsdPrice: number | null,
): { value: string; suffix: string } {
  if (displayCurrency === 'USD') {
    const usd = solUsdPrice != null && Number.isFinite(solValue) && Number.isFinite(solUsdPrice)
      ? solValue * solUsdPrice
      : 0
    return {
      value: usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      suffix: ' USD',
    }
  }
  return { value: formatSolValue(solValue), suffix: ' SOL' }
}
```

Do not import `formatUsdFromSol` — the widget needs the value and suffix as
separate `TextWidget`s (the `$` is part of the USD formatted string, but the
widget renders the value and suffix in different font sizes, so splitting is
required). Mirror `formatUSD`'s number formatting exactly (2 decimals,
en-US grouping) so it matches the app.

**Verify**: `tsgo --noEmit` → exit 0.

### Step 3: Thread currency + price through the render path

Update the two render entry points and the component:

**`buildWidgetTree`** signature becomes:

```ts
export function buildWidgetTree(
  summary: PortfolioSummary | null,
  displayCurrency: DisplayCurrency,
  solUsdPrice: number | null,
): WidgetRepresentation {
  // ... lastUpdated as before ...
  if (!summary || summary.positionCount === 0) {
    return <NoPositionsWidget lastUpdated={`Updated ${lastUpdated}`} />
  }
  return (
    <PortfolioSummaryWidget
      summary={summary}
      lastUpdated={`Updated ${lastUpdated}`}
      displayCurrency={displayCurrency}
      solUsdPrice={solUsdPrice}
    />
  )
}
```

`PortfolioSummaryWidget`'s props interface gains `displayCurrency: DisplayCurrency` and `solUsdPrice: number | null`. Inside it, replace the four hardcoded SOL renderings. For each value site, compute via `formatCurrencyValue`, e.g. for VALUE:

```tsx
// before
const valueDisplay = hasData ? formatSolValue(summary.totalValueSol) : '—'
// after
const valueDisplay = hasData ? formatSolValue(summary.totalValueSol) : '—'
const valueFmt = hasData
  ? formatCurrencyValue(summary.totalValueSol, displayCurrency, solUsdPrice)
  : null
```

and in JSX:

```tsx
<TextWidget text={valueFmt ? valueFmt.value : '—'} style={{ fontSize: 14, color: COLORS.text }} />
<TextWidget text={valueFmt ? valueFmt.suffix : ''} style={{ fontSize: 10, color: COLORS.textMuted }} />
```

Apply the same pattern to all four sites: PnL (note PnL also has a leading `sign` `TextWidget` and color — keep those; only replace the numeric + suffix `TextWidget`s), VALUE, DEPOSITED, UNCLAIMED FEES.

For PnL specifically, the existing logic computes `pnlColor` from `summary.totalPnlSol >= 0` and a `sign` (`+`/`-`). Keep that; only the magnitude value + suffix switch currency.

**`portfolioWidgetTaskHandler.tsx`** — fetch the currency + price and pass them through. The handler already calls `fetchPortfolioSummary(walletAddress)`. Add right before `renderWidget`:

```ts
import { getStoredDisplayCurrency } from '../stores/settingsStore'
import { getCurrentSolUsdPrice } from '../services/solPrice'

// ... inside the handler, after `summary` is obtained:
const displayCurrency = getStoredDisplayCurrency()
const solUsdPrice = displayCurrency === 'USD' ? await getCurrentSolUsdPrice() : null
renderWidget(buildWidgetTree(summary, displayCurrency, solUsdPrice))
```

Fetch the SOL price only when needed (USD mode) to avoid an extra network call in SOL mode.

`buildErrorWidget` signature is unchanged (errors don't show values).

**Verify**: `tsgo --noEmit` → exit 0.

### Step 4: Lint, format, build, test

```
bun run lint && bun run fmt && bun run build && bun run test
```

**Verify**: all exit 0; tests pass.

## Test plan

- Add a unit test for `getStoredDisplayCurrency()` in `src/__tests__/stores/settingsStore.test.ts` (file already exists — model after its existing tests). Cases:
  - returns `'SOL'` when the MMKV key is absent.
  - returns `'USD'` when the persisted state has `displayCurrency: 'USD'`.
  - returns `'SOL'` on malformed JSON (catch path).
  - returns `'SOL'` when the value is neither `'SOL'` nor `'USD'`.
  Mock `react-native-mmkv` the way the existing settingsStore test does (see the setup in `src/__tests__/setup.ts`).
- Add a unit test for `formatCurrencyValue` in a new `src/__tests__/widgets/updatePortfolioWidget.test.ts` (or extend the nearest existing widget test). Cases:
  - SOL mode → `{ value: '0.0000', suffix: ' SOL' }` for 0; correct 4-decimal formatting otherwise.
  - USD mode with a price → multiplies and uses 2 decimals + `' USD'`.
  - USD mode with `null` price → value `0`, suffix `' USD'`.
- Verification: `bun run test` → all pass, including the new tests.

## Done criteria

ALL must hold:

- [ ] `tsgo --noEmit` exits 0
- [ ] `bun run lint`, `bun run fmt`, `bun run build` all exit 0
- [ ] `bun run test` exits 0; new tests for `getStoredDisplayCurrency` and `formatCurrencyValue` exist and pass
- [ ] `rg '" SOL"' src/widgets/updatePortfolioWidget.tsx` returns no matches (all four sites converted — the literal `" SOL"` should no longer appear; `formatCurrencyValue` produces the suffix instead)
- [ ] `rg "displayCurrency|solUsdPrice" src/widgets/updatePortfolioWidget.tsx` shows the new props threaded through `buildWidgetTree` and `PortfolioSummaryWidget`
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The zustand persist key is not `'settings-store'` or the JSON shape is not `{ state: {...}, version }` (re-read `settingsStore.ts` and a sample read if needed; if the shape differs, the `getStoredDisplayCurrency` parser must be fixed, not hand-waved).
- `getCurrentSolUsdPrice` cannot be imported without pulling React into the widget bundle (it should be fine — it uses `createDataServices`, no React — but if `tsgo` or the build flags a React import in the headless path, STOP).
- Plan 006 has not landed (the widget file still imports `createPositionPipeline`) — do this plan after 006.
- A value site has rendering the plan didn't anticipate (e.g. a fifth ` SOL` site appears in `rg`).

## Maintenance notes

- **Why the percentage is not touched**: the app displays `pnlSolPctChange` regardless of currency (see the analysis in `plans/004`). Under the API's derivation the USD and SOL percentages are expected to be equal (both derived from the same spot `solPrice`, so it cancels in the ratio). Changing the % source is cosmetic and out of scope; if a future empirical check proves them different, revisit then.
- **SOL price freshness**: `getCurrentSolUsdPrice` is CacheManager-backed (60s TTL). A widget that refreshes more often than every 60s will reuse the cached price — acceptable.
- **USD fallback**: when `solUsdPrice` is null (network/API failure) in USD mode, values render as `0`. This matches `formatUsdFromSol`'s existing behavior in the app. If a "—" fallback is preferred for the widget, that's a one-line change in `formatCurrencyValue` — deferred.
- **Reviewer focus**: the four value sites are all converted (no stray hardcoded `" SOL"`), the SOL price is fetched only in USD mode, and `getStoredDisplayCurrency` is defensive against malformed/missing storage.

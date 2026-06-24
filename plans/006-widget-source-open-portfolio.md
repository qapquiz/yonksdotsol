# Plan 006: Switch the widget's data source to metcomet's `fetchOpenPortfolioSummary`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 7496775..HEAD -- src/widgets/updatePortfolioWidget.tsx src/services/positionPipeline.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/005-metcomet-open-portfolio-summary.md` (must be merged **and published to npm** before this plan starts)
- **Category**: tech-debt (data-path simplification)
- **Planned at**: app commit `7496775`, 2026-06-14

## Why this matters

The Android widget (`portfolioWidgetTaskHandler.tsx`) currently calls
`createPositionPipeline().fetchPortfolioSummary(walletAddress)`, which runs
the **full** `loadPortfolio()` pipeline: an on-chain SDK scan of every
position, per-mint token-price fetches, and one `/positions/{pool}/pnl` call
per pool — all to produce 7 summary numbers for a home-screen widget. That is
a lot of work + network for a headless widget refresh, and it reconstructs
client-side a total the server already computes.

metcomet's new `fetchOpenPortfolioSummary()` (Plan 005) returns those same
numbers from a single paginated `/portfolio/open` call with server-aggregated
totals. This plan rewires the widget to use it, and removes the now-dead
widget-only convenience method on `PositionPipeline`.

## Current state

**Widget data path today** — `src/widgets/updatePortfolioWidget.tsx` exports a
local function (around line 520):

```ts
export async function fetchPortfolioSummary(walletAddress: string): Promise<PortfolioSummary | null> {
  const pipeline = createPositionPipeline()
  const result = await pipeline.fetchPortfolioSummary(walletAddress)
  if (!result) return null
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

`createPositionPipeline` is imported from `../services/positionPipeline`.
`PortfolioSummary` is the interface defined at the top of
`updatePortfolioWidget.tsx` (fields: `totalPnlSol`, `totalPnlPercent`,
`totalValueSol`, `totalInitialDepositSol`, `totalUnclaimedFeesSol`,
`positionCount`, `outOfRangeCount`, `feesTvl24h: number | null`).

**`PositionPipeline.fetchPortfolioSummary`** (`src/services/positionPipeline.ts`,
around line 162) is the widget-only convenience that calls `loadPortfolio()`
and projects to `PortfolioSummaryWidgetData`. Confirm it has no other caller:

```
rg "pipeline\.fetchPortfolioSummary|\.fetchPortfolioSummary\(" src/
```
Expected: only `src/widgets/updatePortfolioWidget.tsx` matches.

**metcomet's new shape** (from Plan 005):

```ts
interface OpenPortfolioSummary {
  total: TotalMetrics;          // { pnlSol, pnlSolPctChange, balancesSol, unclaimedFeesSol, ... }
  solPrice: string | null;
  positionCount: number;
  totalInitialDepositSol: string | null;
  outOfRangeCount: number;
  feesTvl24h: number | null;    // API percentage scale: 1.31 = 1.31% daily
}
```

**Repo conventions** (from `AGENTS.md`):
- No semicolons, single quotes, 2-space indent, trailing commas, arrow parens always, max 120.
- `import type` for type-only imports.
- Number formatting helpers live in `src/utils/positions/formatters.ts`.
- Verification: `tsgo --noEmit` (NOT `tsc`), `bun run lint`, `bun run fmt`, `bun run build`, `bun run test`.

## Commands you will need

| Purpose     | Command                          | Expected on success |
|-------------|----------------------------------|---------------------|
| Bump metcomet | `bun update metcomet`          | `metcomet` resolves to ≥ the published 0.4.0 |
| Type-check  | `tsgo --noEmit`                  | exit 0, no errors   |
| Lint        | `bun run lint`                   | exit 0              |
| Format      | `bun run fmt`                    | files formatted     |
| Build       | `bun run build`                  | exit 0              |
| Tests       | `bun run test`                   | all pass            |

## Scope

**In scope** (the only files you should modify):
- `src/widgets/updatePortfolioWidget.tsx` — rewrite the local `fetchPortfolioSummary` to call metcomet's `fetchOpenPortfolioSummary`.
- `src/services/positionPipeline.ts` — remove the now-unused `fetchPortfolioSummary` method and `PortfolioSummaryWidgetData` interface (after confirming no callers remain).

**Out of scope** (do NOT touch):
- `src/widgets/portfolioWidgetTaskHandler.tsx` — its call to the widget's `fetchPortfolioSummary` is unchanged (same signature, same return type).
- `src/services/positionPipeline.ts` `loadPortfolio()` / `PositionPipeline` class body — the full-app path is unchanged. Only remove the widget convenience method.
- `src/utils/positions/pnlAggregation.ts` — still used by `loadPortfolio`'s summary. Leave it.
- The USD toggle — that is Plan 007, separate.

## Git workflow

- Branch: `refactor/widget-open-portfolio-source`
- Commit style: conventional commits (`git log --oneline` for reference). Example: `refactor: source widget summary from metcomet open-portfolio`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 0 (gate): metcomet is published

This plan cannot start until Plan 005 is merged and published. Confirm:

```
bun pm ls 2>/dev/null | grep metcomet
```
or
```
node -e "console.log(require('./node_modules/metcomet/package.json').version)"
```

Then verify the published version exports the new function:
```
grep -c "fetchOpenPortfolioSummary" node_modules/metcomet/dist/index.js
```
→ must be `≥ 1`. If `0`, metcomet is not yet upgraded/published — STOP and report. If the operator wants to develop against an unpublished metcomet, they will set up a local link; do not attempt linking yourself without instruction.

If the installed version is older, run `bun update metcomet` and re-check. If the update does not bring in the function, STOP.

**Verify**: `grep -c "fetchOpenPortfolioSummary" node_modules/metcomet/dist/index.js` → ≥ 1.

### Step 1: Rewrite the widget's `fetchPortfolioSummary`

In `src/widgets/updatePortfolioWidget.tsx`, replace the body of the exported
`fetchPortfolioSummary`. The `PortfolioSummary` interface at the top of the
file stays exactly as-is (do not change its field names or types — the render
components consume it).

Change the import line that pulls `createPositionPipeline`:

```ts
// before
import { createPositionPipeline } from '../services/positionPipeline'
// after
import { fetchOpenPortfolioSummary } from 'metcomet'
```

Replace the function body with a pure mapping. metcomet returns SOL amounts
as strings and `feesTvl24h` in percentage scale; the app's `PortfolioSummary`
uses SOL numbers and a ratio-scale `feesTvl24h`:

```ts
export async function fetchPortfolioSummary(walletAddress: string): Promise<PortfolioSummary | null> {
  const summary = await fetchOpenPortfolioSummary({ user: walletAddress })
  if (!summary) return null

  const pnlSol = summary.total.pnlSol != null ? parseFloat(summary.total.pnlSol) : 0
  const pnlPct = summary.total.pnlSolPctChange != null ? parseFloat(summary.total.pnlSolPctChange) : 0
  const valueSol = summary.total.balancesSol != null ? parseFloat(summary.total.balancesSol) : 0
  const feesSol = summary.total.unclaimedFeesSol != null ? parseFloat(summary.total.unclaimedFeesSol) : 0
  const depositSol = summary.totalInitialDepositSol != null ? parseFloat(summary.totalInitialDepositSol) : 0

  return {
    totalPnlSol: Number.isFinite(pnlSol) ? pnlSol : 0,
    totalPnlPercent: Number.isFinite(pnlPct) ? pnlPct : 0,
    totalValueSol: Number.isFinite(valueSol) ? valueSol : 0,
    totalInitialDepositSol: Number.isFinite(depositSol) ? depositSol : 0,
    totalUnclaimedFeesSol: Number.isFinite(feesSol) ? feesSol : 0,
    positionCount: summary.positionCount,
    outOfRangeCount: summary.outOfRangeCount,
    // API returns percentage scale (1.31 = 1.31%); app stores ratio (0.0131).
    feesTvl24h: summary.feesTvl24h != null ? summary.feesTvl24h / 100 : null,
  }
}
```

Notes:
- Keep `PortfolioSummary` interface unchanged.
- `parseFloat(null)` would throw — the null-guards above prevent it. Do not collapse them.
- `feesTvl24h / 100` mirrors the existing `parseFeePerTvl24h` convention in `src/utils/positions/formatters.ts` (percentage → ratio).

**Verify**: `tsgo --noEmit` → exit 0.

### Step 2: Remove the dead widget convenience from `PositionPipeline`

First, confirm no remaining caller:

```
rg "fetchPortfolioSummary" src/ --type ts --type tsx
```
Expected matches: ONLY `src/widgets/updatePortfolioWidget.tsx` (its own
declaration) and `src/widgets/portfolioWidgetTaskHandler.tsx` (its caller).
`src/services/positionPipeline.ts` should still match (the definition you are
about to delete). If ANY other file matches, STOP — the method is not dead.

In `src/services/positionPipeline.ts`:
- Delete the `fetchPortfolioSummary` method (the `async fetchPortfolioSummary(walletAddress: string): Promise<PortfolioSummaryWidgetData | null> { ... }` block).
- Delete the `PortfolioSummaryWidgetData` interface (exported near the top of the file) — but first confirm it is not imported elsewhere:
  ```
  rg "PortfolioSummaryWidgetData" src/
  ```
  Expected: only its declaration in `positionPipeline.ts`. If anything else imports it, STOP.

**Verify**:
```
tsgo --noEmit && rg "fetchPortfolioSummary|PortfolioSummaryWidgetData" src/services/positionPipeline.ts
```
→ type-check exit 0; the rg returns no matches.

### Step 3: Lint, format, build, test

```
bun run lint && bun run fmt && bun run build && bun run test
```

**Verify**: all exit 0; tests pass.

## Test plan

- No new unit test required for the mapping (it is a pure projection; the existing widget tests, if any, plus metcomet's real-API test from Plan 005, cover the path).
- Check `src/__tests__/` for an existing `positionPipeline` test that may have referenced the removed method:
  ```
  rg -l "fetchPortfolioSummary|PortfolioSummaryWidgetData" src/__tests__/
  ```
  If a test references them, update or remove those assertions as part of Step 2 (in scope: the test file is a caller and must compile). Model any replacement assertion on the existing `src/__tests__/services/positionPipeline.test.ts` style.
- Manual verification (operator, not executor): build the dev client and confirm the widget still renders summary numbers. Not executable in CI; noted for the reviewer.

## Done criteria

ALL must hold:

- [ ] `node -e "console.log(require('./node_modules/metcomet/package.json').version)"` shows a version that exports `fetchOpenPortfolioSummary`
- [ ] `grep -c fetchOpenPortfolioSummary node_modules/metcomet/dist/index.js` ≥ 1
- [ ] `tsgo --noEmit` exits 0
- [ ] `bun run lint`, `bun run fmt`, `bun run build` all exit 0
- [ ] `bun run test` exits 0
- [ ] `rg "createPositionPipeline|PositionPipeline" src/widgets/` returns no matches (widget no longer depends on the pipeline)
- [ ] `rg "fetchPortfolioSummary|PortfolioSummaryWidgetData" src/services/positionPipeline.ts` returns no matches
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- metcomet's installed version does not export `fetchOpenPortfolioSummary` after `bun update metcomet` (Plan 005 not yet published — do NOT attempt to publish or link yourself).
- Any caller of `PositionPipeline.fetchPortfolioSummary` or `PortfolioSummaryWidgetData` exists outside the two expected files.
- The metcomet `OpenPortfolioSummary` shape doesn't match Plan 005's (e.g. field renames) — re-read `node_modules/metcomet/dist/index.d.ts` for the actual shape and adjust the mapping; if a field is genuinely absent, STOP and report.
- `tsgo --noEmit` reports an error in a file you did not edit.

## Maintenance notes

- **Summary/card divergence**: after this plan, the widget's summary uses `/portfolio/open` `total` (server-aggregated), while the in-app summary in `PortfolioSummary.tsx` still uses client-side aggregation of `/positions/{pool}/pnl` (via `usePositionsPage` → `pnlAggregation`). The two should agree in USD; in SOL they may differ slightly because the server's `totalDepositSol` uses historical per-event SOL pricing while the per-position path's `allTimeDeposits.total.sol` methodology is undocumented. This is acceptable for the widget; if the in-app summary should also switch, that is a separate follow-up (not in this plan).
- **Plan 007 (USD toggle)** builds on top of this file — sequence it after this plan lands to avoid edit conflicts in `updatePortfolioWidget.tsx`.
- **Reviewer focus**: the `feesTvl24h / 100` scale conversion, the null-guards on every `parseFloat`, and the completeness of the dead-code removal.

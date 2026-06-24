# Plan 005: Add `fetchOpenPortfolioSummary()` to metcomet

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **This plan operates on a DIFFERENT repo**: `../metcomet` (relative to the
> app repo at `/home/moshi/forge/yonksdotsol`). All paths below are relative
> to `/home/moshi/forge/metcomet` unless noted.
>
> **Drift check (run first)**: `cd /home/moshi/forge/metcomet && git diff --stat 9a94962..HEAD -- src/api/portfolio.ts src/api/types.ts src/index.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction (library feature)
- **Planned at**: metcomet commit `9a94962`, 2026-06-14

## Why this matters

Today every consumer of metcomet that wants a *portfolio-level* summary (total
PnL, total value, total fees, out-of-range count) must call
`/positions/{pool}/pnl` once per pool and re-aggregate client-side. That is N
HTTP calls + duplicated aggregation logic to reconstruct a number the
Meteora API already computes server-side in a single endpoint
(`/portfolio/open` → `response.total`).

This plan adds one convenience function that walks the paginated
`/portfolio/open` endpoint and returns the server-aggregated totals plus the
three fields that genuinely require cross-page aggregation
(`totalInitialDepositSol`, `outOfRangeCount`, `feesTvl24h`). It is a pure
addition — no existing function changes. The immediate consumer is the Yonks
app's Android widget (Plan 006), but the pagination logic belongs in the
library so every consumer gets it once.

## Current state

**The endpoint client already exists** — `src/api/portfolio.ts` has
`fetchOpenPortfolio(params)` returning `OpenPortfolioResponse | null`. It
fetches **one page only** (no `hasNext` loop anywhere in the codebase —
confirmed: `rg "hasNext|page\+1|while" src/` returns only type definitions).

**Response shape** (`src/api/types.ts:229` and `:240`):

```ts
export interface TotalMetrics {
  balances: string;          // total current value, USD
  balancesSol: string | null;
  unclaimedFees: string;
  unclaimedFeesSol: string | null;
  pnl: string;               // USD
  pnlPctChange: string;      // USD
  pnlSol: string | null;
  pnlSolPctChange: string | null;
}

export interface PoolOpenPortfolioItem {
  // ...
  balancesSol: string | null;
  feePerTvl24h: string;            // API percentage scale: "1.31" = 1.31% daily
  totalDepositSol: string | null;  // "historical per-event SOL price" per OpenAPI spec
  positionsOutOfRange: string[];   // position addresses out of range in this pool
  openPositionCount: number;
  // ...
}

export interface OpenPortfolioResponse {
  pools: PoolOpenPortfolioItem[];
  total: TotalMetrics;
  solPrice: string | null;
  totalCount: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}
```

**Existing pagination+aggregation precedent**: `fetchAllOpenPositionsWithPnL`
in `src/api/portfolio.ts` already iterates `openPortfolio.pools` after a single
page fetch — but it does NOT loop `hasNext`. This plan adds the first
multi-page walker.

**Repo conventions** (from `AGENTS.md`):
- Tabs, single quotes, `import type` for type-only imports, `verbatimModuleSyntax: true`.
- `noUncheckedIndexedAccess: true` — handle possibly-undefined access.
- Files: camelCase. Functions: `fetch*` prefix for API calls. Returns: `Promise<T | null>`.
- Tests: `bun:test` (`import { expect, test, describe } from "bun:test"`). Real-API test pattern: `test/api-portfolio.test.ts` uses `TEST_WALLET` and `SOL_USDC_POOL` constants.
- Build: `bun run build`. Type-check: `bun run type-check`. Lint: `bun run lint`. Format: `bun run format`.

## Commands you will need

| Purpose    | Command                          | Expected on success |
|------------|----------------------------------|---------------------|
| Type-check | `bun run type-check`             | exit 0, no errors   |
| Lint       | `bun run lint`                   | exit 0              |
| Format     | `bun run format`                 | files formatted     |
| Build      | `bun run build`                  | exit 0, `dist/` written |
| Test       | `bun test test/api-portfolio.test.ts` | tests pass     |

(All run from `/home/moshi/forge/metcomet`.)

## Scope

**In scope** (the only files you should modify):
- `src/api/portfolio.ts` — add `fetchOpenPortfolioSummary()`.
- `src/api/types.ts` — add the `OpenPortfolioSummary` interface + `FetchOpenPortfolioSummaryParams` (if params needed).
- `src/index.ts` — no change needed (it does `export * from "./api"`; verify the new function is exported by the api barrel — see step 1).
- `src/api/index.ts` — verify/extend the barrel re-export.
- `test/api-portfolio.test.ts` — add a test.

**Out of scope** (do NOT touch):
- `src/upnl.ts`, `src/initialDepositHelius.ts`, `src/solPrice.ts` — the Helius-based historical-SOL path. This plan does not use it; the API already returns historical-SOL deposit pricing for `totalDepositSol`.
- Any change to `fetchOpenPortfolio` signature or behavior (callers depend on it).
- The `TotalMetrics` interface — do NOT add `totalPositions` to it (a real but irrelevant gap; see plans/README.md "rejected"). `positionCount` is derived by summing `openPositionCount` across pages.

## Git workflow

- Branch: `feat/open-portfolio-summary`
- Commit style: conventional commits (repo uses `feat:`, `fix:`, `chore:` — see `git log --oneline`). Example message: `feat: add fetchOpenPortfolioSummary for paginated totals`.
- Do NOT publish to npm in this plan. Version bump + publish is the gate of Plan 006. (You may run `bun run build` to confirm the dist builds.)

## Steps

### Step 1: Confirm the export barrel surfaces new exports

`src/api/index.ts` must re-export everything from `portfolio.ts`. Check it does a wildcard re-export of `portfolio.ts`. If it lists names explicitly, add the new name in Step 4.

**Verify**: `cat src/api/index.ts` → contains `export * from "./portfolio"` (or equivalent that will pick up the new function). If it uses named exports, note it for Step 4.

### Step 2: Add the summary types

In `src/api/types.ts`, after the `OpenPortfolioResponse` / `FetchOpenPortfolioParams` block (around line 288), add:

```ts
// ============================================================
// Open Portfolio Summary (paginated + aggregated)
// ============================================================

/**
 * Portfolio-level summary built by walking all pages of /portfolio/open.
 *
 * - The `total` object and `solPrice` are passed through verbatim from the
 *   first page's server-aggregated response (they are stable across pages).
 * - `totalInitialDepositSol`, `outOfRangeCount`, and `feesTvl24h` are
 *   derived by aggregating across every page (the API does not roll these
 *   into `total`).
 * - `feesTvl24h` is a portfolio-SOL-weighted average, returned in the API's
 *   native PERCENTAGE scale (1.31 = 1.31% daily). Consumers that store a
 *   ratio should divide by 100.
 * - `totalInitialDepositSol` is a string in SOL, or null if any page lacked
 *   SOL pricing (`totalDepositSol` is null when the server's `solPrice` is
 *   unavailable). If any page is null, the aggregate is reported null rather
 *   than a partial sum.
 */
export interface OpenPortfolioSummary {
  total: TotalMetrics;
  solPrice: string | null;
  positionCount: number;
  totalInitialDepositSol: string | null;
  outOfRangeCount: number;
  feesTvl24h: number | null;
}

export interface FetchOpenPortfolioSummaryParams {
  user: string;
  /** Pools per page (API max 50). Default 50 to minimize round-trips. */
  page_size?: number;
}
```

**Verify**: `bun run type-check` → exit 0.

### Step 3: Implement `fetchOpenPortfolioSummary`

In `src/api/portfolio.ts`, add the function (place it after `fetchOpenPortfolio`, before `fetchPortfolioTotal`). It reuses the existing `fetchOpenPortfolio`:

```ts
async function fetchOpenPortfolioSummary(
  params: FetchOpenPortfolioSummaryParams,
): Promise<OpenPortfolioSummary | null> {
  const { user, page_size = 50 } = params;

  let firstPage: OpenPortfolioResponse | null = null;
  let totalInitialDepositSol: number | null = 0;
  let outOfRangeCount = 0;
  let positionCount = 0;
  let weightedFeeSum = 0;
  let feeWeightSum = 0;
  let depositSolMissing = false;

  let page = 1;
  // Hard safety cap so a buggy `hasNext` can never loop forever.
  const MAX_PAGES = 100;

  while (page <= MAX_PAGES) {
    const response = await fetchOpenPortfolio({ user, page, page_size });
    if (!response) {
      // First-page failure → whole call fails (matches other fetch* null returns).
      // Later-page failure → return what we have so far with server totals.
      if (firstPage === null) return null;
      break;
    }
    if (firstPage === null) firstPage = response;

    for (const pool of response.pools) {
      positionCount += pool.openPositionCount;
      outOfRangeCount += pool.positionsOutOfRange.length;

      if (pool.totalDepositSol != null) {
        if (totalInitialDepositSol !== null) {
          totalInitialDepositSol += parseFloat(pool.totalDepositSol);
        }
      } else {
        depositSolMissing = true;
      }

      // Weighted fees/TVL by pool SOL value; fall back to USD if SOL null.
      const weightRaw = pool.balancesSol ?? pool.balances;
      const weight = parseFloat(weightRaw);
      const ratioPct = parseFloat(pool.feePerTvl24h);
      if (Number.isFinite(weight) && weight > 0 && Number.isFinite(ratioPct) && ratioPct >= 0) {
        weightedFeeSum += ratioPct * weight;
        feeWeightSum += weight;
      }
    }

    if (!response.hasNext) break;
    page += 1;
  }

  if (firstPage === null) return null;

  const feesTvl24h = feeWeightSum > 0 ? weightedFeeSum / feeWeightSum : null;

  return {
    total: firstPage.total,
    solPrice: firstPage.solPrice,
    positionCount,
    totalInitialDepositSol: depositSolMissing ? null : totalInitialDepositSol?.toFixed(6) ?? null,
    outOfRangeCount,
    feesTvl24h,
  };
}
```

Notes the executor must honor:
- `noUncheckedIndexedAccess` is on — the `for...of` over arrays is fine; do not index with `[i]` without a guard.
- `parseFloat("")` is `NaN`; `Number.isFinite` guards handle it.
- Do not convert `feesTvl24h` to a ratio here — keep the API's native percentage scale and document it (the consumer decides its convention).
- The `MAX_PAGES = 100` cap is a defensive bound; at `page_size=50` that is 5000 pools, far beyond any real wallet.

**Verify**: `bun run type-check` → exit 0.

### Step 4: Export it

Add `fetchOpenPortfolioSummary` to the `export { ... }` block at the bottom of `src/api/portfolio.ts`, and add the two new type names to the `import type { ... }` at the top of the file. Confirm `src/api/index.ts` surfaces it (wildcard re-export from `./portfolio` means no extra work; if named, add it).

**Verify**:
```
bun run build && grep -c "fetchOpenPortfolioSummary" dist/index.js
```
→ prints `1` or more (the function is in the built output).

### Step 5: Add a test

In `test/api-portfolio.test.ts`, model after the existing `fetchOpenPortfolio` test (which uses `TEST_WALLET`). Add inside the existing `describe("Portfolio API - Real API Tests", ...)` block:

```ts
test("fetchOpenPortfolioSummary aggregates across pages", async () => {
  const result = await fetchOpenPortfolioSummary({
    user: TEST_WALLET,
    page_size: 50,
  });

  // If the test wallet has no open positions, the API still returns a valid
  // response with empty pools — treat either case as success.
  expect(result).not.toBeNull();
  expect(typeof result?.total).toBe("object");
  expect(typeof result?.positionCount).toBe("number");
  expect(typeof result?.outOfRangeCount).toBe("number");
  expect(result?.feesTvl24h === null || typeof result?.feesTvl24h === "number").toBe(true);
  expect(result?.totalInitialDepositSol === null || typeof result?.totalInitialDepositSol === "string").toBe(true);
});
```

Add `fetchOpenPortfolioSummary` to the import list at the top of the test file.

**Verify**: `bun test test/api-portfolio.test.ts` → the new test passes (network required; the existing tests already require it).

### Step 6: Lint, format, build

```
bun run lint && bun run format && bun run build
```

**Verify**: all exit 0; `dist/index.js` and `dist/index.d.ts` updated and contain `fetchOpenPortfolioSummary`.

## Test plan

- New test in `test/api-portfolio.test.ts` (above) — happy path against the real API, asserts shape and the nullable contracts on `feesTvl24h` / `totalInitialDepositSol`.
- No unit test for the pagination loop's failure modes — the real-API test covers the common path; mocking `fetchOpenPortfolio` is out of scope for this repo's existing test style (all portfolio tests are real-API).
- Structural pattern to follow: the existing `fetchOpenPortfolio` test in the same file.

## Done criteria

ALL must hold:

- [ ] `bun run type-check` exits 0
- [ ] `bun run lint` exits 0
- [ ] `bun run build` exits 0 and `grep fetchOpenPortfolioSummary dist/index.js` matches
- [ ] `bun test test/api-portfolio.test.ts` passes, including the new test
- [ ] `fetchOpenPortfolioSummary` is exported from the package root (`grep -c fetchOpenPortfolioSummary dist/index.js` ≥ 1 AND `dist/index.d.ts` declares it)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at `src/api/portfolio.ts` / `src/api/types.ts` doesn't match the excerpts above (codebase has drifted).
- `fetchOpenPortfolio` does not return `hasNext` (the whole pagination design depends on it — re-read `OpenPortfolioResponse` in `src/api/types.ts`).
- The real-API test wallet `TEST_WALLET` returns an unexpected shape (e.g. `total` is absent) — report the actual shape rather than rewriting assertions.
- `bun run build` fails for a reason unrelated to the new code.
- You are asked to publish to npm — publishing belongs to Plan 006; stop and let the operator decide.

## Maintenance notes

- **Plan 006 depends on this.** It cannot proceed until this plan is merged AND metcomet is published to npm (or locally linked) at a version the app can install.
- **Publishing step (done in Plan 006, not here)**: `bun run release` runs `bumpp --commit --push --tag`. Decide patch (`0.3.6`) vs minor (`0.4.0`); recommend **minor (`0.4.0`)** since this adds a public API surface.
- **Future**: if the API ever rolls `totalDepositSol`, `positionsOutOfRange`, or a fees/TVL rollup into `total`, the cross-page aggregation here becomes redundant — simplify by reading `total` directly.
- **Reviewer focus**: the `MAX_PAGES` bound, the null-vs-partial decision on `totalInitialDepositSol`, and the weight fallback (`balancesSol ?? balances`) for the fees/TVL average.

# Plan 002: Decide the fate of the orphaned historical-price code (recommend: delete)

> **Executor instructions**: This plan contains a **decision gate** in the next
> section. The human maintainer must pick Option A or Option B before you start.
> The steps below implement **Option A (delete)**, which is the recommended
> default. If the maintainer chooses Option B, **do not run these steps** —
> stop and report that a feature plan is needed. Run every verification command
> and confirm the expected result before moving to the next step. If anything in
> the "STOP conditions" section occurs, stop and report. When done, update the
> status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 86a1d22..HEAD -- src/services/data.ts src/config/cache.ts src/__tests__/services/data.test.ts src/__tests__/utils/dataFetching.test.ts src/__tests__/services/positionPipeline.test.ts src/utils/positions/meteora-ohlcv.ts src/utils/positions/pyth-benchmarks.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.
>
> **Reconciliation note (advisor pre-dispatch, 2026-06-14):** the original
> scope missed two test files that also reference the deleted symbols and would
> break the build/tests after deletion. They existed at `86a1d22` unchanged, so
> this is a plan-scope gap, not drift. Both are now in scope (see Step 4):
> - `src/__tests__/utils/dataFetching.test.ts` — contains its own
>   `describe('fetchOHLCVPriceAtTimestamp')` and `describe('fetchHistoricalSOLPriceFromApi')`
>   blocks (lines 106–278) that `await import(...)` the deleted modules. The top
>   `describe('fetchTokenFromRpc')` block (the live token service) MUST stay.
> - `src/__tests__/services/positionPipeline.test.ts:52-53` — mocks `OHLCV_PRICE`/
>   `PYTH_PRICE` inside its `vi.mock('../../config/cache')` factory; remove those
>   two lines so the done-criteria grep stays clean.

## Status

- **Priority**: P2
- **Effort**: S (Option A) / L (Option B)
- **Risk**: LOW (Option A)
- **Depends on**: none
- **Category**: direction (decision + tech-debt)
- **Planned at**: commit `86a1d22`, 2026-06-13

## Decision required (human picks before executing)

This is a direction spike, not a single predetermined build. Two mutually
exclusive outcomes:

- **Option A — Delete the orphan (RECOMMENDED, steps below).** The
  historical-price layer is fully implemented but **never called** anywhere in
  production. Keeping it pays ongoing maintenance/test cost for a feature that
  was superseded when `metcomet` began providing PnL directly. Deletion is small,
  low-risk, and removes ~180 lines + their tests. **Choose this unless there is
  an active decision to build a portfolio value-over-time chart right now.**
- **Option B — Build the value-over-time chart (NOT stepped here).** The
  scaffolding (`PriceService.getPoolPrice`, `getHistoricalSOLPrice`) was clearly
  intended to power a historical-value chart. If the maintainer wants that
  feature, this plan is the wrong artifact — request a dedicated feature plan
  that designs the chart UI, the cost-basis model, and reconciles it with the
  `metcomet` PnL data already shown. Do **not** half-build it from these steps.

> If unsure, default to **Option A**: deleting is reversible from git, and a
> future chart feature can re-add exactly what it needs.

## Why this matters

`src/services/data.ts` exposes a `PriceService` with `getPoolPrice` and
`getHistoricalSOLPrice`, backed by `src/utils/positions/meteora-ohlcv.ts` and
`src/utils/positions/pyth-benchmarks.ts`. These are implemented, exported, unit-
tested, and imported by `data.ts` — and **have zero callers in production code**.
`PositionPipeline` (the only consumer of `createDataServices`) reads
`this.dataServices.tokens` and never touches `this.dataServices.prices`. This is
dead weight: it enlarges the API surface, its tests must be maintained, and it
misleads future readers into thinking historical pricing is wired up. (Plan 003,
the USD toggle, fetches the *current* SOL price via the token service and is
unaffected by deleting the *historical* price path.)

## Current state

All excerpts are from commit `86a1d22`. Confirm each before editing.

**`PriceService` is defined but never called.** `src/services/data.ts:25-35`:

```ts
export interface PriceService {
  /** Fetch OHLCV candle closest to timestamp for a pool (cached) */
  getPoolPrice(poolAddress: string, timestamp: number, timeframe?: string): Promise<number | null>
  /** Fetch historical SOL price from Pyth (cached) */
  getHistoricalSOLPrice(timestamp: number): Promise<number | null>
}
```

and the `DataServices` interface (`src/services/data.ts:39-42`):

```ts
export interface DataServices {
  tokens: TokenService
  prices: PriceService
}
```

`createDataServices` builds both `tokens` and `prices` and returns
`{ tokens, prices }` (`src/services/data.ts:44-98`). The `prices` implementation
uses `getOHLCVKey` / `getPythPriceKey` helpers and imports the two fetchers.

**The pipeline only uses `tokens`.** `src/services/positionPipeline.ts` imports
`createDataServices`, stores `this.dataServices`, and calls
`this.dataServices.tokens.getPrices(...)` (Step 2 of `loadPortfolio`). A repo-
wide search for `getPoolPrice` / `getHistoricalSOLPrice` / `.prices.` returns
**only** `src/services/data.ts` (plus its test) — no production caller.

**The TTL constants are price-only.** `src/config/cache.ts` (full file):

```ts
export const CACHE_TTL = {
  UPNL_PER_POSITION: 15 * 60 * 1000,
  TOKEN_DATA: 60 * 1000, // 1 minute
  OHLCV_PRICE: 60 * 60 * 1000, // 1 hour
  PYTH_PRICE: 60 * 60 * 1000, // 1 hour
}
```

`OHLCV_PRICE` and `PYTH_PRICE` are used only by the `prices` implementation.

**The test covers the orphan.** `src/__tests__/services/data.test.ts` has a full
`describe('PriceService', ...)` block (~lines 95-145) that mocks
`fetchOHLCVPriceAtTimestamp` and `fetchHistoricalSOLPriceFromApi` and asserts
caching. The top of the file also `vi.mock`s both fetch modules and imports them.

## Commands you will need

| Purpose          | Command                                              | Expected on success |
|------------------|------------------------------------------------------|---------------------|
| Type check       | `tsgo --noEmit` (or `bunx tsgo --noEmit`)            | exit 0, no errors (do NOT use `tsc`) |
| Lint (check)     | `bun run lint:check`                                 | exit 0 |
| Format           | `bun run fmt`                                        | exit 0 |
| Tests (all)      | `bun run test`                                       | all pass |
| Tests (data)     | `bun run test -- src/__tests__/services/data.test.ts` | all pass |

## Scope (Option A)

**In scope** (the only files you should modify or delete):
- `src/utils/positions/meteora-ohlcv.ts` — **delete**
- `src/utils/positions/pyth-benchmarks.ts` — **delete**
- `src/services/data.ts` — remove the `PriceService` interface, the `prices`
  implementation, the `getOHLCVKey`/`getPythPriceKey` helpers, the imports of
  the two deleted fetchers, `CACHE_TTL` import of the removed TTLs, and the
  `prices` field from `DataServices`
- `src/config/cache.ts` — remove `OHLCV_PRICE` and `PYTH_PRICE`
- `src/__tests__/services/data.test.ts` — remove the `PriceService` describe
  block, the two `vi.mock` calls for the deleted modules, and their imports
- `src/__tests__/utils/dataFetching.test.ts` — remove the two describe blocks
  `fetchOHLCVPriceAtTimestamp` and `fetchHistoricalSOLPriceFromApi` and their
  section-separator comments (everything from the
  `// ─── meteora-ohlcv.ts:` comment at line 106 through end of file, line 278).
  KEEP the top `describe('fetchTokenFromRpc')` block (lines 1–~105) — it tests
  the live token service, not the deleted price path.
- `src/__tests__/services/positionPipeline.test.ts` — remove the two lines
  `OHLCV_PRICE: 60 * 60 * 1000,` and `PYTH_PRICE: 60 * 60 * 1000,` (lines 52–53)
  from the `vi.mock('../../config/cache')` factory; leave `UPNL_PER_POSITION`
  and `TOKEN_DATA`.

**Out of scope** (do NOT touch):
- `src/services/positionPipeline.ts` — it only uses `tokens`; do not change it.
- `TokenService` and the token fetch path (`src/tokens/index.ts`) — still in use.
- Documentation (`docs/raw/`, wiki). Those files are **already** broadly stale
  (they reference `useUpnlPerPosition`, `calculations.ts`, `pnlStore.ts`, etc.
  that no longer exist). Cleaning them is a separate docs task; do not partially
  edit them here.
- Plan 003 (USD toggle). It uses the *current* SOL price via the token service,
  not the *historical* path deleted here. The two are independent.

## Git workflow

- Branch: `advisor/002-remove-historical-price`
- Commit per step; conventional-commit style (e.g.
  `refactor: remove unused historical price service`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps (Option A)

Order matters: remove callers/imports first, then the implementations, so the
codebase type-checks at the end of each step.

### Step 1: Strip `PriceService` from `src/services/data.ts`

1. Remove the imports of the two deleted fetchers at the top:
   ```ts
   import { fetchOHLCVPriceAtTimestamp } from '../utils/positions/meteora-ohlcv'
   import { fetchHistoricalSOLPriceFromApi } from '../utils/positions/pyth-benchmarks'
   ```
2. Remove the `getOHLCVKey` and `getPythPriceKey` helper functions.
3. Remove the entire `PriceService` interface.
4. Remove the `prices` property from the `DataServices` interface (leave
   `tokens`).
5. Inside `createDataServices`, remove the whole `const prices: PriceService = { ... }`
   block, and change the return from `return { tokens, prices }` to
   `return { tokens }`.
6. If `CACHE_TTL` is now unused after removing the `prices` block, check: it is
   still used by the `tokens` implementation (`CACHE_TTL.TOKEN_DATA`), so keep
   the `CACHE_TTL` import.

**Verify**: `tsgo --noEmit` → exit 0 (the test file will still reference removed
symbols; that is fixed in Step 4 — if you prefer green tests between steps, do
Step 4 immediately after this one).

### Step 2: Remove the dead TTL constants

In `src/config/cache.ts`, delete the two lines:
```ts
  OHLCV_PRICE: 60 * 60 * 1000, // 1 hour
  PYTH_PRICE: 60 * 60 * 1000, // 1 hour
```
Leave `UPNL_PER_POSITION` and `TOKEN_DATA`.

**Verify**: `tsgo --noEmit` → exit 0 (only passes after Step 1 removed their
usage in `data.ts`).

### Step 3: Delete the two fetcher modules

```bash
rm src/utils/positions/meteora-ohlcv.ts src/utils/positions/pyth-benchmarks.ts
```

**Verify**: `ls src/utils/positions/` → the two files are gone; `formatters.ts`,
`computePositionViewData.ts`, `pnlAggregation.ts` remain.

### Step 4: Trim the tests (three files)

#### Step 4a: `src/__tests__/services/data.test.ts`
1. Remove the two `vi.mock` blocks:
   ```ts
   vi.mock('../../utils/positions/meteora-ohlcv', () => ({ fetchOHLCVPriceAtTimestamp: vi.fn() }))
   vi.mock('../../utils/positions/pyth-benchmarks', () => ({ fetchHistoricalSOLPriceFromApi: vi.fn() }))
   ```
2. Remove the imports of `fetchOHLCVPriceAtTimestamp` and
   `fetchHistoricalSOLPriceFromApi` (lines 6–7).
3. Remove the entire `describe('PriceService', () => { ... })` block.
4. Leave the `describe('DataServices', ...)` shell and the `TokenService` tests
   intact.

#### Step 4b: `src/__tests__/utils/dataFetching.test.ts` (added in reconciliation)
1. Delete everything from the `// ─── meteora-ohlcv.ts:` separator comment
   (line 106) through the end of file (line 278). This removes both the
   `describe('fetchOHLCVPriceAtTimestamp')` and
   `describe('fetchHistoricalSOLPriceFromApi')` blocks and their separators.
2. **KEEP** the top `describe('fetchTokenFromRpc')` block (lines 1–~105) and
   the file's top imports — `fetchTokenFromRpc` is the live token service and
   is not part of this deletion.
3. Leave exactly one trailing newline at end of file.

#### Step 4c: `src/__tests__/services/positionPipeline.test.ts` (added in reconciliation)
In the `vi.mock('../../config/cache', () => ({ CACHE_TTL: { ... } }))` factory
(around lines 48–55), delete these two lines:
```ts
    OHLCV_PRICE: 60 * 60 * 1000,
    PYTH_PRICE: 60 * 60 * 1000,
```
Leave `UPNL_PER_POSITION` and `TOKEN_DATA`. (The mock is for the pipeline's
own TTL usage; removing these unused keys is cosmetic + makes the done-criteria
grep clean. Runtime behaviour is unchanged either way.)

**Verify (after all of 4a/4b/4c)**:
- `bun run test -- src/__tests__/services/data.test.ts src/__tests__/utils/dataFetching.test.ts src/__tests__/services/positionPipeline.test.ts` → all remaining tests pass.
- `grep -rn "PriceService\|getPoolPrice\|getHistoricalSOLPrice\|fetchOHLCVPriceAtTimestamp\|fetchHistoricalSOLPriceFromApi\|OHLCV_PRICE\|PYTH_PRICE\|meteora-ohlcv\|pyth-benchmarks" src/` → **no matches** (the whole src/ tree is now clean of the deleted price path).

### Step 5: Format and full verification

```bash
bun run fmt
tsgo --noEmit
bun run lint:check
bun run fmt:check
bun run test
```

All must exit 0 / all tests pass. (No native prebuild is required for this plan
— no dependencies or native config changed. You may run `bun run build` for
parity with CI, but it is not necessary to validate this change.)

## Test plan

- No new tests. The deletion removes tests; the remaining `TokenService` tests
  in `data.test.ts` must still pass unchanged and continue to assert token
  fetch + caching behavior.
- Add nothing new — this plan's verification is "the orphan is gone and nothing
  else broke."

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `test ! -f src/utils/positions/meteora-ohlcv.ts` → succeeds (file gone)
- [ ] `test ! -f src/utils/positions/pyth-benchmarks.ts` → succeeds (file gone)
- [ ] `grep -rn "PriceService\|getPoolPrice\|getHistoricalSOLPrice\|fetchOHLCVPriceAtTimestamp\|fetchHistoricalSOLPriceFromApi\|OHLCV_PRICE\|PYTH_PRICE" src/` → no matches
- [ ] `tsgo --noEmit` exits 0
- [ ] `bun run test` exits 0
- [ ] `bun run lint:check` and `bun run fmt:check` exit 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any "Current state" excerpt does not match the live code (drift since `86a1d22`).
- A search reveals a production caller of `getPoolPrice` / `getHistoricalSOLPrice`
  that this plan missed — i.e. the code is **not** actually orphaned. (Re-run
  `grep -rn "getPoolPrice\|getHistoricalSOLPrice" src/` and report the hits.)
- The maintainer has chosen Option B (build the chart) — do not run these steps.
- Removing `prices` from `DataServices` causes `positionPipeline.ts` or any other
  file to fail type-checking in a way not described here (it should not, since
  nothing reads `.prices`).

## Maintenance notes

- **Why deletion is safe**: `PositionPipeline` never reads `dataServices.prices`,
  and the only other reference is the unit test being removed. The historical
  fetchers are pure HTTP functions with no side effects beyond network calls.
- **If a value-over-time chart is wanted later**: re-adding is straightforward
  (the git history at `86a1d22` contains the exact implementations). A chart
  feature should design its own cost-basis/aggregation model rather than assume
  this scaffolding's shape — that is why Option B is a separate plan.
- **Interaction with Plan 003 (USD toggle)**: none. Plan 003 fetches the
  *current* SOL price through `TokenService` (the wrapped-SOL mint), which is a
  different code path from the *historical* Pyth service deleted here. They can
  land in either order.
- **Reviewer scrutiny**: confirm the `TokenService` tests still cover fetch +
  caching, and that `CACHE_TTL` still exports `UPNL_PER_POSITION` and
  `TOKEN_DATA` (used elsewhere).

# Implementation Plans

> Multiple passes of the `improve` skill live here, plus a standalone feature plan.
>
> - **Pass 1 (2026-06-13, roadmap/`next` variant, commit `86a1d22`)** — product
>   direction plans 001–004. All four are **DONE** (see Execute log).
> - **Pass 2 (2026-06-14, `plan` variant, app commit `7496775` / metcomet
>   `9a94962`)** — plans 005–008. The widget SOL/USD + PnL-data-source work,
>   prompted by "does the widget USD toggle follow the app?" becoming a deep
>   dive into how PnL is computed.
> - **009 (2026-06-22, `plan` variant, app commit `7496775`)** — a standalone
>   feature plan (no audit): a non-interactive price-movement chart with the
>   position's min/max range band, rendered in-card below the liquidity shape.
>   Independent of 005–008.
> - **Pass 3 (2026-06-24, full standard audit, commit `7496775`)** — audited the
>   whole repo fresh and reconciled against the existing backlog. Three new
>   findings surfaced; only **012** (housekeeping sweep) is written this session.
>   Two higher-leverage findings are identified but **not yet planned** (see
>   "Findings identified in Pass 3 but not yet planned" below) — pick them up
>   as 010/011 when ready.
> - **013 (2026-06-24, `/grilling` direction plan, app commit `7496775`)** — a
>   standalone **direction/design plan** (not an audit): the at-a-glance triage
>   redesign from a `/grilling` session. Flips the home fold from a PnL hero to
>   a foregone-fee **urgency rate** + two-tier triage queue, adds a claimable-
>   fees push trigger (extending the DONE 001 alert system), and mirrors
>   reactive urgency onto the widget. Phased A→(B∥C)→D; Phase A is the core
>   unbuilt value. Fences held: Android-primary, single-wallet, pull-based, no
>   server.
>
> Each plan is self-contained: an executor with no prior context can run it from
> the file + the repo alone. Read each plan fully before starting, honor its
> STOP conditions, and update your row when done.

## Execution order & status

| Plan | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| 004  | Fix pre-existing CI baseline (tsgo + lint + fmt green) | **P1 prerequisite** | S | — | DONE (all gates green: tsgo/lint/fmt/test/build exit 0; 146/146 tests) |
| 001  | Out-of-range alerts | P1 | M | — | DONE (impl complete & tested; build red on pre-existing CI — see Execute log) |
| 002  | Historical-price disposition (recommend: delete) | P2 | S | — | DONE (Option A: orphaned PriceService + 2 fetchers deleted; tsgo/lint/fmt/test 143 all exit 0) |
| 003  | SOL/USD display toggle | P2 | M | — | DONE (Steps 1-8,10 done, all gates green: tsgo/lint/fmt/test 155/build exit 0; Step 9 widget USD deferred → picked up by 007) |
| 005  | Add `fetchOpenPortfolioSummary()` to metcomet (cross-repo) | P1 | S | — | DONE (impl complete & tested; type-check/lint/build/test all exit 0; format-CHECK red on pre-existing repo-wide debt — see Execute log) |
| 006  | Switch widget data source to metcomet's open-portfolio summary | P1 | S | 005 (merged + published) | TODO |
| 007  | Make the widget follow the app's SOL/USD toggle (= deferred Step 9 of 003) | P2 | S | 006 | TODO |
| 008  | Document PnL semantics in the wiki | P2 | S | — | TODO |
| 009  | Non-interactive price-movement chart + position min/max range band (in-card) | P2 | M | — | TODO |
| 012  | Housekeeping sweep — dead code, `.env.example`, stale wiki links | P3 | S | — | DONE (deleted 5 dead exports + 19 tests; wired clearRangeState on disconnect; added .env.example; README bun + DEV_MOCK; removed stale PnLStore/useUpnlPerPosition wiki refs incl. 3 reconciled files; tsgo/lint/fmt/test 124 all exit 0) |
| 013  | At-a-glance triage redesign (urgency hero + triage queue + fees push + widget mirror) | P1 (A) / P2 (B, C) / P3 (D) | L (phased) | 001 (done) | TODO — Phase A (home reshape) first; B ∥ C after A; D last |
| 013a | Phase A — home first-fold reshape (urgency hero + two-tier triage queue) | P1 | L | 013 (design) | DONE (all gates green: tsgo/lint:check/fmt:check/test 179/build exit 0; 3 new + 7 modified files, 0 out-of-scope; all-clear PnL hero byte-identical) |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (with one-line reason) | REJECTED (with one-line rationale).

## Dependency notes

### Pass 1 (001–004)

- **004 (baseline CI fix) is a prerequisite for clean-CI verification of every
  other plan.** The base commit (`1ea83e4` ≡ `86a1d22` for all source/deps) has
  three pre-existing failures: `tsgo` (1 error, accidental `@solana/web3.js`
  v3 bump in `positionPipeline.ts:108`), `lint:check` (2 errors,
  `react-hooks/set-state-in-effect`), and `fmt:check` (4 files, the `plans/*.md`).
  004 fixes all three with low risk (v1 dep pin + rule suppressions + ignore
  `plans/`). Land 004 first; then 001's already-DONE implementation will verify
  green without code changes, and 002/003 can finish cleanly.
- 001/002/003 are **independent of each other** — no hard ordering among them.
- **Recommended order: 004 → 001 (verify green) → 002 → 003.**
  - **001 (alerts)** first: highest user leverage; the background-task
    infrastructure it builds on already exists, so it's the best risk/reward.
  - **002 (delete dead historical-price code)** before **003**: 003 touches the
    value-display layer; doing 002 first removes the orphaned `PriceService` so
    003 reasons about a clean token-only value path. (Not a hard dependency —
    003 uses the *current* SOL price via the token service, not the *historical*
    path 002 deletes — but landing 002 first is tidier.)
  - **003 (USD toggle)** is the broadest in surface area (touches summary,
    header, threading, optional widget); do it last when the value layer is clean.

### Pass 2 (005–008)

- **005 → 006 (hard, cross-repo):** Plan 006's Step 0 verifies the installed
  metcomet exports `fetchOpenPortfolioSummary`. Plan 005 must be merged AND
  published to npm (recommend minor bump to `0.4.0`) before 006 starts. To
  develop 006 before publishing, set up a local link — do not let the executor
  improvise linking.
- **006 → 007 (soft, same file):** Both edit
  `src/widgets/updatePortfolioWidget.tsx`. Do 006 first so 007 applies on top
  of the new data path and the diff stays reviewable.
- **007 completes 003.** Plan 003's Step 9 (widget USD variant) was marked
  OPTIONAL/DEFERRABLE and deferred; Plan 007 is that follow-up. Note the
  intervening data-path change in 006 — 007 reads `displayCurrency` exactly as
  003 anticipated, but the underlying summary values now come from metcomet's
  open-portfolio summary rather than the in-app pipeline.
- **008 is independent** and can land any time. Its "See also" notes reference
  Plans 005–007 as future state; update the wording to present tense once they
  land (noted in its Maintenance section).
- **Recommended order:** 005 → 006 → 007, with 008 slotted in whenever
  convenient (often cheapest alongside or just after 006 so the author has the
  data-path facts fresh).
- **009 is fully independent** (no audit, no cross-repo dependency). It only
  reads existing view-model fields (`liquidityShape.binDistribution[].price`)
  and the public Meteora OHLCV endpoint — no dep on 005 being published. Land it
  any time.

### Cross-repo checklist (for the operator)

1. Land Plan 005 in `../metcomet`, run its verification, and publish:
   `cd ../metcomet && bun run release` (decide `0.4.0` minor vs `0.3.6`
   patch; minor is recommended for a new public export).
2. In the app: `bun update metcomet`, then start Plan 006.

### Pass 3 (012)

- **012 is fully independent** — pure dead-code removal + onboarding files +
  stale-wiki-link fixes. No dependency on any other plan; land it any time.
- **010 and 011 are NOT written yet** (see "Findings identified in Pass 3 but not
  yet planned" below). When written, 010 (usePositionsPage robustness) is the
  highest-leverage remaining item; 011 (background-sync range snapshots) is
  independent and builds on the already-DONE 001 alert infrastructure.

### 013 (standalone direction plan)

- **013 is a direction/design plan**, not a step-by-step executor plan —
  elaborate each phase into a step-by-step plan (à la 001) when dispatching it.
- **Phase A is a hard prerequisite for B and C** — both consume the numeric
  `totalValueUsd` / `unrealizedFeesUsd` fields A.0 adds to `PositionViewModel`
  (today those exist only as formatted `$X.XX` strings).
- **B and C are independent** of each other after A; parallelize them.
- **013 builds on the DONE 001 alert infrastructure** (detector + `alertStore` +
  `widgetBackgroundSync` + `expo-notifications`) — Phase B extends it with a
  sibling fees detector + hysteresis state, reusing the single `alertsEnabled`
  toggle.
- **Watch for overlap with proposed 011** (background-sync range snapshots):
  both touch `widgetBackgroundSync.ts`'s alert block. If 011 lands first, Phase
  B's fees detector attaches to whatever snapshot path 011 establishes.
- **Recommended order:** A → (B ∥ C) → D.
- **Phase A is elaborated as a step-by-step executor plan in [`013a-home-reshape.md`](./013a-home-reshape.md)** (à la 001). 013 stays the direction/roadmap doc; elaborate B / C / D the same way when dispatching them.

## Execute log

### 001 — Out-of-range alerts (executed 2026-06-13 via herdr executor pi / glm-5.2)

- **Verdict: APPROVE.** Implementation is complete, in-scope (11 files, 0 out-of-scope),
  and fully unit-tested (`bun run test` → 146/146, incl. 6 new detector + 3 new settings
  tests). Executor's code adds **0** new tsgo/lint/fmt problems.
- **Merge:** fast-forwarded onto `main` from base `1ea83e4` (commits `d132f6d`..`b01b8ac`,
  linear history — no merge commit; DONE marker `9d3e138`). Branch + worktree removed.
- **`bun run build` / `tsgo --noEmit` / `lint:check` are RED, but NOT because of 001.** Three
  pre-existing, out-of-scope failures exist at the base commit (`86a1d22` == `1ea83e4` for
  all source/deps — the plan's recon never verified the baseline):
  1. `tsgo`: `src/services/positionPipeline.ts(108,65)` TS2740 — `@solana/web3.js`
     (top-level 3.0.0-rc.1) vs `@coral-xyz/anchor`'s nested 1.98.4 `Connection` divergence.
  2. `lint:check`: `react-hooks/set-state-in-effect` in `src/hooks/usePositionsPage.ts:86`
     and `src/hooks/useWalletLifecycle.ts:50`.
  3. `fmt:check`: the 4 `plans/*.md` files are not oxfmt-conformant (introduced by the plans
     commit itself).
- **Recommended follow-up (blocks 002 & 003 too):** a small baseline-fix plan — resolve the
  web3/anchor Connection typing, the two effect setState lints, and add `plans/` to oxfmt
  ignore (or format the markdown). Until then every plan's "clean CI" done criterion is
  unsatisfiable. Ask `/improve plan "fix pre-existing CI baseline"` if wanted.
- **Documented executor deviations (all meritorious, in scope):** `alertStore.clearRangeState`
  uses `mmkv.remove()` (react-native-mmkv v4 API; mirrors `walletStore`); detector test
  imports vitest globals + orders `vi.mock` after imports (tsgo + eslint `import/first`).

### 002 — Historical-price disposition (executed 2026-06-14 via herdr executor pi / glm-5.2)

- **Verdict: APPROVE.** Option A (delete the orphan) executed. The `PriceService` (`getPoolPrice` /
  `getHistoricalSOLPrice`), its two fetcher modules (`meteora-ohlcv.ts`, `pyth-benchmarks.ts`), the
  `OHLCV_PRICE`/`PYTH_PRICE` TTL constants, and the `prices` field on `DataServices` were fully
  orphaned — `PositionPipeline` only ever reads `dataServices.tokens`. All removed.
- **Merge:** merged to `main` via `--no-ff` as `fc67375` (2026-06-14, this session;
  operator merge + `470f26a` log correction). Branch + worktree removed post-review
  (advisor teardown: `herdr worktree remove --workspace w65434a370239a18 --force` +
  `git branch -d advisor/002-remove-historical-price`).
- **All gates green at the post-001/003/004 base:** `tsgo --noEmit` 0, `lint:check` 0,
  `fmt:check` 0, `test` 143/143 (−12 vs the 155 baseline — exactly the 4 PriceService + 4 OHLCV
  + 4 Pyth orphan tests removed). No native build run (no deps/native config changed).
- **Scope:** 7 files, 0 out-of-scope. `data.ts` (−42), `cache.ts` (−2), 2 deleted modules (−97),
  `data.test.ts` (−52), `dataFetching.test.ts` (−174), `positionPipeline.test.ts` (−2). Net
  +1/−368.
- **Decision gate honored:** branch name + maintainer instruction confirmed Option A
  (delete). Option B (build value-over-time chart) not chosen; per plan, that needs its own
  feature plan.
- **Drift check clean:** `git diff --stat 86a1d22..HEAD -- <in-scope files>` returned nothing —
  no in-scope file changed since the plan was written.
- **STOP conditions all cleared:** every "Current state" excerpt matched live code; grep for
  `getPoolPrice`/`getHistoricalSOLPrice` returned only `data.ts` (def) + `data.test.ts` (removed);
  no production caller found (confirmed orphaned); `positionPipeline.ts` never reads `.prices`.
- **Executor note on commit grouping:** the plan's Step 1 alone leaves `tsgo` red (removing
  `prices` from `DataServices` immediately breaks `data.test.ts`). Per the plan's explicit
  sanction ("if you prefer green tests between steps, do Step 4 immediately after this one"),
  the 5 steps were grouped into 3 green commits: (1) data.ts + data.test.ts; (2) cache.ts +
  positionPipeline.test.ts; (3) delete modules + dataFetching.test.ts. Each commit type-checks
  and passes tests independently.

### 005 — metcomet `fetchOpenPortfolioSummary` (executed 2026-06-15 via herdr executor pi / glm-5.2)

- **Verdict: APPROVE.** Implementation complete, in-scope (4 files, 0 out-of-scope),
  +127 lines. All real gates green in the worktree: `bun run type-check` 0,
  `bun run lint` 0, `bun run build` 0 (dist 28.95 KB js / 18.79 KB d.ts),
  `bun test test/api-portfolio.test.ts` 16/16 incl. the new
  `fetchOpenPortfolioSummary aggregates across pages` test (real API, 6 expects).
  `fetchOpenPortfolioSummary` exported from both `dist/index.js` and `dist/index.d.ts`.
- **Format-CHECK is RED, but NOT because of 005.** metcomet's pinned `oxfmt` 0.47.0
  wants single quotes while the entire pre-existing codebase uses double quotes —
  the BASE `src/api/portfolio.ts` (commit `9a94962`, before any 005 change) already
  has **100** lines oxfmt wants to reformat. The executor's new code matches the
  existing file's style (double quotes, tabs) and added only ~4 attributable lines.
  Same precedent as Plan 001's pre-existing CI red. Correct executor judgment: did
  NOT commit a 100-line unrelated reformat (that would have failed scope). A
  baseline-format pass for metcomet is a separate task, not part of 005.
- **One tiny style nit on a new line** (not worth a REVISE round): oxfmt wants
  parens on `depositSolMissing ? null : totalInitialDepositSol?.toFixed(6) ?? null`
  → `: (… ?? null)`. Semantically identical (ternary binds looser than `??`);
  type-check passes. Fold into a future baseline-format pass.
- **Drift note honored:** the export barrel `src/api/index.ts` uses NAMED
  re-exports (not wildcard); the executor correctly added `fetchOpenPortfolioSummary`
  to both the `./portfolio` named block in `index.ts` and the `export {}` in
  `portfolio.ts`. Types auto-export via the existing `export type * from "./types"`.
- **Worktree:** `advisor/005-open-portfolio-summary` at
  `/home/moshi/.herdr/worktrees/metcomet/advisor-005-open-portfolio-summary`
  (executor commit `16c92c1` on top of plan-staging `aea27c2` on base `9a94962`).
  Poll signal lied (TUI stuck on `working` after commit; clean tree) — verified via
  git state per HERDR_EXECUTION.md guidance.
- **PENDING (operator):** merge the branch to `main` in `../metcomet`, then
  **publish** (`cd ../metcomet && bun run release`; recommend minor `0.4.0` for the
  new public export). Plan 006's Step 0 gate checks the installed metcomet exports
  `fetchOpenPortfolioSummary` — it cannot start until publish lands.

### 003 — SOL/USD display toggle (executed 2026-06-14 via herdr executor pi / glm-5.2)

- **Verdict: APPROVE.** Steps 1–8 & 10 complete; in-scope (13 files modified, widget
  deferred per Step 9, 0 out-of-scope). All gates green at the post-004 base (`7c764a2`):
  `tsgo --noEmit` 0, `lint:check` 0, `fmt:check` 0, `test` 155/155 (+9 new: 6
  `formatUsdFromSol` + 3 `displayCurrency`), `build` 0. Zero new tsgo/lint/fmt problems
  introduced.
- **Merge:** merged to `main` via `--no-ff` as `a70a60e`. Branch + worktree removed.
- **Drift handled (not a STOP):** plan 001 (`alertsEnabled`) + plan 004 (`eslint-disable`
  in `usePositionsPage.ts`) had landed since `86a1d22`. `displayCurrency` added alongside
  `alertsEnabled` exactly as Step 4 anticipated.
- **Step 9 (widget USD variant) DEFERRED** per plan (marked OPTIONAL/DEFERRABLE and
  self-contained). In-app SOL/USD toggle is complete and consistent; the headless-widget
  USD variant is a clean follow-up — **picked up by Plan 007** (Pass 2).
- **Anticipated by plan, followed exactly:** per-position `totalValue` stays USD in both
  modes (known pre-existing inconsistency; out of scope — see plan maintenance notes).
- **Executor decisions (in scope, low-risk):** dropped the now-dead `upnlIsSol` prop from
  `PositionHeader`/`PositionCard` (always `true`; the USD/SOL branch is now driven by
  `displayCurrency` from the store); `CurrencyToggle` is a compact joined segmented control
  using the FontPicker color tokens (`bg-app-primary-dim`/`text-app-primary`); dev-mock mode
  fetches the SOL price once on mount so the USD path is testable.
- **SOL-mode regression:** verified byte-for-byte — `SummaryValue` delegates to the existing
  `SolValue` with identical props, unit labels render the same `<Text>SOL</Text>`, and the
  `PositionHeader` uPnL resolves to `formatUPNLDisplaySol` (SOL branch unchanged).

### 012 — Housekeeping sweep (executed 2026-06-24 via direct pi session)

- **Verdict: APPROVE.** All seven steps executed. Dead code removed
  (`formatPriceRange`, `formatTimestamp`, `shortenPublicKey`, `formatFees`, `hasAnyPnLData`);
  the 19 formatter tests they lived in were removed with them. The one behavior change —
  wiring `alertStore.clearRangeState` into `useWalletLifecycle.handleDisconnect` — is the
  intended use of an export that was previously defined-but-uncalled, and passes
  `react-hooks/exhaustive-deps` with no deps-array change (verified).
- **Reconciliation (in plan, commit `088fbc8`):** Steps 6/7's done-criteria greps are repo-wide,
  but the original scope named only a subset of the files holding each symbol. Three files
  were added to scope as mechanical fixes: `Connection.md` (stale Consumers list →
  `positionPipeline.ts`), and the broken `[[PnLStore]]` links in `PortfolioSummary.md` +
  `usePositionsPage.md` (would dangle once `PnLStore.md` was deleted). Deeper stale *prose*
  in those pages (e.g. PortfolioSummary's "Data Source" still reads `pnlStore`) is left for
  plan 008, per the same precedent that excluded `Testing.md`.
- **Gates:** `tsgo --noEmit` 0, `lint:check` 0, `fmt:check` 0, `test` 124/124 (−19 vs the 143
  baseline — exactly the removed formatter tests; count matches the plan's prediction). No
  native build run (no deps/native config changed — only deletions, one safe call, docs).
- **Scope:** 15 files net (13 source/docs + plan-file reconciliation + README), 0 unintended
  out-of-scope edits.
- **Merge note (process deviation):** the executor **self-merged** its branch to `main` as
  merge commit `b82bfa1` (`--no-ff`) and tore down the worktree + branch itself, following
  `HERDR_EXECUTION.md`'s "Merging and cleaning up" recipe — which is written for the
  advisor/operator *post-review*, not the executor. The plan's git workflow only authorized
  per-step commits + "do not push"; it did not authorize merging, so this bypassed the
  advisor's pre-merge review gate. The advisor then independently re-ran every gate on
  `main` (`tsgo`/`lint:check`/`fmt:check`/`test` all exit 0, 124/124) and re-verified all
  done-criteria greps + the full diff. Work is correct and complete; the merge is trivially
  revertable (`git reset --hard 3e13ac2`) if a review-then-merge flow is preferred. Lesson
  for future dispatches: state explicitly in the task prompt that the executor must STOP
  after committing and NOT run the merge/teardown recipe.
- **Deferred (out of scope, noted in plan maintenance notes):** `docs/wiki/guides/Testing.md`
  and the stale PnL-source *prose* in PortfolioSummary/usePositionsPage entity pages need
  content rewrites (→ plans 008 / 010). README line 29 still says `npm run android` (out of
  this plan's `npm install`-only done criterion) — trivial Bun-consistency follow-up.

### 013a — Phase A home first-fold reshape (executed 2026-06-24 via direct pi session)

- **Verdict: APPROVE.** All eight steps executed in order. The home fold now flips
  to a foregone-fee urgency hero ("−$X.XX/hr not earning") + two-tier triage queue
  ("Bleeding now" / "About to bleed") when anything needs attention, and returns
  to the unchanged PnL hero when all clear.
- **Gates all green** at branch `advisor/013a-home-reshape` (base `ad46946`):
  `tsgo --noEmit` 0, `lint:check` 0, `fmt:check` 0, `test` 179/179 (+55 new: 23
  triage + 7 foregone-rate formatters + 25 carried over), `build` 0.
- **Scope:** 10 files — 3 new (`triage.ts`, `useTriage.ts`, `TriageView.tsx`) +
  their tests, 7 modified; 0 out-of-scope. `android/` regenerated by prebuild,
  not committed.
- **Data-model prerequisite (A.0):** added numeric `totalValueUsd` +
  `unrealizedFeesUsd` to `PositionViewModel` (the values existed only as formatted
  `$X.XX` strings). `mockPortfolio`'s `vm()` helper derives them from those
  strings so dev-mock triage exercises real numbers — the only tsgo break the
  step caused, anticipated by the plan's test-plan note.
- **All-clear regression preserved:** the PnL-hero return path is byte-identical;
  the triage branch short-circuits before it only when `triage.items.length > 0`.
- **Freshness principle held:** near-edge `timeToEdgeHours` is gated by the
  discrete `isNearEdge()` bin-distance trigger (≤2 bins) so a noisy velocity
  estimate can't invent a tier-2 item; velocity is null-guarded against stable
  price and away-from-edge drift.
- **Banner removed:** the standalone out-of-range banner in `positions/index.tsx`
  is superseded by the "Bleeding now" tier. `outOfRangeCount` stays a required
  prop on `PositionsListProps` (parent untouched) but is no longer destructured.
- **Not merged.** Awaiting operator review + merge to `main`. Phases B (fees
  push), C (widget mirror), D (polish) still TODO — both B and C consume the
  numeric VM fields added in A.0.

## Recap of what each plan delivers

### Pass 1

- **001 — Out-of-range alerts:** reuse the existing 30-min background task to
  detect in-range → out-of-range transitions and fire a local notification.
  Opt-in via a new settings sheet. Adds `expo-notifications`.
- **002 — Historical-price disposition:** a decision spike. The recommended
  default is to **delete** the fully-orphaned `PriceService` + its two fetcher
  modules (zero production callers). The build-a-chart alternative is documented
  but not stepped — if chosen, request a dedicated feature plan instead.
- **003 — SOL/USD display toggle:** add a SOL|USD segmented control in the
  portfolio summary that converts the SOL-native PnL/value/fee figures using the
  live SOL price (fetched via the existing token service on the wrapped-SOL
  mint). Default SOL preserves current behavior.

### Pass 2 (driven by the widget-USD-toggle + PnL-semantics investigation)

- **005 — metcomet `fetchOpenPortfolioSummary`:** add a paginated helper to the
  DLMM library (cross-repo, `../metcomet`) that walks all pages of
  `/portfolio/open` and returns the server-aggregated `total` plus the three
  fields that need cross-page rollup (`totalInitialDepositSol`,
  `outOfRangeCount`, `feesTvl24h`). Pure addition; no existing function changes.
- **006 — Widget data source:** rewire the Android widget away from the full
  `loadPortfolio()` pipeline (on-chain scan + per-mint prices + N PnL calls,
  all to build 7 summary numbers) to metcomet's new one-call summary. Removes
  the dead `PositionPipeline.fetchPortfolioSummary` widget convenience.
- **007 — Widget USD toggle:** make the headless widget read the app's persisted
  `displayCurrency` (mirroring the `getStoredWalletAddress` non-React pattern)
  and render SOL or USD. This is the deferred Step 9 of Plan 003.
- **008 — PnL semantics wiki page:** record the findings (USD canonical, SOL
  derived; historical-per-event vs live SOL pricing; why the % doesn't change on
  toggle) so the next person doesn't re-derive them.

### 013 (standalone direction plan)

- **013 — At-a-glance triage redesign:** the product of a `/grilling` session
  ("make this the best at-a-glance app for Meteora"). For an active rebalancer,
  beat Meteora on *time-to-answer* by making the glance say **how urgently must I
  act**, not *how am I doing*. **Phase A** reshapes the home first-fold: a
  foregone-fee urgency hero ("$X/hr not earning") + a two-tier triage queue
  ("Bleeding now" / "About to bleed"), with PnL demoted and reclaiming the hero
  automatically when all clear. Near-edge detection is proactive (trigger =
  bins-from-edge ≤ 2; display = time-to-edge from OHLCV drift) and lives only on
  the fresh on-open fetch. **Phase B** adds a claimable-fees push trigger
  (threshold `max(0.5% of value, $5)`, edge-detected with hysteresis) to the
  existing Plan 001 30-min background task. **Phase C** mirrors reactive urgency
  onto the Android widget (no near-edge — a 30-min-stale prediction isn't
  honest). **Phase D** is light polish. The governing principle: *staleness of
  the channel decides how far a signal may travel* — reactive everywhere,
  proactive on fresh fetch only.

### 009 (standalone feature plan)

- **009 — Position price-movement chart + range band:** add a non-interactive
  chart to each position card, below the liquidity shape. It overlays the
  market's ~10-day price line (Meteora DLMM public OHLCV endpoint,
  `GET /pools/{addr}/ohlcv?timeframe=24h`) on a shaded band marking the
  position's current `[min, max]` price range (already computed on
  `liquidityShape.binDistribution`). Hand-rolled `react-native-svg` (matches the
  `LiquidityBarChart` sibling — no new deps). Cached per-pool 5 min so multiple
  positions in one pool share a fetch. The single correctness risk — the two
  price conventions (token-unit `bin.pricePerToken` vs USD `vm.currentPrice`) —
  is called out as a STOP gate in the plan.

## Findings identified in Pass 3 but not yet planned

The Pass 3 audit surfaced three findings. Only 012 is written; the other two
are recorded here so they are not re-derived. Request `/improve plan` to turn
either into a numbered plan.

- **010 (proposed, P1) — `usePositionsPage` robustness + first hook tests.**
  `src/hooks/usePositionsPage.ts:69-78` calls `pipeline.loadPortfolio(...)` and
  `getCurrentSolUsdPrice()` with `.then(...)` but **no `.catch`** and **no
  request-staleness / unmount guard**. Any transient RPC error (or a thrown
  rejection) leaves `loading` true forever → permanent skeleton, no auto-recovery;
  `refresh()` is equally unguarded. Separately, `tokenDataReady` (`:73-76`) gets
  stuck `false` when every position's token info is null (its `some(tokenXInfo
  !== null)` predicate stays false), so a total token-price failure = infinite
  skeleton. Plan should add error handling + a request-id staleness guard to the
  load effect and `refresh()`, fix the stuck-skeleton path, and add the first
  characterization tests for the hook (error → not stuck; rapid wallet switch →
  no stale data). Highest leverage of the remaining items. The main orchestration
  hooks currently have **zero** test coverage (no `src/__tests__/hooks/`).
- **011 (proposed, P2) — Background-sync: lightweight range snapshots.**
  `src/tasks/widgetBackgroundSync.ts` runs the full pipeline **twice** per 30-min
  task — once via `fetchPortfolioSummary` (`:23`) for the widget, and again via
  `pipeline.loadPortfolio` (`:38`) only to read `vm.inRange` for the alert
  detector. But `inRange` needs no token or PnL data (`computePositionViewData`
  derives it from `activeId` vs bin range alone). Plan should add a
  `fetchPositionRangeSnapshots()` that skips token/PnL fetches and use it for the
  alert path, halving the background work. Independent of 006; builds on the
  DONE 001 alert infrastructure.

## Findings considered and rejected

### Pass 3

- **`bigint-buffer` high-severity advisory (GHSA-3gc7-fjrx-p6mg):** no upstream
  fix exists — `1.1.5` is the latest published version and is itself the
  vulnerable one, so a package.json `override` is impossible. Low exploitability
  (parses RPC / on-chain-provided data, not user input). Not actionable until
  upstream publishes `1.1.6+`. Do not re-audit.
- **`undici` advisories:** transitive via `jsdom`, which is a **dev/test-only**
  dependency (not in the runtime bundle). Not worth doing.

### Pass 1

- **Position detail screen (tap-through):** high value but deliberately deferred
  from this batch at the user's selection. A natural next batch; would unlock
  deeper charts and explorer deep-links. Re-audit when prioritizing the next set.
- **Claim-fees flow (read-only → actionable):** the largest product swing but
  HIGH risk (real-money signing, polyfill fragility, confirmation UX). Deferred;
  revisit only with appetite for a large, careful effort.
- **Position search/filter/sort:** low leverage until users have many positions.
  Defer.
- **Multi-wallet / watch-only address:** conflicts with the connect-to-sign model
  once transactions land. Rejected for now.
- **iOS support:** widget + background-fetch + signing are Android-first; large
  effort, low current ROI. Rejected.
- **Docs cleanup** (stale `docs/raw/` + wiki referencing deleted files like
  `pnlStore.ts`, `useUpnlPerPosition`, `calculations.ts`): real tech-debt finding
  surfaced during recon, but it's a docs task, not a direction item. Track
  separately; do not bundle into 001–003.

### Pass 2

- **Add `totalPositions` to metcomet's `TotalMetrics` type.** Real gap (the
  API returns it; metcomet omits it), but the app derives `positionCount` from
  the on-chain SDK positions anyway, so it changes no plan decision. Not planned.
- **Implement true SOL-numeraire PnL locally via `getInitialDepositsHelius` +
  `getSolPriceByTimestamp` (original "Plan B").** Killed because (a) the server
  already returns historical-SOL PnL in the `/portfolio/open` and
  `/portfolio/total` aggregates, making local Helius-based computation redundant
  work; (b) it would diverge from Meteora's own displayed numbers for debatable
  benefit; (c) it needs a Helius key and (per-position) SOL-containing pools.
  The historical-SOL semantics are surfaced for free via Plan 006's switch to
  `/portfolio/open`.
- **Make the % change source switch with the USD toggle (in-app).** The app
  always shows `pnlSolPctChange`. Under the API's derivation the USD and SOL
  percentages are expected to be equal (same spot `solPrice` cancels in the
  ratio), so switching the source is cosmetic. Left as an open empirical
  question in Plan 008; revisit only if a real-API sample proves them different.
- **Switch the in-app `PortfolioSummary` to `/portfolio/open` totals too.** The
  in-app summary coexists with the position cards, which already need
  per-position data; switching the summary saves no calls on that path.
  Deferred — only the widget (where per-position data is pure waste) is
  switched in Plan 006.

## Notes for executors

- **Running an executor under herdr**: see [`HERDR_EXECUTION.md`](./HERDR_EXECUTION.md) — the workspace-vs-split gotcha, the `worktree create` + `pane run` recipe (preferred), the task-prompt template, observation/poll patterns, independent verification, and merge/cleanup.
- Verification commands are repo-specific: type-check with **`tsgo --noEmit`**
  (never `tsc`), lint with `bun run lint:check`, format with `bun run fmt`,
  tests with `bun run test`, full build/prebuild with `bun run build`.
  (In `../metcomet`, the equivalents are `bun run type-check`, `bun run lint`,
  `bun run format`, `bun test`, `bun run build`.)
- Formatting is `oxfmt` (no semicolons, single quotes, 2-space, trailing commas).
  In `../metcomet` it's tabs instead of 2-space — see that repo's `AGENTS.md`.
- **Cross-repo plans (005, 006):** Plan 005 operates on `../metcomet`; all its
  commands run there. Plan 006 consumes the published result from the app repo.
  The metcomet version must be bumped + published between the two.
- Honor each plan's STOP conditions — they exist because the plans were written
  against a specific commit (app `7496775` / metcomet `9a94962` for Pass 2) and
  the code may have moved.

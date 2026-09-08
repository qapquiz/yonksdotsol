---
title: Codebase Improvement Report 2026-09-08
type: guide
created: 2026-09-08
updated: 2026-09-08
tags: [maintenance, bugs, testing, architecture]
related:
  - CacheManager
  - Caching Strategy
  - DlmmApi
  - Loading States
---

# Codebase Improvement Report — 2026-09-08

This pass improves the shared data-loading modules: cache correctness during overlapping requests and complete pagination for PnL and widget summaries. Production changes are limited to three files, with regression tests and wiki updates explaining their contracts.

## What Changed and Why It Is Better

| Area                      | Before                                                                                                                                                      | After                                                                                                                                                      | Benefit                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Cache invalidation        | A pending response could restore invalidated data. `delete` and pattern invalidation could leave later callers attached to the old request.                 | Invalidation detaches matching pending work, including keys without a cached value yet. Old responses cannot write back.                                   | Refreshes can fetch fresh data without stale responses repopulating the cache.                                  |
| Overlapping requests      | An old request's cleanup could remove a newer pending request after `clear`, allowing duplicate fetches. An old response could overwrite an explicit `set`. | Completion and cleanup verify request identity. Explicit writes supersede pending fetches.                                                                 | A newer request keeps ownership of its result and deduplication.                                                |
| Cache values and TTL      | Successful `null` values were fetched repeatedly; values remained fresh at the exact expiration deadline, including zero TTL.                               | Entry presence is separate from value; expiration uses `now >= expiresAt`.                                                                                 | Empty results can be cached, and all read paths follow the same freshness rule.                                 |
| PnL pagination            | The pipeline requested one page, so later positions could have missing uPnL and be omitted from the portfolio summary.                                      | `fetchAllPositionPnL` gathers every page before the result is cached or aggregated.                                                                        | Cards and summaries include positions returned on later pages.                                                  |
| Widget summary pagination | Reaching the ten-page limit returned partial rollups as a successful summary.                                                                               | An unfinished result throws `DlmmApiError`; a complete tenth page still succeeds.                                                                          | Incomplete data takes the widget's existing error path.                                                         |
| Regression coverage       | Pipeline tests mocked the entire API client. The disabled-PnL test inherited a previous test's rejecting mock and still had a configured fallback key.      | Pipeline tests run the real client against a replaced `fetch`. Network mocks reset per test; disabling PnL explicitly asserts that no HTTP request occurs. | Tests cover the actual join between transport, pagination, caching, position matching, and summary calculation. |

## Easier to Extend

- **One cache freshness implementation.** `get`, `has`, and `getOrFetch` share an internal entry lookup. Future cached queries inherit invalidation and expiration behavior through the existing interface. Internal storage uses `unknown` in place of `any`.
- **One page walker for two real callers.** Position PnL and widget summaries share page numbering, termination, and limit handling inside [[DlmmApi]]. Future complete-result helpers can reuse those rules without exposing pagination bookkeeping to their consumers.
- **Cache the complete operation.** The pipeline passes the complete PnL fetch into `getOrFetch`. A later-page failure leaves no partially cached PnL; a subsequent load can retry while other pools remain usable.
- **Documented contracts.** [[CacheManager]], [[Caching Strategy]], and [[DlmmApi]] now explain request ownership, expiration, page limits, and which methods to use when extending data loading.

## Evidence and Verification

The original suite passed **155 tests**. Before implementing the fixes, deterministic regressions produced **19 cache failures** and **2 pagination failures**. The cache repros control time and promise completion order; the pagination repros exercise real application code with fixture HTTP responses.

The expanded suite passes **181 tests across 13 files**, including two positions on different PnL pages, late-page failure and retry, cache invalidation while a request is in flight, newer-request deduplication, explicit writes, cached `null`, synchronous fetch failures, and exact TTL expiration.

| Check                                                  | Result                                                                        |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `bunx --no-install tsgo --noEmit`                      | Passed                                                                        |
| `bun run lint:check` and `bun run lint`                | Passed                                                                        |
| `bun run fmt` and `bun run fmt:check`                  | Passed                                                                        |
| `bun run build`                                        | Passed: type check and Android prebuild; this command does not compile an APK |
| `bun run test`                                         | Passed: 181 tests across 13 files                                             |
| `git diff --check` and links in the changed wiki pages | Passed                                                                        |

The installed Bun and Node tools were available through Mise; checks used `/home/yoki/.local/share/mise/shims` on `PATH`. No dependency or project configuration changes were needed.

## Practical Limits and Follow-up

- Invalidation protects the cache. Existing callers still receive their original request's outcome; consuming hooks must ignore obsolete responses after a wallet or selection change. Requests are not aborted.
- Complete-result helpers permit ten pages per call, using 50 items per page by default. Larger results now fail explicitly rather than return a truncated success. The existing widget error handling receives this failure; the main pipeline omits the affected pool's PnL as it does for other PnL failures.
- The legacy Helius configuration gate remains intentional product behavior, as recorded in `plans/013-owned-data-layer.md`. Its misleading dependency comment and test were corrected. PnL formulas and the separate app/widget summary definitions are preserved.
- This pass verifies data behavior with fixtures and the repository's Android prebuild command. It does not include a device run or live-wallet validation.
- The next useful pass is the already documented [[Loading States]] work: `usePositionsPage` still needs load-error recovery and ownership checks for wallet changes, refreshes, and unmounts. That UI lifecycle problem is separate from cache ownership and remains open.

Pagination parameters were verified against Meteora's [official OpenAPI schema](https://github.com/MeteoraAg/docs/blob/main/developer-guides/dlmm/api-reference/openapi.json). The in-app and widget aggregation choices follow ADR 0001 and ADR 0002 in `docs/adr/`.

## Changed Files

- Production: `src/utils/cache/CacheManager.ts`, `src/services/dlmmApi.ts`, `src/services/positionPipeline.ts`.
- Regression tests: `src/__tests__/stores/CacheManager.test.ts`, `src/__tests__/services/dlmmApi.test.ts`, `src/__tests__/services/positionPipeline.test.ts`.
- Documentation: this report, the three wiki pages linked above, [[index]], and [[log]].

## Release Packaging

Release version: **5.1.4**, following `v5.1.3` on `dev`. Updated `package.json` and `CHANGELOG.md`; Expo derives the app version from the package version. The `v5.1.4` tag selects this snapshot for the existing Android Tagged Build workflow, which builds an APK and uploads it as a GitHub Actions artifact.

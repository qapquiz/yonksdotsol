---
type: testing
title: Testing Strategy
description: How the Vitest suite is wired — a Node-environment harness with React Native module mocks and the expo-observe web-stub alias, CacheManager.createFresh() and PipelineDeps injection replacing singletons, pure-function invariant tests, and device-less widget render tests that assert captured trees.
tags: [testing, vitest, mocks, dependency-injection, coverage, widgets]
verified:
  - by: openwiki/0.5.1
    at: 2026-09-13T11:52:56.431Z
sources:
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-660c3cd224220244aca440b1
    resource: repo://src/__tests__/config/theme.test.ts
  - id: openwiki-source-5f9d635b445a9d90cfe577d6
    resource: repo://src/__tests__/services/data.test.ts
  - id: openwiki-source-dd74a952f7895b46b684700c
    resource: repo://src/__tests__/services/dlmmApi.test.ts
  - id: openwiki-source-d69e0581b704b5a1bdf3a259
    resource: repo://src/__tests__/services/positionPipeline.test.ts
  - id: openwiki-source-288b4a3bf1db5fb3d5a0c6e3
    resource: repo://src/__tests__/setup.ts
  - id: openwiki-source-11d3513b239b7b48c5b3e70a
    resource: repo://src/__tests__/stores/CacheManager.test.ts
  - id: openwiki-source-83823a605733927141a05de9
    resource: repo://src/__tests__/utils/computePositionViewData.test.ts
  - id: openwiki-source-8968f5fd79b076a5b14e6db4
    resource: repo://src/__tests__/utils/downsampleChartBins.test.ts
  - id: openwiki-source-ff81bb1e0f0a8e120dbc86b6
    resource: repo://src/__tests__/utils/formatters.test.ts
  - id: openwiki-source-1117cfba7eea95c4b143634c
    resource: repo://src/__tests__/utils/outOfRange.test.ts
  - id: openwiki-source-8df9ecd208f5e877efd94977
    resource: repo://src/__tests__/utils/pnlAggregation.test.ts
  - id: openwiki-source-cb09eac104e3c63e35cd729a
    resource: repo://src/__tests__/widgets/portfolioWidgetSync.test.tsx
  - id: openwiki-source-2d0119b33a0ff1f4146fb549
    resource: repo://src/__tests__/widgets/positionLiquidityWidget.test.tsx
  - id: openwiki-source-4927117ba73903d38c3a1115
    resource: repo://src/observe/index.web.tsx
  - id: openwiki-source-b1fb2ead06f307fd5ffbcd19
    resource: repo://src/services/positionPipeline.ts
  - id: openwiki-source-243e1c1b6c6a3f9a0796a1b6
    resource: repo://src/utils/cache/CacheManager.ts
  - id: openwiki-source-fbadcd8591b65031efaaedce
    resource: repo://vitest.config.ts
generated: { by: 'openwiki/0.5.1', at: '2026-09-13T11:52:56.431Z' }
---

# Testing Strategy

This is a React Native/Expo app, but its test suite never boots React Native.
`vitest run` executes everything in a Node environment with two substitution
strategies: global module mocks for the platform shell, and dependency
injection for the singletons the data layer owns. The result is a suite that
runs the real pipeline, the real DLMM Data API client, the real cache, and the
real widget component tree — without an RPC endpoint, an emulator, or a
device — and pins the invariants that historically broke: cache
invalidation-during-flight, partial-PnL caching, net cost basis, wire-format
tolerance, and wallet-lifecycle flashing.

## The harness

`vitest.config.ts` defines the whole harness:

- **Environment: `node`** with `globals: true` (no per-test imports needed for
  `describe`/`it`/`expect`). No DOM is loaded by default; the one suite that
  renders React hooks opts into `happy-dom` per file with a
  `// @vitest-environment happy-dom` directive.
- **Global setup file** `src/__tests__/setup.ts` runs before every test file.
- **Test discovery**: `src/**/*.test.{ts,tsx}`, excluding `node_modules`,
  `android`, and `ios`.
- **Path alias**: `@` resolves to `src` in both `test.alias` and
  `resolve.alias`.
- **`expo-observe` alias**: `resolve.alias` redirects `expo-observe` to
  `src/observe/index.web.tsx`.

The `expo-observe` alias is the web seam run in reverse. The native package
resolves its module at import time, which fails under Node; the web stub is a
no-op that imports only the `ObserveConfig` _type_. Aliasing it in makes every
module in the test graph — hooks that emit Observe events included —
importable without a native runtime. Metro performs the same substitution for
the web bundle, so the stub's exports stay honest for both consumers.

## What `setup.ts` mocks — and what it deliberately does not

`src/__tests__/setup.ts` replaces the platform shell globally:

- `react-native`: `Platform` (pinned to `android`), `StyleSheet`, the core
  primitives (`View`, `Text`, `Image`, `TouchableOpacity`, `ScrollView`,
  `ActivityIndicator`), `Dimensions` (fixed 375×812), and `Appearance`
  (pinned to `dark`).
- `expo-router`: `useRouter`, `useLocalSearchParams`, `Link`, `Stack.Screen`.
- `@meteora-ag/dlmm`: an empty module shell — suites that need the SDK mock
  its methods locally.
- A defensive `BigInt` polyfill and a `console.error` filter that suppresses
  only React's `ReactDOM.render`/`act(...)` warnings so real errors stay
  visible.

The deliberate exception is `src/services/dlmmApi`: there is **no global mock
for it**. It is a light, owned leaf module whose only import is the pure
formatters util, so test files import the real client and stub `globalThis.fetch`
when they need to control the wire — the pipeline tests exercise its real URL
construction, pagination, and error typing that way.

## Layout and commands

Test files live in `src/__tests__/`, mirroring `src/`:

```
src/__tests__/
├── setup.ts
├── config/      theme.test.ts
├── services/    data, dlmmApi, mockOhlcv, ohlcv, positionPipeline
├── stores/      CacheManager, settingsStore
├── utils/       computePositionViewData, dataFetching, downsampleChartBins,
│                formatters, outOfRange, pnlAggregation
└── widgets/     portfolioWidgetSync, positionLiquidityWidget, updatePortfolioWidget
```

Commands (from `package.json`):

| Command                 | What it runs                                 |
| ----------------------- | -------------------------------------------- |
| `bun run test`          | `vitest run` — the whole suite once          |
| `bun run test:watch`    | `vitest` — watch mode                        |
| `bun run test:coverage` | `vitest run --coverage` — V8 coverage report |

## Dependency injection over singletons

Two owned singletons would otherwise make tests order-dependent and
network-bound, so both ship a test seam:

- **`CacheManager.createFresh()`** — the class's constructor is private and
  `getInstance()` returns a process-wide singleton; `createFresh()` exists
  "for testing only" and hands back an independent instance. Every suite that
  touches caching builds a fresh cache in `beforeEach`, so tests never share
  state through the singleton.
- **`PipelineDeps` injection** — `createPositionPipeline(deps)` accepts an
  optional `{ cache, connection, dataServices }`. Tests pass only
  `cache: CacheManager.createFresh()` and let the defaults stand for the rest.
  The `connection` default is resolved **lazily** on first chain access, so
  constructing a pipeline requires no RPC URL — which is exactly why pipeline
  tests can run the whole flow with only the DLMM SDK and token fetcher mocked.

The recurring shape of a pipeline test: build a fresh cache, `vi.stubGlobal('fetch', fetchMock)`,
feed the real `dlmmApi` client `Response` fixtures, and assert on the pipeline's
output and on how many times `fetch` was called.

<!-- openwiki: mermaid parse failed and this diagram was converted to a text fence so it does not break rendering. Fix the diagram source and restore the mermaid fence. Parser error: Heuristic: an unescaped angle bracket inside a label breaks rendering; rephrase the label. -->

```text
flowchart TD
    subgraph PURE["Pure-function tests"]
        P1["Import the real module - no mocks"]
        P2["Pin invariants of aggregation, view models,<br/>formatters, downsampling and range alerts"]
        P1 --> P2
    end

    subgraph PIPE["Pipeline tests - positionPipeline.test.ts"]
        D1["Inject PipelineDeps with<br/>CacheManager.createFresh"]
        D2["Stub global fetch with Response pages<br/>mock DLMM SDK and token fetcher"]
        D3["Exercise the real dlmmApi client, pagination,<br/>cache and aggregation"]
        D1 --> D3
        D2 --> D3
    end

    subgraph WGT["Widget tests - no device"]
        W1["Mock react-native-android-widget transport<br/>and react-native-mmkv storage"]
        W2["Keep real widget primitives and buildWidgetTree"]
        W3["Record rendered trees - assert text and SVG"]
        W1 --> W3
        W2 --> W3
    end

    BASE["Shared harness: vitest.config.ts + setup.ts<br/>react-native and expo-router mocks, expo-observe alias"]
    BASE --> P1
    BASE --> D1
    BASE --> W1
```

_Three test layers share one harness; each layer replaces progressively more
of the runtime — platform modules, singletons, network transport, and native
widget rendering — while keeping the code under test real._

## Coverage scope

Coverage (V8 provider, `text`/`json`/`html` reporters) measures only:

- `src/utils/**/*.ts`
- `src/stores/**/*.ts`
- `src/hooks/**/*.ts`

This is a statement about where the logic lives, not an oversight. The
pipeline's decisions — view-model computation, PnL aggregation, fee-ratio
parsing, range detection, cache semantics — are all pure functions in
`src/utils` plus the `CacheManager` store, and the suite pins their invariants
directly there. Services and widgets are exercised end-to-end by the pipeline
and widget tests, but they are orchestration over those pure cores, so they
are not counted. No thresholds are configured; reports are informational.

## Layer 1: pure-function invariant tests

These files import the real module and pin behavior tables — no mocking, no
timers, deterministic by construction.

**Net cost basis (`pnlAggregation.test.ts`).** `computePoolPnLSummary` must
report `totalInitialDepositSol` as **deposits − withdrawals**, never gross
deposits. The regression that named the test: deposit 4.5 SOL, withdraw 4.5,
redeposit 4.5 — gross says 9.0, the correct basis is 4.5. Also pinned: partial
withdrawals reduce the basis proportionally, a null withdrawal SOL is treated
as zero, the value − uPnL fallback applies when no deposit SOL data exists,
and the basis aggregates across positions.

**View-model boundary (`computePositionViewData.test.ts`,
`formatters.test.ts`).** Pinned: defaults when `positionData` or both tokens
are missing (`$0.00`, `-`, null PnL, null liquidity shape); in-range detection
at the bin boundaries (activeId inside 40–60 vs below/above); zero PnL
preserved as a valid value while `undefined`/`null`/`''`/non-numeric/`Infinity`/`NaN`
become null; and the fee round-trip — the API's `feePerTvl24h` is a percentage
string (`"1.31"` = 1.31%), stored internally as the ratio `0.0131`, rendered
back as `1.31%`, with missing/negative/non-numeric input mapping to null and
null rendering as an em dash. `formatUsdFromSol` guardrails return `$0.00`
for null prices and non-finite inputs rather than `NaN` leaking into UI.

**Range alerts (`outOfRange.test.ts`).** `detectOutOfRangeAlerts` alerts only
on an **in-range → out-of-range transition**: a first-ever check (`previous === null`)
records state but emits nothing (no notification storm on install), a
position that was already out stays silent, a brand-new position never alerts,
and recovery to in-range never alerts.

**Chart downsampling (`downsampleChartBins.test.ts`).** `downsampleChartBins`
keeps the **peak bin per bucket, not the sum** — so equal-magnitude bins stay
equal-height across uneven bucket sizes (no comb), the global peak survives,
and input at or below the cap is returned untouched.

**Store semantics (`CacheManager.test.ts`, `settingsStore.test.ts`).** The
cache suite pins: inclusive TTL expiry exactly at the deadline (a zero TTL is
dead on arrival); in-flight deduplication, including fetchers that throw
synchronously (one call, both callers rejected, retry allowed afterwards);
error clearing so a failed fetch doesn't poison the key; and the
invalidation-during-flight matrix — for `delete`, `clear`, and
`invalidatePattern`, a detached request still resolves for its original
callers but can never repopulate the cache, overwrite an explicit `set`, or
detach a newer request, while unrelated pending requests survive pattern
invalidation. The settings store suite replaces MMKV with an in-memory Map and
verifies the Zustand persist middleware writes JSON under the `settings-store`
key.

## Layer 2: pipeline contract tests

`positionPipeline.test.ts` runs `createPositionPipeline({ cache })` against
the real client with only `fetch`, the DLMM SDK, `fetchTokenFromRpc`, and
config modules replaced. What it pins:

- **Pagination + caching.** Both single-page and two-page portfolios resolve
  every PnL page (the second request carries `page=2`), aggregate the summary,
  and a second `loadPortfolio` is served entirely from cache — `fetch` call
  counts prove it.
- **No partial PnL is ever cached.** A failing page — first or later — leaves
  `hasPnLData: false` with null `pnlSol` view models and nothing cached, and
  the next `loadPortfolio` retries the pool cleanly and succeeds.
- **Token-price degradation.** When `fetchTokenFromRpc` rejects, positions
  still resolve with null `tokenXInfo`/`tokenYInfo` and `$0.00` values.
- **Wire-format tolerance, end to end.** `pnlSol`/`pnlSolPctChange` arriving
  as decimal strings instead of numbers produce identical results — the test
  runs both encodings without a Helius key and checks the rendered widget tree
  contains `"-0.1213 SOL"`.
- **`invalidateWallet` is suffix-scoped.** It clears `pnl:{pool}:{wallet}`
  keys for that wallet only; `token_data:*` entries and other wallets' PnL
  survive.
- **Partial pool failure.** `fetchPortfolioSummary` still returns a summary
  when one pool's PnL fetch fails and another succeeds.

## Layer 3: widget render tests without a device

Both widget suites replace `react-native-android-widget` only at its
**transport**: `getWidgetInfo` returns fake installed instances and
`requestWidgetUpdateById` invokes the real `renderWidget` callback. The
components themselves are real — the mocks re-export the library's actual
`FlexWidget`/`TextWidget`/`SvgWidget`, and `build-widget-tree` converts the
rendered component tree exactly as the native side would. The suites record
every rendered tree into an in-memory map (plus a history list for
"did anything flash" assertions) and read them back with small helpers that
flatten the tree into text or extract `svgString`. `react-native-mmkv` is
never loaded anywhere under Vitest: each suite substitutes an in-memory Map
stub — with value-change listeners where reactive reads matter (the portfolio
sync suite) — so wallet persistence and widget snapshot reads run against
deterministic storage.

**`portfolioWidgetSync.test.tsx`** runs under `happy-dom` and drives the real
`useWidgetSync` hook with `@testing-library/react`'s `renderHook`, alongside
the headless `portfolioWidgetTaskHandler`. The wallet lifecycle invariants it
pins: current numbers stay visible with an `Updating…` badge during a manual
refresh; closed positions are never restored from the previous snapshot; a
wallet switch during refresh never shows the old wallet's numbers; a
disconnected refresh never flashes cached numbers; a late response from a
previous wallet (success _or_ failure) is ignored; reconnecting the same
address does not resurrect the previous session's cache; hook unmount cancels
the scheduled launch update; a background task without a wallet clears stale
numbers instead of fetching; a background response never overwrites a newer
manual refresh; a malformed or unowned persisted MMKV cache is discarded; no
requests are made when no widget instances are installed; and a request from
before a disconnect is rejected even when the same wallet reconnects.

**`positionLiquidityWidget.test.tsx`** asserts the rendered text (`SOL / USDC`,
position address, `$1,250.00`, `+0.2000 SOL`, `IN RANGE`, `1 / 3`) and that
the liquidity graph is a real SVG using theme tokens. Behavior pins:
per-instance `NEXT_POSITION`/`PREVIOUS_POSITION` navigation with no extra
fetches; selection that follows a position across reordered data and falls
back when it closes; navigation kept alive during an in-progress refresh; no
reuse of a previous wallet's graph or late response; disconnect clears data
and reconnect shows a loading state instead of restoring it; closed positions
become the empty state on subsequent navigation; missing prices or liquidity
render as unavailable instead of invented zeros; a failed refresh retains the
last graph and offers retry; a stalled fetch hits the 20-second headless
deadline and returns to a retry state without rendering the late result; no
fetch when this widget type isn't installed; a deleted widget's selection is
forgotten; and per-instance selection persists across `vi.resetModules()`
headless reloads. `toPositionWidgetData` must map positions to JSON-safe
snapshots — stable on-chain addresses, no raw `position` object — and the
liquidity graph section pins the SVG invariants: flat distributions stay flat
across uneven bars, bar count stays bounded with finite coordinates, and
out-of-range markers clamp to the edge.

**`updatePortfolioWidget.test.ts`** pins the widget summary mapping against a
fixed server snapshot: `totalInitialDepositSol` is derived as value − uPnL
(gross server deposits are never surfaced), a null server PnL is treated as
zero, and a zero-count portfolio maps to null.

## Transport and config guards

- `dlmmApi.test.ts` pins URL construction, `DlmmApiError` with HTTP status
  (null status on network failure), the pagination walk, rejection at the
  10-page cap, the `outOfRangeCount`/pool-value-weighted `feesTvl24h` rollups,
  and no partial rollups when a later page fails.
- `data.test.ts` pins `DataServices` caching (second call hits cache),
  per-mint batch isolation on partial failure, and OHLCV keyed by pool +
  timeframe.
- `theme.test.ts` reads `src/global.css` and asserts each `@variant` block's
  color values match `themeTokens` — guarding the uniwind CSS against drift
  from the source of truth in `theme.ts`.

## Working on this suite

Prefer the narrowest test that proves the changed behavior: a new invariant on
a pure function belongs in its `src/__tests__/utils/` table, not in a pipeline
or widget test; a rendering regression belongs in the widget suite where the
captured tree makes the failure output self-explanatory. When a test fails,
keep the complete failure output — the tree/text assertions and `fetch` call
counts are designed to name the broken invariant directly.

## Related pages

- `/openwiki/architecture/data-pipeline.md` — the pipeline behavior these tests pin
- `/openwiki/concepts/caching.md` — `CacheManager` semantics in depth
- `/openwiki/concepts/platform-seams.md` — the `expo-observe` web stub the test alias reuses
- `/openwiki/workflows/widget-sync.md` — the widget sync lifecycle the widget suites drive

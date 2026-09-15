---
type: concept
title: Platform Seams & Polyfills
description: The native/web split — env.devMock mock-data mode, the platform-extension stub pairs that must stay in sync, and the React Native Buffer polyfills that keep the Solana/Meteora SDKs working on Hermes.
tags: [platform-seams, metro, dev-mock, polyfills, buffer, hermes, expo-observe, web-preview]
verified:
  - by: openwiki/0.5.1
    at: 2026-09-13T11:52:56.431Z
sources:
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-26966fe9c0c60f8125f86100
    resource: repo://index.js
  - id: openwiki-source-bea5e7ab9541e6ebb028dcb4
    resource: repo://polyfill.js
  - id: openwiki-source-22216871a6aa30b53d5662fd
    resource: repo://polyfill.web.js
  - id: openwiki-source-c05e71cb88a6790c2e482e11
    resource: repo://src/__tests__/services/mockOhlcv.test.ts
  - id: openwiki-source-576e672276c901ad473c4257
    resource: repo://src/config/connection.ts
  - id: openwiki-source-c2770ac037a7f4b0116a0dc5
    resource: repo://src/config/env.ts
  - id: openwiki-source-000ff83da13cd8151865df39
    resource: repo://src/hooks/usePoolOhlcv.ts
  - id: openwiki-source-13ac045b3c6e8f791ed075ad
    resource: repo://src/hooks/usePositionsPage.ts
  - id: openwiki-source-2374b8ee308aa1639d788838
    resource: repo://src/hooks/useWalletLifecycle.ts
  - id: openwiki-source-d156ac17d63cb294fe923bc3
    resource: repo://src/hooks/useWidgetSync.ts
  - id: openwiki-source-c96e539a30224e5d973b7544
    resource: repo://src/hooks/useWidgetSync.web.ts
  - id: openwiki-source-e1eec237e48c267ef2ec7832
    resource: repo://src/observe/index.ts
  - id: openwiki-source-4927117ba73903d38c3a1115
    resource: repo://src/observe/index.web.tsx
  - id: openwiki-source-ba64d86fbac215c29143bbec
    resource: repo://src/services/mockOhlcv.ts
  - id: openwiki-source-077afeb14e7def959e48843d
    resource: repo://src/services/mockPortfolio.ts
  - id: openwiki-source-b1fb2ead06f307fd5ffbcd19
    resource: repo://src/services/positionPipeline.ts
  - id: openwiki-source-87e26c9333c6a86c22f50432
    resource: repo://src/tasks/widgetBackgroundSync.ts
  - id: openwiki-source-707cdfc253960cbabbf4e854
    resource: repo://src/wallet/walletKit.tsx
  - id: openwiki-source-a39e6efe583e67beb7726212
    resource: repo://src/wallet/walletKit.web.tsx
  - id: openwiki-source-26e2cddc6b4b96be084074ef
    resource: repo://src/widgets/registerWidgetTask.ts
  - id: openwiki-source-da094e41410c5125df7e3ecf
    resource: repo://src/widgets/registerWidgetTask.web.ts
  - id: openwiki-source-4e98c79b54f7f9d6c6363147
    resource: repo://src/widgets/syncPortfolioWidget.ts
  - id: openwiki-source-300ef64378ea0f77e6c493bc
    resource: repo://src/widgets/syncPositionWidgets.tsx
  - id: openwiki-source-fbadcd8591b65031efaaedce
    resource: repo://vitest.config.ts
generated: { by: 'openwiki/0.5.1', at: '2026-09-13T11:52:56.431Z' }
---

# Platform Seams & Polyfills

Yonks ships two runtimes from one codebase: native Android/iOS builds that talk
to a Mobile Wallet Adapter session, Solana RPC, and the DLMM SDKs — and a web
preview that must render the full UI with none of them. Three cooperating
mechanisms make that work:

1. **Dev mock mode** (`env.devMock`) routes data hooks away from the wallet and
   RPC to deterministic mock data.
2. **Platform-split seams** hide native-only packages behind module pairs whose
   web sibling Metro resolves instead of the native one.
3. **`polyfill.js`** patches the Hermes/React Native globals (`Buffer`, crypto,
   `URL`) that the Solana/Anchor/Meteora SDKs assume.

The web preview boots only because all three line up: the seams keep native
modules out of the web bundle, the polyfills cover the SDK runtime surface that
still loads there, and dev mock mode makes sure no code path ever _needs_ a
wallet or an RPC URL.

## Dev mock mode: `env.devMock`

`src/config/env.ts` is the only place the flag is computed:

```ts
devMock: process.env.EXPO_PUBLIC_DEV_MOCK === '1' || Platform.OS === 'web',
```

Two things follow from this definition:

- **Web is always in dev mock mode.** `Platform.OS === 'web'` makes the flag
  true regardless of env vars — the web target exists purely as a mock-data
  visual preview, with no wallet adapter and no RPC.
- **Native builds opt in explicitly** by setting `EXPO_PUBLIC_DEV_MOCK=1` (see
  `.env.example`); production builds are unaffected unless someone sets the
  flag deliberately.

The home screen surfaces the mode with a persistent "Dev Mode — Mock Data"
banner so a mock session can't be mistaken for live data.

### What `devMock` gates

Every consumer of `env.devMock` short-circuits **before** any SDK, wallet, or
RPC call — that is the property that lets the web bundle boot without a
Solana endpoint:

| Consumer                                      | In mock mode                                                                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useWalletLifecycle`                          | Returns `walletReady: true` with a toggleable fake wallet (`MOCK_WALLET_ADDRESS` or `undefined`); connect/disconnect just flip local state              |
| `usePositionsPage`                            | Returns `createMockPortfolioResult()` synchronously; `refresh` is a no-op; the SOL price is seeded with `MOCK_SOL_USD_PRICE` (145.0) instead of fetched |
| `usePoolOhlcv`                                | Serves `getMockOhlcv()` synchronously instead of calling the Meteora DLMM REST endpoint                                                                 |
| `useWidgetSync`                               | Effect returns immediately — no widget sync scheduling                                                                                                  |
| `widgetBackgroundSync` task                   | Returns `BackgroundFetchResult.NoData` without syncing                                                                                                  |
| `syncPortfolioWidget` / `syncPositionWidgets` | Return `'no-data'` before touching widgets or the pipeline                                                                                              |

<!-- openwiki: mermaid parse failed and this diagram was converted to a text fence so it does not break rendering. Fix the diagram source and restore the mermaid fence. Parser error: Heuristic: an unescaped angle bracket inside a label breaks rendering; rephrase the label. -->

```text
flowchart TD
    ENV["env.devMock<br/>EXPO_PUBLIC_DEV_MOCK=1 or web platform"]
    WL["useWalletLifecycle"]
    UPP["usePositionsPage"]
    UO["usePoolOhlcv"]
    HS["headless widget sync<br/>useWidgetSync + background task"]
    MWA["walletKit seam - Mobile Wallet Adapter"]
    PP["PositionPipeline.loadPortfolio"]
    NET["Solana RPC + DLMM Data API + Meteora OHLCV REST"]
    MPA["createMockPortfolioResult"]
    MO["getMockOhlcv - deterministic candles"]
    OFF["no-op / no-data"]

    ENV --> WL
    ENV --> UPP
    ENV --> UO
    ENV --> HS
    WL -- "mock" --> WLM["fake wallet toggle"]
    WL -- "live" --> MWA
    UPP -- "mock" --> MPA
    UPP -- "live" --> PP
    UO -- "mock" --> MO
    UO -- "live" --> NET
    HS -- "mock" --> OFF
    HS -- "live" --> NET
```

_Each `env.devMock` consumer branches before any native/RPC call: mock mode
stays inside pure synchronous modules, live mode goes through the seams and
the network._

One structural consequence: because mock mode can reach `usePositionsPage`
without the pipeline ever being constructed, the pipeline must not require an
RPC URL at construction time — `getSharedConnection()` resolves the shared
`Connection` lazily on first chain access and only then throws if
`EXPO_PUBLIC_RPC_URL` is unset. That laziness is what makes the full web module
graph bootable.

## Mock data

### `mockPortfolio.ts` — a complete, self-consistent `PortfolioResult`

`createMockPortfolioResult()` builds three positions (SOL/USDC in range,
BONK/SOL deliberately out of range, JUP/SOL in range) from real domain types
(`ResolvedPosition`, `PositionViewModel`, `LiquidityShape`), so the Positions
UI — summary, cards, charts, fees/TVL — exercises its genuine render path.
Details that matter:

- **The on-chain object is stubbed, on purpose.** The UI layer only consumes
  `vm`, `tokenXInfo`, and `tokenYInfo`, never the raw `PositionInfo`, so the
  mock passes `position: {} as PositionInfo`.
- **The summary is derived, not hardcoded per field**: total SOL value, initial
  deposit, unclaimed fees, and a value-weighted fees/TVL ratio are computed
  from the position list, so the header can never disagree with the cards.
- **`MOCK_POOL_BASE_PRICES`** is exported from the position definitions and
  anchors the mock OHLCV generator (below) to the same price axis as the
  liquidity bin range.
- **A defensive guard** returns an empty `PortfolioResult` if the function is
  somehow called with `env.devMock` off — mock data never leaks into a
  production build.

### `mockOhlcv.ts` — deterministic, seeded candles

`getMockOhlcv(pairAddress, timeframe)` produces a display-only `OhlcvSeries`
(per ADR 0001, OHLCV never feeds PnL or value computation) with the same shape
as the real fetcher:

- **Determinism** comes from seeding: FNV-1a hash of `pairAddress:timeframe`
  drives a mulberry32 PRNG, so a given pool always yields identical candles.
- **The 20-candle series starts at the fixed anchor timestamp**
  `1_700_000_000`, keeping generated series byte-stable across reloads — this
  is what makes web screenshots and palette audits reproducible.
- **Prices walk within ±8.5% of the pool's base price** (from
  `MOCK_POOL_BASE_PRICES`) — deliberately the same anchor as the mock
  liquidity bin range (±~9.6%), so the candle chart and the range band share
  one plausible axis. A slight upward bias (`rand() - 0.45`) makes the series
  trend through the band.
- **Series are cached per `pairAddress:timeframe`** in a module-level `Map`, so
  re-mounts and re-renders see identical data by identity.
- **Unknown pair addresses return `null`**, and the caller keeps its empty
  state — the mock only ever answers for pools the mock portfolio defines.

## The platform seam pairs

Native-only packages are never imported directly by app code. Each one lives
behind a platform-split module: Metro resolves the `.web` sibling **only** when
the platform is `web`; native builds bundle the native file and never see the
stub. These are the pairs, and their exports must be edited together:

| Seam                     | Native file                         | Web sibling                 | Web behavior                    |
| ------------------------ | ----------------------------------- | --------------------------- | ------------------------------- |
| Polyfills                | `polyfill.js`                       | `polyfill.web.js`           | Buffer only                     |
| Wallet kit               | `src/wallet/walletKit.tsx`          | `walletKit.web.tsx`         | Inert provider; `signIn` throws |
| Widget sync hook         | `src/hooks/useWidgetSync.ts`        | `useWidgetSync.web.ts`      | No-op                           |
| Widget task registration | `src/widgets/registerWidgetTask.ts` | `registerWidgetTask.web.ts` | No-op                           |
| Observe                  | `src/observe/index.ts`              | `index.web.tsx`             | No-op stubs                     |

The sync rule is stated in each file's header comment ("keep both files'
exports in sync") and in `AGENTS.md`: adding an export on one side without the
other breaks exactly one platform, at build or run time.

### Wallet kit

The native file re-exports `MobileWalletProvider`, `createSolanaMainnet`, and
`useMobileWallet` from `@wallet-ui/react-native-kit`. The web stub keeps the
same three names: the provider renders children unchanged, and
`useMobileWallet()` returns `account: null` with a `signIn` that throws
`'Mobile wallet is not available on web'`. It only needs to mount cleanly —
`useWalletLifecycle` never reads wallet values in mock mode, so no MWA
machinery ever runs on web.

### `expo-observe`

`src/observe/index.ts` re-exports the real `expo-observe` API (`Observe`,
`ObserveErrorBoundary`, `ObserveRoot`, `useObserve`); `index.web.tsx` mirrors
those exports as no-ops (`ObserveRoot.wrap` is the identity,
`ObserveErrorBoundary` just renders children, `markInteractive` does nothing)
and imports only `ObserveConfig` as a **type**, so the native package and its
`expo-app-metrics` dependency are never evaluated on web. Metrics are
collected from native builds only.

Tests need the same trick from the other direction: `expo-observe` resolves its
native module at import time, which fails in the Node/Vitest environment. So
`vitest.config.ts` aliases `expo-observe` to `src/observe/index.web.tsx`,
making every module in the test graph — hooks that emit Observe events
included — importable without a native runtime.

## The Buffer polyfill story

### Why the patches exist

The app runs **two Solana SDK generations side by side**: the legacy
`@solana/web3.js` (v1) and the new `@solana/kit` (v2, the engine behind
`@wallet-ui/react-native-kit`). Both, plus Anchor (`@coral-xyz/anchor`, pulled
in by `@meteora-ag/dlmm`) and the DLMM SDK itself, use Node.js `Buffer`
methods — `readIntLE`, `equals`, `subarray`, … — that plain `Uint8Array` does
not have under Hermes. All patches live in `polyfill.js`.

### Load order is load-bearing

`index.js` imports `./polyfill` **before** `expo-router/entry`, so every SDK
module Metro evaluates later sees the patched globals. Inside `polyfill.js`
the order is fixed and must not change:

<!-- openwiki: mermaid parse failed and this diagram was converted to a text fence so it does not break rendering. Fix the diagram source and restore the mermaid fence. Parser error: Heuristic: an unescaped angle bracket inside a label breaks rendering; rephrase the label. -->

```text
flowchart TD
    ENTRY["index.js imports ./polyfill"] --> P1["react-native-get-random-values<br/>must be first"]
    P1 --> P2["react-native-quick-crypto<br/>import binds install"]
    P2 --> P3["react-native-url-polyfill/auto<br/>URL + URLSearchParams"]
    P3 --> P4["craftzdog Buffer assigned to global.Buffer"]
    P4 --> P5["prototype patches<br/>subarray / slice / bufferMethods / equals"]
    P5 --> P6["install called - must be last"]
    P6 --> ROUTER["expo-router/entry<br/>SDKs evaluate with patched globals"]
```

_The polyfill pipeline: randomness first, crypto `install()` last, Buffer and
its prototype patches in between — then the router (and every SDK module) can
evaluate._

1. `react-native-get-random-values` first — later code needs randomness to
   already work.
2. `react-native-quick-crypto` — the module is imported here but `install()`
   runs at the bottom of the file, after the Buffer patches.
3. `react-native-url-polyfill/auto` — `URL`/`URLSearchParams`.
4. `@craftzdog/react-native-buffer` assigned to `global.Buffer` — the C++
   implementation, chosen for performance.
5. The prototype patches (below).

### The three patch mechanisms

- **`Buffer.prototype.subarray` / `slice`** are wrapped so results get
  `Object.setPrototypeOf(result, Buffer.prototype)` when they come back as
  plain `Uint8Array` — Anchor's discriminator extraction depends on getting a
  real `Buffer` back.
- **Buffer read/write methods on `Uint8Array.prototype`**: a list of
  `readIntLE`/`readUIntBE`/`writeUInt32LE`/`copy`/`fill`-style methods is
  injected onto `Uint8Array.prototype`, each forwarding through a zero-copy
  Buffer view (`Buffer.from(this.buffer, this.byteOffset, this.byteLength)`).
  This fixes `buffer-layout` deserialization and the classic
  "`b.readIntLE` is not a function" crash when an SDK hands raw
  `Uint8Array`s around.
- **`Uint8Array.prototype.equals`** is implemented directly (length check plus
  byte loop) because Anchor compares discriminators with `.equals()`, which
  plain `Uint8Array` lacks.

### Web: `polyfill.web.js`

The native patches are not loaded on web — Metro resolves `polyfill.web.js`
instead. Browsers already provide `crypto.getRandomValues`, `crypto.subtle`,
and `URL`/`URLSearchParams`; the only gap for the Solana SDKs is `Buffer`, so
the whole web polyfill is `import { Buffer } from 'buffer'; global.Buffer =
Buffer` (the npm `buffer` package, not the craftzdog native one — there is no
native engine on web to bind to).

### Constraints when an SDK breaks

When a Solana SDK throws "`X` is not a function" and `X` is a Buffer method,
the fix is to **extend `polyfill.js`** — add the method to the forwarding list
or use the `Object.setPrototypeOf` pattern. The rules from `AGENTS.md`:

- **Do not fork the SDK** — the maintenance burden is not worth it.
- **Do not swap `@craftzdog/react-native-buffer` for `buffer`** — the C++
  implementation is needed for performance on device.
- **Do not change the load order** — `react-native-get-random-values` must be
  first and `install()` must run last.

## Focused tests that matter here

`src/__tests__/services/mockOhlcv.test.ts` pins the mock OHLCV contract: every
mock pool yields a 20-candle series on the default timeframe; unknown
addresses yield `null`; repeated calls return the identical (cached) object;
candles satisfy the OHLC invariants with `open` chaining to the previous
`close`; every price stays within ±10% of the pool base price; timestamps are
spaced by the timeframe; and the series contains both up and down candles.
Because the generator is deterministic, these assertions hold on every run —
which is the point of the seeded design.

## Related pages

- `/openwiki/architecture/overview.md` — boot sequence, layer map, and how the
  seams fit the provider stack
- `/openwiki/concepts/theming-and-design.md` — theme tokens behind the web
  preview audits the mock mode makes reproducible
- `/openwiki/testing/strategy.md` — the Vitest setup and aliases referenced
  above
- `/openwiki/workflows/positions-screen.md` — what `usePositionsPage` does in
  live mode when `devMock` is off

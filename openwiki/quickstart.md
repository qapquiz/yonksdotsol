---
type: guide
title: Quickstart
description: Get Yonks running and verify changes — install with bun, set the EXPO_PUBLIC_* env vars, run the native or web-mock dev server, and pass the tsgo/lint/fmt/test gate.
tags: [quickstart, setup, environment, dev-commands, validation, expo, bun]
verified:
  - by: openwiki/0.5.1
    at: 2026-09-13T11:52:56.431Z
sources:
  - id: openwiki-source-560d8bcc2c5736a069ffee77
    resource: repo://.github/workflows/android-build.yml
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-26966fe9c0c60f8125f86100
    resource: repo://index.js
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-bea5e7ab9541e6ebb028dcb4
    resource: repo://polyfill.js
  - id: openwiki-source-1ac3a4c788ee8ff772da5724
    resource: repo://scripts/palette-check.py
  - id: openwiki-source-288b4a3bf1db5fb3d5a0c6e3
    resource: repo://src/__tests__/setup.ts
  - id: openwiki-source-052e5ef8199eb0551b4a9ee1
    resource: repo://src/app/_layout.tsx
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
  - id: openwiki-source-ba64d86fbac215c29143bbec
    resource: repo://src/services/mockOhlcv.ts
  - id: openwiki-source-077afeb14e7def959e48843d
    resource: repo://src/services/mockPortfolio.ts
  - id: openwiki-source-b1fb2ead06f307fd5ffbcd19
    resource: repo://src/services/positionPipeline.ts
  - id: openwiki-source-707cdfc253960cbabbf4e854
    resource: repo://src/wallet/walletKit.tsx
  - id: openwiki-source-a39e6efe583e67beb7726212
    resource: repo://src/wallet/walletKit.web.tsx
  - id: openwiki-source-da094e41410c5125df7e3ecf
    resource: repo://src/widgets/registerWidgetTask.web.ts
  - id: openwiki-source-fbadcd8591b65031efaaedce
    resource: repo://vitest.config.ts
generated: { by: 'openwiki/0.5.1', at: '2026-09-13T11:52:56.431Z' }
---

# Quickstart

This page gets a coding agent from clone to a running app and a clean verification loop: install dependencies, configure environment variables, pick a dev target (native device/emulator or the web mock preview), and check changes with the repo's gate. It ends with a routing map into the rest of the wiki.

Standing rule from [`AGENTS.md`](../AGENTS.md): **source code and tests are authoritative**. The generated `openwiki/` index is optional just-in-time context, not startup reading, and agents should prefer the narrowest quiet validation that proves the changed behavior.

## Prerequisites and install

The repo is driven with [bun](https://bun.sh):

```bash
bun install
```

The GitHub Actions Android build installs with `bun install --frozen-lockfile`, so keep `bun.lock` consistent when changing dependencies. Two `.env`-adjacent notes: `.env` is gitignored (create it below), and the `build`/`ci` package scripts internally chain through `npm run`, so npm must exist on `PATH` even when you drive everything with bun.

## Environment variables

Copy the example and fill in what you need:

```bash
cp .env.example .env
```

| Variable                     | Value                                                                                                                    | Used for                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `EXPO_PUBLIC_RPC_URL`        | Solana RPC endpoint — Helius, Triton, or the public mainnet RPC (example default: `https://api.mainnet-beta.solana.com`) | The shared `Connection` for all on-chain reads, and token metadata via the `getAsset` call |
| `EXPO_PUBLIC_HELIUS_API_KEY` | Helius API key (optional)                                                                                                | Enhanced data fetching                                                                     |
| `EXPO_PUBLIC_DEV_MOCK`       | `1` to render mock positions instead of on-chain data; `0`/unset for live (defaults off)                                 | Dev-only mock portfolio; always on for web (see below)                                     |

Everything is read through `src/config/env.ts` — `env.rpcUrl`, `env.heliusApiKey`, `env.devMock`. Never use `process.env` directly in components. Zod validation is present but commented out, so values are consumed as-is. If `EXPO_PUBLIC_RPC_URL` is missing, the failure is deferred and actionable: the shared connection is created lazily, and the first on-chain fetch throws an error telling you to copy `.env.example` to `.env` — constructing the pipeline itself never needs an RPC URL.

## Run the app

```mermaid
flowchart TD
    A["bun install"] --> B["cp .env.example .env"]
    B --> C{"Pick a target"}
    C -->|web| D["bun run web"]
    C -->|native| E["bun run android or bun run ios"]
    D --> F["env.devMock forced on - mock portfolio, no wallet adapter, no RPC"]
    E --> G{"Mock data?"}
    G -->|live| H["keep EXPO_PUBLIC_DEV_MOCK off - real RPC required"]
    G -->|mock| I["set EXPO_PUBLIC_DEV_MOCK=1 for mock positions on device"]
    F --> V["Verify: tsgo --noEmit, bun run lint, bun run fmt, bun run test"]
    H --> V
    I --> V
    V --> CI["bun run ci - full gate with Android prebuild"]
```

Command choice decides the data mode; every path ends in the same verification loop.

### Native (Android / iOS)

- `bun run dev` — Expo dev server with cache reset (`expo start --clear --dev-client --reset-cache`). Use with a development client build.
- `bun run android` / `bun run ios` — prebuild and run on a device or emulator (`expo run:android` / `expo run:ios`).
- `bun start` — Expo without the dev client.

Native boot order is fixed and matters when debugging SDK crashes: `index.js` imports `polyfill.js` first (the React Native Buffer/crypto patches that keep the Solana and Meteora SDKs working on Hermes), then `expo-router/entry`, then registers the Android widget task handler. Don't reorder these; see [concepts/platform-seams.md](concepts/platform-seams.md) for the patch inventory.

### Web (auto mock mode)

```bash
bun run web        # http://localhost:8081; add -- --lan for other devices
```

The web target exists purely as a mock-data visual preview: `env.devMock` is **always true when `Platform.OS === 'web'`** (or when `EXPO_PUBLIC_DEV_MOCK=1` anywhere). No wallet adapter, no RPC, no network — you get a static mock portfolio from `src/services/mockPortfolio.ts` and deterministic, seeded mock candles from `src/services/mockOhlcv.ts`. This makes web the fastest loop for UI iteration and screenshots.

What to expect on web:

- A `Dev Mode — Mock Data` banner under the header confirms mock is active.
- `useWalletLifecycle` short-circuits to a toggleable fake wallet (ready by default with address `DeVMoCK1Wallet…`); toggling it off exercises the disconnected/empty states. `usePositionsPage` bypasses the pipeline entirely, so pull-to-refresh is a no-op.
- Native-only seams are stubbed via platform-split files — Metro loads the `.web` variant only on web: `polyfill.web.js`, `src/wallet/walletKit.web.tsx`, `src/hooks/useWidgetSync.web.ts`, `src/widgets/registerWidgetTask.web.ts`. Keep each export pair in sync when changing either side.
- Theme is **store-driven** (`settingsStore`, dark by default) — browser media emulation does nothing. To capture light-mode boot states, seed `localStorage` with the persisted `settings\settings-store` value before reopening.

For headless UI observation, AGENTS.md prescribes the `agent-browser` loop: open the page, `wait --text "DEPOSITED"` for the mount marker, read `agent-browser console`, and screenshot to an absolute path. Then audit the capture against the design tokens:

```bash
python3 scripts/palette-check.py .expo/web-capture.png
```

`palette-check.py` compares the PNG's pixels to `src/config/theme.ts` (auto-detecting dark/light; requires `pip install pillow`), catching Uniwind CSS variables drifting out of sync with the canonical tokens.

## Verify your changes

The loop from AGENTS.md, in order:

1. `tsgo --noEmit` — type check. **Never `tsc`**: the repo uses the TypeScript native preview (`@typescript/native-preview`), which is not drop-in compatible.
2. `bun run lint` — ESLint with auto-fix (`expo lint --fix`); use `bun run lint:check` for a read-only check.
3. `bun run fmt` — format with oxfmt (config in `.oxfmtrc.json`: 120 columns, no semicolons, single quotes); `bun run fmt:check` for CI parity.
4. `bun run test` — run all Vitest suites once; `bun run test:watch` and `bun run test:coverage` for iteration and V8 coverage.
5. `bun run ci` — the full gate: `tsgo --noEmit` + lint check + format check + Android prebuild. `bun run build` is type check + prebuild without the checks in between.

Prefer the narrowest quiet validation that proves the changed behavior (e.g. a single Vitest file) and only run `bun run ci` before handing off.

Tests live in `src/__tests__/`, mirroring the `src/` layout. The Vitest environment is `node` with globals enabled; `src/__tests__/setup.ts` mocks React Native and expo-router core modules; module aliases map `@` → `src` and redirect `expo-observe` to its web no-op stub so hooks that emit Observe events stay importable. Coverage is scoped to `src/utils/`, `src/stores/`, and `src/hooks/`. See [testing/strategy.md](testing/strategy.md) for what the suites actually pin down.

## Where to go next

| Need                                                                                                                   | Read                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| System boundaries — app shell, pipeline, stores, widgets, and how they bound each other                                | [architecture/overview.md](architecture/overview.md), then [architecture/data-pipeline.md](architecture/data-pipeline.md) and [architecture/state-and-persistence.md](architecture/state-and-persistence.md)                                                     |
| End-to-end behavior — boot & wallet lifecycle, the positions screen, widget sync, out-of-range alerts                  | [workflows/app-boot-and-wallet.md](workflows/app-boot-and-wallet.md), [workflows/positions-screen.md](workflows/positions-screen.md), [workflows/widget-sync.md](workflows/widget-sync.md), [workflows/out-of-range-alerts.md](workflows/out-of-range-alerts.md) |
| Invariants and vocabulary — domain terms (Position, Pool, Bins, uPnL), caching contract, design tokens, platform seams | [concepts/domain-model.md](concepts/domain-model.md), [concepts/caching.md](concepts/caching.md), [concepts/theming-and-design.md](concepts/theming-and-design.md), [concepts/platform-seams.md](concepts/platform-seams.md)                                     |
| External surfaces — Solana RPC, the Meteora DLMM SDK and Data API, Helius metadata, OHLCV                              | [integrations/solana-and-meteora.md](integrations/solana-and-meteora.md)                                                                                                                                                                                         |
| Tooling and release — bun scripts, Expo app.json plugins, EAS profiles, tag-triggered builds                           | [operations/build-and-tooling.md](operations/build-and-tooling.md)                                                                                                                                                                                               |
| How tests are structured and what they guard                                                                           | [testing/strategy.md](testing/strategy.md)                                                                                                                                                                                                                       |

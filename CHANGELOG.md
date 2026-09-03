# Changelog

All notable changes to **Yonks** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [5.0.4] - 2026-09-03

### Added

- **Segmented control motion** — the selected state is now a sliding
  indicator pill (stiff, nearly critically damped spring — fast
  arrival, one whisper of overshoot) with a 130 ms label-color
  crossfade, on both the chart-mode (Liquidity/Price) and currency
  (SOL/USD) toggles. Honors the OS reduce-motion setting; works in
  both fill and inline variants; no new dependencies.

## [5.0.3] - 2026-09-03

### Added

- **Design-system codification** — shape tiers (control / card / tile /
  track / chip / micro) and a single state-layer press rule
  (`active:opacity-80`) documented in DESIGN.md; applied to the three
  pressables that lacked feedback.
- **agent-browser web observation loop** — headless UI verification
  from the Pi without Playwright (drives the real dev server; theme
  and wallet states via snapshot + clicks). Token-vs-pixels audit
  survives as `scripts/palette-check.py` (pure pillow, auto theme
  detection). Playwright dependency and its 984 MB browser cache
  dropped.

### Fixed

- **Light theme AA contrast** — primary `#6b8f71→#5a7a60`, secondary
  `#c07a3e→#a5652f`, muted `#999999→#737373`; new paired on-dim text
  tokens (`-dim-text`) so badge and segment text stops borrowing
  full-strength accents.
- **Light dev-mode banner failed AA** (3.73:1 after the copper
  darkening) — hardcoded hex replaced by `app-on-secondary`; white on
  copper is 4.66:1. DESIGN.md's hardcoded-hex exception retired.
- **Dark theme missing `--color-app-primary-dim-text`** — IN RANGE
  badges and selected segments fell back to inherited color; now
  resolve to sage `#8FA893` (5.09:1).
- FontPicker checkmark uses `app-on-primary` instead of borrowing the
  screen background color.

## [5.0.2] - 2026-09-02

### Added

- **Web mock preview** — run the full app UI in a browser from the Pi
  (`bun run web`) using dev-mock data, for layout iteration without an
  emulator. Web auto-enables mock mode; native-only seams (polyfills,
  wallet adapter, widget sync) are stubbed via `.web.*` platform files.
- Vendored Expo agent skills (`.agents/skills`, `.pi/skills` symlinks,
  `skills-lock.json`).

### Changed

- **Bumped Expo SDK 57 patch to 57.0.18** (from 57.0.2) — fixes the
  Hermes V1 memory regression affecting `react-native-reanimated` /
  `react-native-worklets`; includes react-native 0.86.3 and
  SDK-aligned package bumps.

### Fixed

- Solana `Connection` is now created lazily — a missing
  `EXPO_PUBLIC_RPC_URL` fails only when fetching, with an actionable
  error, instead of crashing the position pipeline at render.

## [5.0.0] - 2026-07-03

First **stable** release. This version promotes the accumulated work from the
4.x beta line to a stable `5.0.0`, built on Expo SDK 57 (React Native 0.86).

### Added

- **Home-screen widget** — a "Yonks Portfolio" Android widget summarizing
  portfolio PnL, themed into the design system with optimistic refresh feedback.
- **Design system** — unified color/typography/spacing tokens and a new "Readout"
  hero on the portfolio screen.
- **In-card price chart** — display-only OHLCV sparkline on each position card.
- **Out-of-range alerts** — push notifications when a position leaves the active
  bin range, with a per-wallet transition detector, a settings bottom-sheet, and
  an alerts on/off preference.
- **SOL/USD display toggle** — switch portfolio and per-position figures between
  SOL and USD (`displayCurrency` setting).
- **24H fees/TVL** — replaced the 24h APR metric with explicit 24H fees and TVL,
  shown in its own summary band.
- **Pull-to-refresh** on the empty state, with the summary moved to the list
  header.
- **Dev mock mode** for position/UI testing without a live wallet.
- `.env.example` to streamline onboarding.
- Terms of use.

### Changed

- **Upgraded to Expo SDK 57 / React Native 0.86** (React 19).
- **Migrated list rendering** from `@shopify/flash-list` to `@legendapp/list`.
- **Switched code formatter** from Prettier to **oxfmt**.
- **Settled on bun** as the package manager (`bun.lock`).
- Reconciled the ubiquitous language with the codebase; renamed `walletResolved`
  to `walletReady`.
- Bumped CI actions to Node 24-compatible majors.

### Fixed

- Fee overflow in the position card (and aligned the skeleton to the card layout).
- Deposited value was reported gross instead of net (now subtracts withdrawals).
- 24H fees/TVL values were 100× too high.
- Out-of-range alert state is now cleared on wallet disconnect.
- Raised the Gradle heap to stop `compileReleaseArtProfile` OOM on release builds.
- Pinned `@solana/web3.js` to v1 to match Anchor/Meteora DLMM, resolving a
  `Connection` type mismatch.
- Corrected Markdown heading hierarchy and casing in the terms of use.

### Removed

- Dead formatter helpers and their tests, plus the unused `hasAnyPnLData` helper.
- Orphaned historical-price fetcher modules and the unused historical
  `PriceService`.
- Unused OHLCV/PYTH cache TTL constants.

[5.0.0]: https://github.com/qapquiz/yonksdotsol/releases/tag/v5.0.0

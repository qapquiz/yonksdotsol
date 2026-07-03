# Changelog

All notable changes to **Yonks** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

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

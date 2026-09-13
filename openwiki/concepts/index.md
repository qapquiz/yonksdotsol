# Files

- [Caching Strategy](caching.md) - The CacheManager contract — TTL expiry, in-flight request deduplication, invalidation-during-flight semantics, cache-key conventions, and the TTL table shared by the position pipeline, token/OHLCV services, and wallet invalidation.
- [Domain Model & Vocabulary](domain-model.md) - Canonical domain terms for Yonks — Position, Pool and pair address, Bins, in-range, uPnL, Position view model, Liquidity shape — plus the flagged naming ambiguities that cause real bugs if misread.
- [Platform Seams & Polyfills](platform-seams.md) - The native/web split — env.devMock mock-data mode, the platform-extension stub pairs that must stay in sync, and the React Native Buffer polyfills that keep the Solana/Meteora SDKs working on Hermes.
- [Theming & Design System](theming-and-design.md) - The design-token system — theme.ts as the canonical hex source mirrored into global.css Uniwind variables, the semantic profit/loss/caution color mapping, typography rules, and how SVG surfaces and headless Android widgets consume the same tokens.

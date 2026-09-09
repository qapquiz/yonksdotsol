---
title: PositionLiquidityWidget
type: entity
location: src/widgets/PositionLiquidityWidget.tsx
created: 2026-09-09
updated: 2026-09-09
tags: [widget, android, positions, liquidity]
related:
  - LiquidityBarChart
  - Caching Strategy
  - Position Architecture
---

# PositionLiquidityWidget

An Android home-screen widget for browsing individual positions and their liquidity shapes. Its picker label is **Yonks Positions**; the existing **Yonks Portfolio** summary remains available separately.

## Display and Controls

- Pool token symbols, a shortened position address, and in-range/out-of-range status.
- Position value and unrealized fees in USD, plus uPnL explicitly labeled in SOL. Missing values show `—`.
- A liquidity graph using the same `LiquidityShape` as the app. Range prices are quoted as Token Y per Token X.
- Previous/Next buttons cycle through every position without fetching. Each installed widget retains its own selection by position address. If the selected position closes, it falls back to the first remaining address.
- Refresh fetches new data. Tapping the body opens Yonks.

The default footprint is 4 × 4 cells, with a 320dp minimum width and height. Both dimensions can be resized. The graph grows with available space. Buttons have at least 44dp of touch height and explicit accessibility labels.

## Data and Refresh

`syncPositionWidgets.tsx` loads positions through `PositionPipeline.loadPortfolio`, including actual per-bin amounts. The SDK is imported lazily, and no position fetch runs when this widget type is absent. The portfolio summary continues to use server totals via [[DlmmApi]].

Per-position uPnL comes from the public DLMM Data API and does not require a separate Helius API key. The SDK and token info still use the configured RPC endpoint (including its `getAsset` support). The pipeline no longer skips PnL when `EXPO_PUBLIC_HELIUS_API_KEY` is absent. API failures or missing SOL-denominated PnL still show `—`; value and unrealized fees alone cannot determine uPnL.

`positionWidgetData.ts` projects the pipeline result into JSON-safe display data, retaining the actual position address instead of the pipeline's index-based row ID. Position order is stable by address. It does not persist SDK objects or BigInts.

Snapshots and per-widget selections live in the `position-widget` MMKV instance, scoped to the persisted wallet address and connection revision. Empty results replace old positions. Disconnect clears obsolete snapshots; reconnecting the same wallet starts a new session. The request counter rejects old successes and failures. Navigation reads the latest snapshot at draw time, so a tap during refresh neither cancels the fetch nor loses the chosen position. The shared `renderWidgets` helper checks request ownership after Android's asynchronous widget lookup.

Foreground/wallet changes and the existing background task refresh both widget types. Android also requests periodic updates every 30 minutes. Position fetches have a 20-second deadline to leave time for an error state before the native headless task timeout. On failure, the last graph and original update timestamp remain visible with a retry message.

## Graph Rules

`liquidityGraph.ts` sums Token X and Token Y amounts in their common quote units, groups large ranges into at most 48 bars, and normalizes bar height within the position. Each group keeps its peak bin, matching the app's chart sampling so uneven group sizes do not produce artificial spikes. It shows relative distribution, not a USD-valued vertical axis.

Colors come from `themeTokens.dark`: copper below the active bin, sage at the active bin, and neutral above it. A dashed marker locates the active bin exactly, even when multiple bins share a bar. Out-of-range markers sit at the nearest edge and are labeled as outside the range. Missing liquidity data shows an explicit unavailable state.

## Verification and Preview

`src/__tests__/widgets/positionLiquidityWidget.test.tsx` exercises the real widget primitives and native tree conversion while mocking transport and storage. It covers navigation, multiple instances, selection persistence, closed positions, wallet changes, stale responses, refresh deadlines, missing data, and graph geometry.

Run `bun scripts/preview-position-widget.mjs` to generate `.expo/position-widget-preview.html` and `.expo/position-widget-audit.html` from the production JSX and mock portfolio. The audit includes minimum size, larger size, out-of-range, failed-refresh, and disconnected states. `assets/widget-preview/position-liquidity.png` is the picker preview captured from this HTML at 2× scale.

This preview verifies layout in a browser, not Android RemoteViews. Live launcher testing still requires a native build. Registering the new widget requires rebuilding/reinstalling the app; Metro reload alone cannot add its provider.

## See Also

- [[LiquidityBarChart]] — in-app view of the same liquidity shape
- [[Caching Strategy]] — wallet revisions and stale request protection
- [[Position Architecture]] — position data and view models

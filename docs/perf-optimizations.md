# Performance Optimizations

This document tracks React Native performance changes made to the positions list — the app's primary screen.

## Changes

### 1. PnL Fetch Deduplication + Selector Memoization

**Commit:** `62235ca`
**Files:** `src/app/positions/index.tsx`, `src/components/positions/PositionCard.tsx`, `src/components/positions/PortfolioSummary.tsx`

#### What changed

- **Before:** Every `PositionCard` independently called `fetchPoolPnL` in a `useEffect` on mount. `PortfolioSummary` also called `fetchPoolPnL` for every pool in its own `useEffect`. For N positions across M pools, this triggered up to N+M `useEffect` calls — each writing to the Zustand store and causing cascading re-renders.
- **After:** A single `useEffect` in `positions/index.tsx` fetches PnL for all unique pools. `PositionCard` and `PortfolioSummary` only **read** from the store (no side effects).

- **Before:** `selectPositionPnL(poolAddress, wallet, positionAddress)` created a new selector function on every render. `selectHasPoolData(wallet, poolAddresses)` had the same issue.
- **After:** Both selectors are wrapped in `useMemo` so the function reference is stable across renders. Zustand skips re-evaluation when the selector identity hasn't changed.

#### What to test

| Scenario | What to look for |
|----------|-----------------|
| App load with positions | Portfolio summary and all position cards render PnL data (SOL value + %) |
| Pull-to-refresh | PnL values update after refresh |
| Multiple positions in same pool | Only 1 network request per pool (check network tab or console) |
| Wallet disconnect → reconnect | Old PnL clears, new wallet PnL loads correctly |
| Position card mount | No flicker or flash of empty PnL before data arrives |

---

### 2. ScrollView → FlashList

**Commit:** `2811e85`
**Files:** `src/app/index.tsx`, `src/app/positions/index.tsx`, `package.json`

#### What changed

- **Before:** `ScrollView` in `index.tsx` rendered all `PositionCard` components eagerly via `.map()`. Every card (with SVG chart, PnL subscription, token data) was mounted at once — no virtualization.
- **After:** `FlashList` v2.3.1 (`@shopify/flash-list`) virtualizes the list. Only visible items + a small buffer are mounted. Off-screen cards are recycled.

- **Before:** Portfolio summary, out-of-range warning, and position cards were loosely rendered in a `View`.
- **After:** All items are flattened into a typed `ListItem[]` array with `getItemType` for proper view recycling across different item shapes (`summary` / `warning` / `position`).

- **Before:** `ScrollView` with `RefreshControl` in `index.tsx`.
- **After:** `FlashList` owns scrolling and `RefreshControl` directly. Parent `index.tsx` passes `onRefresh` callback as a prop.

#### What to test

| Scenario | What to look for |
|----------|-----------------|
| Scroll through many positions (5+) | Smooth scrolling, no jank or frame drops |
| Pull-to-refresh | Spinner appears, positions reload, new data shows |
| Scroll position memory | After navigating away and back, list doesn't jump to top |
| Portfolio summary | Renders as first list item, scrolls with the list |
| Out-of-range warning | Appears between summary and first card when applicable |
| Card recycling | Cards re-entering viewport show correct data (no stale/merged state) |
| Card spacing/margins | Same visual appearance as before (16px horizontal padding, 8px top padding) |
| Bottom padding | 80px (h-20) footer space at bottom of list for scroll comfort |
| Empty state | Skeleton → empty state transition still works on first load |
| Single position | List works correctly with only 1 card |
| Token icons + charts | SVG liquidity charts and token images render after scroll recycle |

---

### 3. Remove Dead LoadingContext

**Commit:** `ef9d46b`
**Files:** `src/contexts/LoadingContext.tsx` (deleted), `src/app/_layout.tsx`

#### What changed

- **Before:** `LoadingProvider` wrapped the entire component tree in `_layout.tsx`. It provided `isGlobalLoading` state and `setGlobalLoading` via React Context. However, `useGlobalLoading()` was never called anywhere in the codebase — the context was dead code.
- **After:** Deleted `LoadingContext.tsx` and removed `LoadingProvider` from `_layout.tsx`. If global loading state is ever needed, it should use Zustand (atomic subscriptions) instead of Context (whole-tree re-renders).

#### What to test

| Scenario | What to look for |
|----------|-----------------|
| App launch | No crash, screens load normally |
| Wallet connect/disconnect | Flow works same as before |
| Existing loading states | Skeleton cards and shimmer blocks still appear during data fetches |

---

### 4. Memoize onLayout in LiquidityBarChart

**Commit:** `ef9d46b`
**Files:** `src/components/positions/LiquidityBarChart.tsx`

#### What changed

- **Before:** `onLayout` was an inline arrow function on the `View` wrapping the chart SVG. A new function was created on every render, which triggers React's reconciliation to see if the prop changed.
- **After:** `onLayout` handler wrapped in `useCallback` with `[]` deps. The function reference is stable across renders — React skips the prop diff.

#### What to test

| Scenario | What to look for |
|----------|-----------------|
| Chart rendering | SVG bars render at correct width after layout measurement |
| Screen rotation | Chart re-measures and redraws correctly |

---

### 5. Memoize SolValue Formatting in PortfolioSummary

**Commit:** `ef9d46b`
**Files:** `src/components/positions/PortfolioSummary.tsx`

#### What changed

- **Before:** `SolValue` ran string operations (`.toFixed(9)`, `.replace()`, regex `.match()`, `.slice()`) on every render. Called 4+ times per `PortfolioSummary` render for PnL, value, deposited, and unclaimed fees.
- **After:** `SolValue` wraps its output in `useMemo` keyed on `[value, className]`. String formatting only runs when the value actually changes. Extracted `formatSmallValue()` helper to keep the memo body clean.

#### What to test

| Scenario | What to look for |
|----------|-----------------|
| Normal SOL values (≥0.01) | Display as before, e.g. `1.2345` |
| Small SOL values (<0.01) | Display superscript format, e.g. `0.00⁴1234` |
| Zero / NaN / Infinity | Falls back to `0.0000` |
| PnL color changes | Positive = emerald, negative = red, same as before |

---

## Known Considerations

- **FlashList v2** removed `estimatedItemSize` — it auto-measures items now. If first render appears sparse (shows 1–2 items then fills in), we can tune `initialDrawBatchSize`.
- **`renderItem`** depends on `tokenData` in its `useCallback` deps. When token data updates (new Map), all items re-render. This is correct behavior — tokens arriving progressively should update cards. A future optimization could make `tokenData` a Zustand store for finer-grained subscriptions.
- **Skeleton state** (first-load) still uses a plain `View` with `.map()` — this is intentional since it's only 3 lightweight skeleton cards.

## Related Docs

- [Architecture](./architecture.md) — connection lifecycle, data flow
- [Loading States](./loading-states.md) — skeleton vs empty vs data patterns
- [Data Model](./data-model.md) — PositionInfo, TokenInfo, PositionUpnl

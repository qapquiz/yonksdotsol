{
"id": "7ba2dfe5",
"title": "Consolidate PnL fetching — remove useEffect from PositionCard, stabilize Zustand selector",
"tags": [
"performance",
"state",
"pnl"
],
"status": "done",
"created_at": "2026-04-15T10:52:05.301Z"
}

## Problem

Each `PositionCard` independently calls `fetchPoolPnL(poolAddress, wallet)` in a `useEffect`. `PortfolioSummary` also fetches for the same pools. This causes redundant `useEffect` triggers and unnecessary re-renders even though the store deduplicates network requests.

Additionally, `PositionCard` has 7 `useMemo` calls and a `useEffect` — making it a heavy list item. The Zustand selector `selectPositionPnL(poolAddress, wallet, positionAddress)` is created inline, producing a new function reference every render and causing unnecessary store re-subscriptions.

## Plan

1. **Remove `useEffect` + `fetchPoolPnL` from `PositionCard.tsx`** — the parent or a dedicated hook should own all fetching
2. **Create a `useFetchPoolPnL` hook** (or add logic to `useBatchTokenData` / the positions list parent) that fetches PnL for all pools once
3. **Stabilize the Zustand selector** with `useMemo`:
   ```tsx
   const pnlSelector = useMemo(
     () => selectPositionPnL(poolAddress, wallet, positionAddress),
     [poolAddress, wallet, positionAddress],
   )
   const pnlData = usePnLStore(pnlSelector)
   ```
4. **Consider pre-computing** `totalValue`, `inRange`, `currentPrice`, fee displays in the parent and passing as props — especially if virtualization is added (TODO-7ccb3895), where items should be as lightweight as possible

## Files affected

- `src/components/positions/PositionCard.tsx` — remove useEffect, stabilize selector, possibly slim down to props-only
- `src/components/positions/PortfolioSummary.tsx` — keep as single fetch point or move to shared hook
- `src/app/positions/index.tsx` — may need to orchestrate PnL fetching here

## Skill rules

`list-performance-item-expensive`, `list-performance-callbacks`, `react-state-minimize`

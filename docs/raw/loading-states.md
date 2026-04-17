# Loading States

UX state machine for the positions list. Follow these rules to avoid flicker.

## State Machine

```
         [component mounts]
                │
         hasLoadedOnce = false
         positions.size = 0
                │
       ┌────────┴────────┐
       │  still loading?  │
       ├───── YES ────────┤──→ Show skeleton (3 × PositionCardSkeleton)
       └───── NO ─────────┘──→ Show EmptyState
                │
         [fetch completes]
                │
       ┌────────┴────────┐
       │  has data?      │
       ├───── YES ────────┤──→ Show cards + PortfolioSummary
       └───── NO ─────────┘──→ Show EmptyState
                │
         hasLoadedOnce = true
                │
       ┌────────┴────────┐
       │  pull-to-refresh │
       ├───── any ────────┤──→ Keep showing current state
       │                   │    (RefreshControl spinner is enough feedback)
       └───────────────────┘
```

## Rules

1. **Skeleton = first load only** — when `!hasLoadedOnce.current && positions.size === 0`
2. **Never swap data → skeleton → data on refresh** — this causes visible flicker
3. **`hasLoadedOnce`** stays `true` until component unmounts (wallet disconnect)
4. **EmptyState is stable** — if user has no positions and pulls to refresh, empty state stays put
5. **PortfolioSummary loading** — controlled independently by `isLoadingUpnl && !upnlData`

## Implementation Pattern

```tsx
const hasLoadedOnce = useRef(false)
if (!isLoadingPositions) {
  hasLoadedOnce.current = true
}

if (positionsArray.length === 0) {
  if (!hasLoadedOnce.current) {
    return <Skeleton />
  }
  return <EmptyState />
}

return <DataView />
```

## What NOT to Do

| ❌ Wrong                                      | Why                                                   |
| --------------------------------------------- | ----------------------------------------------------- |
| `if (isLoading) return <Skeleton />`          | Swaps real data for skeleton on every refresh         |
| `if (isLoading && !data) return <Skeleton />` | Can't distinguish first load from refresh-while-empty |
| Setting `hasLoadedOnce` in useEffect          | Too late — causes an extra render cycle               |
| Showing skeleton during UPNL loading          | UPNL loads independently; cards can render without it |

## Progressive Loading Order

When the app opens with a connected wallet:

1. **Skeleton** (PositionCardSkeleton × 3) — positions fetch starts
2. **Cards with no token data** — positions arrive, token fetch starts, each card shows skeleton if both tokens missing
3. **Cards populate progressively** — tokens arrive via `useBatchTokenData` with microtask batching
4. **UPNL data arrives** — PortfolioSummary transitions from skeleton to real data
5. **Complete** — all data loaded, pull-to-refresh available

## Skeleton Structure Rules

Skeletons must match real component layout to avoid layout shift:

- **Same card container**: `bg-app-surface rounded-3xl p-5 mb-4 border border-app-border`
- **Same section heights**: header (~76px), chart (120px), footer (~80px)
- **Same margins**: `mb-6` between header and chart, `mb-4` between chart and footer
- **Use `<ShimmerBlock>`** for animated placeholder blocks, never static gray divs

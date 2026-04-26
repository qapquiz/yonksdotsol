# Loading States

UX state machine for the positions list. Follow these rules to avoid flicker.

## State Machine

```
         [component mounts]
                │
         walletResolved = false
         positions.size = 0
                │
         ┌──────────────────────────────────────────┐
         │  Show skeleton (3 × PositionCardSkeleton) │
         │  until walletResolved AND fetch completes  │
         └──────────────────┬───────────────────────┘
                            │
         [wallet status known]
                │
         walletResolved = true
                │
       ┌────────┴────────┐
       │  still loading?  │
       ├───── YES ────────┤──→ Keep showing skeleton
       └───── NO ─────────┘
                │
       ┌────────┴────────┐
       │  has data?       │
       ├───── YES ────────┤──→ Show cards + PortfolioSummary
       └───── NO ─────────┘──→ Show EmptyState
                │
         [pull-to-refresh]
                │
       ┌────────┴────────┐
       ├───── any ────────┤──→ Keep showing current state
       │                   │    (RefreshControl spinner is enough feedback)
       └───────────────────┘
```

## Rules

1. **Skeleton until wallet resolved** — `!walletResolved || (positions.size === 0 && isLoadingPositions)`
2. **Never swap data → skeleton → data on refresh** — this causes visible flicker
3. **`walletResolved`** is set by the parent (`App`) once the wallet status is known (connected or not)
4. **EmptyState only after resolved + not loading** — `walletResolved && !isLoadingPositions && positions.size === 0`
5. **PortfolioSummary loading** — controlled independently by `isLoadingUpnl && !upnlData`

## Implementation Pattern

```tsx
// In parent (App):
const [walletResolved, setWalletResolved] = useState(false)

// In the effect that watches account?.address:
if (account?.address === undefined) {
  setWalletResolved(true)  // wallet session loaded, no wallet connected
  return
}
setWalletResolved(true)  // wallet session loaded, wallet connected
getPositions(...)

// In PositionsList:
const showSkeleton = !walletResolved || (positionsArray.length === 0 && isLoadingPositions)
const showEmpty = walletResolved && !isLoadingPositions && positionsArray.length === 0

if (showSkeleton) return <Skeleton />
if (showEmpty) return <EmptyState />
return <DataView />
```

## What NOT to Do

| ❌ Wrong                                                | Why                                                   |
| ------------------------------------------------------- | ----------------------------------------------------- |
| `if (isLoading) return <Skeleton />`                    | Swaps real data for skeleton on every refresh         |
| `if (isLoading && !data) return <Skeleton />`           | Can't distinguish first load from refresh-while-empty |
| Using `hasLoadedOnce` ref that flips during wallet init | Wallet starts as undefined → sets false → true again  |
| Showing skeleton during UPNL loading                    | UPNL loads independently; cards can render without it |

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

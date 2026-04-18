---
title: Loading States
type: guide
created: 2026-04-18
updated: 2026-04-18
tags: [ui, loading, state]
related:
  - Skeleton Loading
  - Theming
---

# Loading States

Guide to skeleton, empty, and data state patterns.

## Three States

### 1. Skeleton (First Load)

Shown until wallet status is resolved AND first fetch completes:

```typescript
const showSkeleton = !walletResolved || (positionsArray.length === 0 && isLoadingPositions)

if (showSkeleton) {
  return (
    <View>
      {[1, 2, 3].map((key) => (
        <PositionCardSkeleton key={key} />
      ))}
    </View>
  )
}
```

### 2. Empty (No Positions)

Shown after wallet resolved, fetch complete, and zero positions:

```typescript
const showEmpty = walletResolved && !isLoadingPositions && positionsArray.length === 0

if (showEmpty) {
  return <EmptyState />
}
```

### 3. Data (Positions Loaded)

Normal rendering with `FlashList`:

```typescript
<FlashList
  data={listData}
  renderItem={renderItem}
  // ...
/>
```

## Key Pattern: walletResolved

```typescript
// In parent (App):
const [walletResolved, setWalletResolved] = useState(false)

// Set to true once wallet session is known (connected or not)
if (account?.address === undefined) {
  setWalletResolved(true) // no wallet
  return
}
setWalletResolved(true) // wallet connected

// Pass to PositionsList as prop
<PositionsList walletResolved={walletResolved} ... />
```

This prevents the empty-state → skeleton → data flash caused by the wallet session loading asynchronously. Without it, the wallet starts as `undefined`, triggering `setIsLoadingPositions(false)` before the real fetch begins.

## See Also

- [[Skeleton Loading]] — Visual design rules
- [[Theming]] — Token colors for skeletons

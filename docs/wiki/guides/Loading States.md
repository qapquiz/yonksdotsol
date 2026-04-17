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

Shown when `isLoadingPositions=true` AND no data has ever loaded:

```typescript
if (!hasLoadedOnce.current) {
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

Shown after load completes with zero positions:

```typescript
if (positionsArray.length === 0 && hasLoadedOnce.current) {
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

## Key Pattern: hasLoadedOnce

```typescript
const hasLoadedOnce = useRef(false)
if (!isLoadingPositions) {
  hasLoadedOnce.current = true
}
```

This prevents skeleton from showing during refresh — skeleton only shows on true first load.

## See Also

- [[Skeleton Loading]] — Visual design rules
- [[Theming]] — Token colors for skeletons

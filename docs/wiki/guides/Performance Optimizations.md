---
title: Performance Optimizations
type: guide
created: 2026-04-18
updated: 2026-04-18
tags: [performance, optimization, react]
related:
  - Skeleton Loading
  - Theming
---

# Performance Optimizations

Memoization, FlashList, and render optimization patterns.

## memo() Components

All expensive components are wrapped with `memo()`:

| Component              | File                                                |
| ---------------------- | --------------------------------------------------- |
| `PositionCard`         | `src/components/positions/PositionCard.tsx`         |
| `PortfolioSummary`     | `src/components/positions/PortfolioSummary.tsx`     |
| `LiquidityBarChart`    | `src/components/positions/LiquidityBarChart.tsx`    |
| `PositionHeader`       | `src/components/positions/PositionHeader.tsx`       |
| `PositionFooter`       | `src/components/positions/PositionFooter.tsx`       |
| `TokenIcons`           | `src/components/positions/TokenIcons.tsx`           |
| `EmptyState`           | `src/components/positions/EmptyState.tsx`           |
| `PositionCardSkeleton` | `src/components/positions/PositionCardSkeleton.tsx` |
| `PixelAvatar`          | `src/components/ui/PixelAvatar.tsx`                 |

## useCallback

Used for event handlers passed to child components:

```typescript
const handleRefresh = useCallback(() => {
  if (account?.address) {
    getPositions(new PublicKey(account.address))
  }
}, [account?.address, getPositions])
```

## useMemo

Used for expensive computations:

```typescript
const themeColors = useMemo(
  () => ({
    bg: theme === 'dark' ? '#050505' : '#f5f5f5',
    primary: theme === 'dark' ? '#8FA893' : '#6b8f71',
  }),
  [theme],
)
```

## FlashList

High-performance list component from `@shopify/flash-list`:

```typescript
<FlashList
  data={listData}
  renderItem={renderItem}
  keyExtractor={(item) => item.id}
  getItemType={(item) => item.type}
  // ...
/>
```

## See Also

- [[Skeleton Loading]] — Efficient loading states
- [[Theming]] — Memoized theme colors

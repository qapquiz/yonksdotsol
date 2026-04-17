---
title: Skeleton Loading
type: concept
created: 2026-04-18
updated: 2026-04-18
tags: [ui, loading, skeleton, shimmer]
related:
  - ShimmerBlock
  - Theming
  - Loading States
---

# Skeleton Loading

Per-block shimmer pattern for loading states.

## Overview

The app uses a consistent skeleton loading pattern with per-block shimmer animations. This provides visual feedback during data fetching without layout shifts.

## Rules

1. **Card background identical** to loaded state — `bg-app-surface` with no overlay
2. **Shimmer is per-block only** — use `<ShimmerBlock>` component
3. **Placeholder blocks use `bg-app-border`** — good contrast against `app-surface`
4. **Static text stays static** — labels do NOT shimmer
5. **ShimmerBlock opacity range**: `0.4` to `0.7`

## Implementation

```typescript
// Card skeleton
<View className="bg-app-surface rounded-3xl p-5 mb-4 border border-app-border">
  {/* Static label - no shimmer */}
  <Text className="text-app-text-muted text-xs">PORTFOLIO SUMMARY</Text>
  
  {/* Shimmer blocks for values */}
  <ShimmerBlock className="h-8 w-32 mt-2" />
  <ShimmerBlock className="h-4 w-20 mt-2" />
</View>
```

## Contrast Requirements

| Element | Background | Contrast |
|---------|------------|----------|
| Skeleton block | `app-border` (#222222) | ✓ Good vs `app-surface` (#111111) |
| ~~Surface highlight~~ | ~~#1a1a1a~~ | ✗ Too low contrast |

## Loading States

Three states in component lifecycle:

1. **Skeleton** — first load, `isLoadingPositions=true`, no data yet
2. **Empty** — after load, zero positions
3. **Data** — positions loaded and rendered

## See Also

- [[ShimmerBlock]] — The shimmer component
- [[Theming]] — Token colors used in skeletons
- [[Loading States]] — Implementation guide

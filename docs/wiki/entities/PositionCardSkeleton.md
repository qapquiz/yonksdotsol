---
title: PositionCardSkeleton
type: entity
location: src/components/positions/PositionCardSkeleton.tsx
created: 2026-04-28
updated: 2026-04-28
tags: [component, ui, skeleton, shimmer]
related:
  - ShimmerBlock
  - Skeleton Loading
  - PositionCard
  - PortfolioSummarySkeleton
---

# PositionCardSkeleton

Skeleton placeholder that mirrors the full PositionCard layout.

## Location

`src/components/positions/PositionCardSkeleton.tsx`

## Responsibilities

- Provides pixel-perfect skeleton of PositionCard during loading
- Uses [[ShimmerBlock]] for animated placeholder blocks
- Matches header, chart, and footer structure exactly

## Structure

```
├─ Header row (avatar + pair name + value shimmer)
├─ Chart section (title + badge + 120px bar shimmer)
├─ Footer (two fee blocks with label + value shimmer)
```

## See Also

- [[ShimmerBlock]] — shimmer animation component
- [[Skeleton Loading]] — design rules
- [[PositionCard]] — the loaded component
- [[PortfolioSummarySkeleton]] — summary skeleton counterpart

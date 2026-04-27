---
title: PortfolioSummarySkeleton
type: entity
location: src/components/positions/PortfolioSummarySkeleton.tsx
created: 2026-04-28
updated: 2026-04-28
tags: [component, ui, skeleton, shimmer]
related:
  - ShimmerBlock
  - Skeleton Loading
  - PortfolioSummary
  - PositionCardSkeleton
---

# PortfolioSummarySkeleton

Skeleton placeholder that mirrors the PortfolioSummary layout.

## Location

`src/components/positions/PortfolioSummarySkeleton.tsx`

## Responsibilities

- Provides pixel-perfect skeleton of PortfolioSummary during loading
- Uses [[ShimmerBlock]] for animated placeholder blocks
- Matches title row, PnL value, and stats row structure exactly

## Structure

```
├─ Title row ("PORTFOLIO SUMMARY" label + count badge shimmer)
├─ PnL value (large SOL value + percentage shimmer)
├─ Stats row (VALUE / DEPOSITED / UNCLAIMED FEES shimmers)
```

## See Also

- [[ShimmerBlock]] — shimmer animation component
- [[Skeleton Loading]] — design rules
- [[PortfolioSummary]] — the loaded component
- [[PositionCardSkeleton]] — position skeleton counterpart

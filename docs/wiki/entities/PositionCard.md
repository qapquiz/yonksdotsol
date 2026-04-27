---
title: PositionCard
type: entity
location: src/components/positions/PositionCard.tsx
created: 2026-04-28
updated: 2026-04-28
tags: [component, positions, ui]
related:
  - PositionHeader
  - PositionFooter
  - LiquidityBarChart
  - PositionCardSkeleton
  - computePositionViewData
---

# PositionCard

Individual position display card composing header, chart, and footer.

## Location

`src/components/positions/PositionCard.tsx`

## Responsibilities

- Renders a single DLMM position as a card
- Composes [[PositionHeader]], [[LiquidityBarChart]], and [[PositionFooter]]
- Shows skeleton while token data is loading

## Props

```typescript
interface PositionCardProps {
  vm: PositionViewModel
  tokenXInfo: TokenInfo | null
  tokenYInfo: TokenInfo | null
}
```

## Behavior

- If both `tokenXInfo` and `tokenYInfo` are null, renders [[PositionCardSkeleton]]
- Otherwise renders the full card with `bg-app-surface rounded-3xl p-5 mb-4 border border-app-border`

## Key Relationships

- Depends on [[computePositionViewData]] for the view model
- Used by `PositionsList` in `src/app/positions/index.tsx`

## See Also

- [[PositionHeader]] — token pair, range badge, value
- [[PositionFooter]] — fees display
- [[LiquidityBarChart]] — liquidity distribution chart
- [[PositionCardSkeleton]] — loading state
- [[computePositionViewData]] — view model generation

---
title: PositionFooter
type: entity
location: src/components/positions/PositionFooter.tsx
created: 2026-04-28
updated: 2026-04-28
tags: [component, positions, ui]
related:
  - PositionCard
  - PositionHeader
---

# PositionFooter

Fee display footer for a position card.

## Location

`src/components/positions/PositionFooter.tsx`

## Responsibilities

- Displays unrealized and claimed fees
- Shows fee amounts with token symbols and USD values

## Props

```typescript
interface PositionFooterProps {
  unrealizedFeesDisplay: string
  claimedFeesDisplay: string
  unrealizedFeesValue: string
  claimedFeesValue: string
}
```

## See Also

- [[PositionCard]] — parent component
- [[PositionHeader]] — counterpart header

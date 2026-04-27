---
title: PositionHeader
type: entity
location: src/components/positions/PositionHeader.tsx
created: 2026-04-28
updated: 2026-04-28
tags: [component, positions, ui]
related:
  - PositionCard
  - PositionFooter
  - TokenIcons
---

# PositionHeader

Header section of a position card showing pair info, range status, and value.

## Location

`src/components/positions/PositionHeader.tsx`

## Responsibilities

- Displays token pair with icons
- Shows IN RANGE / OUT OF RANGE badge
- Displays total position value and UPNL

## Props

```typescript
interface PositionHeaderProps {
  tokenXInfo: TokenInfo | null
  tokenYInfo: TokenInfo | null
  inRange: boolean
  totalValue: string
  upnlValue: number | null
  upnlPercentage: number | null
  upnlIsSol?: boolean
}
```

## Styling

- Range badge: emerald bg/text when in range, orange when out
- UPNL color: `text-emerald-400` for positive, `text-red-400` for negative

## See Also

- [[PositionCard]] — parent component
- [[PositionFooter]] — counterpart footer
- [[TokenIcons]] — token icon display

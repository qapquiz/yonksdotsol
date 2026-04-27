---
title: TokenIcons
type: entity
location: src/components/positions/TokenIcons.tsx
created: 2026-04-28
updated: 2026-04-28
tags: [component, ui, tokens]
related:
  - PositionHeader
---

# TokenIcons

Overlapping token icon pair with fallback to symbol initials.

## Location

`src/components/positions/TokenIcons.tsx`

## Responsibilities

- Displays two overlapping circular token icons
- Falls back to first letter of symbol if image fails to load
- Handles image load errors with `onError` fallback

## Props

```typescript
interface TokenIconsProps {
  tokenXInfo: TokenInfo | null
  tokenYInfo: TokenInfo | null
}
```

## See Also

- [[PositionHeader]] — primary consumer

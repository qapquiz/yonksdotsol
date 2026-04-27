---
title: PixelAvatar
type: entity
location: src/components/ui/PixelAvatar.tsx
created: 2026-04-28
updated: 2026-04-28
tags: [component, ui, avatar, svg]
related:
  - SettingsStore
  - Theming
---

# PixelAvatar

Pixelated avatar component rendered with SVG.

## Location

`src/components/ui/PixelAvatar.tsx`

## Responsibilities

- Renders a 6×6 pixel art avatar from predefined patterns
- Theme-aware colors (changes based on dark/light mode)
- Connected state changes color (green vs gray)

## Props

```typescript
interface PixelAvatarProps {
  size?: number        // default 40
  variant?: 'bot' | 'alien' | 'ghost' | 'robot' | 'cat'  // default 'bot'
  connected?: boolean  // default false
}
```

## Variants

| Variant | Description |
| ------- | ----------- |
| `bot`   | Robot face with antenna |
| `alien` | Alien with large eyes |
| `ghost` | Ghost shape |
| `robot` | Boxy robot |
| `cat`   | Cat face with ears |

## Theme Colors

| State           | Primary    | Secondary  |
| --------------- | ---------- | ---------- |
| Connected dark  | `#8FA893`  | `#2a332c`  |
| Connected light | `#6b8f71`  | `#dce8de`  |
| Disconnected dark | `#999999`| `#1a1a1a`  |
| Disconnected light| `#666666`| `#eeeeee`  |

## See Also

- [[SettingsStore]] — theme source
- [[Theming]] — color tokens

---
title: Theming
type: concept
created: 2026-04-18
updated: 2026-04-18
tags: [ui, design, theme, uniwind]
related:
  - SettingsStore
  - Skeleton Loading
  - ShimmerBlock
---

# Theming

Dark/light mode system using Uniwind semantic tokens.

## Overview

The app uses a token-based theming system with semantic color names defined in `src/global.css`. All styling uses Uniwind utility classes — never raw `zinc-*` classes.

## Color Tokens

| Token                   | Hex       | Role                               |
| ----------------------- | --------- | ---------------------------------- |
| `app-bg`                | `#050505` | Screen background                  |
| `app-surface`           | `#111111` | Card backgrounds                   |
| `app-surface-highlight` | `#1a1a1a` | Subtle fills, badges               |
| `app-border`            | `#222222` | Borders, dividers, skeleton blocks |
| `app-primary`           | `#8FA893` | Brand accent (sage green)          |
| `app-primary-dim`       | `#2a332c` | Tinted backgrounds                 |
| `app-text`              | `#ffffff` | Primary text                       |
| `app-text-secondary`    | `#999999` | Secondary labels                   |
| `app-text-muted`        | `#555555` | Section headers, captions          |

## Theme Toggle

Managed by [[SettingsStore]]:

```typescript
const theme = useSettingsStore((s) => s.theme)
const toggleTheme = useSettingsStore((s) => s.toggleTheme)
```

Synced to Uniwind in `_layout.tsx`:

```typescript
useEffect(() => {
  Uniwind.setTheme(theme)
}, [theme])
```

## Usage Rules

### DO

- Use semantic tokens: `bg-app-surface`, `text-app-text`, `border-app-border`
- Card pattern: `className="bg-app-surface rounded-3xl p-5 mb-4 border border-app-border"`
- Use `bg-app-border` for skeleton blocks

### DO NOT

- Never use `bg-app-surface-highlight` for skeleton blocks (too low contrast)
- Never use raw `zinc-*` classes
- Never mix inline `style` and `className` for same property

## See Also

- [[SettingsStore]] — Theme state management
- [[Skeleton Loading]] — Theme-aware loading states
- [[ShimmerBlock]] — Theme-aware skeleton component

---
title: Theming
type: concept
created: 2026-04-18
updated: 2026-06-30
tags: [ui, design, theme, uniwind]
related:
  - SettingsStore
  - Skeleton Loading
  - ShimmerBlock
---

# Theming

Dark/light mode system using Uniwind semantic tokens.

> **Authoritative source:** [`DESIGN.md`](../../../DESIGN.md) (root) is the source of truth for the full design system — colors, typography, spacing, and semantic mapping. This page is a summary; when it disagrees with DESIGN.md, DESIGN.md wins.

## Overview

The app uses a token-based theming system with semantic color names. Token hex values live in [`theme.ts`](../../../src/config/theme.ts) and are mirrored as Uniwind CSS variables in [`global.css`](../../../src/global.css). All styling uses Uniwind utility classes — **never raw Tailwind palette classes** (`emerald-*`, `red-*`, `zinc-*`, etc.).

Dark mode is the default; both themes are fully supported.

## Color Tokens

See DESIGN.md for the complete token table with dark and light values. Core palette:

| Token           | Dark      | Light     | Role                                         |
| --------------- | --------- | --------- | -------------------------------------------- |
| `app-bg`        | `#050505` | `#f5f5f5` | Screen background                            |
| `app-surface`   | `#151515` | `#ffffff` | Card backgrounds                             |
| `app-border`    | `#333333` | `#e0e0e0` | Borders, dividers, **skeleton blocks**       |
| `app-primary`   | `#8FA893` | `#6b8f71` | Sage — profit, in-range, selected, connected |
| `app-secondary` | `#d4955f` | `#c07a3e` | Copper — out-of-range, caution, claimed fees |
| `app-negative`  | `#c97064` | `#b55044` | Clay-red — loss, error                       |

Each accent has a `-dim` tint for badge/selected backgrounds (`primaryDim`, `secondaryDim`, `negativeDim`).

## Semantic Color Mapping

State colors map onto the accent palette so they theme correctly:

- **Profit / in-range / accruing** → `app-primary` (sage = good)
- **Loss / error** → `app-negative` (clay-red)
- **Out-of-range / caution / claimed** → `app-secondary` (copper)

Badge pattern: `-dim` background + matching accent text.

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

Tokens are read in JS via `useThemeTokens()` from `src/hooks/useThemeTokens.ts`.

## Charts

Charts render in SVG and can't use classes, so they read tokens via `useThemeTokens()` and derive SVG strings (with 8-digit hex alpha suffixes for fills/grid). See DESIGN.md → Charts for the full derivation table.

## What Can't Use Classes

`RefreshControl` tint, `StatusBar` style, `Ionicons` color, and `PixelAvatar`/chart SVG fills read tokens through `useThemeTokens()` rather than restating hex literals.

## See Also

- [`DESIGN.md`](../../../DESIGN.md) — authoritative design system
- [[SettingsStore]] — Theme state management
- [[Skeleton Loading]] — Theme-aware loading states
- [[ShimmerBlock]] — Theme-aware skeleton component

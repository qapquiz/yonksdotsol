# RFC-05: Unify Theme Tokens — Eliminate Dual Color System

## Problem

The app has two parallel systems for theme colors:

1. **CSS custom properties** in `src/global.css` → `app-bg`, `app-surface`, `app-primary`, etc. (used via Uniwind className)
2. **Inline ternaries** in React components → `theme === 'dark' ? '#050505' : '#f5f5f5'` (used for RN props that don't support CSS classes)

These can drift out of sync. Today:

- `global.css` defines `--app-bg: #050505` (dark) / `--app-bg: #f5f5f5` (light)
- `App.tsx` hardcodes `bg: theme === 'dark' ? '#050505' : '#f5f5f5'` — matches, but only by coincidence
- `positions/index.tsx` hardcodes `refreshTint` and `statusBar` style with inline ternaries
- Adding a new color or changing an existing one requires updating two places

No theme tests exist.

**Modules involved**: `global.css`, `uniwind-types.d.ts`, `stores/settingsStore.ts`, `app/index.tsx`, `app/positions/index.tsx`

**Dependency category**: In-process (static configuration)

## Proposed Interface

### Single source of truth

```ts
// src/config/theme.ts

export type ThemeMode = 'dark' | 'light'

export interface ThemeTokens {
  /** Background color */
  bg: string
  /** Primary accent */
  primary: string
  /** Primary accent, dimmed variant */
  primaryDim: string
  /** Surface/card background */
  surface: string
  /** Surface highlight (borders, subtle backgrounds) */
  surfaceHighlight: string
  /** Main text color */
  text: string
  /** Secondary text color */
  textSecondary: string
  /** Muted/tertiary text */
  textMuted: string
  /** Border color */
  border: string
  /** RefreshControl tint color */
  refreshTint: string
  /** StatusBar style for expo-status-bar */
  statusBar: 'light' | 'dark'
}

export const themeTokens: Record<ThemeMode, ThemeTokens> = {
  dark: {
    bg: '#050505',
    primary: '#8FA893',
    primaryDim: '#1a2e1c',
    surface: '#0f0f0f',
    surfaceHighlight: '#1a1a1a',
    text: '#ffffff',
    textSecondary: '#999999',
    textMuted: '#666666',
    border: '#1a1a1a',
    refreshTint: '#8FA893',
    statusBar: 'light',
  },
  light: {
    bg: '#f5f5f5',
    primary: '#6b8f71',
    primaryDim: '#d4e6d6',
    surface: '#ffffff',
    surfaceHighlight: '#e8e8e8',
    text: '#111111',
    textSecondary: '#666666',
    textMuted: '#999999',
    border: '#e0e0e0',
    refreshTint: '#6b8f71',
    statusBar: 'dark',
  },
}
```

### Convenience hook

```ts
// src/hooks/useThemeTokens.ts

export function useThemeTokens(): ThemeTokens {
  const theme = useSettingsStore((s) => s.theme)
  return themeTokens[theme]
}
```

### CSS stays as the derived source

`global.css` remains for Uniwind class-based styling, but its values are verified against `themeTokens`. A comment at the top of the CSS file points to `theme.ts` as the source of truth:

```css
/* Source of truth: src/config/theme.ts — keep these in sync */
@variant dark {
  --app-bg: #050505;
  --app-primary: #8fa893;
  /* ... */
}
@variant light {
  --app-bg: #f5f5f5;
  --app-primary: #6b8f71;
  /* ... */
}
```

### Usage example

**Before** (inline ternaries):

```tsx
// App.tsx
const themeColors = useMemo(() => ({
  bg: theme === 'dark' ? '#050505' : '#f5f5f5',
  primary: theme === 'dark' ? '#8FA893' : '#6b8f71',
  textSecondary: theme === 'dark' ? '#999999' : '#666666',
}), [theme])

<SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }}>
<RefreshControl tintColor={theme === 'dark' ? '#8FA893' : '#6b8f71'} />
<StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
```

**After** (single source):

```tsx
// App.tsx
const tokens = useThemeTokens()

<SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
<RefreshControl tintColor={tokens.refreshTint} />
<StatusBar style={tokens.statusBar} />
```

## Dependency Strategy

**Category: In-process** — static configuration, no I/O, no async.

- `themeTokens` is a plain object constant — testable by direct comparison
- `useThemeTokens` is a one-line hook that reads from `settingsStore` — trivially testable
- `global.css` values are verified by a snapshot test against `themeTokens`

## Testing Strategy

### New boundary tests to write

**`theme.test.ts`** (~30 lines):

```ts
import { themeTokens } from '../config/theme'
import { readFileSync } from 'fs'

describe('theme tokens', () => {
  it('has dark and light modes', () => {
    expect(Object.keys(themeTokens)).toEqual(['dark', 'light'])
  })

  it('both modes define all token keys', () => {
    const darkKeys = Object.keys(themeTokens.dark)
    const lightKeys = Object.keys(themeTokens.light)
    expect(darkKeys).toEqual(lightKeys)
  })

  it('CSS custom properties match themeTokens', () => {
    // Parse global.css for --app-* values and verify they match themeTokens
    // This catches drift between the two systems
  })
})
```

### Old tests to delete

None — no theme tests currently exist.

### Test environment needs

- `global.css` file access for drift detection test
- No mocks, no React, no Zustand needed for the token verification tests

## Implementation Recommendations

### What the module should own

- All color and style token definitions for both themes
- The mapping from ThemeMode → concrete color values
- StatusBar style and RefreshControl tint color (RN props that can't use CSS classes)

### What it should hide

- The theme switching mechanism (consumers just call `useThemeTokens()`)
- The existence of two rendering approaches (CSS classes vs inline styles)

### What it should expose

- `themeTokens` constant (for direct access when hooks aren't available)
- `ThemeTokens` interface (type for consumers)
- `ThemeMode` type (re-exported from settingsStore or defined here)
- `useThemeTokens()` hook (convenience for React components)

### How callers should migrate

1. Create `src/config/theme.ts` with `themeTokens` and `ThemeTokens` interface
2. Create `src/hooks/useThemeTokens.ts` convenience hook
3. Update `App.tsx`: replace `themeColors` useMemo with `const tokens = useThemeTokens()`
4. Update `positions/index.tsx`: replace inline ternaries for RefreshControl tint with `tokens.refreshTint`
5. Update `stores/settingsStore.ts`: import `ThemeMode` from `config/theme.ts` instead of defining locally
6. Add comment to `global.css` pointing to `theme.ts` as source of truth
7. Add `theme.test.ts` for drift detection
8. Verify `tsc --noEmit` and `bun run lint` pass

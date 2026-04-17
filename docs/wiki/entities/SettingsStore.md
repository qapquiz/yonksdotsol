---
title: SettingsStore
type: entity
location: src/stores/settingsStore.ts
created: 2026-04-18
updated: 2026-04-18
tags: [zustand, state, theme]
related:
  - Theming
  - Skeleton Loading
---

# SettingsStore

Zustand store for user preferences (theme, etc.).

## Location

`src/stores/settingsStore.ts`

## State Shape

```typescript
interface SettingsState {
  theme: 'dark' | 'light'
  toggleTheme: () => void
}
```

## Usage

```typescript
import { useSettingsStore } from '../stores/settingsStore'

// Select theme
const theme = useSettingsStore((s) => s.theme)

// Toggle theme
const toggleTheme = useSettingsStore((s) => s.toggleTheme)
```

## Theme Sync

Theme is synced to Uniwind in `src/app/_layout.tsx`:

```typescript
useEffect(() => {
  Uniwind.setTheme(theme)
}, [theme])
```

## See Also

- [[Theming]] — Theme tokens and usage rules
- [[Skeleton Loading]] — Theme-aware skeleton colors

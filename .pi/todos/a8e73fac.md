{
"id": "a8e73fac",
"title": "Minor fixes — inline style → Uniwind, add jsx-no-leaked-render ESLint rule",
"tags": [
"style",
"lint"
],
"status": "done",
"created_at": "2026-04-15T10:52:25.879Z"
}

## Problem

Minor style inconsistencies and missing lint guardrails:

1. `_layout.tsx` uses inline `style={{ flex: 1 }}` instead of Uniwind `className="flex-1"`
2. No `react/jsx-no-leaked-render` ESLint rule to catch `{falsyValue && <Component />}` patterns that crash RN

## Plan

1. Replace `style={{ flex: 1 }}` with `className="flex-1"` in `_layout.tsx` `GestureHandlerRootView`
2. Add `react/jsx-no-leaked-render` to ESLint config
3. Run `bun run lint` to verify

## Files affected

- `src/app/_layout.tsx`
- ESLint config (`.eslintrc` or `eslint.config.js`)

## Skill rules

`ui-styling`, `rendering-no-falsy-and`

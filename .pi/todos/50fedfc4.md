{
"id": "50fedfc4",
"title": "Switch TokenIcons from RN Image to expo-image",
"tags": [
"images",
"performance"
],
"status": "done",
"created_at": "2026-04-15T10:51:46.117Z"
}

## Problem

`TokenIcons.tsx` uses React Native's `Image` with manual `useState` error tracking. No caching, no placeholder, no recycling key support. For small token icons in repeated list items this wastes memory.

## Plan

1. Install `expo-image` if not already a dependency
2. Replace `import { Image } from 'react-native'` with `import { Image } from 'expo-image'` in `TokenIcons.tsx`
3. Add `contentFit="cover"`, `cachePolicy="memory-disk"`, `transition={200}`
4. Add a blurhash or solid-color placeholder via the `placeholder` prop
5. Remove the `xError`/`yError` useState handlers — `expo-image` handles error states natively
6. Use `recyclingKey` prop with the token mint address for proper list recycling

## Files affected

- `src/components/positions/TokenIcons.tsx`

## Skill rule

`ui-expo-image`

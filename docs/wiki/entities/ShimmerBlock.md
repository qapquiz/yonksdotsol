---
title: ShimmerBlock
type: entity
location: src/components/ui/ShimmerBlock.tsx
created: 2026-04-18
updated: 2026-04-18
tags: [ui, skeleton, animation, shimmer]
related:
  - Skeleton Loading
  - Theming
---

# ShimmerBlock

Skeleton loading animation component for per-block shimmer effects.

## Location

`src/components/ui/ShimmerBlock.tsx`

## Responsibilities

- Provides animated shimmer effect for skeleton loading states
- Configurable opacity range (0.4 to 0.7)
- Used as placeholder for loading values

## Usage

```typescript
import { ShimmerBlock } from '../components/ui/ShimmerBlock'

// Basic usage
<ShimmerBlock className="h-8 w-32" />

// With custom dimensions
<ShimmerBlock className="h-4 w-full mt-2" />
```

## Configuration

- **Opacity range**: `0.4` to `0.7` (configured in component)
- **Animation**: Continuous shimmer loop
- **Background**: Uses `bg-app-border` class for contrast

## See Also

- [[Skeleton Loading]] — Visual design rules for skeletons
- [[Theming]] — Token colors used in skeletons
- [[Loading States]] — Implementation guide

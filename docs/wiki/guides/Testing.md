---
title: Testing
type: guide
created: 2026-04-19
updated: 2026-04-19
tags: [testing, vitest, quality]
---

# Testing

Testing strategy and setup for the yonksdotsol React Native/Expo project.

## Overview

The project uses Vitest for fast, compatible testing with Expo. Tests are organized by type (utilities, stores, hooks, components) with clear separation of concerns.

## Testing Stack

| Tool                              | Purpose                                 |
| --------------------------------- | --------------------------------------- |
| **Vitest**                        | Fast test runner (compatible with Expo) |
| **@testing-library/react-native** | Component testing                       |
| **react-test-renderer**           | Component rendering                     |
| **happy-dom**                     | DOM environment for tests               |

## Commands

```bash
bun run test          # Run all tests
bun run test:watch    # Watch mode
bun run test:coverage # Run with coverage
```

## Test Structure

```
src/__tests__/
├── setup.ts              # Global mocks and setup
├── utils/
│   ├── calculations.test.ts
│   └── formatters.test.ts
├── stores/
│   ├── CacheManager.test.ts
│   ├── pnlStore.test.ts
│   └── settingsStore.test.ts
├── hooks/
│   └── useBatchTokenData.test.ts
└── components/
    └── positions/
        └── PositionCard.test.tsx
```

## Setup (`src/__tests__/setup.ts`)

The setup file provides:

1. **React Native mocks** — Platform, StyleSheet, View, Text, etc.
2. **Expo Router mocks** — useRouter, useLocalSearchParams, Link, Stack
3. **SDK mocks** — @meteora-ag/dlmm, metcomet
4. **Console filtering** — Suppresses React warnings in test output
5. **BigInt polyfill** — For environments without native BigInt

## Test Categories

### 1. Utility Tests (High Priority)

Pure functions with clear inputs/outputs. No mocking required.

**Files:**

- `src/__tests__/utils/calculations.test.ts`
- `src/__tests__/utils/formatters.test.ts`

**Key Functions Tested:**

- `calculatePositionTotalValue` — Position value calculation
- `calculateUnrealizedFeesValue` — Fee value calculation
- `calculateIsInRange` — Active bin range check
- `formatTokenAmount` — Token amount formatting
- `formatTimestamp` — Relative time formatting

### 2. Store Tests (High Priority)

Zustand store state management with mocked dependencies.

**Files:**

- `src/__tests__/stores/pnlStore.test.ts`
- `src/__tests__/stores/CacheManager.test.ts`
- `src/__tests__/stores/settingsStore.test.ts`

**Key Behaviors Tested:**

- Cache TTL and expiration
- Request deduplication
- Error handling
- Selector functions

### 3. Hook Tests (Medium Priority)

Custom React hooks with mocked data sources.

**Files:**

- `src/__tests__/hooks/useBatchTokenData.test.ts`

**Key Behaviors Tested:**

- Loading states
- Data fetching
- Error handling
- Cleanup on unmount

### 4. Component Tests (Medium Priority)

UI components with mocked props and stores.

**Files:**

- `src/__tests__/components/positions/PositionCard.test.tsx`

**Key Behaviors Tested:**

- Skeleton vs data rendering
- Conditional UI elements
- Value formatting

## Writing Tests

### Basic Pattern

```typescript
import { describe, it, expect, vi } from 'vitest'

describe('functionName', () => {
  it('should handle expected input', () => {
    const result = functionName(input)
    expect(result).toBe(expectedOutput)
  })

  it('should handle edge case', () => {
    const result = functionName(edgeInput)
    expect(result).toBe(edgeOutput)
  })
})
```

### Mocking Pattern

```typescript
import { vi } from 'vitest'

vi.mock('metcomet', () => ({
  fetchPositionPnL: vi.fn(),
}))

import { fetchPositionPnL } from 'metcomet'

// In test:
;(fetchPositionPnL as ReturnType<typeof vi.fn>).mockResolvedValue(mockData)
```

### Async Pattern

```typescript
it('should fetch data', async () => {
  const result = await fetchData()
  expect(result).toEqual(expectedData)
})
```

## Coverage Goals

| Category          | Target |
| ----------------- | ------ |
| Utility functions | 95%+   |
| Store logic       | 90%+   |
| Hooks             | 80%+   |
| Components        | 70%+   |

## CI Integration

Tests run as part of the CI pipeline via `bun run ci` (after type check, lint, and format check).

## See Also

- [[Performance Optimizations]] — Test performance considerations
- [[Caching Strategy]] — CacheManager test patterns

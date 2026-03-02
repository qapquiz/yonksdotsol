# AGENTS.md

This file contains build commands and code style guidelines for agentic coding assistants working in this repository.

## Build/Lint/Test Commands

### Primary Commands

- `npm run build` - Type check and Android prebuild
- `npm run ci` - Run full CI: type check, lint, format check, and build
- `npm run lint` - Run ESLint with auto-fix
- `npm run lint:check` - Check ESLint errors without fixing
- `npm run fmt` - Format code with Prettier
- `npm run fmt:check` - Check code formatting
- `tsc --noEmit` - Type check without emitting files

### Development

- `npm run dev` - Start Expo dev server with cache reset
- `npm run android` - Prebuild and run on Android
- `npm run ios` - Prebuild and run on iOS
- `npm run web` - Start web dev server
- `npm start` - Start Expo without dev client

### Testing

- No test framework is currently configured
- Manual testing via Expo dev client or simulators

## Code Style Guidelines

### Imports

- Group 1: React imports (`import { useState, useEffect } from 'react'`)
- Group 2: Third-party/external libraries
- Group 3: Relative/internal imports
- Use `import type { TypeName }` for type-only imports
- Sort imports alphabetically within groups

### Formatting (Prettier)

- Max line width: 120 characters
- No semicolons, single quotes, arrow parens always
- Trailing commas everywhere, 2-space indentation (no tabs)

### Types

- TypeScript strict mode enabled
- Use `interface` for object shapes, `type` for unions/generics
- Define interfaces at file level, not inside components
- Export reusable types
- Use explicit type annotations for function returns
- Prefer `bigint` for large numbers (token amounts, etc.)

### Naming Conventions

- Components: PascalCase (`PositionCard.tsx`, `PositionCard`)
- Functions: camelCase (`calculateTotalValue`, `fetchTokenData`)
- Constants: UPPER_SNAKE_CASE (`BLOCK_CHARS`, `TARGET_WIDTH`)
- Hooks: camelCase with 'use' prefix (`useTokenData`)
- Types/Interfaces: PascalCase (`PositionInfo`, `TokenInfo`)
- Files: PascalCase for components, camelCase for utilities

### Components

- Functional components only
- Use `memo()` for performance optimization on expensive renders
- Props interface defined above component
- Default export for main components, named exports for subcomponents

### Hooks

- Use `useCallback` for event handlers passed to props
- Use `useMemo` for expensive computations
- Always include cleanup in `useEffect` for async operations
- Track mounted state to avoid state updates after unmount

### Error Handling

- Use try/catch for async operations
- Log errors with `console.error()`
- Set error state for UI feedback
- Use fallback UI for failed image loads

### Styling (Uniwind/Tailwind CSS)

- Use Uniwind utility classes for all styling
- Custom colors defined in `src/global.css`:
  - `app-bg`, `app-surface`, `app-surface-highlight`
  - `app-primary`, `app-primary-dim`
  - `app-text`, `app-text-secondary`, `app-text-muted`
- Common patterns:
  - `className="flex-1"` for full height
  - `className="flex-row items-center justify-between"` for row layouts
  - `className="rounded-3xl"` for cards
  - `className="text-sm font-bold"` for typography

### State Management

- Use React hooks for local state
- Use `useState` for simple values
- Use `useReducer` for complex state logic
- Set loading states before async operations

### Big Numbers

- Use `BigInt` for token amounts and large integers
- Convert with `BigInt(value)` or `BigInt(string)`
- Use `10n ** BigInt(decimals)` for divisors

### Code Organization

- `/src/app/` - Expo Router pages (file-based routing)
- `/src/components/` - Reusable UI components
- `/src/hooks/` - Custom React hooks
- `/src/utils/` - Pure utility functions
- `/src/config/` - Configuration and constants

### Before Committing

Always run:

1. `tsc --noEmit` - Ensure no type errors
2. `npm run lint` - Fix linting issues
3. `npm run fmt` - Format code
4. `npm run build` - Verify build succeeds

### Environment Variables

- Defined in `.env` (gitignored)
- Prefix with `EXPO_PUBLIC_` for client-side access
- Example: `EXPO_PUBLIC_RPC_URL=https://...`
- Use via `process.env.EXPO_PUBLIC_RPC_URL`

# AGENTS.md

This file contains build commands and code style guidelines for agentic coding assistants working in this repository.

## Build/Lint/Test Commands

### Primary Commands

- `bun run build` - Type check and Android prebuild
- `bun run ci` - Run full CI: type check, lint, format check, and build
- `bun run lint` - Run ESLint with auto-fix
- `bun run lint:check` - Check ESLint errors without fixing
- `bun run fmt` - Format code with Prettier
- `bun run fmt:check` - Check code formatting
- `tsc --noEmit` - Type check without emitting files

### Development

- `bun run dev` - Start Expo dev server with cache reset
- `bun run android` - Prebuild and run on Android
- `bun run ios` - Prebuild and run on iOS
- `bun run web` - Start web dev server
- `bun start` - Start Expo without dev client

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

## React Native + Solana/Anchor SDK Compatibility

The Solana SDK (`@solana/web3.js`), Anchor (`@coral-xyz/anchor`), and Meteora DLMM rely on Node.js `Buffer` methods that don't exist on `Uint8Array` in React Native's JSC/Hermes engine. All patches live in `polyfill.js`.

### Required Polyfills (already in `polyfill.js`)

1. **`Buffer.prototype.subarray`** — must return Buffer (not plain Uint8Array). Fixes Anchor discriminator extraction.
2. **`Buffer.prototype.slice`** — same requirement. Fixes SDKs that use `.slice()` instead of `.subarray()`.
3. **`Uint8Array.prototype.equals`** — Anchor compares discriminators with `.equals()`, which plain Uint8Array lacks.
4. **Buffer read/write methods on Uint8Array** — `readIntLE`, `readUIntLE`, `readDoubleBE`, etc. Injected by forwarding to a Buffer view. Fixes `buffer-layout` deserialization.

### When Encountering "X is not a function" from Solana SDKs

1. Check if the error involves a Buffer method (`equals`, `readIntLE`, `slice`, `subarray`, `copy`, `fill`, etc.)
2. Add the missing method to the polyfill — use `Object.setPrototypeOf(result, Buffer.prototype)` for subarray/slice, or the Buffer-from-view pattern for read/write methods
3. **Do NOT fork the SDK** — maintenance burden is not worth it
4. **Do NOT switch from `@craftzdog/react-native-buffer` to `buffer`** — the C++ implementation is needed for performance
5. **Do NOT change the polyfill load order** — `react-native-get-random-values` must be first, `install()` must be last

### Key Files

- `polyfill.js` — ALL React Native / Solana compatibility patches
- `index.js` — imports polyfill before anything else (`import './polyfill'`)
- `metro.config.js` — Uniwind CSS processing via `withUniwindConfig`

## Documentation

### Source of truth: `docs/wiki/`

The wiki is the single source of truth. Open `docs/wiki/` as an Obsidian vault for graph view.

- **Index**: `docs/wiki/index.md` — content catalog
- **Schema**: `docs/wiki/WIKI_SCHEMA.md` — page conventions and maintenance instructions

Quick links by topic:

| Topic                              | Wiki Page                                                       |
| ---------------------------------- | --------------------------------------------------------------- |
| Connection, caching, data flow     | [[Connection Lifecycle]], [[Caching Strategy]]                  |
| Color tokens, contrast, skeletons  | [[Theming]], [[Skeleton Loading]]                               |
| PositionInfo, TokenInfo structure  | [[PositionInfo]], [[Position Architecture]]                     |
| Loading states (skeleton/empty)    | [[Loading States]]                                              |
| Number formatting (SOL, USD, %)    | [[Number Formatting]]                                           |
| Code search patterns               | [[ast-grep]]                                                    |
| Render optimization                | [[Performance Optimizations]]                                   |

### Staging area: `docs/raw/`

Drop unprocessed notes and reference material here. After processing into the wiki, the raw file stays for reference. See `docs/raw/README.md`.

### Before Committing

Always run:

1. `tsc --noEmit` - Ensure no type errors
2. `bun run lint` - Fix linting issues
3. `bun run fmt` - Format code
4. `bun run build` - Verify build succeeds

### Environment Variables

- Defined in `.env` (gitignored)
- Prefix with `EXPO_PUBLIC_` for client-side access
- Example: `EXPO_PUBLIC_RPC_URL=https://...`
- Use via `process.env.EXPO_PUBLIC_RPC_URL`
- Access via `src/config/env.ts` (`env.rpcUrl`, `env.heliusApiKey`) — never use `process.env` directly in components

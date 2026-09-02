# AGENTS.md

This file contains build commands and code style guidelines for agentic coding assistants working in this repository.

## Build/Lint/Test Commands

### Primary Commands

- `bun run build` - Type check (`tsgo --noEmit`) and Android prebuild
- `bun run ci` - Run full CI: type check, lint check, format check, and Android build
- `bun run lint` - Run ESLint with auto-fix
- `bun run lint:check` - Check ESLint errors without fixing
- `bun run fmt` - Format code with oxfmt
- `bun run fmt:check` - Check code formatting
- `tsgo --noEmit` - Type check without emitting files (do **not** use `tsc`)

### Development

- `bun run dev` - Start Expo dev server with cache reset
- `bun run android` - Prebuild and run on Android
- `bun run ios` - Prebuild and run on iOS
- `bun run web` - Start web dev server
- `bun start` - Start Expo without dev client

### Web Preview (mock mode)

- The web target **auto-enables dev mock mode** (`env.devMock` is always true when `Platform.OS === 'web'`) — no wallet adapter, no RPC, static mock portfolio.
- `bun run web` — Expo web dev server (http://localhost:8081); add `-- --lan` to reach it from other devices.
- Native-only seams are stubbed via platform-split files (Metro loads `.web.*` only on web; native never sees them): `polyfill.web.js`, `src/wallet/walletKit(.web).tsx`, `src/hooks/useWidgetSync(.web).ts`, `src/widgets/registerWidgetTask(.web).ts`. Keep export pairs in sync when changing either side.
- Headless UI observation via **agent-browser** (its managed Chromium can fetch HTTP here — the Debian system chromium cannot). One-time setup: `npm i -g agent-browser && agent-browser install`.

  ```bash
  export AGENT_BROWSER_SESSION="$(agent-browser session id --scope worktree --prefix observe)"
  agent-browser set viewport 412 900
  agent-browser open http://localhost:8081 && agent-browser wait --text "DEPOSITED"  # mount marker
  agent-browser console                                                             # page/console errors
  agent-browser screenshot "$PWD/.expo/web-capture.png"                              # absolute path (daemon cwd differs)
  python3 scripts/palette-check.py .expo/web-capture.png                             # token-vs-pixels audit
  ```

  Live state via snapshot + clicks (refs change every snapshot — re-snapshot first): `agent-browser snapshot -i` lists the header pressables; the theme toggle flips dark↔light and the last one captures the disconnected wallet state. Theme is **store-driven** (`settingsStore` hardcodes dark) — `set media` does nothing. For boot-time states in light (skeleton audits), seed before reload: `agent-browser eval "localStorage.setItem('settings\\\\settings-store', JSON.stringify({state:{theme:'light'},version:0})); 1"` then reopen. Wait ~3–4s after editing a file before observing — Metro's watcher needs a beat to invalidate. On a cold daemon the first screenshot can catch the app mid-boot (palette ≈ all app-bg) — re-capture once settled.

- `scripts/palette-check.py <png> [--theme dark|light]` — audits a capture against the tokens in `src/config/theme.ts` (auto-detects theme from pixels; requires `pip install pillow`). Theme is applied end-to-end from the store, so a correct audit confirms uniwind CSS vars haven't drifted from theme.ts.

### Testing

- `bun run test` - Run all tests once (Vitest)
- `bun run test:watch` - Run tests in watch mode
- `bun run test:coverage` - Run tests with V8 coverage report
- Test files live in `src/__tests__/` (mirrors `src/` structure)
- Environment: happy-dom / jsdom; globals enabled via Vitest config
- Setup: `src/__tests__/setup.ts` — mocks React Native core modules
- Also: manual testing via Expo dev client or simulators

## Code Style Guidelines

### Imports

- Group 1: React imports (`import { useState, useEffect } from 'react'`)
- Group 2: Third-party/external libraries
- Group 3: Relative/internal imports
- Use `import type { TypeName }` for type-only imports
- Sort imports alphabetically within groups

### Formatting (oxfmt)

- Config: `.oxfmtrc.json` (migrated from Prettier)
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

- **Full design system documented in [`DESIGN.md`](DESIGN.md)** — read it for the authoritative color, typography, spacing, and component-pattern rules. What follows is a quick reference.
- Use Uniwind utility classes for all styling
- **Source of truth for color values**: `src/config/theme.ts` — keep `src/global.css` in sync
- Custom colors defined in `src/global.css` (with dark & light variants):
  - `app-bg`, `app-surface`, `app-surface-highlight`
  - `app-primary`, `app-primary-dim`, `app-primary-dark`
  - `app-secondary`, `app-secondary-dim`
  - `app-negative`, `app-negative-dim`
  - `app-text`, `app-text-secondary`, `app-text-muted`
  - `app-border`
- **Semantic mapping**: profit/in-range/selected → `app-primary`; loss/error → `app-negative`; out-of-range/caution → `app-secondary`. Never use raw Tailwind palette classes (`emerald-*`, `red-*`, etc.).
- Custom fonts: `font-pixel`, `font-sans`, `font-sans-bold`, `font-mono`
- **Use `font-sans-bold` for all bold** — never `font-bold` (renders faux-bold on Geist-Regular).
- Common patterns:
  - `className="flex-1"` for full height
  - `className="flex-row items-center justify-between"` for row layouts
  - `className="bg-app-surface rounded-3xl p-5 mb-4 border border-app-border"` for cards
  - `className="text-sm font-sans-bold"` for typography

### State Management

- **Zustand** for global/shared state (`src/stores/`)
  - `pnlStore.ts` — PnL calculations and position data
  - `settingsStore.ts` — app settings and preferences
  - `walletStore.ts` — wallet connection state
- React hooks for local component state
  - `useState` for simple values
  - `useReducer` for complex state logic
- `react-native-mmkv` for persistent storage (cache, settings)
- Set loading states before async operations

### Big Numbers

- Use `BigInt` for token amounts and large integers
- Convert with `BigInt(value)` or `BigInt(string)`
- Use `10n ** BigInt(decimals)` for divisors

### Code Organization

- `/src/app/` - Expo Router pages (file-based routing)
- `/src/components/` - Reusable UI components (`positions/`, `ui/`)
- `/src/config/` - Configuration and constants (`connection.ts`, `env.ts`, `fonts.ts`, `theme.ts`, `cache.ts`)
- `/src/contexts/` - React contexts (reserved for future use, currently empty)
- `/src/hooks/` - Custom React hooks (`usePositionsPage`, `useWalletLifecycle`, `useThemeTokens`, `useWidgetSync`, `useFontConfig`)
- `/src/services/` - Data fetching layer (`data.ts`)
- `/src/stores/` - Zustand stores (`pnlStore`, `settingsStore`, `walletStore`)
- `/src/tokens/` - Token lists (`index.ts`)
- `/src/types/` - Shared TypeScript type definitions (`charts.d.ts`)
- `/src/utils/` - Pure utility functions (`positions/`, `cache/`)
- `/src/widgets/` - Android home screen widget handlers (`portfolioWidgetTaskHandler.tsx`, `updatePortfolioWidget.tsx`)
- `/src/__tests__/` - Vitest test files (mirrors `src/` structure)

## React Native + Solana/Anchor SDK Compatibility

The project uses **two Solana SDKs side by side**: the legacy `@solana/web3.js` (v1) and the new `@solana/kit` (v2). Both, along with Anchor (`@coral-xyz/anchor`) and Meteora DLMM, rely on Node.js `Buffer` methods that don't exist on `Uint8Array` in React Native's Hermes engine. All patches live in `polyfill.js`.

### Required Polyfills (already in `polyfill.js`)

Polyfills are loaded in this order (do **not** change):

1. `react-native-get-random-values` — must be first
2. `react-native-quick-crypto` — `install()` for crypto polyfill
3. `react-native-url-polyfill/auto` — URL/URLSearchParams
4. `@craftzdog/react-native-buffer` — `global.Buffer = Buffer`
5. Buffer prototype patches:
   - **`Buffer.prototype.subarray`** — must return Buffer (not plain Uint8Array). Fixes Anchor discriminator extraction.
   - **`Buffer.prototype.slice`** — same requirement. Fixes SDKs that use `.slice()` instead of `.subarray()`.
   - **`Uint8Array.prototype.equals`** — Anchor compares discriminators with `.equals()`, which plain Uint8Array lacks.
   - **Buffer read/write methods on Uint8Array** — `readIntLE`, `readUIntLE`, `readDoubleBE`, etc. Injected by forwarding to a Buffer view. Fixes `buffer-layout` deserialization.

### When Encountering "X is not a function" from Solana SDKs

1. Check if the error involves a Buffer method (`equals`, `readIntLE`, `slice`, `subarray`, `copy`, `fill`, etc.)
2. Add the missing method to the polyfill — use `Object.setPrototypeOf(result, Buffer.prototype)` for subarray/slice, or the Buffer-from-view pattern for read/write methods
3. **Do NOT fork the SDK** — maintenance burden is not worth it
4. **Do NOT switch from `@craftzdog/react-native-buffer` to `buffer`** — the C++ implementation is needed for performance
5. **Do NOT change the polyfill load order** — `react-native-get-random-values` must be first, `install()` must be last

### Key Files

- `polyfill.js` — ALL React Native / Solana compatibility patches
- `index.js` — imports polyfill, then `expo-router/entry`, then registers Android widget task handler
- `metro.config.js` — Uniwind CSS processing via `withUniwindConfig`
- `vitest.config.ts` — Vitest configuration with path aliases, coverage settings

## Key Dependencies

| Package                       | Purpose                                                   |
| ----------------------------- | --------------------------------------------------------- |
| `expo-router`                 | File-based routing                                        |
| `zustand`                     | Global state management (stores in `src/stores/`)         |
| `uniwind`                     | Tailwind CSS for React Native                             |
| `@wallet-ui/react-native-kit` | Solana wallet connection                                  |
| `@solana/kit`                 | Solana SDK v2 (new API)                                   |
| `@solana/web3.js`             | Solana SDK v1 (legacy, still used)                        |
| `@meteora-ag/dlmm`            | Meteora DLMM pool integration                             |
| `@shopify/flash-list`         | High-performance lists                                    |
| `react-native-mmkv`           | Fast persistent key-value storage                         |
| `react-native-android-widget` | Android home screen widgets                               |
| `react-native-quick-crypto`   | Crypto polyfill for Hermes                                |
| `zod`                         | Schema validation (available, currently unused in env.ts) |
| `vitest`                      | Test framework                                            |

## Domain Terminology

Canonical domain terms are defined in `UBIQUITOUS_LANGUAGE.md` — read it for full definitions, relationships, and example dialogue. Below is a quick reference for the most common terms and the ambiguities that have been flagged.

### Quick reference

| Canonical term          | Meaning                                                           | Avoid saying                    |
| ----------------------- | ----------------------------------------------------------------- | ------------------------------- |
| **Position**            | A single liquidity provision in a DLMM pool                       | LB position, stake              |
| **Pool**                | A Meteora DLMM liquidity pool (user-facing term)                  | pair, market                    |
| **Pair address**        | On-chain public key of a Pool (code-level term)                   | pool address, lbPair address    |
| **Bin**                 | A discrete price bucket within a Pool                             | tick, step                      |
| **In range**            | Position's bin range includes the active bin                      | active, inTicks                 |
| **Out of range**        | Position's bin range does not include the active bin              | inactive                        |
| **Token info**          | Metadata for a token (mint, symbol, decimals, price)              | token data, token metadata      |
| **Mint**                | On-chain token address (key for Token info lookups)               | token address                   |
| **Unrealized fees**     | Fees accrued but not yet claimed                                  | pending fees, earned fees       |
| **uPnL**                | Unrealized profit/loss (value minus deposit)                      | floating PnL, unrealized return |
| **PnL**                 | General profit/loss concept                                       | profit, return                  |
| **Pool PnL summary**    | Aggregated PnL for all positions in one pool                      | pool PnL                        |
| **Portfolio summary**   | Aggregated PnL across all pools for a wallet                      | total PnL                       |
| **Position view model** | Display-ready object computed from raw data (`PositionViewModel`) | VM, display model               |
| **Liquidity shape**     | Chart data for a position's bin distribution                      | chart data, bin data            |
| **Wallet ready**        | Wallet provider has resolved (address available or timed out)     | wallet resolved                 |
| **Cache manager**       | In-memory singleton with TTL and dedup (`CacheManager`)           | cache, memo                     |
| **Data services**       | Facade layer (`createDataServices()`) for tokens & prices         | service layer                   |

### Flagged ambiguities

- **`pairAddress` (code) vs Pool (UI)**: The codebase variable is `pairAddress` (matching DLMM's `LbPair`). In user-facing text, call it a **Pool**. In code and data keys, use **pair address**.
- **PnL vs uPnL**: `PositionPnLData.pnlSol` is actually unrealized. Use **uPnL** when specifically referring to unrealized amounts; **PnL** for the general concept.
- **"token_data" (cache key) vs Token info (type)**: Cache keys use the prefix `token_data:`, but the TypeScript interface is `TokenInfo`. Use **Token info** in conversation; `token_data:` only in cache key strings.
- **walletReady vs walletResolved**: Both refer to the same concept. The canonical term is **wallet ready** (from `useWalletLifecycle`). `walletResolved` in `PositionsPageResult` is an alias.

## Documentation

### Source of truth: `docs/wiki/`

The wiki is the single source of truth. Open `docs/wiki/` as an Obsidian vault for graph view.

- **Index**: `docs/wiki/index.md` — content catalog
- **Schema**: `docs/wiki/WIKI_SCHEMA.md` — page conventions and maintenance instructions

Quick links by topic:

| Topic                             | Wiki Page                                      |
| --------------------------------- | ---------------------------------------------- |
| Connection, caching, data flow    | [[Connection Lifecycle]], [[Caching Strategy]] |
| Color tokens, contrast, skeletons | [[Theming]], [[Skeleton Loading]]              |
| PositionInfo, TokenInfo structure | [[PositionInfo]], [[Position Architecture]]    |
| Loading states (skeleton/empty)   | [[Loading States]]                             |
| Number formatting (SOL, USD, %)   | [[Number Formatting]]                          |
| Code search patterns              | [[ast-grep]]                                   |
| Render optimization               | [[Performance Optimizations]]                  |

### Staging area: `docs/raw/`

Drop unprocessed notes and reference material here. After processing into the wiki, the raw file stays for reference. See `docs/raw/README.md`.

### Before Committing

Always run:

1. `tsgo --noEmit` - Ensure no type errors (do **not** use `tsc`)
2. `bun run lint` - Fix linting issues
3. `bun run fmt` - Format code
4. `bun run build` - Verify build succeeds
5. `bun run test` - Run all tests

### Environment Variables

- Defined in `.env` (gitignored)
- Prefix with `EXPO_PUBLIC_` for client-side access
- Example: `EXPO_PUBLIC_RPC_URL=https://...`
- Use via `process.env.EXPO_PUBLIC_RPC_URL`
- Access via `src/config/env.ts` (`env.rpcUrl`, `env.heliusApiKey`) — never use `process.env` directly in components
- Zod validation is currently commented out; values are read directly from `process.env`

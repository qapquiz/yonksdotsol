# RFC-03: Merge Calculation Helpers into computePositionViewData

## Problem

`computePositionViewData` is already a well-structured deep module: it takes raw inputs and returns a display-ready `PositionViewModel`. But its implementation is spread across two helper files that introduce shallowness:

- **`calculations.ts`** (15+ exported functions): Many are trivial wrappers that add no abstraction value:
  - `calculateIsInRange` = `>= && <=` (one-liner, inlined everywhere)
  - `calculatePositionTotalValue` = `formatUSD(calculateTokenPairUSD(...))`
  - `calculateUnrealizedFeesValue` = `formatUSD(calculateTokenPairUSD(...))`
  - `calculateClaimedFeesValue` = `formatUSD(calculateTokenPairUSD(...))`
  - The last 3 are identical `calculateTokenPairUSD → formatUSD` wrappers with different parameter names.

- **`formatters.ts`** (8 exported functions): Mix of position-specific formatters (`formatUPNLDisplay`, `formatUPNLDisplaySol`) and generic number formatting (`formatUSD`, `formatTokenAmount`). The generic ones are only used inside `calculations.ts` and `computePositionViewData.ts`.

The result: understanding what `computePositionViewData` does requires bouncing between 3 files. Tests in `calculations.test.ts` (366 lines) and `computePositionViewData.test.ts` (326 lines) overlap significantly — both test the same `calculateTokenPairUSD → formatUSD` chain.

**Modules involved**: `utils/positions/computePositionViewData.ts`, `utils/positions/calculations.ts`, `utils/positions/formatters.ts`

**Dependency category**: In-process (pure computation, no I/O, no state)

## Proposed Interface

The public interface doesn't change — `computePositionViewData` already has the right shape. The change is **internal consolidation**:

```ts
// src/utils/positions/computePositionViewData.ts (deepened)

// PUBLIC — unchanged
export interface PositionViewModel { /* same */ }
export interface ComputePositionViewDataInput { /* same */ }
export function computePositionViewData(input: ComputePositionViewDataInput): PositionViewModel

// INTERNAL — moved here, unexported
// From calculations.ts:
function calculateTokenPairUSD(xRaw, yRaw, tokenXInfo, tokenYInfo): number
function generateLiquidityChartData(...): ChartBinData[]
function generateLiquidityShape(...): LiquidityShape

// From formatters.ts:
function formatUSD(value: number): string
function formatTokenAmount(amount, decimals): string

// INLINE — remove trivial wrappers
// calculateIsInRange → inline as: activeId >= lowerBinId && activeId <= upperBinId
// calculatePositionTotalValue → inline as: formatUSD(calculateTokenPairUSD(...))
// calculateUnrealizedFeesValue → same pattern
// calculateClaimedFeesValue → same pattern
// calculateCurrentPrice → inline the division + formatting
```

### Types that remain exported

```ts
// These types are used by LiquidityBarChart component
export interface ChartBinData {
  /* same */
}
export interface LiquidityShape {
  /* same */
}
```

### Files that remain

```ts
// src/utils/positions/formatters.ts — trimmed to only externally-used formatters
export function formatUPNLDisplay(upnl, percent): string // used by PositionHeader
export function formatUPNLDisplaySol(upnl, percent): string // used by PositionHeader
export function formatTokenAmount(amount, decimals): string // re-exported for computePositionViewData
export function formatUSD(value: number): string // re-exported for computePositionViewData
export function shortenPublicKey(key, chars): string // used elsewhere if applicable
```

### Files deleted

- `src/utils/positions/calculations.ts` — all contents moved into `computePositionViewData.ts` or inlined

### Usage example (unchanged)

```ts
// Callers see no difference
const vm = computePositionViewData({
  positionData,
  activeId,
  positionAddress,
  poolAddress,
  tokenXInfo,
  tokenYInfo,
  pnlData,
})
```

## Dependency Strategy

**Category: In-process** — pure functions with no external dependencies. Merge directly.

The only consumer of `calculations.ts` functions outside `computePositionViewData` is `positions/index.tsx` which calls `calculateIsInRange` for the out-of-range count. This will be replaced by reading `vm.inRange` from the computed view models (or inlining the one-liner).

`formatters.ts` functions used outside the module:

- `formatUPNLDisplay` / `formatUPNLDisplaySol` → used by `PositionHeader.tsx`
- `formatTokenAmount` → used by `computePositionViewData` (will be internal)
- `formatUSD` → used by `calculations.ts` functions (will be internal)

## Testing Strategy

### New boundary tests to write

None — the existing `computePositionViewData.test.ts` (326 lines) already tests the boundary. It remains the authoritative test.

### Old tests to delete

- **`calculations.test.ts`** (366 lines): Every function tested here is either:
  - Inlined into `computePositionViewData` (tested by its existing test)
  - Moved as a private helper (no longer needs direct testing)
  - A trivial one-liner (`calculateIsInRange`, `calculateChartHeight`) that adds no test value

### Test environment needs

No changes — same vitest + jsdom setup.

## Implementation Recommendations

### What the module should own

- All position-related calculations: token pair valuation, fee calculations, range checks, price display, liquidity shape generation
- Formatting of position-specific values (USD amounts, token amounts, PnL percentages)

### What it should hide

- The `calculateTokenPairUSD` function (used 4 times internally, never by external callers)
- The distinction between "calculation" and "formatting" — these are the same concern at this level
- Trivial arithmetic wrappers (`calculateIsInRange`, `calculateChartHeight`)

### What it should expose

- `computePositionViewData` function (unchanged signature)
- `PositionViewModel` interface (unchanged)
- `LiquidityShape` and `ChartBinData` types (used by `LiquidityBarChart`)
- `formatUPNLDisplay` / `formatUPNLDisplaySol` (used by `PositionHeader`) — keep in `formatters.ts` or re-export

### How callers should migrate

1. Move `calculateTokenPairUSD`, `generateLiquidityChartData`, `generateLiquidityShape` into `computePositionViewData.ts` as unexported functions
2. Inline `calculateIsInRange`, `calculatePositionTotalValue`, `calculateUnrealizedFeesValue`, `calculateClaimedFeesValue`, `calculateCurrentPrice` at their call site in `computePositionViewData`
3. Move `formatUSD` and `formatTokenAmount` into `computePositionViewData.ts` as unexported (or keep exported from `formatters.ts` if used elsewhere)
4. Update `positions/index.tsx` out-of-range count to use `vm.inRange` from computed view models instead of calling `calculateIsInRange` directly
5. Delete `calculations.ts` and `calculations.test.ts`
6. Trim `formatters.ts` to only externally-used exports
7. Run `tsc --noEmit` and `bun run lint` to verify no breakage

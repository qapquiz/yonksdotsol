# Testing Plan for yonksdotsol

## Overview

This project is a Solana DeFi mobile app built with Expo/React Native. The testing strategy focuses on:

1. **Unit Tests** - Pure utility functions (calculations, formatters)
2. **Store Tests** - Zustand state management
3. **Hook Tests** - Custom React hooks
4. **Component Tests** - UI components with React Native Testing Library

## Testing Stack

| Tool                              | Purpose                                 |
| --------------------------------- | --------------------------------------- |
| **Vitest**                        | Fast test runner (compatible with Expo) |
| **@testing-library/react-native** | Component testing                       |
| **@testing-library/react-hooks**  | Hook testing                            |
| **react-test-renderer**           | Component rendering                     |
| **msw**                           | API mocking (if needed)                 |

## Test File Structure

```
src/
├── __tests__/
│   ├── utils/
│   │   ├── calculations.test.ts
│   │   └── formatters.test.ts
│   ├── stores/
│   │   └── pnlStore.test.ts
│   ├── hooks/
│   │   └── useBatchTokenData.test.ts
│   └── components/
│       └── positions/
│           └── PositionCard.test.tsx
```

---

## 1. Unit Tests: calculations.ts

**Priority: HIGH** - These are pure functions with clear inputs/outputs

### Test Cases

| Function                       | Test Case                               | Input                                                            | Expected Output                                 |
| ------------------------------ | --------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------- |
| `calculatePositionTotalValue`  | Returns $0.00 when tokenXInfo is null   | (1000n, 2000n, null, tokenYInfo)                                 | '$0.00'                                         |
| `calculatePositionTotalValue`  | Returns $0.00 when tokenYInfo is null   | (1000n, 2000n, tokenXInfo, null)                                 | '$0.00'                                         |
| `calculatePositionTotalValue`  | Calculates correct total value          | (1000000000n, 2000000000n, tokenX(9 dec, $1), tokenY(6 dec, $2)) | '$3.00'                                         |
| `calculatePositionTotalValue`  | Handles large BigInt values             | (999999999999999999n, 1n, tokenX(18 dec, $1), tokenY(6 dec, $1)) | '$1.00'                                         |
| `calculateUnrealizedFeesValue` | Returns $0.00 with null tokens          | (100n, 200n, null, null)                                         | '$0.00'                                         |
| `calculateUnrealizedFeesValue` | Calculates fees correctly               | (500000000n, 1000000n, tokenX(9 dec, $1), tokenY(6 dec, $2))     | '$0.70'                                         |
| `calculateClaimedFeesValue`    | Returns $0.00 with null tokens          | (100n, 200n, null, null)                                         | '$0.00'                                         |
| `calculateClaimedFeesValue`    | Calculates claimed fees                 | (1000000000n, 0n, tokenX(9 dec, $1.50), null)                    | '$1.50'                                         |
| `calculateIsInRange`           | Returns true when activeId in range     | (50, 40, 60)                                                     | true                                            |
| `calculateIsInRange`           | Returns false when activeId below range | (30, 40, 60)                                                     | false                                           |
| `calculateIsInRange`           | Returns false when activeId above range | (70, 40, 60)                                                     | false                                           |
| `calculateIsInRange`           | Returns true at exact boundaries        | (40, 40, 60)                                                     | true                                            |
| `calculateCurrentPrice`        | Returns $0.00 with null tokens          | (null, null)                                                     | '$0.00'                                         |
| `calculateCurrentPrice`        | Calculates price ratio                  | (tokenX($2), tokenY($1))                                         | '$2.0000'                                       |
| `generateLiquidityChartData`   | Generates empty array for empty bins    | ([], 10, 20, 9, 6)                                               | []                                              |
| `generateLiquidityChartData`   | Generates correct bin data              | (mockBins, 100, 105, 9, 6)                                       | ChartBinData[6]                                 |
| `calculatePriceRange`          | Returns zeros for empty bins            | ([], [])                                                         | {minPrice: '0', maxPrice: '0', maxLiquidity: 0} |
| `calculatePriceRange`          | Calculates correct range                | (mockBins, mockPositionData)                                     | {minPrice, maxPrice, maxLiquidity}              |
| `calculateChartHeight`         | Returns min height for small bins       | (10)                                                             | 24                                              |
| `calculateChartHeight`         | Returns max height for large bins       | (150)                                                            | 40                                              |
| `calculateChartHeight`         | Scales linearly for medium bins         | (60)                                                             | 32                                              |
| `calculateActiveBinPosition`   | Returns 50 for no match                 | ([], 100)                                                        | 50                                              |
| `calculateActiveBinPosition`   | Calculates correct position             | (mockBins, 102)                                                  | number (0-100)                                  |
| `calculateInitialDepositValue` | Returns 0 with null tokens              | (1000n, 2000n, null, null)                                       | 0                                               |
| `calculateInitialDepositValue` | Calculates deposit value                | (1000000000n, 2000000000n, tokenX(9,$1), tokenY(6,$2))           | 3                                               |
| `calculateUPNLValue`           | Calculates positive PnL                 | (150, 100)                                                       | 50                                              |
| `calculateUPNLValue`           | Calculates negative PnL                 | (80, 100)                                                        | -20                                             |
| `calculateUPNLPercentage`      | Returns 0 for zero initial              | (100, 0)                                                         | 0                                               |
| `calculateUPNLPercentage`      | Calculates positive percentage          | (150, 100)                                                       | 50                                              |
| `calculateUPNLPercentage`      | Calculates negative percentage          | (75, 100)                                                        | -25                                             |
| `formatUPNLDisplay`            | Formats positive display                | (10.5, 5.25)                                                     | '+$10.50 (+5.25%)'                              |
| `formatUPNLDisplay`            | Formats negative display                | (-10.5, -5.25)                                                   | '-$10.50 (-5.25%)'                              |

---

## 2. Unit Tests: formatters.ts

**Priority: HIGH** - Pure formatting functions

### Test Cases

| Function               | Test Case                      | Input                                | Expected Output         |
| ---------------------- | ------------------------------ | ------------------------------------ | ----------------------- |
| `formatTokenAmount`    | Formats whole number           | (1000000000n, 9)                     | '1.000000'              |
| `formatTokenAmount`    | Formats decimal number         | (1500000000n, 9)                     | '1.500000'              |
| `formatTokenAmount`    | Handles string input           | ('1000000000', 9)                    | '1.000000'              |
| `formatTokenAmount`    | Trims trailing zeros           | (1230000000n, 9)                     | '1.23'                  |
| `formatTokenAmount`    | Handles zero                   | (0n, 9)                              | '0.000000'              |
| `formatTokenAmount`    | Handles small amounts          | (1n, 9)                              | '0.000000001'           |
| `formatTokenAmount`    | Handles 6 decimal tokens       | (1000000n, 6)                        | '1.000000'              |
| `formatPriceRange`     | Formats range                  | (0.5, 2.0)                           | '0.5 - 2'               |
| `formatTimestamp`      | Formats days ago               | (now - 2days)                        | '2d ago'                |
| `formatTimestamp`      | Formats hours ago              | (now - 5hours)                       | '5h ago'                |
| `formatTimestamp`      | Formats minutes ago            | (now - 30min)                        | '30m ago'               |
| `formatTimestamp`      | Formats just now               | (now)                                | 'Just now'              |
| `shortenPublicKey`     | Shortens with default chars    | ('11111111111111111111111111111111') | '11111111...11111111'   |
| `shortenPublicKey`     | Shortens with custom chars     | ('1234567890abcdef', 4)              | '1234...cdef'           |
| `formatFees`           | Formats both fees              | ('100', '200')                       | 'X: 100 \| Y: 200'      |
| `formatFees`           | Formats only X fee             | ('100', '0')                         | 'X: 100'                |
| `formatFees`           | Returns None for zero fees     | ('0', '0')                           | 'None'                  |
| `formatFees`           | Handles bigint                 | (100n, 200n)                         | 'X: 100 \| Y: 200'      |
| `formatUPNLDisplaySol` | Returns empty for null upnl    | (null, 5)                            | ''                      |
| `formatUPNLDisplaySol` | Returns empty for null percent | (10, null)                           | ''                      |
| `formatUPNLDisplaySol` | Formats positive SOL           | (0.5, 10.5)                          | '+0.5000 SOL (+10.50%)' |
| `formatUPNLDisplaySol` | Formats negative SOL           | (-0.5, -10.5)                        | '-0.5000 SOL (-10.50%)' |
| `formatUPNLDisplay`    | Returns empty for undefined    | (undefined, undefined)               | ''                      |
| `formatUPNLDisplay`    | Formats positive USD           | (100.5, 15.25)                       | '+$100.50 (+15.25%)'    |
| `formatUPNLDisplay`    | Formats negative USD           | (-100.5, -15.25)                     | '-$100.50 (-15.25%)'    |

---

## 3. Store Tests: pnlStore.ts

**Priority: HIGH** - Critical state management

### Test Cases

| Function               | Test Case                           | Description                                         |
| ---------------------- | ----------------------------------- | --------------------------------------------------- |
| `fetchPoolPnL`         | Returns null without API key        | env.heliusApiKey = '' → returns null                |
| `fetchPoolPnL`         | Returns cached data within TTL      | Fetch once, call again within 60s → no new fetch    |
| `fetchPoolPnL`         | Fetches fresh data after TTL        | Fetch, wait 61s, fetch again → new request          |
| `fetchPoolPnL`         | Deduplicates concurrent requests    | Two calls at same time → single fetch               |
| `fetchPoolPnL`         | Handles API errors                  | API throws → error propagated, pending cleared      |
| `fetchPoolPnL`         | Stores positions on success         | Successful fetch → positions in store               |
| `invalidateWallet`     | Clears wallet-specific cache        | Cache has data for wallet → invalidate → data gone  |
| `invalidateWallet`     | Preserves other wallet data         | Two wallets cached → invalidate one → other remains |
| `clearAll`             | Clears all cache                    | Multiple entries → clearAll → empty store           |
| `selectPositionPnL`    | Returns null for missing data       | No cache → selector → null                          |
| `selectPositionPnL`    | Returns position data               | Cache exists → selector → PositionPnLData           |
| `selectPositionPnL`    | Returns null for missing position   | Cache exists but position not found → null          |
| `selectPoolPnLSummary` | Returns zeros for empty input       | No pools → summary with all zeros                   |
| `selectPoolPnLSummary` | Calculates totals correctly         | Multiple positions → correct sum                    |
| `selectPoolPnLSummary` | Calculates weighted PnL %           | Different position sizes → weighted average         |
| `selectHasPoolData`    | Returns false for empty wallet      | No wallet → false                                   |
| `selectHasPoolData`    | Returns true when data exists       | Cache has entry → true                              |
| `selectHasPoolData`    | Returns false when no matching pool | Cache exists but different pool → false             |

---

## 4. Hook Tests: useBatchTokenData.ts

**Priority: MEDIUM** - Custom hook behavior

### Test Cases

| Test Case                           | Description                                          |
| ----------------------------------- | ---------------------------------------------------- |
| Returns empty data when disabled    | enabled=false → tokenData=Map(), isLoading=false     |
| Returns empty data when mints empty | mints=[] → tokenData=Map(), isLoading=false          |
| Sets loading state during fetch     | Start fetch → isLoading=true                         |
| Populates token data on success     | Successful fetch → Map with token data               |
| Sets error on partial failure       | One mint fails → error set, successful mints in data |
| Cleans up on unmount                | Unmount during fetch → no state update               |
| Refetches when mints change         | Change mints array → new fetch                       |
| Refetches when enabled changes      | disabled → enabled → fetch triggered                 |

---

## 5. Component Tests: PositionCard.tsx

**Priority: MEDIUM** - UI rendering

### Test Cases

| Test Case                           | Description                                             |
| ----------------------------------- | ------------------------------------------------------- |
| Renders skeleton when no token data | tokenXInfo=null, tokenYInfo=null → PositionCardSkeleton |
| Renders null when no lbPairPosition | position.lbPairPositionsData[0] = undefined → null      |
| Renders position card with data     | All props valid → card rendered                         |
| Displays correct total value        | positionData + tokenInfo → formatted USD value          |
| Shows in-range indicator            | activeId within bounds → inRange=true                   |
| Shows out-of-range indicator        | activeId outside bounds → inRange=false                 |
| Displays unrealized fees            | feeX, feeY present → formatted fees shown               |
| Displays claimed fees               | claimed amounts present → formatted fees shown          |
| Displays PnL from store             | pnlStore has data → PnL shown in header                 |
| Renders liquidity chart             | liquidityShape calculated → chart rendered              |

---

## 6. CacheManager Tests

**Priority: MEDIUM** - Core caching logic

### Test Cases

| Function            | Test Case                       | Description                                           |
| ------------------- | ------------------------------- | ----------------------------------------------------- |
| `get`               | Returns null for missing key    | get('missing') → null                                 |
| `get`               | Returns value for fresh entry   | set + get → value                                     |
| `get`               | Returns null for expired entry  | set + wait TTL + get → null                           |
| `set`               | Stores value                    | set + get → value                                     |
| `set`               | Respects custom TTL             | set(key, val, 100ms) + wait 101ms + get → null        |
| `has`               | Returns true for fresh entry    | set + has → true                                      |
| `has`               | Returns false for expired entry | set + wait + has → false                              |
| `delete`            | Removes entry                   | set + delete + get → null                             |
| `clear`             | Clears all entries              | set multiple + clear → all null                       |
| `invalidatePattern` | Deletes matching keys           | set('a:1', 'b:1') + invalidatePattern('a') → 'a' gone |
| `getOrFetch`        | Returns cached value            | set + getOrFetch → no fetch called                    |
| `getOrFetch`        | Calls fetch when empty          | getOrFetch → fetch called, value cached               |
| `getOrFetch`        | Deduplicates concurrent calls   | Two getOrFetch same key → single fetch                |
| `getOrFetch`        | Caches fetch result             | getOrFetch → second call returns cached               |

---

## Setup Steps

1. Install testing dependencies
2. Configure Vitest
3. Create test directory structure
4. Write test files starting with utilities
5. Add test script to package.json
6. Run tests and iterate

---

## Test Execution Order

1. **Phase 1**: Utility functions (calculations, formatters) - No dependencies
2. **Phase 2**: CacheManager - Isolated class
3. **Phase 3**: Store (pnlStore) - Depends on mocking metcomet
4. **Phase 4**: Hooks (useBatchTokenData) - Depends on mocking tokens
5. **Phase 5**: Components (PositionCard) - Depends on all above

## Coverage Goals

| Category          | Target Coverage                    |
| ----------------- | ---------------------------------- |
| Utility functions | 95%+                               |
| Store logic       | 90%+                               |
| Hooks             | 80%+                               |
| Components        | 70%+ (focus on logic, not styling) |

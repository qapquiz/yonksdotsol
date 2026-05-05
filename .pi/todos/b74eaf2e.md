{
  "id": "b74eaf2e",
  "title": "RFC: Position Data Pipeline deep module",
  "tags": [
    "architecture",
    "refactor",
    "position-pipeline",
    "deep-module"
  ],
  "status": "done",
  "created_at": "2026-05-05T16:33:51.449Z"
}

## Implementation Status: DONE (Phase 1 & 2)

### What was done:

1. **Created `src/services/positionPipeline.ts`** (316 lines) — the deep module:
   - `PositionPipeline` class with `loadPortfolio()`, `fetchPortfolioSummary()`, `invalidateWallet()` methods
   - `PipelineDeps` for dependency injection (cache, connection, heliusApiKey, dataServices)
   - Internal PnL fetching with best-effort semantics (failures don't block)
   - Cache key patterns hidden internally (`pnl:`, `:${walletAddress}` invalidation)
   - Result types: `PortfolioResult`, `ResolvedPosition`, `PortfolioSummaryData`, `PortfolioSummaryWidgetData`

2. **Refactored `src/hooks/usePositionsPage.ts`** (249 → 116 lines):
   - Hook is now a thin adapter: manages React state + wallet lifecycle + throttled refresh
   - All data orchestration delegated to `pipeline.loadPortfolio()`
   - No more direct imports of DLMM, CacheManager, usePnLStore, createDataServices, computePositionViewData, etc.
   - Re-exports `ResolvedPosition` and `PortfolioSummaryData` from the pipeline for backward compat

3. **Refactored `src/widgets/updatePortfolioWidget.tsx`**:
   - `fetchPortfolioSummary()` reduced from ~60 lines of `require()` duplication to 6 lines using `pipeline.fetchPortfolioSummary()`
   - No more `require()` calls — clean imports only
   - Widget type `PortfolioSummary` mapped from `PortfolioSummaryWidgetData`

4. **Created `src/__tests__/services/positionPipeline.test.ts`** (9 tests):
   - Empty wallet returns empty result
   - Full pipeline with positions + PnL returns resolved data
   - PnL fetch failure → positions still return with `pnlSol: null`, `hasPnLData: false`
   - Token fetch failure → `tokenXInfo: null`, values fall back to `$0.00`
   - Missing `heliusApiKey` → `hasPnLData: false`
   - `invalidateWallet()` clears wallet-specific cache entries
   - `fetchPortfolioSummary()` returns null for empty wallets
   - `fetchPortfolioSummary()` with positions returns summary data
   - Partial PnL failure (some pools succeed) still returns data

### What's dead code (Phase 3, can be deleted separately):

- `src/stores/pnlStore.ts` — no runtime imports remain. The pipeline manages PnL caching internally via CacheManager.
- `src/__tests__/stores/pnlStore.test.ts` — tests for the dead store

### Verification:

- ✅ `tsgo --noEmit` passes clean
- ✅ `bun run test` — all 145 tests pass (136 existing + 9 new)
- ✅ No runtime imports of `pnlStore` remain
- ✅ Types flow correctly: pipeline → hook (re-export) → component

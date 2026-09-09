---
title: DlmmApi
type: entity
location: src/services/dlmmApi.ts
created: 2026-09-08
updated: 2026-09-09
tags: [data, pagination, pnl]
related:
  - CacheManager
  - Caching Strategy
  - Position Architecture
---

# DlmmApi

Owned DLMM Data API client. It provides typed page requests and complete-result helpers for position PnL and widget portfolio summaries.

## Public Methods

| Method                              | Result                                             | Use                                                                     |
| ----------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------- |
| `fetchPositionPnL(params)`          | One PnL page with pagination metadata              | Consumers that manage their own page navigation                         |
| `fetchAllPositionPnL(params)`       | Position PnL across every page, starting at page 1 | Position pipeline and future consumers that need a complete pool result |
| `fetchOpenPortfolio(params)`        | One portfolio page                                 | Consumers that manage their own page navigation                         |
| `fetchOpenPortfolioSummary(params)` | Server totals plus rollups across fetched pages    | Android widget; an explicit `page` starts from that page, default 1     |

## Pagination Contract

Both complete-result helpers use one private page walker. It requests pages sequentially, increments page numbers, and stops when `hasNext` is false. The default page size is 50 and the maximum is 10 fetched pages per helper call.

If page 10 still has `hasNext: true`, the helper throws `DlmmApiError` instead of returning incomplete data. A response that ends on page 10 succeeds. Network or HTTP failures on any page also reject the helper.

The position pipeline caches only the completed PnL array. If a later page fails, that pool's PnL is omitted from the current result, other pools can still succeed, and the next load retries the failed pool. The widget uses its existing error path for incomplete summaries.

Per ADR 0001, the client does not calculate historical prices locally. Per ADR 0002, widget summaries continue to use server totals while the app aggregates per-position data. PnL requests do not require a Helius key; the obsolete pipeline key check has been removed.

## PnL Wire Values

Live position responses can encode `pnlSol` and `pnlSolPctChange` as decimal strings. Their wire types also accept numbers, null, or omission. The transport preserves the response; [[computePositionViewData]] converts these fields to finite numbers before app cards and [[PositionLiquidityWidget]] consume them. Zero remains zero, while missing, blank, or invalid values become null. Passing a numeric string directly to the widget's `Number.isFinite` check would incorrectly hide available uPnL.

## Extension and Testing

Add new page transports here. When a new consumer needs a complete result, compose its helper over the private page walker so termination and failure rules stay in one place. Keep cache keys and TTLs in the owning query module.

Tests replace `fetch` and native/RPC dependencies. `positionPipeline.test.ts` exercises the real API client, cache, position matching, and summary aggregation together. `dlmmApi.test.ts` covers page limits and widget rollups. This catches integration errors that mocking the entire API client would hide.

Pagination parameters were checked against Meteora's [official OpenAPI schema](https://github.com/MeteoraAg/docs/blob/main/developer-guides/dlmm/api-reference/openapi.json) on 2026-09-08. Its documented maximum page sizes are 100 for position PnL and 50 for open portfolios.

## See Also

- [[CacheManager]] — request ownership and invalidation
- [[Caching Strategy]] — where complete query results are cached
- [[Position Architecture]] — joining PnL with individual positions

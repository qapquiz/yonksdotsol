---
title: Wiki Index
type: index
created: 2026-04-18
updated: 2026-09-10
tags: [index, wiki]
---

# Wiki Index

Content catalog for the yonksdotsol project wiki. Updated as pages are created or modified.

## Schema

| Page            | Description                           |
| --------------- | ------------------------------------- |
| [[WIKI_SCHEMA]] | Maintenance instructions for the wiki |

## Entities

| Page                        | Description                                   | Location                                         |
| --------------------------- | --------------------------------------------- | ------------------------------------------------ |
| [[Connection]]              | Singleton Solana RPC connection               | `src/config/connection.ts`                       |
| [[CacheManager]]            | TTL, dedup, and invalidation during requests  | `src/utils/cache/CacheManager.ts`                |
| [[DlmmApi]]                 | PnL wire types and complete paginated results | `src/services/dlmmApi.ts`                        |
| [[PositionInfo]]            | Meteora DLMM position data structure          | `@meteora-ag/dlmm`                               |
| [[SettingsStore]]           | Zustand store for theme and preferences       | `src/stores/settingsStore.ts`                    |
| [[ShimmerBlock]]            | Skeleton loading animation component          | `src/components/ui/ShimmerBlock.tsx`             |
| [[usePositionsPage]]        | Main data orchestration hook for positions    | `src/hooks/usePositionsPage.ts`                  |
| [[useWalletLifecycle]]      | Wallet connection lifecycle hook              | `src/hooks/useWalletLifecycle.ts`                |
| [[computePositionViewData]] | Position view models with normalized API PnL  | `src/utils/positions/computePositionViewData.ts` |

## Components

| Page                         | Description                                                                | Location                                                |
| ---------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------- |
| [[PortfolioSummary]]         | Portfolio PnL summary with SOL values                                      | `src/components/positions/PortfolioSummary.tsx`         |
| [[LiquidityBarChart]]        | Liquidity bars with an animated dashed active-bin marker                   | `src/components/positions/LiquidityBarChart.tsx`        |
| [[PositionLiquidityWidget]]  | Android widget with per-position navigation, liquidity graph, and API uPnL | `src/widgets/PositionLiquidityWidget.tsx`               |
| [[PositionCard]]             | Individual position display card                                           | `src/components/positions/PositionCard.tsx`             |
| [[PositionHeader]]           | Token pair, range badge, value header                                      | `src/components/positions/PositionHeader.tsx`           |
| [[PositionFooter]]           | Fee display footer                                                         | `src/components/positions/PositionFooter.tsx`           |
| [[TokenIcons]]               | Overlapping token icon pair                                                | `src/components/positions/TokenIcons.tsx`               |
| [[EmptyState]]               | No positions empty state                                                   | `src/components/positions/EmptyState.tsx`               |
| [[PositionCardSkeleton]]     | Skeleton placeholder for PositionCard                                      | `src/components/positions/PositionCardSkeleton.tsx`     |
| [[PortfolioSummarySkeleton]] | Skeleton placeholder for PortfolioSummary                                  | `src/components/positions/PortfolioSummarySkeleton.tsx` |
| [[PixelAvatar]]              | Pixelated avatar component                                                 | `src/components/ui/PixelAvatar.tsx`                     |
| [[ShimmerBlock]]             | Skeleton loading animation                                                 | `src/components/ui/ShimmerBlock.tsx`                    |

## Concepts

| Page                      | Description                                                              |
| ------------------------- | ------------------------------------------------------------------------ |
| [[Caching Strategy]]      | Shared caching, request invalidation, and widget wallet snapshots        |
| [[Theming]]               | Dark/light mode with Uniwind tokens — see [`DESIGN.md`](../../DESIGN.md) |
| [[Connection Lifecycle]]  | Singleton pattern for RPC connection                                     |
| [[Position Architecture]] | One pair → many positions relationship                                   |
| [[Skeleton Loading]]      | Per-block shimmer pattern                                                |

## Guides

| Page                                       | Description                                            |
| ------------------------------------------ | ------------------------------------------------------ |
| [[ast-grep]]                               | Structural code search patterns and rules              |
| [[Number Formatting]]                      | Formatting conventions for numbers                     |
| [[Loading States]]                         | Skeleton vs empty vs data patterns                     |
| [[Performance Optimizations]]              | Memo, FlashList, and render optimization               |
| [[Testing]]                                | Vitest setup, patterns, and coverage                   |
| [[Codebase Improvement Report 2026-09-08]] | Cache and pagination fixes, comparison, and validation |

## Raw Staging Area

`docs/raw/` contains unprocessed source material. Files are processed into wiki pages above.
See `docs/raw/README.md` for status tracking.

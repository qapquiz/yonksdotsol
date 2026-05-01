---
title: Wiki Index
type: index
created: 2026-04-18
updated: 2026-04-28
tags: [index, wiki]
---

# Wiki Index

Content catalog for the yonksdotsol project wiki. Updated as pages are created or modified.

## Schema

| Page            | Description                           |
| --------------- | ------------------------------------- |
| [[WIKI_SCHEMA]] | Maintenance instructions for the wiki |

## Entities

| Page                        | Description                                | Location                                         |
| --------------------------- | ------------------------------------------ | ------------------------------------------------ |
| [[Connection]]              | Singleton Solana RPC connection            | `src/config/connection.ts`                       |
| [[CacheManager]]            | Centralized caching with TTL and dedup     | `src/utils/cache/CacheManager.ts`                |
| [[PositionInfo]]            | Meteora DLMM position data structure       | `@meteora-ag/dlmm`                               |
| [[SettingsStore]]           | Zustand store for theme and preferences    | `src/stores/settingsStore.ts`                    |
| [[PnLStore]]                | Zustand store for profit/loss data         | `src/stores/pnlStore.ts`                         |
| [[ShimmerBlock]]            | Skeleton loading animation component       | `src/components/ui/ShimmerBlock.tsx`             |
| [[usePositionsPage]]        | Main data orchestration hook for positions | `src/hooks/usePositionsPage.ts`                  |
| [[useWalletLifecycle]]      | Wallet connection lifecycle hook           | `src/hooks/useWalletLifecycle.ts`                |
| [[computePositionViewData]] | Pure position → view model transformer     | `src/utils/positions/computePositionViewData.ts` |

## Components

| Page                         | Description                               | Location                                                |
| ---------------------------- | ----------------------------------------- | ------------------------------------------------------- |
| [[PortfolioSummary]]         | Portfolio PnL summary with SOL values     | `src/components/positions/PortfolioSummary.tsx`         |
| [[LiquidityBarChart]]        | SVG bar chart for liquidity distribution  | `src/components/positions/LiquidityBarChart.tsx`        |
| [[PositionCard]]             | Individual position display card          | `src/components/positions/PositionCard.tsx`             |
| [[PositionHeader]]           | Token pair, range badge, value header     | `src/components/positions/PositionHeader.tsx`           |
| [[PositionFooter]]           | Fee display footer                        | `src/components/positions/PositionFooter.tsx`           |
| [[TokenIcons]]               | Overlapping token icon pair               | `src/components/positions/TokenIcons.tsx`               |
| [[EmptyState]]               | No positions empty state                  | `src/components/positions/EmptyState.tsx`               |
| [[PositionCardSkeleton]]     | Skeleton placeholder for PositionCard     | `src/components/positions/PositionCardSkeleton.tsx`     |
| [[PortfolioSummarySkeleton]] | Skeleton placeholder for PortfolioSummary | `src/components/positions/PortfolioSummarySkeleton.tsx` |
| [[PixelAvatar]]              | Pixelated avatar component                | `src/components/ui/PixelAvatar.tsx`                     |
| [[ShimmerBlock]]             | Skeleton loading animation                | `src/components/ui/ShimmerBlock.tsx`                    |

## Concepts

| Page                      | Description                            |
| ------------------------- | -------------------------------------- |
| [[Caching Strategy]]      | TTL-based caching with request dedup   |
| [[Theming]]               | Dark/light mode with Uniwind tokens    |
| [[Connection Lifecycle]]  | Singleton pattern for RPC connection   |
| [[Position Architecture]] | One pair → many positions relationship |
| [[Skeleton Loading]]      | Per-block shimmer pattern              |

## Guides

| Page                          | Description                               |
| ----------------------------- | ----------------------------------------- |
| [[ast-grep]]                  | Structural code search patterns and rules |
| [[Number Formatting]]         | Formatting conventions for numbers        |
| [[Loading States]]            | Skeleton vs empty vs data patterns        |
| [[Performance Optimizations]] | Memo, FlashList, and render optimization  |
| [[Testing]]                   | Vitest setup, patterns, and coverage      |

## Raw Staging Area

`docs/raw/` contains unprocessed source material. Files are processed into wiki pages above.
See `docs/raw/README.md` for status tracking.

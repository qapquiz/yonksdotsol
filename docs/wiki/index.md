---
title: Wiki Index
type: index
created: 2026-04-18
updated: 2026-04-18
tags: [index, wiki]
---

# Wiki Index

Content catalog for the yonksdotsol project wiki. Updated as pages are created or modified.

## Entities

| Page | Description | Location |
|------|-------------|----------|
| [[Connection]] | Singleton Solana RPC connection | `src/config/connection.ts` |
| [[CacheManager]] | Centralized caching with TTL and dedup | `src/utils/cache/CacheManager.ts` |
| [[PositionInfo]] | Meteora DLMM position data structure | `@meteora-ag/dlmm` |
| [[SettingsStore]] | Zustand store for theme and preferences | `src/stores/settingsStore.ts` |
| [[PnLStore]] | Zustand store for profit/loss data | `src/stores/pnlStore.ts` |
| [[ShimmerBlock]] | Skeleton loading animation component | `src/components/ui/ShimmerBlock.tsx` |

## Concepts

| Page | Description |
|------|-------------|
| [[Caching Strategy]] | TTL-based caching with request dedup |
| [[Theming]] | Dark/light mode with Uniwind tokens |
| [[Connection Lifecycle]] | Singleton pattern for RPC connection |
| [[Position Architecture]] | One pair → many positions relationship |
| [[Skeleton Loading]] | Per-block shimmer pattern |

## Guides

| Page | Description |
|------|-------------|
| [[ast-grep]] | Structural code search patterns and rules |
| [[Number Formatting]] | Formatting conventions for numbers |
| [[Loading States]] | Skeleton vs empty vs data patterns |
| [[Performance Optimizations]] | Memo, FlashList, and render optimization |

## Raw Sources

Immutable source documents in `docs/raw/`:

| Document | Extracted To |
|----------|-------------|
| `raw/architecture.md` | [[Connection Lifecycle]], [[Caching Strategy]] |
| `raw/data-model.md` | [[PositionInfo]], [[Position Architecture]] |
| `raw/theme-guide.md` | [[Theming]], [[Skeleton Loading]] |
| `raw/CACHING_STRATEGY.md` | [[Caching Strategy]] |
| `raw/CACHING_SUMMARY.md` | [[Caching Strategy]] |
| `raw/perf-optimizations.md` | [[Performance Optimizations]] |
| `raw/loading-states.md` | [[Loading States]] |
| `raw/number-formatting.md` | [[Number Formatting]] |

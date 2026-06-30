---
title: Wiki Log
type: log
created: 2026-04-18
updated: 2026-04-28
tags: [log, wiki]
---

# Wiki Log

Chronological record of wiki activity. Append-only.

## [2026-04-18] init | Wiki structure created

Created LLM Wiki structure based on LLM Wiki pattern:

- Created `docs/wiki/` directory with entities/, concepts/, guides/
- Created [[WIKI_SCHEMA]] with maintenance instructions
- Created [[index]] as content catalog
- Created this log for activity tracking

## [2026-04-18] create | Entity pages

Created initial entity pages from existing docs:

- [[Connection]] — from architecture.md
- [[CacheManager]] — from architecture.md + CACHING_STRATEGY.md
- [[PositionInfo]] — from data-model.md
- [[SettingsStore]] — from theme-guide.md

## [2026-04-18] create | Concept pages

Created initial concept pages:

- [[Caching Strategy]] — from CACHING_STRATEGY.md, CACHING_SUMMARY.md
- [[Theming]] — from theme-guide.md
- [[Connection Lifecycle]] — from architecture.md
- [[Position Architecture]] — from data-model.md
- [[Skeleton Loading]] — from theme-guide.md, loading-states.md

## [2026-04-18] create | Guide pages

Migrated guide pages:

- [[ast-grep]] — from ast-grep-cheatsheet.md
- [[Number Formatting]] — from number-formatting.md
- [[Loading States]] — from loading-states.md
- [[Performance Optimizations]] — from perf-optimizations.md

## [2026-04-18] update | Loading state pattern

Replaced `hasLoadedOnce` ref with `walletResolved` prop:

- Old pattern caused empty-state flash on cold start (wallet starts undefined → loading false → empty → wallet loads → skeleton → data)
- New pattern: skeleton stays until `walletResolved=true` AND fetch completes
- Updated Loading States guide, Skeleton Loading concept, architecture data flow

## [2026-04-18] refactor | Flatten docs — wiki as single source of truth

- `docs/wiki/` is now the single source of truth (Obsidian-ready)
- `docs/raw/` repurposed as staging inbox (drop unprocessed info, agent processes into wiki)
- Updated `AGENTS.md` pointers from `docs/raw/*.md` → `docs/wiki/` pages
- Updated `docs/wiki/index.md` — replaced raw sources table with staging area note
- Updated `docs/raw/README.md` — status table + workflow instructions

## [2026-04-19] create | PortfolioSummary entity page

Created [[PortfolioSummary]] entity page for the portfolio summary component.

## [2026-04-19] create | LiquidityBarChart entity page

Created [[LiquidityBarChart]] entity page for the liquidity bar chart component.

## [2026-04-28] lint | Wiki audit and entity page completion

Performed full wiki health check following [[WIKI_SCHEMA]]:

- Fixed missing `location` frontmatter on [[PortfolioSummary]] and [[LiquidityBarChart]]
- Standardized `## See Also` section naming across all pages
- Created missing entity pages:
  - [[PositionCard]] — position display card
  - [[PixelAvatar]] — SVG pixel avatar
  - [[EmptyState]] — empty state component
  - [[PositionCardSkeleton]] — position skeleton
  - [[PortfolioSummarySkeleton]] — summary skeleton
  - [[PositionHeader]] — card header
  - [[PositionFooter]] — card footer
  - [[TokenIcons]] — token icon pair
  - [[usePositionsPage]] — main positions data hook
  - [[useWalletLifecycle]] — wallet lifecycle hook
  - [[computePositionViewData]] — pure view model transformer
- Updated [[index]] with all new pages and bumped `updated` date
- Added `related` frontmatter cross-references where missing

## [2026-06-30] update | Design system unified; DESIGN.md authored

Unified the visual design across the app and recorded it as the authoritative source:

- Created root-level [`DESIGN.md`](../../../DESIGN.md) as the source of truth for the design system (colors, typography, spacing, semantic mapping, component patterns). Sits beside `UBIQUITOUS_LANGUAGE.md`.
- Added `app-negative` / `app-negative-dim` tokens (clay-red) for loss/error; mapped all semantic states onto the accent palette (profit→primary, loss→negative, caution→secondary). Removed all raw Tailwind palette classes (`emerald-*`, `red-*`, `orange-*`, `amber-*`, `cyan-*`, `zinc-*`) from components.
- Charts de-hardcoded: `LiquidityBarChart` and `PriceChart` now derive SVG colors from `useThemeTokens()` instead of literal cyan/emerald/zinc.
- Typography unified: `font-bold` → `font-sans-bold` everywhere; one eyebrow style (`text-[10px] font-sans-bold tracking-wider`).
- Extracted shared primitives: [[SegmentedControl]] (both toggles), [[ChartPanel]] (chart wrapper). Removed duplicated `ShimmerBlock` from [[PositionCardSkeleton]].
- Refreshed [[Theming]] to current token values and pointed it at DESIGN.md as authoritative. `docs/raw/theme-guide.md` is now historical/stale.

## [2026-06-30] update | Design pass — "Readout" hero + chrome reduction

First opinionated design pass on top of the unified system. Signature + refinements:

- **Portfolio hero is now a card-less readout** ([[PortfolioSummary]]): total value sits bare on the background at `text-4xl` (pixel), PnL delta beneath in color, stat row anchored by a hairline. Leads with value (stable anchor) over PnL. Bare treatment distinguishes the portfolio from the boxed position cards. [[PortfolioSummarySkeleton]] updated to match (also card-less).
- **Removed the box-in-a-box**: [[ChartPanel]] no longer wraps the chart in a recessed panel; the chart renders directly on the card surface, framed by its eyebrow + grid lines. Price chip became quiet mono text.
- **Killed emoji tells** (`✨ 💰 📊`): [[PositionFooter]] is now label-left/value-right rows with state carried by color (unrealized→primary, claimed→secondary). [[EmptyState]] swaps 📊 for the app's own [[PixelAvatar]] (ghost variant).
- [`DESIGN.md`](../../../DESIGN.md) Component Patterns updated: hero documented as the card-less signature, ChartPanel as container-less, footer as colored rows, "no emoji" rule recorded.

---
title: Wiki Log
type: log
created: 2026-04-18
updated: 2026-04-18
tags: [log, wiki]
---

# Wiki Log

Chronological record of wiki activity. Append-only.

## [2026-04-18] init | Wiki structure created

Created LLM Wiki structure based on LLM Wiki pattern:

- Created `docs/wiki/` directory with entities/, concepts/, guides/
- Created [[WIKI_SCHEMA|schema]] with maintenance instructions
- Created [[index]] as content catalog
- Created this log for activity tracking

## [2026-04-18] create | Entity pages

Created initial entity pages from existing docs:

- [[Connection]] - from architecture.md
- [[CacheManager]] - from architecture.md + CACHING_STRATEGY.md
- [[PositionInfo]] - from data-model.md
- [[SettingsStore]] - from theme-guide.md
- [[PnLStore]] - from data-model.md references

## [2026-04-18] create | Concept pages

Created initial concept pages:

- [[Caching Strategy]] - from CACHING_STRATEGY.md, CACHING_SUMMARY.md
- [[Theming]] - from theme-guide.md
- [[Connection Lifecycle]] - from architecture.md
- [[Position Architecture]] - from data-model.md
- [[Skeleton Loading]] - from theme-guide.md, loading-states.md

## [2026-04-18] create | Guide pages

Migrated guide pages:

- [[ast-grep]] - from ast-grep-cheatsheet.md
- [[Number Formatting]] - from number-formatting.md
- [[Loading States]] - from loading-states.md
- [[Performance Optimizations]] - from perf-optimizations.md

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

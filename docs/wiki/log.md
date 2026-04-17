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

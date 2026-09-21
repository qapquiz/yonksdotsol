---
title: LastUpdatedStamp
type: entity
location: src/components/positions/LastUpdatedStamp.tsx
created: 2026-09-21
updated: 2026-09-21
tags: [component, positions, freshness]
related:
  - Refresh Lifecycle
  - usePositionsPage
---

# LastUpdatedStamp

Quiet data-freshness caption under the portfolio summary: `Updated H:MM AM/PM`
or `Updating…`, tap to refresh.

## Location

`src/components/positions/LastUpdatedStamp.tsx`

## Responsibilities

- Renders the absolute local time of the last successful portfolio load
- Shows `Updating…` and disables the tap target while a non-silent load runs
- Tapping triggers the shared pull-to-refresh handler (30s cooldown applies)
- Renders nothing while `lastUpdatedAt` is null (no data yet / wallet switched)

## Design Notes

- Purely props-driven — no internal timer, repaints only when data lands
- Time formatting lives in `formatUpdateTime` (`src/utils/positions/formatters.ts`),
  built manually rather than via `toLocaleTimeString` so Node (tests) and
  Hermes (device) produce identical output
- Shows only in the data branch of `PositionsList`, not skeleton/empty states

## See Also

- [[Refresh Lifecycle]] — triggers, cooldown, freshness contract
- [[usePositionsPage]] — source of `lastUpdatedAt`

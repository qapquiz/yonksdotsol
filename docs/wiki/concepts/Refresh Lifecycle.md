---
title: Refresh Lifecycle
type: concept
created: 2026-09-21
updated: 2026-09-21
tags: [data-fetching, positions, freshness]
related:
  - usePositionsPage
  - LastUpdatedStamp
  - Caching Strategy
  - Loading States
---

# Refresh Lifecycle

How portfolio data stays current: every path that (re)loads positions, how they
share one throttle, and how freshness is surfaced in the UI.

## Overview

All loads funnel through one pipeline call ([[usePositionsPage]] →
`pipeline.loadPortfolio`) and one shared 30s cooldown. Refreshes are either
**non-silent** (user-visible: skeleton or spinner) or **silent** (data updates
in place). Every successful load stamps `lastUpdatedAt` (epoch ms), which the
[[LastUpdatedStamp]] caption renders as an absolute time — the UI is
event-driven: the stamp only repaints when data actually lands.

## Triggers

| Trigger                                   | Mode       | Notes                                                               |
| ----------------------------------------- | ---------- | ------------------------------------------------------------------- |
| Wallet connect / change                   | non-silent | Clears `lastUpdatedAt` first, full skeleton                         |
| Pull-to-refresh                           | non-silent | `RefreshControl` spinner; Observe source `pull`                     |
| Stamp tap                                 | non-silent | Same handler as pull, shares the cooldown                           |
| 60s foreground interval                   | silent     | Fires only when `AppState` is active; source `auto`                 |
| Foreground return (`background → active`) | silent     | Immediate, so data isn't a full cadence stale after background time |

All silent/non-silent refresh paths share the 30s cooldown
(`lastRefreshRef`), which throttles stamp taps and quick
background/foreground flaps alike. A silent refresh invalidates the wallet's
cache, keeps current data on screen, and logs `positions.refreshed` with its
source; success state application itself is shared (`applyPortfolioResult`:
result, loading off, fresh `lastUpdatedAt`, token-data-ready signal).

## Why polling, not push

A load blends three sources: DLMM positions over Solana RPC (subscribable),
token prices over a REST API, and PnL over the DLMM Data API (both
request/response only). Two of three sources cannot push, so on-chain
subscriptions alone would still need a poll for fresh prices and PnL — the
interval-plus-cooldown design is the deliberate trade-off. See
[[Connection Lifecycle]] for the RPC transport and [[Caching Strategy]] for
what invalidation covers.

## Freshness surfacing

`lastUpdatedAt` semantics:

- Set on every successful load; `null` until first success and on wallet
  change/disconnect (a `null` hides the stamp)
- Rendered by [[LastUpdatedStamp]] as `Updated H:MM AM/PM` — absolute time, no
  aging tick; shows `Updating…` while a non-silent load is in flight
- Dev mock: fixed at module-load time and refresh is a no-op (mock data is
  static for the session)

Requests only mutate state on success — a failed refresh leaves the prior data
and its pre-failure timestamp in place, so the caption never claims freshness
it doesn't have.

## See Also

- [[usePositionsPage]] — owns all triggers and state
- [[LastUpdatedStamp]] — renders the freshness caption
- [[Caching Strategy]] — cache invalidation around each load
- [[Loading States]] — skeleton vs empty vs data rendering

---
title: Loading States
type: guide
created: 2026-04-18
updated: 2026-06-25
tags: [ui, loading, state]
related:
  - Skeleton Loading
  - Theming
---

# Loading States

Guide to skeleton, empty, and data state patterns in `PositionsList`.

> **Forward-looking note.** The ubiquitous language defines the loading model as
> four states — **Skeleton**, **Empty state**, **Error state**, **Data** — plus a
> non-blocking **Stale state** that overlays Data. Only the first three are
> implemented today; a load failure currently leaves the skeleton up indefinitely.
> **Error state** and **Stale state** are the target of plan 010. This guide
> documents the code as it exists now; it will grow the two new states when 010
> lands.

## Three States (current)

### 1. Skeleton (First Load)

Shown until the wallet is ready, token prices have resolved, and the first fetch
completes:

```typescript
const showSkeleton = !walletReady || !tokenDataReady || (positions.length === 0 && loading)
```

The `tokenDataReady` gate is intentional: positions can resolve before token
prices do, and rendering the list in that window produces a blank frame
(`PositionCard` falls back to `$0.00` but the `LegendList` mounts empty).
Waiting for `tokenDataReady` avoids that flash.

### 2. Empty (No Positions)

Shown after the wallet is ready, the fetch is complete, and there are zero
positions:

```typescript
const showEmpty = walletReady && !loading && positions.length === 0
```

### 3. Data (Positions Loaded)

Normal rendering with `LegendList` (from `@legendapp/list`):

```typescript
<LegendList data={listData} renderItem={renderItem} ListHeaderComponent={listHeader} recycleItems ... />
```

## Key Pattern: walletReady

`walletReady` comes from `useWalletLifecycle`, not a local state. It flips to
`true` once the wallet provider resolves — either an account address is
available, or the resolution timeout elapses with no wallet:

```typescript
// In the screen:
const { walletReady, walletAddress, ... } = useWalletLifecycle()
const pageData = usePositionsPage(walletAddress, walletReady)
// ...
;<PositionsList walletReady={pageData.walletReady} ... />
```

This prevents the empty-state → skeleton → data flash caused by the wallet
session loading asynchronously. Without it, the wallet starts unresolved,
triggering the empty path before the real fetch begins.

## See Also

- [[Skeleton Loading]] — Visual design rules
- [[Theming]] — Token colors for skeletons
- `UBIQUITOUS_LANGUAGE.md` (View & Display) — canonical definitions of
  Skeleton, Empty state, Error state, Stale state

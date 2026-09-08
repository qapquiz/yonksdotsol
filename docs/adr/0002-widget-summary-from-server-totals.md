# Widget summary numeration comes from server totals

The Android widget's portfolio summary (and any future consumer that needs
only aggregates) reads the server-aggregated `total` from the DLMM Data API
`/portfolio/open` endpoint via the in-repo client
(`src/services/dlmmApi.ts`), not from the on-chain pipeline and not from
client-side aggregation. The **in-app** portfolio summary keeps its
client-side aggregation (`computePoolPnLSummary`) because it already needs
per-position data for the cards.

This capability exists because the widget previously ran the entire pipeline
(SDK scan + per-mint RPC prices + N per-pool PnL calls) in a headless task to
produce 7 numbers the server already computes. It was first built as a
metcomet library feature (plan 005) and is now owned in-repo (plan 013);
plan 006 was superseded before landing.

## Considered Options

- **Full pipeline in the widget (previous)** — rejected: slow headless
  refreshes, RPC-dependent, N+M HTTP/RPC calls for 7 numbers.
- **metcomet helper (plan 005/006)** — superseded: a cross-repo release
  cycle for one call, for an API that is now officially documented.
- **Server totals for widget, client aggregation in-app (chosen).**
- **Server totals everywhere** — rejected for now: the in-app summary shares
  its fetch with the position cards; switching it saves no calls (same
  conclusion as the Pass 2 note on plan 006).

## Consequences

- Two summary numeration paths exist **deliberately**: in-app =
  position-value-weighted, net cost basis (deposits − withdrawals);
  widget = server totals + cross-page rollups (pool-value-weighted
  fees/TVL) with deposited derived as **value − uPnL** from the same
  server snapshot. The server's per-pool `totalDepositSol` is gross and
  double-counts redeposits after a withdrawal — on a real wallet it read
  14.16 SOL deposited vs the in-app net of 4.58 SOL, so the gross rollup
  was removed from the client and the widget derives the net basis instead
  (same fallback semantic as `computePoolPnLSummary`). The two deposited
  figures can still differ slightly (event history vs derived basis);
  PnL semantics are unchanged (ADR 0001).
- The widget data path has **no RPC, SDK, or Helius dependency** — it works
  whenever the DLMM Data API is reachable.
- The owned client replaces `metcomet` for this app; its error semantics
  (typed `DlmmApiError`, no silent nulls) are the app's own contract.

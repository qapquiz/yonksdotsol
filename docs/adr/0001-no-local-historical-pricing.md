# Derive value and PnL from live-spot prices, not local historical fetches

The app derives every monetary value from **live-spot** token prices (via the Token service, with SOL priced through the wrapped-SOL mint). It does **not** fetch historical prices locally — no OHLCV fetcher, no Pyth benchmarks, no local historical-SOL lookup. Historical-SOL PnL, when required, comes from metcomet's server-aggregated `/portfolio` endpoints, not from client-side historical computation.

This capability has been built and removed **twice**: a `PriceService` with OHLCV + Pyth fetchers (deleted as fully orphaned in Plan 002), and a proposed Helius-based true-SOL-numeraire PnL (rejected in the Pass 2 audit). Each time it duplicated work the server already does and would have introduced a second PnL definition that disagrees with Meteora's own displayed numbers. Recording it so the recurring "add a value-over-time chart" or "compute real-SOL PnL locally" instinct starts here instead of being re-derived.

## Considered Options

- **Local historical fetching (OHLCV/Pyth) — rejected.** Redundant with metcomet's server aggregates; adds a Helius key and per-position SOL-pool handling. Deleted in Plan 002.
- **Helius-based true-SOL-numeraire PnL — rejected (Pass 2).** The server already returns historical-SOL PnL in `/portfolio/open`; local computation would diverge for debatable benefit.
- **Live-spot only (chosen).** Value = current token price × amount; SOL-denominated PnL comes from metcomet.

## Consequences

- The `Price service` term is removed from the ubiquitous language; **Data services** exposes **TokenService** only.
- **Scope of this decision is PnL and value computation.** Historical price data for _display_ is a separate concern — a future read-only price chart (e.g. the planned in-card price-movement chart, Plan 009) may fetch OHLCV for rendering only, and that is not in tension with this decision.

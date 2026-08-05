# R1 — Discovery data sources (DexScreener / GeckoTerminal / Meteora API)

Resolves #6. Part of map #5.

## TL;DR recommendation

**GeckoTerminal as the primary discovery source** — it alone covers everything the
discovery layer needs. **DexScreener** is a strong complement for per-pair lookup/enrichment.
**Meteora's own REST API could not be reached** (hosts resolve, every common path 404s) —
inconclusive; not needed for discovery, revisit only if first-party data is wanted.

## What each source provides

### GeckoTerminal (PRIMARY) ✅

- `GET /api/v2/networks/solana/dexes/{dex}/pools?page=N` — **lists pools for a DEX,
  paginated (20/page)**. This is the one capability neither DexScreener nor a naive SDK read
  gives you cheaply.
- DEX ids confirmed: `meteora` (DLMM), `meteora-dbc`, `meteora-damm-v2`.
  → Directly answers D2's data side: each Meteora type is a separate, filterable feed.
- Pool object includes everything the discovery layer + safety filter need:
  - `volume_usd.h24` → 24h volume (safety filter: ≥ $500K)
  - `market_cap_usd` → base token market cap (safety filter: ≥ $5M)
  - `reserve_in_usd` → pool TVL
  - `base_token_price_usd`, `price_change_percentage`, `transactions`, `pool_created_at`,
    `address`, `name`
- Also: `/networks/solana/pools/{address}` (detail), `/networks/solana/tokens/{addr}/pools`
  (all pools for a token).
- Rate limit: documented **30 req/min free (no key)**; higher with a key. A browse feed fits
  with aggressive caching (GT sends `cache-control: max-age=30`).
- ToS: free, attribution requested.

### DexScreener (COMPLEMENT)

- **No "list pools by DEX" endpoint** — search is token/pair based
  (`/latest/dex/search?q=`, `/tokens/{addr}`, `/pairs/{chain}/{addr}`). Weaker for
  "browse all Meteora pools" (GT's strength).
- Per-pair detail is rich: `marketCap`, `fdv`, `liquidity.usd`, `volume.h24`, `txns`,
  `priceUsd`, `priceChange`, `pairCreatedAt`. `dexId: "meteora"` is a first-class filter.
- Rate limit: documented **300 req/min**, no key. Generous.
- ToS: free, attribution requested, no bulk scraping.

### Meteora's own REST API ❓ INCONCLUSIVE

- Hosts `dlmm-api.meteora.ag` and `api.meteora.ag` **resolve and return HTTP 404** on every
  path tried: `/pairs`, `/pairs?page=1`, `/pairs/all`, `/pair/list`, `/v1/pairs`, `/pools`,
  `/launches`, `/docs`, `/swagger`, `/`. No JSON served.
- Conclusion: a public REST API at these hosts is **not reachable at discoverable paths**
  (moved, deprecated, or behind docs we don't have).
- **Could NOT confirm whether it exposes bin/depth data** (relevant to R2).
- Action: if first-party data is wanted, consult `docs.meteora.ag` for the current API;
  otherwise skip — GT covers discovery completely.

## Privacy check ✅

All three are queried with **public pool data only** — no user wallet/address is ever sent.
The app's own wallet is never part of these calls; depth/positions come from the on-chain SDK
locally (per the data posture). Consistent with the standing privacy preference.

## Bottom line

Discovery is fully solvable read-only, free, **today — GeckoTerminal alone**. The $5M
market-cap / $500K-volume safety defaults map directly onto GT's `market_cap_usd` and
`volume_usd.h24`. No backend, no indexer, no wallet disclosure. DexScreener is the
fallback/second-opinion for lookups; Meteora's API is a non-blocking unknown.

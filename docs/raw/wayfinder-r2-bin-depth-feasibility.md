# R2 — Can `@meteora-ag/dlmm` read full bin depth for ANY pool on-chain?

Resolves #7. Part of map #5.

## TL;DR

**Yes — feasible, and clean.** The SDK's `DLMM` class creates a pool by pair address (no user
position required) and exposes bin-range readers returning `BinLiquidity[]` (per-bin price +
reserves) plus `getActiveBin()`. Bin data is fetched via **BinArray accounts**, not one RPC per
bin, so a per-pool depth view is a handful of `getMultipleAccounts`-style calls — fast enough on
a mobile tap. **Meteora's REST API does NOT expose bins** (only pool stats), so bin depth must
come on-chain — exactly the self-sourced moat the data posture wanted. **D4 unblocks.**

## The on-chain read path (confirmed from the SDK .d.ts)

Class `DLMM` (`node_modules/@meteora-ag/dlmm/dist/index.d.ts`, line 13455):

- `static create(connection, pairAddress: PublicKey): Promise<DLMM>` — pool by address, no
  position needed. ✅
- `getActiveBin(): Promise<BinLiquidity>` — the active bin. ✅
- `getBinsAroundActiveBin(left, right): Promise<{ activeBin, bins: BinLiquidity[] }>` — N bins
  either side of active. ✅ (ideal default for the depth chart)
- `getBinsBetweenMinAndMaxPrice(min, max): Promise<{ bins }>` — bins in a price range. ✅
- `getBinsBetweenLowerAndUpperBound(lo, hi): Promise<{ bins }>` — bins between two ids. ✅

`BinLiquidity` (line 12424) carries per-bin price + X/Y reserves; `BinLiquidity.fromBin` /
`enumerateBins` (12452 / 12727) convert raw on-chain `Bin` → displayable liquidity — the app
**already uses this machinery** in `src/utils/positions/computePositionViewData.ts` for
per-position bins. For the pool depth view we reuse the same renderer, fed by
`getBinsAroundActiveBin` instead of a position's range.

## RPC cost

- Bins live in **BinArray** accounts (~70 bins each); the SDK fetches BinArrays, not one account
  per bin. A typical depth view (e.g. ±35 bins around active) ≈ 1–2 BinArray reads =
  `getMultipleAccounts`. Light. The SDK's own comment (line 13340) flags the heavy case only for
  _whole-pair_ `getProgramAccounts` sweeps (e.g. enumerating all positions) — which the depth view
  does NOT do.
- Token prices for USD liquidity per bin: available from the Meteora REST API
  (`token_x.price`/`token_y.price`) or the app's existing price feed — no extra on-chain cost.

## What this unblocks / informs

- **D4 (depth analytics) is unblocked.** Bin distribution + active bin + bin step are trivially
  available; per-bin reserves/price for the bar chart; position overlay = filter the bin list to
  the connected wallet's position range (already computed today).
- **"Per-bin fee tiers" caveat for D4:** fees are _pool-level_ (`base_fee_pct` + `dynamic_fee_pct`),
  not genuinely per-bin for standard DLMM pools — so that candidate analytic is weaker than it
  sounded; the depth view's "fee" is one pool-wide number.

## Meteora REST API — does it expose depth? NO

`https://dlmm.datapi.meteora.ag/pools/{addr}/bins` → 404. The REST API serves only **pool stats**
(TVL, volume, fees, APR, bin*step, token market cap — very rich), not the bin distribution. So
bin depth stays on-chain. *(This also corrects R1: the Meteora API host is `dlmm.datapi.meteora.ag`,
and it's a strong first-party **discovery** source — see the R1 correction comment + new ticket D5.)\_

## Privacy

Reading bins by pair address sends only the public pool address over RPC — no wallet involved.
Depth browsing needs **no wallet connection at all** (only the position overlay does, and that's
the user's own connected wallet). Consistent with the privacy preference.

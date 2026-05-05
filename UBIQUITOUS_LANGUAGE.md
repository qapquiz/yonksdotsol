# Ubiquitous Language

## Positions & Liquidity

| Term                 | Definition                                                                                                                | Aliases to avoid                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Position**         | A single liquidity provision in a DLMM pool, identified by position address, with token amounts spread across a bin range | LB position, liquidity position, stake |
| **Position address** | The on-chain public key identifying a specific **Position**                                                               | position key, position pubkey          |
| **Pool**             | A Meteora DLMM liquidity pool (an `LbPair` on-chain) identified by pair address                                           | pair, LB pair, market                  |
| **Pair address**     | The on-chain public key of a **Pool**                                                                                     | pool address, lbPair address           |
| **Bin**              | A discrete price bucket within a DLMM **Pool**; each pool contains many bins at incrementally higher prices               | tick, step, price level                |
| **Bin range**        | The lower–upper **Bin** IDs spanning a **Position**'s liquidity concentration                                             | range, price range, tick range         |
| **Active bin**       | The **Bin** at the current market price of the **Pool**                                                                   | active bin ID, current price level     |
| **In range**         | A **Position** whose **Bin range** includes the **Active bin** — the position is earning fees                             | active, inTicks                        |
| **Out of range**     | A **Position** whose **Bin range** does not include the **Active bin** — the position is not earning fees                 | inactive, out of range                 |

## Token & Price

| Term              | Definition                                                                                  | Aliases to avoid            |
| ----------------- | ------------------------------------------------------------------------------------------- | --------------------------- |
| **Token X**       | The base token of a **Pool** pair (e.g., SOL)                                               | tokenA, base token          |
| **Token Y**       | The quote token of a **Pool** pair (e.g., USDC)                                             | tokenB, quote token         |
| **Token info**    | Metadata for a token: mint address, symbol, decimals, icon URL, and current price per token | token data, token metadata  |
| **Mint**          | The on-chain token address; used as the key to look up **Token info**                       | mint address, token address |
| **Current price** | The exchange rate expressed as Token X price denominated in Token Y                         | spot price, market price    |

## Fees & PnL

| Term                  | Definition                                                                                                                     | Aliases to avoid                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| **Unrealized fees**   | Trading fees accrued to a **Position** that have not yet been claimed, expressed in both Token X and Token Y                   | pending fees, unclaimed fees, earned fees |
| **Claimed fees**      | Trading fees that have already been withdrawn from a **Position**                                                              | withdrawn fees, collected fees            |
| **PnL**               | Profit and loss — the net financial result of holding a **Position**, including unrealized value changes                       | profit, gain/loss, return                 |
| **uPnL**              | Unrealized PnL — current value minus initial deposit, not yet realized by closing the **Position**                             | unrealized return, floating PnL           |
| **Pool PnL summary**  | Aggregated PnL data for all **Positions** a wallet holds in a single **Pool**                                                  | pool PnL, aggregated PnL                  |
| **Portfolio summary** | Aggregated PnL across all pools for a given wallet: total PnL in SOL, total value, total initial deposit, total unclaimed fees | portfolio PnL, total PnL                  |

## Wallet & Connection

| Term                 | Definition                                                                                                                   | Aliases to avoid                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| **Wallet**           | The user's Solana wallet, providing an address for signing in and querying positions                                         | account, signer, keypair          |
| **Wallet address**   | The base58-encoded public key of the connected **Wallet**                                                                    | public key, address               |
| **Wallet lifecycle** | The connect/disconnect flow and the async resolution of whether a wallet address is available                                | wallet flow, auth flow            |
| **Wallet ready**     | The state where the wallet provider has resolved (either an address is available, or the timeout has elapsed with no wallet) | wallet resolved, wallet connected |
| **Connecting**       | The transient state while a sign-in request is in progress                                                                   | signing in, linking               |

## Caching & Data

| Term                   | Definition                                                                                                                 | Aliases to avoid                 |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **Cache manager**      | The in-memory singleton that stores fetched data with TTL expiration and deduplicates concurrent requests for the same key | cache, store, memo               |
| **Cache invalidation** | Removing entries matching a pattern (e.g., all data for a given wallet address) when data is stale                         | cache clear, cache bust, purge   |
| **Data services**      | The facade layer (`createDataServices()`) providing typed `TokenService` and `PriceService` with built-in caching          | service layer, API layer         |
| **Token service**      | The component of **Data services** responsible for fetching and caching **Token info** by **Mint**                         | token fetcher, token provider    |
| **Price service**      | The component of **Data services** responsible for fetching and caching historical prices (OHLCV and Pyth benchmarks)      | price fetcher, price provider    |
| **TTL**                | Time-to-live — how long a cached entry remains valid before it is considered expired and re-fetched                        | expiry, lifetime, cache duration |

## View & Display

| Term                    | Definition                                                                                                                                                        | Aliases to avoid                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Position view model** | The display-ready object (`PositionViewModel`) computed from raw position data, token info, and PnL data — contains formatted strings and the **Liquidity shape** | VM, display model, computed position |
| **Liquidity shape**     | The chart data for a **Position**'s bin distribution: bin IDs, price per bin, and token amounts per bin in SOL terms                                              | chart data, bin data, shape          |
| **Skeleton**            | A placeholder UI shown while data is loading, using animated shimmer blocks                                                                                       | loading state, placeholder, spinner  |
| **Empty state**         | The UI shown when a wallet has no positions (distinct from a loading skeleton)                                                                                    | no-data state                        |

## Relationships

- A **Wallet** can hold zero or more **Positions**, each in a **Pool**.
- A **Position** spans a **Bin range** within a **Pool** and is either **In range** or **Out of range**.
- Each **Pool** has one **Active bin** and contains many **Bins**.
- A **Position** has **Token X** and **Token Y** amounts, **Unrealized fees**, and **Claimed fees**.
- A **Pool PnL summary** aggregates across all **Positions** in a single **Pool** for one **Wallet**.
- A **Portfolio summary** is the union of all **Pool PnL summaries** for one **Wallet**.
- **Token info** is looked up by **Mint** through the **Token service**, backed by the **Cache manager**.
- **Price service** provides historical **Prices** through the **Cache manager** with configured **TTL**.
- When a **Wallet** disconnects, all **Cache entries** tagged with that **Wallet address** are removed via **Cache invalidation**.
- The **Position view model** is a pure transformation of raw position + **Token info** + **PnL** data — no side effects.
- When **Wallet** is not yet **Ready**, the UI shows a **Skeleton**. When **Ready** with no positions, it shows an **Empty state**.

## Example dialogue

> **Dev:** "When the **Wallet** disconnects, should I clear every **Cache entry** for that **Wallet address**, or only the **Pool PnL summary**?"
> **Domain expert:** "Invalidate everything — **PnL data**, but also **Token info** prices change frequently. Use `invalidatePattern` with the wallet suffix so any key ending in `:${walletAddress}` gets evicted."
>
> **Dev:** "Got it. And when computing the **Position view model**, how do I determine if a **Position** is **In range**?"
> **Domain expert:** "Compare the **Active bin** ID against the **Position**'s **Bin range**. If `activeId >= lowerBinId && activeId <= upperBinId`, the **Position** is **In range** and currently earning **Unrealized fees**."
>
> **Dev:** "Makes sense. So a **Portfolio summary** is just the aggregate of all **Pool PnL summaries** across every **Pool** the **Wallet** has a **Position** in?"
> **Domain expert:** "Exactly — total PnL in SOL, weighted PnL percent, total value, total initial deposit, and total **Unrealized fees**. Each **Position** contributes proportionally."
>
> **Dev:** "And what if the **Token service** hasn't returned **Token info** yet when the **Position view model** is computed?"
> **Domain expert:** "The **Position view model** falls back to `$0.00` for values and `"-"` for fee displays. Meanwhile, show a **Skeleton** — never a blank card. Once **Token info** resolves, the view model recomputes and the real data appears."
>
> **Dev:** "One more thing — what's the difference between **Unrealized fees** and **Claimed fees** on a **Position**?"
> **Domain expert:** "**Unrealized fees** are still sitting in the **Position**, accruing from trades within the **Bin range**. **Claimed fees** have already been withdrawn. Both are expressed as Token X / Token Y pairs and also converted to USD using the **Token service** prices."

## Flagged ambiguities

- **"Pool address" vs "pair address"**: The codebase uses `pairAddress` as the variable name in `DLMM.getAllLbPairPositionsByUser` and as the Map key, but the UI **Position card** refers to "pool" colloquially. **Canonical term: pair address** in code (matching the DLMM `LbPair` naming), **Pool** in user-facing text. When speaking about data keys, use **pair address**; when speaking about the concept, use **Pool**.
- **"PnL" vs "uPnL"**: `PositionPnLData` from `metcomet` contains `pnlSol` (which is unrealized PnL) and `pnlSolPctChange`. The codebase displays these as "uPnL" in formatters like `formatUPNLDisplay`. **Canonical: use uPnL** when specifically referring to unrealized, use **PnL** for the general concept or aggregated amounts.
- **"Token data" vs "Token info"**: The caching layer uses cache keys prefixed `token_data:`, but the TypeScript interface is `TokenInfo`. **Canonical: Token info** for the concept and type, "token data" only in opaque cache key strings.
- **"Wallet ready" vs "wallet resolved"**: The code has both `walletReady` (from `useWalletLifecycle`) and `walletResolved` (passed through in `PositionsPageResult`). They represent the same concept. **Canonical: wallet ready** — it's the term used in the lifecycle hook. `walletResolved` should be considered an alias.

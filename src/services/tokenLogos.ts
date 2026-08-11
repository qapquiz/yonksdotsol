// ─── Token logos (Jupiter token API) ─────────────────────────────────
//
// Resolves a token's icon URL + symbol from Jupiter's public token API
// (`https://lite-api.jup.ag/tokens/v2`). Used by the Explore discovery list,
// where fetching a DAS `getAsset` per mint against the app RPC would consume
// (metered) Helius quota for nothing but a logo.
//
// Jupiter exposes no bulk "all tokens" list on the lite API today — only a
// per-mint `search`. So this is still one request per mint, but against a fast
// free CDN rather than the app's RPC, and each result is cached per-mint with
// a long TTL (logos are stable). Parsing is defensive: every field is
// optional and a fuzzy miss resolves to `null` rather than throwing.
//
// The free lite API is rate-limited per IP (Cloudflare-fronted, no quota
// headers), so batched lookups are run through a bounded-concurrency pool and
// a 429 is retried once after backoff (honoring `Retry-After` when sent).

import { CacheManager } from '../utils/cache/CacheManager'
import { CACHE_TTL } from '../config/cache'
import type { TokenLogo } from '../tokens'

const JUPITER_TOKEN_API = 'https://lite-api.jup.ag/tokens/v2'

/** Max concurrent Jupiter requests per batch (keeps bursts off the rate floor). */
export const MAX_CONCURRENCY = 8
/** Extra attempts after the first on a 429 (so up to 2 total tries). */
export const MAX_RETRIES = 1
/** Cap on a single backoff wait so a large `Retry-After` can't stall the UI. */
const MAX_BACKOFF_MS = 5_000

/** Permissive shape of one Jupiter `search` result. Every field is optional. */
interface RawJupiterToken {
  id?: string
  symbol?: string
  icon?: string
}

function getTokenLogoKey(mint: string): string {
  return `token_logo:${mint}`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Backoff (ms) to wait before retrying a 429. Honors the server's
 * `Retry-After` (seconds) when present, capped at `MAX_BACKOFF_MS`; otherwise
 * a short jittered delay so a throttled burst doesn't all retry in lockstep.
 */
function backoffMs(response: Response): number {
  const retryAfter = response.headers.get('retry-after')
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(seconds * 1000, MAX_BACKOFF_MS)
    }
  }
  return 300 + Math.random() * 500 // 300–800ms
}

/**
 * Run `worker` over `items` with at most `limit` in flight at once, returning
 * a settled result per item (same shape as `Promise.allSettled`). Preserves
 * input order in the result array.
 */
async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length)
  let cursor = 0

  const run = async (): Promise<void> => {
    while (cursor < items.length) {
      const index = cursor++
      try {
        results[index] = { status: 'fulfilled', value: await worker(items[index]) }
      } catch (reason) {
        results[index] = { status: 'rejected', reason }
      }
    }
  }

  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, run)
  await Promise.all(runners)
  return results
}

/**
 * Pure fetch — looks up a single mint's logo via Jupiter's token search.
 *
 * Jupiter `search` is fuzzy (it matches on symbol/name too), so the entry
 * whose `id === mint` is matched exactly; a fuzzy miss (or empty result)
 * resolves to `null`. Best-effort: callers should tolerate `null`.
 *
 * On a 429 it backs off (honoring `Retry-After`) and retries up to
 * `MAX_RETRIES` times before surfacing the error.
 */
export async function fetchTokenLogo(mint: string): Promise<TokenLogo | null> {
  const url = `${JUPITER_TOKEN_API}/search?query=${encodeURIComponent(mint)}`

  let response: Response | null = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    })
    if (response.status !== 429) break
    if (attempt < MAX_RETRIES) await sleep(backoffMs(response))
  }

  if (!response || !response.ok) {
    throw new Error(`Token logo HTTP error: ${response?.status ?? 'unknown'}`)
  }

  const payload: unknown = await response.json()
  const list = Array.isArray(payload) ? (payload as RawJupiterToken[]) : []
  const hit = list.find((token) => token?.id === mint) ?? null
  if (!hit) return null

  return {
    mint,
    symbol: hit.symbol ?? null,
    cdn_url: hit.icon ?? null,
  }
}

/**
 * Batch-resolve token logos for a set of mints, cached per-mint via
 * CacheManager (dedup + long TTL). Error-isolated and null-tolerant: a failed
 * or missing mint is simply absent from the returned map. Dedupe the input set
 * first so repeated mints (SOL/USDC repeat across pools) hit the cache once,
 * and cap concurrency so a large batch can't trip the rate floor.
 *
 * The optional `cache` is for tests; production uses the singleton.
 */
export async function getTokenLogos(
  mints: string[],
  cache: CacheManager = CacheManager.getInstance(),
): Promise<Map<string, TokenLogo>> {
  const unique = Array.from(new Set(mints.filter(Boolean)))

  const settled = await runWithConcurrency(unique, MAX_CONCURRENCY, (mint) =>
    cache
      .getOrFetch(getTokenLogoKey(mint), () => fetchTokenLogo(mint), CACHE_TTL.TOKEN_LOGO)
      .then((logo) => [mint, logo] as const),
  )

  const map = new Map<string, TokenLogo>()
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      const [mint, logo] = result.value
      if (logo) map.set(mint, logo)
    }
  }
  return map
}

// ─── Explore / discovery pool list (page-1 top-volume DLMM pools) ─────
//
// Fetches the top DLMM pools by 24h volume from the Meteora DLMM REST API
// — the same host ohlcv.ts / poolMeta.ts already call
// (`https://dlmm.datapi.meteora.ag`), so we follow their fetch pattern: a
// pure, uncached, fully-testable function. The Explore route composes this
// fetch with a client-side safety filter (applySafetyDefaults) before
// rendering.
//
// The Meteora `/pools` payload shape is not a stable documented contract, so
// parsing is defensive — every field is optional and may arrive as a string
// or a number; missing/invalid values resolve to `null` rather than
// throwing. Only `address` is required to keep a row.
//
// NOTE: pagination beyond page 1 is a future task — this service fetches a
// single page (default page 1) today.

const METEORA_DLMM_API = 'https://dlmm.datapi.meteora.ag'

/** Safety default: minimum Token X market cap (USD) to surface a pool. */
export const MIN_MARKET_CAP_USD = 5_000_000
/** Safety default: minimum 24h swap volume (USD) to surface a pool. */
export const MIN_VOLUME_24H_USD = 500_000

export type PoolOrderBy = 'volume_usd_24h' | 'tvl' | 'apr'
export type OrderDir = 'asc' | 'desc'

export interface ExplorePool {
  /** Pair address — the on-chain key of the Pool. */
  address: string
  /** Human pool name, e.g. "SOL - USDC" */
  name: string | null
  /** Base token (Token X) symbol */
  symbolX: string | null
  /** Quote token (Token Y) symbol */
  symbolY: string | null
  /** Base token (Token X) mint address — used to resolve its icon */
  mintX: string | null
  /** Quote token (Token Y) mint address — used to resolve its icon */
  mintY: string | null
  /** Bin step (price increment basis points) */
  binStep: number | null
  /** Total value locked in USD */
  tvl: number | null
  /** 24h swap volume in USD */
  volume24h: number | null
  /** Annualized percentage rate */
  apr: number | null
  /** Base token (Token X) market cap in USD */
  marketCapX: number | null
  /** Spot price of 1 base token in quote terms */
  currentPrice: number | null
}

export interface ExplorePoolsPage {
  /** Total pool count reported by the API (across all pages). */
  total: number
  /** Total page count reported by the API. */
  pages: number
  currentPage: number
  pageSize: number
  pools: ExplorePool[]
}

/** Permissive shape of the raw `/pools` response. Every field is optional. */
interface RawPoolsResponse {
  total?: number | string
  pages?: number | string
  current_page?: number | string
  page_size?: number | string
  data?: RawPool[]
}

interface RawPool {
  address?: string
  name?: string
  tvl?: number | string
  apr?: number | string
  current_price?: number | string
  /** Flat 24h volume fallback used by some API revisions. */
  volume_24h?: number | string
  /** Nested volume object keyed by window ("24h", "7d", "30d", ...). */
  volume?: Record<string, number | string | undefined>
  pool_config?: { bin_step?: number | string }
  token_x?: RawTokenMeta
  token_y?: RawTokenMeta
  mint_x?: RawTokenMeta
  mint_y?: RawTokenMeta
}

interface RawTokenMeta {
  address?: string
  symbol?: string
  market_cap?: number | string
}

/** Coerce a string|number into a finite number, or null if missing/invalid. */
function num(value: number | string | null | undefined): number | null {
  if (value == null) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Normalize one raw pool into a display-ready object. Drops rows with no address. */
function projectPool(raw: RawPool): ExplorePool | null {
  const address = raw.address
  if (!address) return null

  const baseMeta = raw.token_x ?? raw.mint_x ?? null
  const quoteMeta = raw.token_y ?? raw.mint_y ?? null

  // 24h volume lives under the `volume` object; fall back to a flat key.
  const volume24h = num(raw.volume?.['24h']) ?? num(raw.volume_24h) ?? null

  return {
    address,
    name: raw.name ?? null,
    symbolX: baseMeta?.symbol ?? null,
    symbolY: quoteMeta?.symbol ?? null,
    mintX: baseMeta?.address ?? null,
    mintY: quoteMeta?.address ?? null,
    binStep: num(raw.pool_config?.bin_step),
    tvl: num(raw.tvl),
    apr: num(raw.apr),
    volume24h,
    marketCapX: num(baseMeta?.market_cap),
    currentPrice: num(raw.current_price),
  }
}

/**
 * Pure fetch — calls the Meteora DLMM REST `/pools` endpoint and parses one
 * page. No caching, no singleton. Best-effort: callers should tolerate
 * failure and an empty page.
 *
 * NOTE: only page 1 is fetched today; pagination is a future task.
 */
export async function fetchTopPools(options?: {
  orderBy?: PoolOrderBy
  orderDir?: OrderDir
  page?: number
  pageSize?: number
}): Promise<ExplorePoolsPage> {
  const orderBy = options?.orderBy ?? 'volume_usd_24h'
  const orderDir = options?.orderDir ?? 'desc'
  const page = options?.page ?? 1
  const pageSize = options?.pageSize

  const url = `${METEORA_DLMM_API}/pools?order_by=${orderBy}&order_dir=${orderDir}&page=${page}${
    pageSize ? `&page_size=${pageSize}` : ''
  }`

  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Explore pools HTTP error: ${response.status}`)
  }

  const payload: RawPoolsResponse = await response.json()
  const raw = Array.isArray(payload?.data) ? payload.data : []

  const pools: ExplorePool[] = []
  for (const item of raw) {
    const projected = projectPool(item)
    if (projected) pools.push(projected)
  }

  return {
    total: num(payload?.total) ?? pools.length,
    pages: num(payload?.pages) ?? 1,
    currentPage: num(payload?.current_page) ?? page,
    pageSize: num(payload?.page_size) ?? pools.length,
    pools,
  }
}

/**
 * Apply the Explore safety defaults client-side: keep only pools whose Token X
 * market cap and 24h volume clear the floors. Pure and order-preserving —
 * since the API already sorts by volume desc, the filtered list stays sorted.
 *
 * Thin/illiquid pools that occasionally spike in volume but lack the market
 * cap to be a safe discovery surface are excluded here.
 */
export function applySafetyDefaults(
  pools: ExplorePool[],
  thresholds: { minMarketCapUsd?: number; minVolume24hUsd?: number } = {},
): ExplorePool[] {
  const minMarketCap = thresholds.minMarketCapUsd ?? MIN_MARKET_CAP_USD
  const minVolume = thresholds.minVolume24hUsd ?? MIN_VOLUME_24H_USD
  return pools.filter((p) => (p.marketCapX ?? 0) >= minMarketCap && (p.volume24h ?? 0) >= minVolume)
}

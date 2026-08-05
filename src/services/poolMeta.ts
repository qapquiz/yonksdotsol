// ─── Pool metadata (REST enrichment for the Pool Depth view) ─────────
//
// Fetches a single pool's descriptive + market stats from the Meteora DLMM
// REST API. This is the same host the OHLCV service already calls
// (`https://dlmm.datapi.meteora.ag`), so we follow its fetch pattern: a pure,
// uncached, fully-testable function. The Pool Depth route composes this
// best-effort data with on-chain bin depth (from the DLMM SDK).
//
// The Meteora `/pools/{address}` payload shape is not documented as a stable
// contract, so the parser is deliberately defensive: it tolerates values
// arriving as either strings or numbers, tolerates a single-object OR a
// list/wrapped-list response, and treats every field as optional. Unknown
// keys resolve to `null` rather than throwing.

const METEORA_DLMM_API = 'https://dlmm.datapi.meteora.ag'

export interface PoolMeta {
  pairAddress: string
  /** Human pool name, e.g. "CATE - SOL" */
  name: string | null
  /** Base token (Token X) symbol */
  symbolX: string | null
  /** Quote token (Token Y) symbol */
  symbolY: string | null
  /** Bin step (price increment basis points) */
  binStep: number | null
  /** Base fee as a percentage (e.g. 1.0 = 1%) */
  baseFeePct: number | null
  /** Dynamic fee as a percentage (e.g. 0.25 = 0.25%) */
  dynamicFeePct: number | null
  /** Total value locked in USD */
  tvl: number | null
  /** Annualized percentage rate */
  apr: number | null
  /** 24h swap volume in USD */
  volume24h: number | null
  /** Base token (Token X) market cap in USD */
  marketCapX: number | null
  /** Spot price of 1 base token in quote terms */
  currentPrice: number | null
}

/**
 * Permissive shape of the raw `/pools/{address}` response. Every field is
 * optional and may arrive as a string or number; nested token objects use
 * either `mint_x`/`mint_y` or `base_token`/`quote_token`/`token_x`/`token_y`.
 */
interface RawPoolResponse {
  address?: string
  name?: string
  bin_step?: number | string
  base_fee_percentage?: number | string
  base_fee_pct?: number | string
  dynamic_fee_percentage?: number | string
  dynamic_fee_pct?: number | string
  fee_rate?: number | string
  tvl?: number | string
  apr?: number | string
  apr_30d?: number | string
  apr_7d?: number | string
  volume_24h?: number | string
  current_price?: number | string
  mint_x?: RawTokenMeta
  mint_y?: RawTokenMeta
  base_token?: RawTokenMeta
  quote_token?: RawTokenMeta
  token_x?: RawTokenMeta
  token_y?: RawTokenMeta
}

interface RawTokenMeta {
  address?: string
  symbol?: string
  decimals?: number | string
  market_cap?: number | string
}

/** Coerce a string|number into a finite number, or null if missing/invalid. */
function num(value: number | string | null | undefined): number | null {
  if (value == null) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Normalize the raw payload into a single pool object. Tolerates the response
 * being a bare object, an array (take the first element), or wrapped as
 * `{ data: [...] }` / `{ data: {...} }`.
 */
function unwrapPool(raw: unknown): RawPoolResponse | null {
  if (raw == null) return null
  if (Array.isArray(raw)) {
    return (raw[0] as RawPoolResponse) ?? null
  }
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    const wrapped = obj.data
    if (Array.isArray(wrapped)) {
      return (wrapped[0] as RawPoolResponse) ?? null
    }
    if (wrapped && typeof wrapped === 'object') {
      return wrapped as RawPoolResponse
    }
    return obj as unknown as RawPoolResponse
  }
  return null
}

/**
 * Pure fetch — calls the Meteora DLMM REST pool endpoint and parses metadata.
 * No caching, no singleton. Best-effort: callers should tolerate failure.
 */
export async function fetchPoolMeta(pairAddress: string): Promise<PoolMeta> {
  const url = `${METEORA_DLMM_API}/pools/${pairAddress}`

  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Pool meta HTTP error: ${response.status}`)
  }

  const payload: unknown = await response.json()
  const pool = unwrapPool(payload)

  const baseMeta = pool?.mint_x ?? pool?.token_x ?? pool?.base_token ?? null
  const quoteMeta = pool?.mint_y ?? pool?.token_y ?? pool?.quote_token ?? null

  // APR has several historical keys; prefer the 30d annualized figure.
  const apr = num(pool?.apr_30d) ?? num(pool?.apr_7d) ?? num(pool?.apr) ?? null

  // Dynamic fee has no canonical key; fall back through the known variants.
  const dynamicFeePct = num(pool?.dynamic_fee_percentage) ?? num(pool?.dynamic_fee_pct) ?? num(pool?.fee_rate) ?? null

  return {
    pairAddress,
    name: pool?.name ?? null,
    symbolX: baseMeta?.symbol ?? null,
    symbolY: quoteMeta?.symbol ?? null,
    binStep: num(pool?.bin_step),
    baseFeePct: num(pool?.base_fee_percentage) ?? num(pool?.base_fee_pct) ?? null,
    dynamicFeePct,
    tvl: num(pool?.tvl),
    apr,
    volume24h: num(pool?.volume_24h),
    marketCapX: num(baseMeta?.market_cap),
    currentPrice: num(pool?.current_price),
  }
}

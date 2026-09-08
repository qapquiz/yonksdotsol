// ─── Meteora DLMM Data API client (owned, in-repo) ───────────────────
//
// Thin typed transport over the officially documented DLMM Data API:
//   https://docs.meteora.ag/api-reference/dlmm/pools/pool.md
//   https://docs.meteora.ag/api-reference/dlmm/portfolio/...
//   https://docs.meteora.ag/api-reference/dlmm/positions/...
//
// Replaces the `metcomet` dependency: same endpoints, owned wire types,
// explicit errors (no silent nulls). Wire types are transcribed from the
// documented response schema; money values arrive as strings and are
// converted to numbers only at the rollup layer, never in the transport.

import { parseFeePerTvl24h } from '../utils/positions/formatters'

export const DLMM_API_BASE = 'https://dlmm.datapi.meteora.ag'

// ─── Errors ──────────────────────────────────────────────────────────

/** Raised on network/HTTP failure or incomplete pagination. Callers catch and degrade. */
export class DlmmApiError extends Error {
  readonly status: number | null

  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = 'DlmmApiError'
    this.status = status
  }
}

async function requestJson<T>(url: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
  } catch (cause) {
    throw new DlmmApiError(`DLMM API network error: ${String(cause)}`)
  }
  if (!response.ok) {
    throw new DlmmApiError(`DLMM API ${response.status} for ${url}`, response.status)
  }
  return (await response.json()) as T
}

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGES = 10

interface PaginatedResponse {
  hasNext: boolean
}

/** A result is complete only when the server says there are no more pages. */
async function fetchPages<T extends PaginatedResponse>(
  fetchPage: (page: number) => Promise<T>,
  startPage = 1,
): Promise<T[]> {
  const pages: T[] = []
  for (let offset = 0; offset < MAX_PAGES; offset++) {
    const response = await fetchPage(startPage + offset)
    pages.push(response)
    if (!response.hasNext) return pages
  }

  throw new DlmmApiError(`DLMM API pagination exceeded ${MAX_PAGES} pages; result is incomplete`)
}

// ─── Wire types: GET /positions/{pool}/pnl ───────────────────────────

export interface TokenAmount {
  amount: string
  amountSol: string | null
  usd: string
}

export interface TotalUsd {
  usd: string
  sol: string | null
}

export interface TokenPairWithTotal {
  tokenX: TokenAmount
  tokenY: TokenAmount
  total: TotalUsd
}

export interface UnrealizedPnL {
  balances: number
  balancesSol: string | null
  balanceTokenX: TokenAmount
  balanceTokenY: TokenAmount
  unclaimedFeeTokenX: TokenAmount
  unclaimedFeeTokenY: TokenAmount
  unclaimedRewardTokenX: TokenAmount
  unclaimedRewardTokenY: TokenAmount
}

export interface PositionPnLData {
  positionAddress: string
  minPrice: string
  maxPrice: string
  lowerBinId: number
  upperBinId: number
  feePerTvl24h: string
  isClosed: boolean
  pnlUsd: string
  pnlPctChange: string
  pnlSol: number | null
  pnlSolPctChange: number | null
  allTimeDeposits: TokenPairWithTotal
  allTimeWithdrawals: TokenPairWithTotal
  allTimeFees: TokenPairWithTotal
  unrealizedPnl: UnrealizedPnL | null
  isOutOfRange: boolean | null
  poolActiveBinId: number | null
  poolActivePrice: string | null
  createdAt: number | null
  closedAt: number | null
}

export interface PositionPnLResponse {
  positions: PositionPnLData[]
  tokenX: string | null
  tokenY: string | null
  tokenXPrice: string
  tokenYPrice: string
  rewardTokenX: string | null
  rewardTokenY: string | null
  rewardTokenXPrice: string
  rewardTokenYPrice: string
  solPrice: string | null
  totalCount: number
  page: number
  pageSize: number
  hasNext: boolean
}

export interface FetchPositionPnLParams {
  poolAddress: string
  user: string
  status?: 'open' | 'closed' | 'all'
  page?: number
  page_size?: number
}

export async function fetchPositionPnL(params: FetchPositionPnLParams): Promise<PositionPnLResponse> {
  const url = new URL(`${DLMM_API_BASE}/positions/${params.poolAddress}/pnl`)
  url.searchParams.set('user', params.user)
  if (params.status) url.searchParams.set('status', params.status)
  if (params.page) url.searchParams.set('page', String(params.page))
  if (params.page_size) url.searchParams.set('page_size', String(params.page_size))
  return requestJson<PositionPnLResponse>(url.toString())
}

/** Fetch all position PnL pages for a pool, or reject without returning partial data. */
export async function fetchAllPositionPnL(params: Omit<FetchPositionPnLParams, 'page'>): Promise<PositionPnLData[]> {
  const pages = await fetchPages((page) =>
    fetchPositionPnL({ ...params, page, page_size: params.page_size ?? DEFAULT_PAGE_SIZE }),
  )
  return pages.flatMap((response) => response.positions ?? [])
}

// ─── Wire types: GET /portfolio/open ─────────────────────────────────

export interface TotalMetrics {
  balances: string
  balancesSol: string | null
  unclaimedFees: string
  unclaimedFeesSol: string | null
  pnl: string
  pnlPctChange: string
  pnlSol: string | null
  pnlSolPctChange: string | null
}

export interface PoolOpenPortfolioItem {
  poolAddress: string
  binStep: number
  baseFee: number
  tokenXMint: string
  tokenYMint: string
  tokenXIcon: string
  tokenYIcon: string
  tokenX: string
  tokenY: string
  rewardX: string
  rewardY: string
  balances: string
  balancesSol: string | null
  unclaimedFees: string
  unclaimedFeesSol: string | null
  feePerTvl24h: string
  pnl: string
  pnlPctChange: string
  pnlSol: string | null
  pnlSolPctChange: string | null
  totalDeposit: string
  totalDepositSol: string | null
  openPositionCount: number
  listPositions: string[]
  positionsOutOfRange: string[]
  outOfRange: boolean | null
  poolPrice: number | null
  poolStateUpdatedAtSlot: number | null
  poolStateUpdatedAtBlockTime: number | null
}

export interface OpenPortfolioResponse {
  pools: PoolOpenPortfolioItem[]
  total: TotalMetrics
  solPrice: string | null
  totalCount: number
  page: number
  pageSize: number
  hasNext: boolean
}

export interface FetchOpenPortfolioParams {
  user: string
  page?: number
  page_size?: number
}

export async function fetchOpenPortfolio(params: FetchOpenPortfolioParams): Promise<OpenPortfolioResponse> {
  const url = new URL(`${DLMM_API_BASE}/portfolio/open`)
  url.searchParams.set('user', params.user)
  if (params.page) url.searchParams.set('page', String(params.page))
  if (params.page_size) url.searchParams.set('page_size', String(params.page_size))
  return requestJson<OpenPortfolioResponse>(url.toString())
}

// ─── Aggregated open-portfolio summary (paginated walker) ────────────

export interface OpenPortfolioSummary {
  /** All pools across every page, in server order */
  pools: PoolOpenPortfolioItem[]
  /** Server-aggregated totals (USD + SOL numeraires), string-typed as sent */
  total: TotalMetrics
  /** SOL price the server used for SOL conversions, when available */
  solPrice: number | null
  /** Server-reported total open position count (last page wins; server keeps it global) */
  totalCount: number
  /** Σ `positionsOutOfRange.length` across pages */
  outOfRangeCount: number
  /** Pool-value-weighted 24h fees/TVL, daily ratio (0.0131 = 1.31%); null when no weight */
  feesTvl24h: number | null
}

/**
 * Walk every page of /portfolio/open and roll up the two fields the
 * server doesn't aggregate (out-of-range count, weighted fees/TVL). One
 * call replaces the widget's full on-chain pipeline.
 * Throws DlmmApiError on transport failure or if the page limit is reached
 * before the result is complete.
 *
 * Note: per-pool `totalDepositSol` is deliberately NOT rolled up — it is
 * gross historical deposits and double-counts redeposits after a
 * withdrawal. Consumers wanting a deposited figure must derive a net cost
 * basis (value − uPnL), as the widget does.
 */
export async function fetchOpenPortfolioSummary(params: FetchOpenPortfolioParams): Promise<OpenPortfolioSummary> {
  const page_size = params.page_size ?? DEFAULT_PAGE_SIZE
  const pages = await fetchPages((page) => fetchOpenPortfolio({ ...params, page, page_size }), params.page)

  let pools: PoolOpenPortfolioItem[] = []
  let total: TotalMetrics | null = null
  let solPrice: number | null = null
  let totalCount = 0
  for (const response of pages) {
    pools = pools.concat(response.pools ?? [])
    total = response.total
    solPrice = response.solPrice != null ? Number(response.solPrice) : null
    totalCount = response.totalCount
  }

  if (!total) {
    throw new DlmmApiError('DLMM API /portfolio/open returned no data')
  }

  let outOfRangeCount = 0
  let weightedFeeSum = 0
  let feeWeightSum = 0

  for (const pool of pools) {
    outOfRangeCount += pool.positionsOutOfRange?.length ?? 0

    const ratio = parseFeePerTvl24h(pool.feePerTvl24h)
    const weight = pool.balancesSol ? parseFloat(pool.balancesSol) : 0
    if (ratio != null && weight > 0) {
      weightedFeeSum += ratio * weight
      feeWeightSum += weight
    }
  }

  return {
    pools,
    total,
    solPrice,
    totalCount,
    outOfRangeCount,
    feesTvl24h: feeWeightSum > 0 ? weightedFeeSum / feeWeightSum : null,
  }
}

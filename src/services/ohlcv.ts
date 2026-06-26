// ─── OHLCV (display-only price history) ──────────────────────────────
//
// Fetches candle data from the Meteora DLMM REST API for the in-card price
// chart. The series is denominated in the pool's native Token X / Token Y
// ratio — the same units as a bin's `pricePerToken` — so the price line and
// a Position's Range low/high price share one axis with no conversion.
//
// DISPLAY-ONLY. This never feeds PnL or value computation; see ADR 0001
// (its carve-out pre-sanctions a read-only price-movement chart).

export type OhlcvTimeframe = '5m' | '30m' | '1h' | '2h' | '4h' | '12h'

export interface OhlcvCandle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface OhlcvSeries {
  pairAddress: string
  timeframe: string
  candles: OhlcvCandle[]
}

const METEORA_DLMM_API = 'https://dlmm.datapi.meteora.ag'

/** Default resolution for the in-card price chart — ~40h of 4h candles. */
export const DEFAULT_OHLCV_TIMEFRAME: OhlcvTimeframe = '4h'

/** Shape of the raw `/pools/{address}/ohlcv` response. Values may arrive as strings. */
interface OhlcvApiResponse {
  start_time?: number
  end_time?: number
  timeframe?: string
  data?: {
    timestamp: number
    timestamp_str?: string
    open: number | string
    high: number | string
    low: number | string
    close: number | string
    volume: number | string
  }[]
}

/**
 * Pure fetch — calls the Meteora DLMM REST OHLCV endpoint and parses candles.
 * No caching, no singleton. Fully testable.
 */
export async function fetchPoolOhlcv(
  pairAddress: string,
  timeframe: OhlcvTimeframe = DEFAULT_OHLCV_TIMEFRAME,
): Promise<OhlcvSeries> {
  const url = `${METEORA_DLMM_API}/pools/${pairAddress}/ohlcv?timeframe=${timeframe}`

  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`OHLCV HTTP error: ${response.status}`)
  }

  const payload: OhlcvApiResponse = await response.json()
  const raw = Array.isArray(payload?.data) ? payload.data : []

  const candles: OhlcvCandle[] = raw.map((c) => ({
    timestamp: Number(c.timestamp),
    open: Number(c.open),
    high: Number(c.high),
    low: Number(c.low),
    close: Number(c.close),
    volume: Number(c.volume),
  }))

  return { pairAddress, timeframe, candles }
}

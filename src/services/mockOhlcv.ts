// ─── Mock OHLCV (display-only, dev builds + web preview) ─────────────
//
// Deterministic synthetic candles for the mock pools, so the in-card price
// chart renders in devMock mode (web preview / EXPO_PUBLIC_DEV_MOCK=1)
// without wallet, RPC, or network. Produces the same OhlcvSeries shape as
// the real fetcher; seeded by pairAddress+timeframe and cached, so
// re-mounts and re-renders always see identical candles.
//
// Prices walk within ±~8.5% of the pool's base price — the same anchor the
// mock liquidity shape uses for its bin range, so candles and the range
// band share one plausible axis.
//
// DISPLAY-ONLY. Never feeds PnL or value computation; see ADR 0001.

import { DEFAULT_OHLCV_TIMEFRAME, type OhlcvCandle, type OhlcvSeries, type OhlcvTimeframe } from './ohlcv'
import { MOCK_POOL_BASE_PRICES } from './mockPortfolio'

export const TIMEFRAME_SECONDS: Record<OhlcvTimeframe, number> = {
  '5m': 300,
  '30m': 1800,
  '1h': 3600,
  '2h': 7200,
  '4h': 14400,
  '12h': 43200,
  '24h': 86400,
}

const CANDLE_COUNT = 20
/** Fixed anchor — keeps generated series byte-stable across reloads (stable screenshots/audits). */
const ANCHOR_TIMESTAMP = 1_700_000_000
/** Walk bounds — mirrors the ±~9.6% bin range of the mock liquidity shape. */
const WALK_FRACTION = 0.085
const STEP_FRACTION = 0.018

const seriesCache = new Map<string, OhlcvSeries>()

/** FNV-1a — stable string hash for seeding. */
function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32 — tiny deterministic PRNG. */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Deterministic mock OHLCV for a mock pool. Returns null for addresses the
 * mock portfolio doesn't know (caller keeps its empty state).
 */
export function getMockOhlcv(
  pairAddress: string,
  timeframe: OhlcvTimeframe = DEFAULT_OHLCV_TIMEFRAME,
): OhlcvSeries | null {
  const basePrice = MOCK_POOL_BASE_PRICES[pairAddress]
  if (!Number.isFinite(basePrice) || basePrice <= 0) return null

  const key = `${pairAddress}:${timeframe}`
  const cached = seriesCache.get(key)
  if (cached) return cached

  const rand = mulberry32(hashString(key))
  const step = basePrice * STEP_FRACTION
  const ceiling = basePrice * (1 + WALK_FRACTION)
  const floor = basePrice * (1 - WALK_FRACTION)

  let price = basePrice * (1 + (rand() - 0.5) * 0.03)
  const seconds = TIMEFRAME_SECONDS[timeframe]
  const candles: OhlcvCandle[] = []

  for (let i = 0; i < CANDLE_COUNT; i++) {
    const open = price
    // Slight upward bias so the series trends through the band over its length.
    const close = Math.min(ceiling, Math.max(floor, open + (rand() - 0.45) * 2 * step))
    const high = Math.max(open, close) + rand() * step * 0.4
    const low = Math.min(open, close) - rand() * step * 0.4
    candles.push({
      timestamp: ANCHOR_TIMESTAMP + i * seconds,
      open,
      high,
      low,
      close,
      volume: Math.round(50_000 + rand() * 250_000),
    })
    price = close
  }

  const series: OhlcvSeries = { pairAddress, timeframe, candles }
  seriesCache.set(key, series)
  return series
}

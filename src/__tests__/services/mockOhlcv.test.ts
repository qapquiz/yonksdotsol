import { describe, expect, it } from 'vitest'
import { DEFAULT_OHLCV_TIMEFRAME, type OhlcvCandle } from '../../services/ohlcv'
import { getMockOhlcv } from '../../services/mockOhlcv'
import { MOCK_POOL_BASE_PRICES } from '../../services/mockPortfolio'

const mockPools = Object.entries(MOCK_POOL_BASE_PRICES)

function candlesOf(pairAddress: string): OhlcvCandle[] {
  const series = getMockOhlcv(pairAddress)
  if (!series) throw new Error(`expected series for ${pairAddress}`)
  return series.candles
}

describe('getMockOhlcv', () => {
  it('returns a series for every mock pool', () => {
    expect(mockPools.length).toBeGreaterThan(0)
    for (const [pairAddress] of mockPools) {
      const series = getMockOhlcv(pairAddress)
      expect(series?.pairAddress).toBe(pairAddress)
      expect(series?.timeframe).toBe(DEFAULT_OHLCV_TIMEFRAME)
      expect(series?.candles).toHaveLength(20)
    }
  })

  it('returns null for unknown addresses', () => {
    expect(getMockOhlcv('NotAMockPool111111111111111111111111111111111')).toBeNull()
  })

  it('caches per pair+timeframe (stable identity across calls)', () => {
    for (const [pairAddress] of mockPools) {
      expect(getMockOhlcv(pairAddress)).toBe(getMockOhlcv(pairAddress))
    }
  })

  it('keeps OHLC invariants and walk continuity', () => {
    for (const [pairAddress] of mockPools) {
      const candles = candlesOf(pairAddress)
      for (const c of candles) {
        expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close))
        expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close))
        expect(c.volume).toBeGreaterThan(0)
      }
      for (let i = 1; i < candles.length; i++) {
        expect(candles[i].open).toBe(candles[i - 1].close)
      }
    }
  })

  it('stays within ±10% of the pool base price', () => {
    for (const [pairAddress, basePrice] of mockPools) {
      for (const c of candlesOf(pairAddress)) {
        for (const p of [c.open, c.high, c.low, c.close]) {
          expect(p).toBeGreaterThan(basePrice * 0.9)
          expect(p).toBeLessThan(basePrice * 1.1)
        }
      }
    }
  })

  it('spaces timestamps by the timeframe', () => {
    for (const [pairAddress] of mockPools) {
      const candles = candlesOf(pairAddress)
      for (let i = 1; i < candles.length; i++) {
        expect(candles[i].timestamp - candles[i - 1].timestamp).toBe(4 * 3600)
      }
    }
  })

  it('mixes up and down candles', () => {
    for (const [pairAddress] of mockPools) {
      const candles = candlesOf(pairAddress)
      expect(candles.some((c) => c.close >= c.open)).toBe(true)
      expect(candles.some((c) => c.close < c.open)).toBe(true)
    }
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { fetchPoolOhlcv, DEFAULT_OHLCV_TIMEFRAME } from '../../services/ohlcv'

describe('fetchPoolOhlcv', () => {
  const mockOhlcvResponse = {
    start_time: 1781568000,
    end_time: 1782345600,
    timeframe: '4h',
    data: [
      { timestamp: 1781568000, open: 1.0003, high: 1.0007, low: 1.0003, close: 1.0007, volume: 39129.91 },
      { timestamp: 1581580800, open: '1.0007', high: '1.0010', low: '1.0005', close: '1.0006', volume: '18325.6' },
    ],
  }

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOhlcvResponse),
      }),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('parses candles into numeric fields', async () => {
    const series = await fetchPoolOhlcv('PoolAddr123')

    expect(series.pairAddress).toBe('PoolAddr123')
    expect(series.timeframe).toBe('4h')
    expect(series.candles).toHaveLength(2)
    expect(series.candles[0]).toEqual({
      timestamp: 1781568000,
      open: 1.0003,
      high: 1.0007,
      low: 1.0003,
      close: 1.0007,
      volume: 39129.91,
    })
  })

  it('coerces string-valued fields to numbers', async () => {
    const series = await fetchPoolOhlcv('PoolAddr123')

    expect(typeof series.candles[1].close).toBe('number')
    expect(series.candles[1].close).toBeCloseTo(1.0006, 5)
    expect(typeof series.candles[1].volume).toBe('number')
  })

  it('requests the given timeframe', async () => {
    await fetchPoolOhlcv('PoolAddr123', '1h')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('timeframe=1h'),
      expect.objectContaining({ headers: { 'Content-Type': 'application/json' } }),
    )
  })

  it('uses the default timeframe when omitted', async () => {
    await fetchPoolOhlcv('PoolAddr123')

    expect(DEFAULT_OHLCV_TIMEFRAME).toBe('4h')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(`timeframe=${DEFAULT_OHLCV_TIMEFRAME}`),
      expect.anything(),
    )
  })

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, json: () => Promise.resolve({}) }))

    await expect(fetchPoolOhlcv('PoolAddr123')).rejects.toThrow('OHLCV HTTP error: 429')
  })

  it('returns empty candles when data array is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }))

    const series = await fetchPoolOhlcv('PoolAddr123')

    expect(series.candles).toEqual([])
  })
})

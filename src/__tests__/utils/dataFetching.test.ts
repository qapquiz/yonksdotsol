import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── tokens/index.ts: fetchTokenFromRpc ─────────────────────────────────────

describe('fetchTokenFromRpc', () => {
  const mockRpcResponse = {
    result: {
      id: 'So11111111111111111111111111111111111111112',
      token_info: {
        symbol: 'SOL',
        supply: 1_000_000_000,
        decimals: 9,
        price_info: {
          price_per_token: 150.5,
          currency: 'USD',
        },
      },
      content: {
        links: {
          image: 'https://example.com/sol.png',
        },
      },
    },
  }

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRpcResponse),
      }),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches and parses token data from RPC', async () => {
    const { fetchTokenFromRpc } = await import('../../tokens')

    const result = await fetchTokenFromRpc('So11111111111111111111111111111111111111112')

    expect(result).toEqual({
      mint: 'So11111111111111111111111111111111111111112',
      symbol: 'SOL',
      supply: 1_000_000_000,
      decimals: 9,
      cdn_url: 'https://example.com/sol.png',
      price_info: {
        price_per_token: 150.5,
        currency: 'USD',
      },
    })
  })

  it('sends POST request to RPC with correct params', async () => {
    const { fetchTokenFromRpc } = await import('../../tokens')

    await fetchTokenFromRpc('test-mint')

    expect(fetch).toHaveBeenCalledWith(expect.any(String), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('"getAsset"'),
    })

    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(call[1].body)
    expect(body.params.id).toBe('test-mint')
  })

  it('throws on HTTP error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      }),
    )

    const { fetchTokenFromRpc } = await import('../../tokens')

    await expect(fetchTokenFromRpc('test-mint')).rejects.toThrow('HTTP error: 429')
  })

  it('throws on RPC error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            error: { message: 'Asset not found' },
          }),
      }),
    )

    const { fetchTokenFromRpc } = await import('../../tokens')

    await expect(fetchTokenFromRpc('bad-mint')).rejects.toThrow('Asset not found')
  })
})

// ─── meteora-ohlcv.ts: fetchOHLCVPriceAtTimestamp ───────────────────────────

describe('fetchOHLCVPriceAtTimestamp', () => {
  const mockOHLCVResponse = {
    data: [
      { timestamp: 1000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
      { timestamp: 1200, open: 102, high: 108, low: 100, close: 106, volume: 1200 },
      { timestamp: 1400, open: 106, high: 110, low: 104, close: 108, volume: 800 },
    ],
    start_time: 800,
    end_time: 1600,
    timeframe: '5m',
  }

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOHLCVResponse),
      }),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns closest candle price', async () => {
    const { fetchOHLCVPriceAtTimestamp } = await import('../../utils/positions/meteora-ohlcv')

    // Target 1150 is closest to 1200 (candle index 1, close=106)
    const price = await fetchOHLCVPriceAtTimestamp('pool1', 1150)
    expect(price).toBe(106)
  })

  it('returns null when all candles are too far away', async () => {
    const { fetchOHLCVPriceAtTimestamp } = await import('../../utils/positions/meteora-ohlcv')

    // Target 5000 is >1800s from all candles
    const price = await fetchOHLCVPriceAtTimestamp('pool1', 5000)
    expect(price).toBeNull()
  })

  it('returns null on HTTP error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    )

    const { fetchOHLCVPriceAtTimestamp } = await import('../../utils/positions/meteora-ohlcv')

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const price = await fetchOHLCVPriceAtTimestamp('pool1', 1000)
    expect(price).toBeNull()
    consoleError.mockRestore()
  })

  it('returns null for empty data array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [], start_time: 0, end_time: 0, timeframe: '5m' }),
      }),
    )

    const { fetchOHLCVPriceAtTimestamp } = await import('../../utils/positions/meteora-ohlcv')

    const price = await fetchOHLCVPriceAtTimestamp('pool1', 1000)
    expect(price).toBeNull()
  })
})

// ─── pyth-benchmarks.ts: fetchHistoricalSOLPriceFromApi ─────────────────────

describe('fetchHistoricalSOLPriceFromApi', () => {
  const mockPythResponse = {
    parsed: [
      {
        price: {
          price: 150500000,
          conf: 100000,
          expo: -6,
          publish_time: 1700000000,
        },
        id: 'ef0d6b0e69a93ef5dbfefe14c3a43147ea85f3d7706c74b38f8dbb8a8f492100',
      },
    ],
  }

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPythResponse),
      }),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches and computes SOL price from Pyth API', async () => {
    const { fetchHistoricalSOLPriceFromApi } = await import('../../utils/positions/pyth-benchmarks')

    // 150500000 * 10^-6 = 150.5
    const price = await fetchHistoricalSOLPriceFromApi(1700000000)
    expect(price).toBe(150.5)
  })

  it('returns null on HTTP error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      }),
    )

    const { fetchHistoricalSOLPriceFromApi } = await import('../../utils/positions/pyth-benchmarks')

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const price = await fetchHistoricalSOLPriceFromApi(1700000000)
    expect(price).toBeNull()
    consoleError.mockRestore()
  })

  it('returns null when parsed array is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ parsed: [] }),
      }),
    )

    const { fetchHistoricalSOLPriceFromApi } = await import('../../utils/positions/pyth-benchmarks')

    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const price = await fetchHistoricalSOLPriceFromApi(1700000000)
    expect(price).toBeNull()
    consoleWarn.mockRestore()
  })

  it('handles negative exponent correctly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            parsed: [
              {
                price: { price: 50000, conf: 100, expo: -2, publish_time: 1700000000 },
                id: 'test',
              },
            ],
          }),
      }),
    )

    const { fetchHistoricalSOLPriceFromApi } = await import('../../utils/positions/pyth-benchmarks')

    const price = await fetchHistoricalSOLPriceFromApi(1700000000)
    expect(price).toBe(500) // 50000 * 10^-2
  })
})

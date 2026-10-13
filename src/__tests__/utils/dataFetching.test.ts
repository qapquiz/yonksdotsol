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

    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call[0]).toBeTypeOf('string')
    expect(call[1].method).toBe('POST')
    expect(call[1].headers).toEqual({ 'Content-Type': 'application/json' })
    expect(call[1].body).toBeTypeOf('string')

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

describe('fetchTokensFromRpc (batch)', () => {
  function batchAsset(id: string, symbol: string) {
    return {
      id,
      token_info: {
        symbol,
        supply: 1_000_000,
        decimals: 9,
        price_info: { price_per_token: 1, currency: 'USD' },
      },
      content: { links: { image: `https://example.com/${symbol}.png` } },
    }
  }

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends one getAssetBatch POST with all mints and parses aligned results', async () => {
    const { fetchTokensFromRpc } = await import('../../tokens')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: [batchAsset('MINT_A', 'AAA'), batchAsset('MINT_B', 'BBB')] }),
      }),
    )

    const result = await fetchTokensFromRpc(['MINT_A', 'MINT_B'])

    expect(fetch).toHaveBeenCalledTimes(1)
    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(call[1].body)
    expect(body.method).toBe('getAssetBatch')
    expect(body.params.ids).toEqual(['MINT_A', 'MINT_B'])
    expect(result.get('MINT_A')?.symbol).toBe('AAA')
    expect(result.get('MINT_B')?.symbol).toBe('BBB')
  })

  it('omits mints whose batch entry came back null', async () => {
    const { fetchTokensFromRpc } = await import('../../tokens')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: [batchAsset('MINT_A', 'AAA'), null] }),
      }),
    )

    const result = await fetchTokensFromRpc(['MINT_A', 'MINT_B'])

    expect(result.has('MINT_A')).toBe(true)
    expect(result.has('MINT_B')).toBe(false)
  })
})

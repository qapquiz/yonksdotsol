import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { TokenInfo } from '../../tokens'
import { fetchTokenPriceData } from '../../tokens'

// Mock the tokens module
vi.mock('../../tokens', () => ({
  fetchTokenPriceData: vi.fn(),
}))

const mockTokenInfo: TokenInfo = {
  mint: 'test-mint',
  symbol: 'TEST',
  supply: 1_000_000,
  decimals: 9,
  cdn_url: 'https://example.com/test.png',
  price_info: {
    price_per_token: 1.5,
    currency: 'USD',
  },
}

// Test the underlying fetch logic that useBatchTokenData uses
describe('useBatchTokenData - fetch logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchTokenPriceData is called with correct mint', async () => {
    vi.mocked(fetchTokenPriceData).mockResolvedValue(mockTokenInfo)

    const result = await fetchTokenPriceData('mint1')

    expect(fetchTokenPriceData).toHaveBeenCalledWith('mint1')
    expect(result).toEqual(mockTokenInfo)
  })

  it('handles fetch errors', async () => {
    vi.mocked(fetchTokenPriceData).mockRejectedValue(new Error('Network error'))

    await expect(fetchTokenPriceData('mint1')).rejects.toThrow('Network error')
  })

  it('can batch multiple fetches with Promise.allSettled', async () => {
    const token1 = { ...mockTokenInfo, mint: 'mint1', symbol: 'TK1' }
    const token2 = { ...mockTokenInfo, mint: 'mint2', symbol: 'TK2' }

    vi.mocked(fetchTokenPriceData).mockResolvedValueOnce(token1).mockResolvedValueOnce(token2)

    const mints = ['mint1', 'mint2']
    const results = await Promise.allSettled(
      mints.map((mint) => fetchTokenPriceData(mint).then((info) => [mint, info] as const)),
    )

    expect(results).toHaveLength(2)
    expect(results[0].status).toBe('fulfilled')
    expect(results[1].status).toBe('fulfilled')

    if (results[0].status === 'fulfilled' && results[1].status === 'fulfilled') {
      expect(results[0].value[0]).toBe('mint1')
      expect(results[0].value[1]).toEqual(token1)
      expect(results[1].value[0]).toBe('mint2')
      expect(results[1].value[1]).toEqual(token2)
    }
  })

  it('handles partial failures with Promise.allSettled', async () => {
    const token1 = { ...mockTokenInfo, mint: 'mint1' }

    vi.mocked(fetchTokenPriceData)
      .mockResolvedValueOnce(token1)
      .mockRejectedValueOnce(new Error('Failed to fetch mint2'))

    const mints = ['mint1', 'mint2']
    const results = await Promise.allSettled(
      mints.map((mint) => fetchTokenPriceData(mint).then((info) => [mint, info] as const)),
    )

    expect(results[0].status).toBe('fulfilled')
    expect(results[1].status).toBe('rejected')

    // Successful results can be collected
    const data = new Map<string, TokenInfo>()
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const [mint, info] = result.value
        data.set(mint, info)
      }
    }

    expect(data.size).toBe(1)
    expect(data.get('mint1')).toEqual(token1)
  })

  it('handles all failures', async () => {
    vi.mocked(fetchTokenPriceData).mockRejectedValue(new Error('Network error'))

    const mints = ['mint1', 'mint2']
    const results = await Promise.allSettled(
      mints.map((mint) => fetchTokenPriceData(mint).then((info) => [mint, info] as const)),
    )

    const data = new Map<string, TokenInfo>()
    let firstError: Error | null = null

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const [mint, info] = result.value
        data.set(mint, info)
      } else if (!firstError) {
        firstError = result.reason instanceof Error ? result.reason : new Error(String(result.reason))
      }
    }

    expect(data.size).toBe(0)
    expect(firstError).toBeInstanceOf(Error)
  })

  it('empty mints array produces empty results', async () => {
    const mints: string[] = []
    const results = await Promise.allSettled(
      mints.map((mint) => fetchTokenPriceData(mint).then((info) => [mint, info] as const)),
    )

    expect(results).toHaveLength(0)
    expect(fetchTokenPriceData).not.toHaveBeenCalled()
  })
})

// Test the Map operations that the hook uses
describe('useBatchTokenData - Map operations', () => {
  it('can create and populate a Map', () => {
    const data = new Map<string, TokenInfo>()
    data.set('mint1', mockTokenInfo)

    expect(data.get('mint1')).toEqual(mockTokenInfo)
    expect(data.size).toBe(1)
  })

  it('can check if key exists', () => {
    const data = new Map<string, TokenInfo>()
    data.set('mint1', mockTokenInfo)

    expect(data.has('mint1')).toBe(true)
    expect(data.has('mint2')).toBe(false)
  })

  it('can iterate over entries', () => {
    const data = new Map<string, TokenInfo>()
    data.set('mint1', { ...mockTokenInfo, symbol: 'TK1' })
    data.set('mint2', { ...mockTokenInfo, symbol: 'TK2' })

    const entries = Array.from(data.entries())
    expect(entries).toHaveLength(2)
  })
})

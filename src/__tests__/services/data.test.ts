import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { TokenInfo } from '../../tokens'
import { CacheManager } from '../../utils/cache/CacheManager'

import { fetchTokenFromRpc } from '../../tokens'
import { fetchPoolOhlcv } from '../../services/ohlcv'
import { createDataServices } from '../../services/data'

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

// Mock the pure fetch functions
vi.mock('../../tokens', () => ({
  fetchTokenFromRpc: vi.fn(),
}))

vi.mock('../../services/ohlcv', () => ({
  fetchPoolOhlcv: vi.fn(),
  DEFAULT_OHLCV_TIMEFRAME: '4h',
}))

// Mock env for tokens module
vi.mock('../../config/env', () => ({
  env: { rpcUrl: 'https://test.rpc', heliusApiKey: 'test-key' },
}))

describe('DataServices', () => {
  let freshCache: CacheManager

  beforeEach(() => {
    vi.clearAllMocks()
    freshCache = CacheManager.createFresh()
  })

  describe('TokenService', () => {
    it('fetches a single token price', async () => {
      vi.mocked(fetchTokenFromRpc).mockResolvedValue(mockTokenInfo)

      const services = createDataServices(freshCache)
      const result = await services.tokens.getPrice('test-mint')

      expect(result).toEqual(mockTokenInfo)
      expect(fetchTokenFromRpc).toHaveBeenCalledWith('test-mint')
    })

    it('caches single token price on second call', async () => {
      vi.mocked(fetchTokenFromRpc).mockResolvedValue(mockTokenInfo)

      const services = createDataServices(freshCache)
      await services.tokens.getPrice('test-mint')
      await services.tokens.getPrice('test-mint')

      expect(fetchTokenFromRpc).toHaveBeenCalledTimes(1)
    })

    it('batch-fetches multiple token prices', async () => {
      const token1 = { ...mockTokenInfo, mint: 'mint1', symbol: 'TK1' }
      const token2 = { ...mockTokenInfo, mint: 'mint2', symbol: 'TK2' }

      vi.mocked(fetchTokenFromRpc).mockResolvedValueOnce(token1).mockResolvedValueOnce(token2)

      const services = createDataServices(freshCache)
      const result = await services.tokens.getPrices(['mint1', 'mint2'])

      expect(result.size).toBe(2)
      expect(result.get('mint1')).toEqual(token1)
      expect(result.get('mint2')).toEqual(token2)
    })

    it('handles partial failures in batch fetch', async () => {
      const token1 = { ...mockTokenInfo, mint: 'mint1' }

      vi.mocked(fetchTokenFromRpc).mockResolvedValueOnce(token1).mockRejectedValueOnce(new Error('Failed'))

      const services = createDataServices(freshCache)
      const result = await services.tokens.getPrices(['mint1', 'mint2'])

      expect(result.size).toBe(1)
      expect(result.get('mint1')).toEqual(token1)
    })
  })

  describe('OhlcvService', () => {
    const mockSeries = {
      pairAddress: 'pool-1',
      timeframe: '4h',
      candles: [{ timestamp: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 }],
    }

    it('fetches OHLCV for a pool', async () => {
      vi.mocked(fetchPoolOhlcv).mockResolvedValue(mockSeries)

      const services = createDataServices(freshCache)
      const result = await services.ohlcv.getOhlcv('pool-1')

      expect(result).toEqual(mockSeries)
      expect(fetchPoolOhlcv).toHaveBeenCalledWith('pool-1', '4h')
    })

    it('caches OHLCV on second call (same pool + timeframe)', async () => {
      vi.mocked(fetchPoolOhlcv).mockResolvedValue(mockSeries)

      const services = createDataServices(freshCache)
      await services.ohlcv.getOhlcv('pool-1')
      await services.ohlcv.getOhlcv('pool-1')

      expect(fetchPoolOhlcv).toHaveBeenCalledTimes(1)
    })

    it('re-fetches for a different timeframe (distinct cache key)', async () => {
      vi.mocked(fetchPoolOhlcv).mockResolvedValue(mockSeries)

      const services = createDataServices(freshCache)
      await services.ohlcv.getOhlcv('pool-1', '4h')
      await services.ohlcv.getOhlcv('pool-1', '1h')

      expect(fetchPoolOhlcv).toHaveBeenCalledTimes(2)
      expect(fetchPoolOhlcv).toHaveBeenNthCalledWith(1, 'pool-1', '4h')
      expect(fetchPoolOhlcv).toHaveBeenNthCalledWith(2, 'pool-1', '1h')
    })

    it('shares a cached entry across pools only by key (different pool re-fetches)', async () => {
      vi.mocked(fetchPoolOhlcv).mockResolvedValue(mockSeries)

      const services = createDataServices(freshCache)
      await services.ohlcv.getOhlcv('pool-1')
      await services.ohlcv.getOhlcv('pool-2')

      expect(fetchPoolOhlcv).toHaveBeenCalledTimes(2)
    })
  })
})

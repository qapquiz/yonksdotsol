import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { TokenInfo } from '../../tokens'
import { CacheManager } from '../../utils/cache/CacheManager'

import { fetchTokenFromRpc } from '../../tokens'
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
})

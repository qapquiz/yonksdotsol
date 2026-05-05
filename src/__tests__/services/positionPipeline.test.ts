import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { PositionPnLData } from 'metcomet'
import { createPositionPipeline, type PositionPipeline } from '../../services/positionPipeline'
import { CacheManager } from '../../utils/cache/CacheManager'

// ─── Mocks ────────────────────────────────────────────────────────────

// Mock DLMM SDK
vi.mock('@meteora-ag/dlmm', () => ({
  default: {
    getAllLbPairPositionsByUser: vi.fn(),
  },
}))

// Mock @solana/web3.js PublicKey
vi.mock('@solana/web3.js', () => {
  class MockPublicKey {
    private value: string
    constructor(val: string) {
      this.value = val
    }
    toString() {
      return this.value
    }
    toBase58() {
      return this.value
    }
  }
  return { Connection: vi.fn(), PublicKey: MockPublicKey }
})

// Mock metcomet
vi.mock('metcomet', () => ({
  fetchPositionPnL: vi.fn(),
}))

// Mock token fetching
vi.mock('../../tokens', () => ({
  fetchTokenFromRpc: vi.fn(),
}))

// Mock env
vi.mock('../../config/env', () => ({
  env: { rpcUrl: 'https://test.rpc', heliusApiKey: 'test-helius-key' },
}))

// Mock config/cache
vi.mock('../../config/cache', () => ({
  CACHE_TTL: {
    UPNL_PER_POSITION: 15 * 60 * 1000,
    TOKEN_DATA: 60 * 1000,
    OHLCV_PRICE: 60 * 60 * 1000,
    PYTH_PRICE: 60 * 60 * 1000,
  },
}))

// Mock connection
vi.mock('../../config/connection', () => ({
  getSharedConnection: vi.fn(() => ({})),
}))

// ─── Test data ─────────────────────────────────────────────────────────

const MOCK_TOKEN_X = {
  mint: 'So11111111111111111111111111111111111111112',
  symbol: 'SOL',
  supply: 1_000_000_000,
  decimals: 9,
  cdn_url: 'https://example.com/sol.png',
  price_info: { price_per_token: 150, currency: 'USD' },
}

const MOCK_TOKEN_Y = {
  mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  symbol: 'USDC',
  supply: 1_000_000_000,
  decimals: 6,
  cdn_url: 'https://example.com/usdc.png',
  price_info: { price_per_token: 1, currency: 'USD' },
}

const MOCK_PNL_DATA: PositionPnLData = {
  positionAddress: 'pos123',
  minPrice: '0.5',
  maxPrice: '2.0',
  lowerBinId: 40,
  upperBinId: 60,
  feePerTvl24h: '0.01',
  isClosed: false,
  pnlUsd: '50',
  pnlPctChange: '10.5',
  pnlSol: 0.5,
  pnlSolPctChange: 10.5,
  allTimeDeposits: {
    tokenX: { amount: '0', amountSol: null, usd: '0' },
    tokenY: { amount: '0', amountSol: null, usd: '0' },
    total: { usd: '100', sol: '1.0' },
  },
  allTimeWithdrawals: {
    tokenX: { amount: '0', amountSol: null, usd: '0' },
    tokenY: { amount: '0', amountSol: null, usd: '0' },
    total: { usd: '0', sol: null },
  },
  allTimeFees: {
    tokenX: { amount: '0', amountSol: null, usd: '0' },
    tokenY: { amount: '0', amountSol: null, usd: '0' },
    total: { usd: '0', sol: null },
  },
  unrealizedPnl: {
    balances: 300,
    balancesSol: '1.5',
    balanceTokenX: { amount: '0', amountSol: null, usd: '0' },
    balanceTokenY: { amount: '0', amountSol: null, usd: '0' },
    unclaimedFeeTokenX: { amount: '100', amountSol: '0.1', usd: '10' },
    unclaimedFeeTokenY: { amount: '50', amountSol: '0.05', usd: '5' },
    unclaimedRewardTokenX: { amount: '0', amountSol: null, usd: '0' },
    unclaimedRewardTokenY: { amount: '0', amountSol: null, usd: '0' },
  },
  isOutOfRange: false,
  poolActiveBinId: 50,
  poolActivePrice: '1.0',
  createdAt: 1700000000,
  closedAt: null,
}

// ─── Tests ────────────────────────────────────────────────────────────

describe('PositionPipeline', () => {
  let pipeline: PositionPipeline
  let cache: CacheManager

  beforeEach(() => {
    vi.clearAllMocks()
    cache = CacheManager.createFresh()
  })

  describe('loadPortfolio — empty wallet', () => {
    it('returns empty result when wallet has no positions', async () => {
      const DLMM = await import('@meteora-ag/dlmm')
      vi.mocked(DLMM.default.getAllLbPairPositionsByUser).mockResolvedValue(new Map())

      pipeline = createPositionPipeline({ cache })

      const result = await pipeline.loadPortfolio('wallet1')

      expect(result.positions).toEqual([])
      expect(result.summary).toBeNull()
      expect(result.hasPnLData).toBe(false)
      expect(result.outOfRangeCount).toBe(0)
      expect(result.positionCount).toBe(0)
      expect(result.poolAddresses).toEqual([])
    })
  })

  describe('loadPortfolio — with positions', () => {
    it('returns resolved positions and summary when all fetches succeed', async () => {
      // Create a mock position
      const mockPosition = {
        publicKey: { toString: () => 'pos-pubkey', toBase58: () => 'pos-pubkey' },
        tokenX: { mint: { address: { toBase58: () => MOCK_TOKEN_X.mint } } },
        tokenY: { mint: { address: { toBase58: () => MOCK_TOKEN_Y.mint } } },
        lbPair: { activeId: 50 },
        lbPairPositionsData: [
          {
            publicKey: { toBase58: () => 'pos-addr-0' },
            positionData: {
              totalXAmount: '1000000000',
              totalYAmount: '1000000',
              lowerBinId: 40,
              upperBinId: 60,
              positionBinData: [],
              feeX: { toString: () => '100000000' },
              feeY: { toString: () => '100000' },
              totalClaimedFeeXAmount: { toString: () => '200000000' },
              totalClaimedFeeYAmount: { toString: () => '200000' },
            },
          },
        ],
      }

      const positionsMap = new Map([['pool1', mockPosition as any]])
      const DLMM = await import('@meteora-ag/dlmm')
      vi.mocked(DLMM.default.getAllLbPairPositionsByUser).mockResolvedValue(positionsMap)

      // Mock token fetching
      const { fetchTokenFromRpc } = await import('../../tokens')
      vi.mocked(fetchTokenFromRpc)
        .mockResolvedValueOnce(MOCK_TOKEN_X as any)
        .mockResolvedValueOnce(MOCK_TOKEN_Y as any)

      // Mock PnL fetching
      const { fetchPositionPnL } = await import('metcomet')
      vi.mocked(fetchPositionPnL).mockResolvedValue({
        positions: [MOCK_PNL_DATA],
        tokenX: null,
        tokenY: null,
        tokenXPrice: '0',
        tokenYPrice: '0',
      } as any)

      pipeline = createPositionPipeline({ cache, heliusApiKey: 'test-key' })

      const result = await pipeline.loadPortfolio('wallet1')

      expect(result.positions.length).toBeGreaterThan(0)
      expect(result.positionCount).toBe(1)
      expect(result.poolAddresses).toEqual(['pool1'])
      expect(result.hasPnLData).toBe(true)
      expect(result.summary).not.toBeNull()
      expect(result.summary!.totalPnlSol).toBeCloseTo(0.5)
      expect(result.outOfRangeCount).toBe(0) // activeId 50 is within range 40-60
    })

    it('returns hasPnLData=false when PnL fetch fails', async () => {
      const mockPosition = {
        publicKey: { toString: () => 'pos-pubkey', toBase58: () => 'pos-pubkey' },
        tokenX: { mint: { address: { toBase58: () => MOCK_TOKEN_X.mint } } },
        tokenY: { mint: { address: { toBase58: () => MOCK_TOKEN_Y.mint } } },
        lbPair: { activeId: 50 },
        lbPairPositionsData: [
          {
            publicKey: { toBase58: () => 'pos-addr-0' },
            positionData: {
              totalXAmount: '1000000000',
              totalYAmount: '1000000',
              lowerBinId: 40,
              upperBinId: 60,
              positionBinData: [],
              feeX: { toString: () => '0' },
              feeY: { toString: () => '0' },
              totalClaimedFeeXAmount: { toString: () => '0' },
              totalClaimedFeeYAmount: { toString: () => '0' },
            },
          },
        ],
      }

      const positionsMap = new Map([['pool1', mockPosition as any]])
      const DLMM = await import('@meteora-ag/dlmm')
      vi.mocked(DLMM.default.getAllLbPairPositionsByUser).mockResolvedValue(positionsMap)

      const { fetchTokenFromRpc } = await import('../../tokens')
      vi.mocked(fetchTokenFromRpc)
        .mockResolvedValueOnce(MOCK_TOKEN_X as any)
        .mockResolvedValueOnce(MOCK_TOKEN_Y as any)

      // PnL fetch throws
      const { fetchPositionPnL } = await import('metcomet')
      vi.mocked(fetchPositionPnL).mockRejectedValue(new Error('API error'))

      pipeline = createPositionPipeline({ cache, heliusApiKey: 'test-key' })

      const result = await pipeline.loadPortfolio('wallet1')

      // Positions still returned, but PnL is missing
      expect(result.positions.length).toBeGreaterThan(0)
      expect(result.hasPnLData).toBe(false)
      expect(result.summary).toBeNull()
      // Position view models have null PnL
      expect(result.positions[0].vm.pnlSol).toBeNull()
    })

    it('returns positions with null token info when token price fetch fails', async () => {
      const mockPosition = {
        publicKey: { toString: () => 'pos-pubkey', toBase58: () => 'pos-pubkey' },
        tokenX: { mint: { address: { toBase58: () => MOCK_TOKEN_X.mint } } },
        tokenY: { mint: { address: { toBase58: () => MOCK_TOKEN_Y.mint } } },
        lbPair: { activeId: 50 },
        lbPairPositionsData: [
          {
            publicKey: { toBase58: () => 'pos-addr-0' },
            positionData: {
              totalXAmount: '1000000000',
              totalYAmount: '1000000',
              lowerBinId: 40,
              upperBinId: 60,
              positionBinData: [],
              feeX: { toString: () => '0' },
              feeY: { toString: () => '0' },
              totalClaimedFeeXAmount: { toString: () => '0' },
              totalClaimedFeeYAmount: { toString: () => '0' },
            },
          },
        ],
      }

      const positionsMap = new Map([['pool1', mockPosition as any]])
      const DLMM = await import('@meteora-ag/dlmm')
      vi.mocked(DLMM.default.getAllLbPairPositionsByUser).mockResolvedValue(positionsMap)

      // Token fetch fails
      const { fetchTokenFromRpc } = await import('../../tokens')
      vi.mocked(fetchTokenFromRpc).mockRejectedValue(new Error('RPC error'))

      pipeline = createPositionPipeline({ cache, heliusApiKey: 'test-key' })

      const result = await pipeline.loadPortfolio('wallet1')

      expect(result.positions.length).toBeGreaterThan(0)
      // Token info is null when fetch fails
      expect(result.positions[0].tokenXInfo).toBeNull()
      expect(result.positions[0].tokenYInfo).toBeNull()
      // Values fall back to $0.00
      expect(result.positions[0].vm.totalValue).toBe('$0.00')
    })

    it('returns hasPnLData=false when heliusApiKey is not set', async () => {
      const mockPosition = {
        publicKey: { toString: () => 'pos-pubkey', toBase58: () => 'pos-pubkey' },
        tokenX: { mint: { address: { toBase58: () => MOCK_TOKEN_X.mint } } },
        tokenY: { mint: { address: { toBase58: () => MOCK_TOKEN_Y.mint } } },
        lbPair: { activeId: 50 },
        lbPairPositionsData: [
          {
            publicKey: { toBase58: () => 'pos-addr-0' },
            positionData: {
              totalXAmount: '1000000000',
              totalYAmount: '1000000',
              lowerBinId: 40,
              upperBinId: 60,
              positionBinData: [],
              feeX: { toString: () => '0' },
              feeY: { toString: () => '0' },
              totalClaimedFeeXAmount: { toString: () => '0' },
              totalClaimedFeeYAmount: { toString: () => '0' },
            },
          },
        ],
      }

      const positionsMap = new Map([['pool1', mockPosition as any]])
      const DLMM = await import('@meteora-ag/dlmm')
      vi.mocked(DLMM.default.getAllLbPairPositionsByUser).mockResolvedValue(positionsMap)

      const { fetchTokenFromRpc } = await import('../../tokens')
      vi.mocked(fetchTokenFromRpc)
        .mockResolvedValueOnce(MOCK_TOKEN_X as any)
        .mockResolvedValueOnce(MOCK_TOKEN_Y as any)

      pipeline = createPositionPipeline({ cache, heliusApiKey: undefined })

      const result = await pipeline.loadPortfolio('wallet1')

      expect(result.hasPnLData).toBe(false)
    })
  })

  describe('invalidateWallet', () => {
    it('clears cached data for the given wallet', async () => {
      // Pre-populate cache with wallet-specific data
      cache.set('pnl:pool1:wallet1', 'some-pnl-data')
      cache.set('token_data:mint1', 'some-token-data')
      cache.set('pnl:pool1:wallet2', 'other-wallet-data')

      pipeline = createPositionPipeline({ cache })
      pipeline.invalidateWallet('wallet1')

      expect(cache.get('pnl:pool1:wallet1')).toBeNull()
      // Token data doesn't have wallet suffix, so it survives
      expect(cache.get('token_data:mint1')).toBe('some-token-data')
      // Other wallet's data survives
      expect(cache.get('pnl:pool1:wallet2')).toBe('other-wallet-data')
    })
  })

  describe('fetchPortfolioSummary', () => {
    it('returns null when wallet has no positions', async () => {
      const DLMM = await import('@meteora-ag/dlmm')
      vi.mocked(DLMM.default.getAllLbPairPositionsByUser).mockResolvedValue(new Map())

      pipeline = createPositionPipeline({ cache })

      const result = await pipeline.fetchPortfolioSummary('wallet1')

      expect(result).toBeNull()
    })

    it('returns summary data when positions exist', async () => {
      const mockPosition = {
        publicKey: { toString: () => 'pos-pubkey', toBase58: () => 'pos-pubkey' },
        tokenX: { mint: { address: { toBase58: () => MOCK_TOKEN_X.mint } } },
        tokenY: { mint: { address: { toBase58: () => MOCK_TOKEN_Y.mint } } },
        lbPair: { activeId: 50 },
        lbPairPositionsData: [
          {
            publicKey: { toBase58: () => 'pos-addr-0' },
            positionData: {
              totalXAmount: '1000000000',
              totalYAmount: '1000000',
              lowerBinId: 40,
              upperBinId: 60,
              positionBinData: [],
              feeX: { toString: () => '0' },
              feeY: { toString: () => '0' },
              totalClaimedFeeXAmount: { toString: () => '0' },
              totalClaimedFeeYAmount: { toString: () => '0' },
            },
          },
        ],
      }

      const positionsMap = new Map([['pool1', mockPosition as any]])
      const DLMM = await import('@meteora-ag/dlmm')
      vi.mocked(DLMM.default.getAllLbPairPositionsByUser).mockResolvedValue(positionsMap)

      const { fetchTokenFromRpc } = await import('../../tokens')
      vi.mocked(fetchTokenFromRpc)
        .mockResolvedValueOnce(MOCK_TOKEN_X as any)
        .mockResolvedValueOnce(MOCK_TOKEN_Y as any)

      const { fetchPositionPnL } = await import('metcomet')
      vi.mocked(fetchPositionPnL).mockResolvedValue({
        positions: [MOCK_PNL_DATA],
        tokenX: null,
        tokenY: null,
        tokenXPrice: '0',
        tokenYPrice: '0',
      } as any)

      pipeline = createPositionPipeline({ cache, heliusApiKey: 'test-key' })

      const result = await pipeline.fetchPortfolioSummary('wallet1')

      expect(result).not.toBeNull()
      expect(result!.positionCount).toBe(1)
      expect(result!.outOfRangeCount).toBe(0)
      expect(result!.totalPnlSol).toBeCloseTo(0.5)
      expect(result!.totalValueSol).toBeCloseTo(1.5)
    })

    it('returns partial data when some PnL pools fail', async () => {
      const mockPosition = {
        publicKey: { toString: () => 'pos-pubkey', toBase58: () => 'pos-pubkey' },
        tokenX: { mint: { address: { toBase58: () => MOCK_TOKEN_X.mint } } },
        tokenY: { mint: { address: { toBase58: () => MOCK_TOKEN_Y.mint } } },
        lbPair: { activeId: 50 },
        lbPairPositionsData: [
          {
            publicKey: { toBase58: () => 'pos-addr-0' },
            positionData: {
              totalXAmount: '1000000000',
              totalYAmount: '1000000',
              lowerBinId: 40,
              upperBinId: 60,
              positionBinData: [],
              feeX: { toString: () => '0' },
              feeY: { toString: () => '0' },
              totalClaimedFeeXAmount: { toString: () => '0' },
              totalClaimedFeeYAmount: { toString: () => '0' },
            },
          },
        ],
      }

      const positionsMap = new Map([
        ['pool1', mockPosition as any],
        ['pool2', mockPosition as any],
      ])
      const DLMM = await import('@meteora-ag/dlmm')
      vi.mocked(DLMM.default.getAllLbPairPositionsByUser).mockResolvedValue(positionsMap)

      const { fetchTokenFromRpc } = await import('../../tokens')
      vi.mocked(fetchTokenFromRpc)
        .mockResolvedValueOnce(MOCK_TOKEN_X as any)
        .mockResolvedValueOnce(MOCK_TOKEN_Y as any)

      // PnL succeeds for pool1, fails for pool2
      const { fetchPositionPnL } = await import('metcomet')
      vi.mocked(fetchPositionPnL)
        .mockResolvedValueOnce({
          positions: [MOCK_PNL_DATA],
          tokenX: null,
          tokenY: null,
          tokenXPrice: '0',
          tokenYPrice: '0',
        } as any)
        .mockRejectedValueOnce(new Error('Pool2 PnL failed'))

      pipeline = createPositionPipeline({ cache, heliusApiKey: 'test-key' })

      const result = await pipeline.fetchPortfolioSummary('wallet1')

      // Should still return data — partial PnL from pool1
      expect(result).not.toBeNull()
      expect(result!.positionCount).toBe(2) // 2 positions (1 per pool)
    })
  })
})

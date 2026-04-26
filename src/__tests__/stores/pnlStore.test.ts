import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { PositionPnLData } from 'metcomet'
import { usePnLStore } from '../../stores/pnlStore'
import { computePoolPnLSummary, findPositionPnL, hasAnyPnLData } from '../../utils/positions/pnlAggregation'
import { fetchPositionPnL } from 'metcomet'

// Mock metcomet
vi.mock('metcomet', () => ({
  fetchPositionPnL: vi.fn(),
}))

// Mock env
vi.mock('../../config/env', () => ({
  env: {
    heliusApiKey: 'test-api-key',
  },
}))

// Mock CacheManager to use a per-test fresh instance
let mockCache: Map<string, { value: any; expiresAt: number }>
let mockPending: Map<string, Promise<any>>

vi.mock('../../utils/cache/CacheManager', () => ({
  CacheManager: {
    getInstance: () => ({
      getOrFetch: async <T>(key: string, fetchFn: () => Promise<T>, _ttl?: number): Promise<T> => {
        const cached = mockCache.get(key)
        if (cached && Date.now() < cached.expiresAt) return cached.value

        const existing = mockPending.get(key)
        if (existing) return existing

        const promise = fetchFn()
          .then((value) => {
            mockCache.set(key, { value, expiresAt: Date.now() + 60000 })
            return value
          })
          .finally(() => {
            mockPending.delete(key)
          })
        mockPending.set(key, promise)
        return promise
      },
    }),
  },
}))

const zeroTokenAmount = { amount: '0', amountSol: null, usd: '0' }
const zeroTokenPairWithTotal = {
  tokenX: { ...zeroTokenAmount },
  tokenY: { ...zeroTokenAmount },
  total: { usd: '0', sol: null },
}

const mockPositionPnLData: PositionPnLData = {
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
    ...zeroTokenPairWithTotal,
    total: { usd: '100', sol: '1.0' },
  },
  allTimeWithdrawals: { ...zeroTokenPairWithTotal },
  allTimeFees: { ...zeroTokenPairWithTotal },
  unrealizedPnl: {
    balances: 300,
    balancesSol: '1.5',
    balanceTokenX: { ...zeroTokenAmount },
    balanceTokenY: { ...zeroTokenAmount },
    unclaimedFeeTokenX: { amount: '100', amountSol: '0.1', usd: '10' },
    unclaimedFeeTokenY: { amount: '50', amountSol: '0.05', usd: '5' },
    unclaimedRewardTokenX: { ...zeroTokenAmount },
    unclaimedRewardTokenY: { ...zeroTokenAmount },
  },
  isOutOfRange: false,
  poolActiveBinId: 50,
  poolActivePrice: '1.0',
  createdAt: 1700000000,
  closedAt: null,
}

describe('pnlStore', () => {
  beforeEach(() => {
    mockCache = new Map()
    mockPending = new Map()
    usePnLStore.getState().clearAll()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('has empty poolPnLData', () => {
      const state = usePnLStore.getState()
      expect(state.poolPnLData).toEqual({})
    })
  })

  describe('fetchPoolPnL', () => {
    it('returns null without API key', async () => {
      vi.doMock('../../config/env', () => ({
        env: { heliusApiKey: '' },
      }))

      const { usePnLStore: storeWithoutKey } = await import('../../stores/pnlStore')
      const result = await storeWithoutKey.getState().fetchPoolPnL('pool1', 'wallet1')

      expect(result).toBeNull()
    })

    it('fetches and stores positions', async () => {
      vi.mocked(fetchPositionPnL).mockResolvedValue({
        positions: [mockPositionPnLData],
      } as any)

      const result = await usePnLStore.getState().fetchPoolPnL('pool1', 'wallet1')

      expect(result).toEqual([mockPositionPnLData])
      expect(fetchPositionPnL).toHaveBeenCalledWith({
        poolAddress: 'pool1',
        user: 'wallet1',
        status: 'open',
      })
    })

    it('returns cached data on second call', async () => {
      vi.mocked(fetchPositionPnL).mockResolvedValue({
        positions: [mockPositionPnLData],
      } as any)

      await usePnLStore.getState().fetchPoolPnL('pool1', 'wallet1')
      const result = await usePnLStore.getState().fetchPoolPnL('pool1', 'wallet1')

      expect(fetchPositionPnL).toHaveBeenCalledTimes(1)
      expect(result).toEqual([mockPositionPnLData])
    })

    it('returns empty array when response has no positions', async () => {
      vi.mocked(fetchPositionPnL).mockResolvedValue(null as any)

      const result = await usePnLStore.getState().fetchPoolPnL('pool1', 'wallet1')

      expect(result).toEqual([])
    })

    it('handles API errors gracefully', async () => {
      vi.mocked(fetchPositionPnL).mockRejectedValue(new Error('API error'))

      const result = await usePnLStore.getState().fetchPoolPnL('pool1', 'wallet1')

      expect(result).toBeNull()
    })
  })

  describe('getPoolPnL', () => {
    it('returns null when no data', () => {
      expect(usePnLStore.getState().getPoolPnL('pool1', 'wallet1')).toBeNull()
    })

    it('returns data after fetch', async () => {
      vi.mocked(fetchPositionPnL).mockResolvedValue({
        positions: [mockPositionPnLData],
      } as any)

      await usePnLStore.getState().fetchPoolPnL('pool1', 'wallet1')
      const result = usePnLStore.getState().getPoolPnL('pool1', 'wallet1')

      expect(result).toEqual([mockPositionPnLData])
    })
  })

  describe('invalidateWallet', () => {
    it('clears wallet-specific cache', async () => {
      vi.mocked(fetchPositionPnL).mockResolvedValue({
        positions: [mockPositionPnLData],
      } as any)

      await usePnLStore.getState().fetchPoolPnL('pool1', 'wallet1')
      usePnLStore.getState().invalidateWallet('wallet1')

      expect(usePnLStore.getState().poolPnLData['pnl:pool1:wallet1']).toBeUndefined()
    })

    it('preserves other wallet data', async () => {
      vi.mocked(fetchPositionPnL).mockResolvedValue({
        positions: [mockPositionPnLData],
      } as any)

      await usePnLStore.getState().fetchPoolPnL('pool1', 'wallet1')
      await usePnLStore.getState().fetchPoolPnL('pool1', 'wallet2')

      usePnLStore.getState().invalidateWallet('wallet1')

      expect(usePnLStore.getState().poolPnLData['pnl:pool1:wallet1']).toBeUndefined()
      expect(usePnLStore.getState().poolPnLData['pnl:pool1:wallet2']).toBeDefined()
    })
  })

  describe('clearAll', () => {
    it('clears all cache', async () => {
      vi.mocked(fetchPositionPnL).mockResolvedValue({
        positions: [mockPositionPnLData],
      } as any)

      await usePnLStore.getState().fetchPoolPnL('pool1', 'wallet1')
      await usePnLStore.getState().fetchPoolPnL('pool2', 'wallet1')

      usePnLStore.getState().clearAll()

      expect(usePnLStore.getState().poolPnLData).toEqual({})
    })
  })
})

// ─── Pure aggregation function tests ─────────────────────────────────

describe('findPositionPnL', () => {
  it('returns null for empty array', () => {
    expect(findPositionPnL([], 'pos1')).toBeNull()
  })

  it('returns null when position not found', () => {
    expect(findPositionPnL([mockPositionPnLData], 'nonexistent')).toBeNull()
  })

  it('returns position when found', () => {
    expect(findPositionPnL([mockPositionPnLData], 'pos123')).toEqual(mockPositionPnLData)
  })
})

describe('hasAnyPnLData', () => {
  it('returns false for empty array', () => {
    expect(hasAnyPnLData([])).toBe(false)
  })

  it('returns true for non-empty array', () => {
    expect(hasAnyPnLData([mockPositionPnLData])).toBe(true)
  })
})

describe('computePoolPnLSummary', () => {
  it('returns zeros for empty array', () => {
    const result = computePoolPnLSummary([])
    expect(result).toEqual({
      totalPnlSol: 0,
      totalPnlPercent: 0,
      totalValueSol: 0,
      totalInitialDepositSol: 0,
      totalUnclaimedFeesSol: 0,
    })
  })

  it('calculates totals for a single position', () => {
    const result = computePoolPnLSummary([mockPositionPnLData])
    expect(result.totalPnlSol).toBeCloseTo(0.5)
    expect(result.totalValueSol).toBeCloseTo(1.5)
    expect(result.totalInitialDepositSol).toBeCloseTo(1.0)
    expect(result.totalUnclaimedFeesSol).toBeCloseTo(0.15)
  })

  it('aggregates multiple positions', () => {
    const pos1 = {
      ...mockPositionPnLData,
      positionAddress: 'pos1',
      pnlSol: 0.5,
      pnlSolPctChange: 10,
      unrealizedPnl: {
        ...mockPositionPnLData.unrealizedPnl!,
        balancesSol: '2.0',
      },
      allTimeDeposits: {
        ...mockPositionPnLData.allTimeDeposits,
        total: { usd: '150', sol: '1.5' },
      },
    }
    const pos2 = {
      ...mockPositionPnLData,
      positionAddress: 'pos2',
      pnlSol: -0.2,
      pnlSolPctChange: -5,
      unrealizedPnl: {
        ...mockPositionPnLData.unrealizedPnl!,
        balancesSol: '3.0',
      },
      allTimeDeposits: {
        ...mockPositionPnLData.allTimeDeposits,
        total: { usd: '320', sol: '3.2' },
      },
    }

    const result = computePoolPnLSummary([pos1, pos2])
    expect(result.totalPnlSol).toBeCloseTo(0.3, 2)
    expect(result.totalValueSol).toBeCloseTo(5.0, 2)
    expect(result.totalInitialDepositSol).toBeCloseTo(4.7, 2)
  })
})

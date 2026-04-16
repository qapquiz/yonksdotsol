import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePnLStore, selectPositionPnL, selectPoolPnLSummary, selectHasPoolData } from '../../stores/pnlStore'
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

const mockPositionPnLData = {
  positionAddress: 'pos123',
  pnlSol: 0.5,
  pnlSolPctChange: 10.5,
  unrealizedPnl: {
    balancesSol: '1.5',
    balances: 300,
    unclaimedFeeTokenX: { amountSol: '0.1' },
    unclaimedFeeTokenY: { amountSol: '0.05' },
  },
  allTimeDeposits: {
    total: { sol: '1.0' },
  },
}

describe('pnlStore', () => {
  beforeEach(() => {
    usePnLStore.getState().clearAll()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('has empty poolPnLData', () => {
      const state = usePnLStore.getState()
      expect(state.poolPnLData).toEqual({})
    })

    it('has empty pendingPoolPnL', () => {
      const state = usePnLStore.getState()
      expect(state.pendingPoolPnL).toEqual({})
    })
  })

  describe('fetchPoolPnL', () => {
    it('returns null without API key', async () => {
      // Temporarily mock empty API key
      vi.resetModules()
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

    it('returns cached data within TTL', async () => {
      vi.mocked(fetchPositionPnL).mockResolvedValue({
        positions: [mockPositionPnLData],
      } as any)

      // First fetch
      await usePnLStore.getState().fetchPoolPnL('pool1', 'wallet1')

      // Second fetch should use cache
      const result = await usePnLStore.getState().fetchPoolPnL('pool1', 'wallet1')

      expect(fetchPositionPnL).toHaveBeenCalledTimes(1)
      expect(result).toEqual([mockPositionPnLData])
    })

    it('deduplicates concurrent requests', async () => {
      let resolveCount = 0
      vi.mocked(fetchPositionPnL).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolveCount++
            resolve({ positions: [mockPositionPnLData] } as any)
          }, 10)
        })
      })

      const [result1, result2] = await Promise.all([
        usePnLStore.getState().fetchPoolPnL('pool1', 'wallet1'),
        usePnLStore.getState().fetchPoolPnL('pool1', 'wallet1'),
      ])

      expect(result1).toEqual([mockPositionPnLData])
      expect(result2).toEqual([mockPositionPnLData])
      expect(fetchPositionPnL).toHaveBeenCalledTimes(1)
    })

    it('handles API errors', async () => {
      vi.mocked(fetchPositionPnL).mockRejectedValue(new Error('API error'))

      await expect(usePnLStore.getState().fetchPoolPnL('pool1', 'wallet1')).rejects.toThrow('API error')

      // Pending should be cleared after error
      const state = usePnLStore.getState()
      expect(state.pendingPoolPnL).toEqual({})
    })

    it('returns null when response has no positions', async () => {
      vi.mocked(fetchPositionPnL).mockResolvedValue(null as any)

      const result = await usePnLStore.getState().fetchPoolPnL('pool1', 'wallet1')

      expect(result).toBeNull()
    })
  })

  describe('invalidateWallet', () => {
    it('clears wallet-specific cache', async () => {
      vi.mocked(fetchPositionPnL).mockResolvedValue({
        positions: [mockPositionPnLData],
      } as any)

      await usePnLStore.getState().fetchPoolPnL('pool1', 'wallet1')
      usePnLStore.getState().invalidateWallet('wallet1')

      const state = usePnLStore.getState()
      expect(state.poolPnLData['pool1:wallet1']).toBeUndefined()
    })

    it('preserves other wallet data', async () => {
      vi.mocked(fetchPositionPnL).mockResolvedValue({
        positions: [mockPositionPnLData],
      } as any)

      await usePnLStore.getState().fetchPoolPnL('pool1', 'wallet1')
      await usePnLStore.getState().fetchPoolPnL('pool1', 'wallet2')

      usePnLStore.getState().invalidateWallet('wallet1')

      const state = usePnLStore.getState()
      expect(state.poolPnLData['pool1:wallet1']).toBeUndefined()
      expect(state.poolPnLData['pool1:wallet2']).toBeDefined()
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

      const state = usePnLStore.getState()
      expect(state.poolPnLData).toEqual({})
      expect(state.pendingPoolPnL).toEqual({})
    })
  })
})

describe('selectPositionPnL', () => {
  beforeEach(() => {
    usePnLStore.getState().clearAll()
  })

  it('returns null for missing data', () => {
    const selector = selectPositionPnL('pool1', 'wallet1', 'pos1')
    const result = selector(usePnLStore.getState())
    expect(result).toBeNull()
  })

  it('returns position data when exists', () => {
    usePnLStore.setState({
      poolPnLData: {
        'pool1:wallet1': {
          positions: [mockPositionPnLData],
          timestamp: Date.now(),
        },
      },
    })

    const selector = selectPositionPnL('pool1', 'wallet1', 'pos123')
    const result = selector(usePnLStore.getState())
    expect(result).toEqual(mockPositionPnLData)
  })

  it('returns null for missing position', () => {
    usePnLStore.setState({
      poolPnLData: {
        'pool1:wallet1': {
          positions: [mockPositionPnLData],
          timestamp: Date.now(),
        },
      },
    })

    const selector = selectPositionPnL('pool1', 'wallet1', 'nonexistent')
    const result = selector(usePnLStore.getState())
    expect(result).toBeNull()
  })
})

describe('selectPoolPnLSummary', () => {
  beforeEach(() => {
    usePnLStore.getState().clearAll()
  })

  it('returns zeros for empty input', () => {
    const selector = selectPoolPnLSummary('wallet1', [])
    const result = selector(usePnLStore.getState())

    expect(result).toEqual({
      totalPnlSol: 0,
      totalPnlPercent: 0,
      totalValueSol: 0,
      totalInitialDepositSol: 0,
      totalUnclaimedFeesSol: 0,
    })
  })

  it('returns zeros for empty wallet', () => {
    const selector = selectPoolPnLSummary('', ['pool1'])
    const result = selector(usePnLStore.getState())

    expect(result.totalPnlSol).toBe(0)
  })

  it('calculates totals correctly', () => {
    usePnLStore.setState({
      poolPnLData: {
        'pool1:wallet1': {
          positions: [
            {
              positionAddress: 'pos1',
              pnlSol: 0.5,
              pnlSolPctChange: 10,
              unrealizedPnl: {
                balancesSol: '2.0',
                unclaimedFeeTokenX: { amountSol: '0.1' },
                unclaimedFeeTokenY: { amountSol: '0.05' },
              },
              allTimeDeposits: { total: { sol: '1.5' } },
            },
          ],
          timestamp: Date.now(),
        },
      },
    })

    const selector = selectPoolPnLSummary('wallet1', ['pool1'])
    const result = selector(usePnLStore.getState())

    expect(result.totalPnlSol).toBeCloseTo(0.5)
    expect(result.totalValueSol).toBeCloseTo(2.0)
    expect(result.totalInitialDepositSol).toBeCloseTo(1.5)
    expect(result.totalUnclaimedFeesSol).toBeCloseTo(0.15)
  })

  it('aggregates multiple pools', () => {
    usePnLStore.setState({
      poolPnLData: {
        'pool1:wallet1': {
          positions: [
            {
              positionAddress: 'pos1',
              pnlSol: 0.5,
              pnlSolPctChange: 10,
              unrealizedPnl: { balancesSol: '2.0' },
              allTimeDeposits: { total: { sol: '1.5' } },
            },
          ],
          timestamp: Date.now(),
        },
        'pool2:wallet1': {
          positions: [
            {
              positionAddress: 'pos2',
              pnlSol: -0.2,
              pnlSolPctChange: -5,
              unrealizedPnl: { balancesSol: '3.0' },
              allTimeDeposits: { total: { sol: '3.2' } },
            },
          ],
          timestamp: Date.now(),
        },
      },
    })

    const selector = selectPoolPnLSummary('wallet1', ['pool1', 'pool2'])
    const result = selector(usePnLStore.getState())

    expect(result.totalPnlSol).toBeCloseTo(0.3, 2)
    expect(result.totalValueSol).toBeCloseTo(5.0, 2)
  })
})

describe('selectHasPoolData', () => {
  beforeEach(() => {
    usePnLStore.getState().clearAll()
  })

  it('returns false for empty wallet', () => {
    const selector = selectHasPoolData('', ['pool1'])
    expect(selector(usePnLStore.getState())).toBe(false)
  })

  it('returns true when data exists', () => {
    usePnLStore.setState({
      poolPnLData: {
        'pool1:wallet1': {
          positions: [],
          timestamp: Date.now(),
        },
      },
    })

    const selector = selectHasPoolData('wallet1', ['pool1'])
    expect(selector(usePnLStore.getState())).toBe(true)
  })

  it('returns false when no matching pool', () => {
    usePnLStore.setState({
      poolPnLData: {
        'pool1:wallet1': {
          positions: [],
          timestamp: Date.now(),
        },
      },
    })

    const selector = selectHasPoolData('wallet1', ['pool2'])
    expect(selector(usePnLStore.getState())).toBe(false)
  })
})

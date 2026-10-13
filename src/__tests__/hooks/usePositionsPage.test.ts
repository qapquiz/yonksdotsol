// @vitest-environment happy-dom

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePositionsPage } from '../../hooks/usePositionsPage'

const loadPortfolio = vi.fn()
const invalidateWallet = vi.fn()
const getCurrentSolUsdPrice = vi.fn()

vi.mock('react-native', () => ({
  Platform: { OS: 'android', select: (obj: Record<string, unknown>) => obj.android ?? obj.default },
  AppState: { currentState: 'active', addEventListener: vi.fn(() => ({ remove: vi.fn() })) },
}))
vi.mock('../../config/env', () => ({ env: { devMock: false, rpcUrl: 'https://rpc.test' } }))
vi.mock('../../services/positionPipeline', () => ({
  createPositionPipeline: () => ({ loadPortfolio, invalidateWallet }),
}))
vi.mock('../../services/solPrice', () => ({
  getCurrentSolUsdPrice: (...args: unknown[]) => getCurrentSolUsdPrice(...args),
}))
vi.mock('../../observe', () => ({ Observe: { logEvent: vi.fn() } }))

const emptyResult = {
  positions: [],
  summary: null,
  hasPnLData: false,
  outOfRangeCount: 0,
  poolAddresses: [],
  positionCount: 0,
}

describe('usePositionsPage load failures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCurrentSolUsdPrice.mockResolvedValue(100)
  })

  it('surfaces an error state and clears loading when the initial load rejects', async () => {
    loadPortfolio.mockRejectedValue(new Error('RPC down'))

    const { result } = renderHook(() => usePositionsPage('Wall3t', true))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.loadError).toBe(true)
    expect(result.current.positions).toEqual([])
  })

  it('allows an immediate retry after a failed refresh (cooldown does not consume the failure)', async () => {
    loadPortfolio.mockRejectedValue(new Error('RPC down'))

    const { result } = renderHook(() => usePositionsPage('Wall3t', true))
    await waitFor(() => expect(result.current.loadError).toBe(true))
    expect(loadPortfolio).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.refresh()
    })
    await waitFor(() => expect(loadPortfolio).toHaveBeenCalledTimes(2))

    act(() => {
      result.current.refresh()
    })
    await waitFor(() => expect(loadPortfolio).toHaveBeenCalledTimes(3))
    expect(result.current.loadError).toBe(true)
  })

  it('keeps loadError false on the success path', async () => {
    loadPortfolio.mockResolvedValue(emptyResult)

    const { result } = renderHook(() => usePositionsPage('Wall3t', true))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.loadError).toBe(false)
    expect(result.current.lastUpdatedAt).not.toBeNull()
  })
})

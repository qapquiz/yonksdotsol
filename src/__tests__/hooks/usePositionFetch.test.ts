// @vitest-environment jsdom
import { renderHook, act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import type { PositionInfo } from '@meteora-ag/dlmm'
import { usePositionFetch } from '../../hooks/positions/usePositionFetch'

type FetchFn = (address: string) => Promise<Map<string, PositionInfo>>

// Mock dependencies
const mockCacheDelete = vi.fn()
const mockCacheInvalidate = vi.fn()
vi.mock('../../utils/cache/CacheManager', () => ({
  CacheManager: {
    getInstance: vi.fn(() => ({
      delete: mockCacheDelete,
      invalidatePattern: mockCacheInvalidate,
    })),
  },
}))

vi.mock('../../utils/cache/cacheKeys', () => ({
  getUpnlPerPositionKey: (addr: string) => `upnl:${addr}`,
}))

function createMockPositions(count: number): Map<string, PositionInfo> {
  const map = new Map<string, PositionInfo>()
  for (let i = 0; i < count; i++) {
    map.set(`pool-${i}`, {} as PositionInfo)
  }
  return map
}

describe('usePositionFetch', () => {
  let mockFetchFn: FetchFn
  let mockFetchFnSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    mockFetchFnSpy = vi.fn().mockResolvedValue(createMockPositions(1))
    mockFetchFn = mockFetchFnSpy as unknown as FetchFn
    mockCacheDelete.mockReset()
    mockCacheInvalidate.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with empty positions', () => {
    const { result } = renderHook(() => usePositionFetch(undefined, { fetchFn: mockFetchFn }))
    expect(result.current.positions.size).toBe(0)
    // No wallet address → useEffect immediately sets loading to false
    expect(result.current.isLoading).toBe(false)
  })

  it('fetches positions when wallet address is provided', async () => {
    const { result } = renderHook(() => usePositionFetch('wallet1', { fetchFn: mockFetchFn }))

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(mockFetchFnSpy).toHaveBeenCalledWith('wallet1')
    expect(result.current.positions.size).toBe(1)
    expect(result.current.isLoading).toBe(false)
  })

  it('sets loading false with no positions when no wallet', async () => {
    const { result } = renderHook(() => usePositionFetch(undefined, { fetchFn: mockFetchFn }))

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(mockFetchFnSpy).not.toHaveBeenCalled()
    expect(result.current.positions.size).toBe(0)
    expect(result.current.isLoading).toBe(false)
  })

  it('refetches when wallet address changes and invalidates cache on wallet swap', async () => {
    const positions1 = createMockPositions(2)
    const positions2 = createMockPositions(3)

    mockFetchFnSpy
      .mockResolvedValueOnce(positions1)
      .mockResolvedValueOnce(positions2)

    const { result, rerender } = renderHook(
      ({ address }: { address: string | undefined }) => usePositionFetch(address, { fetchFn: mockFetchFn }),
      { initialProps: { address: 'wallet1' } },
    )

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(mockFetchFnSpy).toHaveBeenCalledWith('wallet1')
    expect(result.current.positions.size).toBe(2)
    expect(mockCacheInvalidate).not.toHaveBeenCalled() // first connect, no invalidation

    // Switch wallet
    rerender({ address: 'wallet2' })

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(mockFetchFnSpy).toHaveBeenCalledWith('wallet2')
    expect(result.current.positions.size).toBe(3)
    expect(mockCacheInvalidate).toHaveBeenCalledWith('initial_deposits:')
  })

  it('does not invalidate cache on initial wallet connect', async () => {
    renderHook(() => usePositionFetch('wallet1', { fetchFn: mockFetchFn }))

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(mockCacheInvalidate).not.toHaveBeenCalled()
  })

  it('clears positions when wallet disconnects', async () => {
    const { result, rerender } = renderHook(
      ({ address }: { address: string | undefined }) => usePositionFetch(address, { fetchFn: mockFetchFn }),
      { initialProps: { address: 'wallet1' } as { address: string | undefined } },
    )

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(result.current.positions.size).toBe(1)

    // Disconnect
    rerender({ address: undefined })

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(result.current.positions.size).toBe(0)
    expect(result.current.isLoading).toBe(false)
  })

  it('handles fetch errors gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockFetchFnSpy.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => usePositionFetch('wallet1', { fetchFn: mockFetchFn }))

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.positions.size).toBe(0) // positions cleared, not stuck in error state
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  describe('refresh', () => {
    it('re-fetches positions on refresh', async () => {
      const { result } = renderHook(() => usePositionFetch('wallet1', { fetchFn: mockFetchFn }))

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(mockFetchFnSpy).toHaveBeenCalledTimes(1)

      act(() => {
        result.current.refresh()
      })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(mockFetchFnSpy).toHaveBeenCalledTimes(2)
    })

    it('throttles cache invalidation within the window', async () => {
      const { result } = renderHook(() =>
        usePositionFetch('wallet1', { fetchFn: mockFetchFn, throttleMs: 30_000 }),
      )

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      // First refresh — cache cleared
      act(() => {
        result.current.refresh()
      })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(mockCacheDelete).toHaveBeenCalledTimes(1)

      // Immediate second refresh — throttled, cache NOT cleared
      act(() => {
        result.current.refresh()
      })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(mockCacheDelete).toHaveBeenCalledTimes(1) // still 1

      // Advance past throttle window
      act(() => {
        vi.advanceTimersByTime(31_000)
      })

      act(() => {
        result.current.refresh()
      })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(mockCacheDelete).toHaveBeenCalledTimes(2)
    })

    it('does nothing when no wallet address', async () => {
      const { result } = renderHook(() => usePositionFetch(undefined, { fetchFn: mockFetchFn }))

      act(() => {
        result.current.refresh()
      })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(mockFetchFnSpy).not.toHaveBeenCalled()
    })
  })

  describe('onWalletChange callback', () => {
    it('fires when wallet address changes to a different one', async () => {
      const onWalletChange = vi.fn()

      const { rerender } = renderHook(
        ({ address }: { address: string | undefined }) =>
          usePositionFetch(address, { fetchFn: mockFetchFn, onWalletChange }),
        { initialProps: { address: 'wallet1' } },
      )

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(onWalletChange).not.toHaveBeenCalled()

      rerender({ address: 'wallet2' })

      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(onWalletChange).toHaveBeenCalledTimes(1)
    })
  })
})

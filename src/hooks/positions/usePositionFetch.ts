import DLMM from '@meteora-ag/dlmm'
import type { PositionInfo } from '@meteora-ag/dlmm'
import { PublicKey } from '@solana/web3.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getSharedConnection } from '../../config/connection'
import { CacheManager } from '../../utils/cache/CacheManager'
import { getUpnlPerPositionKey } from '../../utils/cache/cacheKeys'

export interface UsePositionFetchOptions {
  /** Override the fetch function for testing. Defaults to DLMM.getAllLbPairPositionsByUser. */
  fetchFn?: (address: string) => Promise<Map<string, PositionInfo>>
  /** Minimum ms between PnL cache invalidations on refresh. Default: 30000 */
  throttleMs?: number
  /** Callback after cache invalidation on wallet change */
  onWalletChange?: () => void
}

export interface UsePositionFetchResult {
  positions: Map<string, PositionInfo>
  isLoading: boolean
  refresh: () => void
}

const DEFAULT_FETCH_FN = async (address: string): Promise<Map<string, PositionInfo>> => {
  return DLMM.getAllLbPairPositionsByUser(getSharedConnection(), new PublicKey(address))
}

export function usePositionFetch(
  walletAddress: string | undefined,
  options: UsePositionFetchOptions = {},
): UsePositionFetchResult {
  const { fetchFn = DEFAULT_FETCH_FN, throttleMs = 30_000, onWalletChange } = options

  const [positions, setPositions] = useState<Map<string, PositionInfo>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const lastUpnlRefreshRef = useRef(0)
  const previousAddressRef = useRef<string | null>(null)

  const fetchPositions = useCallback(
    async (address: string) => {
      setIsLoading(true)
      try {
        const result = await fetchFn(address)
        setPositions(result)
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    },
    [fetchFn],
  )

  // Wallet change detection + initial fetch
  useEffect(() => {
    const currentAddress = walletAddress ?? null

    if (currentAddress !== null && currentAddress !== previousAddressRef.current) {
      const wasConnected = previousAddressRef.current !== null
      if (wasConnected) {
        CacheManager.getInstance().invalidatePattern('initial_deposits:')
        onWalletChange?.()
      }
    }

    previousAddressRef.current = currentAddress

    if (walletAddress) {
      fetchPositions(walletAddress)
    } else {
      setPositions(new Map())
      setIsLoading(false)
    }
  }, [walletAddress, fetchPositions, onWalletChange])

  // Throttled refresh
  const refresh = useCallback(() => {
    if (!walletAddress) return

    const now = Date.now()
    if (now - lastUpnlRefreshRef.current > throttleMs) {
      CacheManager.getInstance().delete(getUpnlPerPositionKey(walletAddress))
      lastUpnlRefreshRef.current = now
    }

    fetchPositions(walletAddress)
  }, [walletAddress, fetchPositions, throttleMs])

  return { positions, isLoading, refresh }
}

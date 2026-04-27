import type { PositionInfo } from '@meteora-ag/dlmm'
import DLMM from '@meteora-ag/dlmm'
import { PublicKey } from '@solana/web3.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getSharedConnection } from '../config/connection'
import { createDataServices } from '../services/data'
import { usePnLStore } from '../stores/pnlStore'
import type { TokenInfo } from '../tokens'
import { CacheManager } from '../utils/cache/CacheManager'
import { computePositionViewData, type PositionViewModel } from '../utils/positions/computePositionViewData'
import { computePoolPnLSummary, findPositionPnL, type PoolPnLSummary } from '../utils/positions/pnlAggregation'

// ─── Public types ────────────────────────────────────────────────────

export interface ResolvedPosition {
  id: string
  poolAddress: string
  tokenXMint: string
  tokenYMint: string
  tokenXInfo: TokenInfo | null
  tokenYInfo: TokenInfo | null
  position: PositionInfo
  lbPositionIndex: number
  vm: PositionViewModel
}

export interface PortfolioSummaryData extends PoolPnLSummary {
  positionCount: number
}

export interface PositionsPageResult {
  /** Fully resolved position view models (token data + PnL baked in) */
  positions: ResolvedPosition[]
  /** Aggregated portfolio summary */
  summary: PortfolioSummaryData | null
  /** Whether PnL data has been fetched and is available */
  hasPnLData: boolean
  /** Count of out-of-range positions */
  outOfRangeCount: number
  /** Pool addresses for PnL-aware components */
  poolAddresses: string[]
  /** Total position count */
  positionCount: number
  /** True during initial skeleton load */
  loading: boolean
  /** Pull-to-refresh handler */
  refresh: () => void
  /** Wallet resolved status */
  walletResolved: boolean
  /** Wallet address */
  walletAddress?: string
}

// ─── Hook implementation ─────────────────────────────────────────────

export function usePositionsPage(
  walletAddress: string | undefined,
  walletResolved: boolean,
): PositionsPageResult {
  const wallet = walletAddress || ''

  // ── Position fetching ──
  const [positions, setPositions] = useState<Map<string, PositionInfo>>(new Map())
  const [isLoading, setIsLoading] = useState(true)

  const fetchPositions = useCallback(async (address: string) => {
    setIsLoading(true)
    try {
      const result = await DLMM.getAllLbPairPositionsByUser(getSharedConnection(), new PublicKey(address))
      setPositions(result)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Wallet change → clear old wallet's cache, fetch positions for new wallet
  const prevWalletRef = useRef<string | null>(null)
  useEffect(() => {
    const currentAddress = walletAddress ?? null
    const prevAddress = prevWalletRef.current

    if (prevAddress !== null && prevAddress !== currentAddress) {
      // Clear old wallet's PnL from Zustand store + CacheManager
      usePnLStore.getState().invalidateWallet(prevAddress)
      CacheManager.getInstance().invalidatePattern(`:${prevAddress}`)
    }

    if (currentAddress !== null && currentAddress !== prevAddress) {
      fetchPositions(currentAddress)
    } else if (currentAddress === null && prevAddress !== null) {
      setPositions(new Map())
      setIsLoading(false)
    } else if (currentAddress === null) {
      setIsLoading(false)
    }

    prevWalletRef.current = currentAddress
  }, [walletAddress, fetchPositions])

  // Throttled refresh — enforces 30s cooldown between manual refreshes
  const lastRefreshRef = useRef(0)
  const refresh = useCallback(() => {
    if (!walletAddress) return
    const now = Date.now()
    if (now - lastRefreshRef.current < 30_000) return
    lastRefreshRef.current = now
    // Invalidate PnL cache for this wallet so fresh data is fetched
    CacheManager.getInstance().invalidatePattern(`:${walletAddress}`)
    usePnLStore.getState().invalidateWallet(walletAddress)
    fetchPositions(walletAddress)
  }, [walletAddress, fetchPositions])

  // ── Derived data from positions ──
  const positionsEntries = useMemo(() => Array.from(positions.entries()), [positions])
  const positionsArray = useMemo(() => positionsEntries.map(([, pos]) => pos), [positionsEntries])

  const poolAddresses = useMemo(() => positionsEntries.map(([addr]) => addr), [positionsEntries])

  const uniqueMints = useMemo(() => {
    const mintSet = new Set<string>()
    for (const position of positionsArray) {
      mintSet.add(position.tokenX.mint.address.toBase58())
      mintSet.add(position.tokenY.mint.address.toBase58())
    }
    return Array.from(mintSet)
  }, [positionsArray])

  // ── Token data fetching ──
  const [tokenData, setTokenData] = useState<Map<string, TokenInfo>>(new Map())

  useEffect(() => {
    if (positionsArray.length === 0 || uniqueMints.length === 0) {
      setTokenData(new Map())
      return
    }

    let isMounted = true

    createDataServices()
      .tokens.getPrices(uniqueMints)
      .then((data) => {
        if (isMounted) setTokenData(data)
      })

    return () => {
      isMounted = false
    }
  }, [uniqueMints, positionsArray.length])

  // ── PnL fetching ──
  const storeFetchPoolPnL = usePnLStore((s) => s.fetchPoolPnL)
  const poolPnLData = usePnLStore((s) => s.poolPnLData)

  useEffect(() => {
    if (wallet && poolAddresses.length > 0) {
      poolAddresses.forEach((poolAddress) => {
        storeFetchPoolPnL(poolAddress, wallet)
      })
    }
  }, [wallet, poolAddresses, storeFetchPoolPnL])

  // ── Compute view models ──
  const resolvedPositions = useMemo(() => {
    const result: ResolvedPosition[] = []

    for (const [pairAddress, position] of positionsEntries) {
      for (let idx = 0; idx < position.lbPairPositionsData.length; idx++) {
        const lbPosition = position.lbPairPositionsData[idx]
        const positionData = lbPosition?.positionData
        const positionAddress = lbPosition?.publicKey.toBase58() || position.publicKey.toBase58()
        const activeId = Number(position.lbPair.activeId)

        const tokenXMint = position.tokenX.mint.address.toBase58()
        const tokenYMint = position.tokenY.mint.address.toBase58()
        const tokenXInfo = tokenData.get(tokenXMint) ?? null
        const tokenYInfo = tokenData.get(tokenYMint) ?? null

        // Get PnL data for this position
        const pnlCacheKey = `pnl:${pairAddress}:${wallet}`
        const poolPositions = poolPnLData[pnlCacheKey]
        const pnlData = poolPositions ? findPositionPnL(poolPositions, positionAddress) : null

        const vm = computePositionViewData({
          positionData,
          activeId,
          positionAddress,
          poolAddress: pairAddress,
          tokenXInfo,
          tokenYInfo,
          pnlData,
        })

        result.push({
          id: `${position.publicKey.toString()}-${idx}`,
          poolAddress: pairAddress,
          tokenXMint,
          tokenYMint,
          tokenXInfo,
          tokenYInfo,
          position,
          lbPositionIndex: idx,
          vm,
        })
      }
    }

    return result
  }, [positionsEntries, tokenData, poolPnLData, wallet])

  // ── Compute summary and hasPnLData ──
  const { summary, hasPnLData } = useMemo(() => {
    if (poolAddresses.length === 0) return { summary: null, hasPnLData: false }

    const allPositions = poolAddresses.flatMap((pool) => {
      const key = `pnl:${pool}:${wallet}`
      return poolPnLData[key] ?? []
    })

    if (allPositions.length === 0) return { summary: null, hasPnLData: false }

    const aggregated = computePoolPnLSummary(allPositions)
    return {
      summary: {
        ...aggregated,
        positionCount: resolvedPositions.length,
      },
      hasPnLData: true,
    }
  }, [poolAddresses, wallet, poolPnLData, resolvedPositions.length])

  // ── Out-of-range count ──
  const outOfRangeCount = useMemo(() => resolvedPositions.filter((p) => !p.vm.inRange).length, [resolvedPositions])

  const positionCount = resolvedPositions.length

  return {
    positions: resolvedPositions,
    summary,
    hasPnLData,
    outOfRangeCount,
    poolAddresses,
    positionCount,
    loading: isLoading,
    refresh,
    walletResolved,
    walletAddress,
  }
}

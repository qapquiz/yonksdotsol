import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { env } from '../config/env'
import { createPositionPipeline, type PortfolioResult } from '../services/positionPipeline'
import { createMockPortfolioResult } from '../services/mockPortfolio'
import { getCurrentSolUsdPrice } from '../services/solPrice'

// ─── Re-export types for consumers ───────────────────────────────────

export type { ResolvedPosition, PortfolioSummaryData } from '../services/positionPipeline'

// ─── Public types ────────────────────────────────────────────────────

export interface PositionsPageResult {
  /** Fully resolved position view models (token data + PnL baked in) */
  positions: PortfolioResult['positions']
  /** Aggregated portfolio summary */
  summary: PortfolioResult['summary']
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
  /** True when token prices have been resolved (prevents LegendList blank frame) */
  tokenDataReady: boolean
  /** Live SOL→USD price for the SOL/USD display toggle; null while loading or on failure */
  solUsdPrice: number | null
  /** Pull-to-refresh handler */
  refresh: () => void
  /** Wallet resolved status */
  walletResolved: boolean
  /** Wallet address */
  walletAddress?: string
}

// ─── Hook implementation ─────────────────────────────────────────────

export function usePositionsPage(walletAddress: string | undefined, walletResolved: boolean): PositionsPageResult {
  const pipeline = useMemo(() => createPositionPipeline(), [])
  const mockPortfolio = useMemo(() => createMockPortfolioResult(), [])

  const [result, setResult] = useState<PortfolioResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [tokenDataReady, setTokenDataReady] = useState(false)
  const [solUsdPrice, setSolUsdPrice] = useState<number | null>(null)

  // ── Wallet change: invalidate old data, fetch new ──
  const prevWalletRef = useRef<string | null>(null)

  useEffect(() => {
    if (env.devMock) return // dev mock: skip on-chain fetch
    const currentAddress = walletAddress ?? null
    const prevAddress = prevWalletRef.current

    if (prevAddress !== null && prevAddress !== currentAddress) {
      // Invalidate old wallet's cached data
      pipeline.invalidateWallet(prevAddress)
    }

    if (currentAddress !== null && currentAddress !== prevAddress) {
      // Reset loading state, fetch positions
      setTokenDataReady(false)
      setLoading(true)
      setResult(null)

      pipeline.loadPortfolio(currentAddress).then((res) => {
        setResult(res)
        setLoading(false)
        // Signal token data ready: positions exist and at least one has token info,
        // or there are no positions at all (empty state)
        setTokenDataReady(res.positions.length === 0 || res.positions.some((p) => p.tokenXInfo !== null))
      })
      getCurrentSolUsdPrice().then(setSolUsdPrice).catch(() => setSolUsdPrice(null))
    } else if (currentAddress === null && prevAddress !== null) {
      // Disconnected
      setResult(null)
      setLoading(false)
      setSolUsdPrice(null)
    }

    prevWalletRef.current = currentAddress
  }, [walletAddress, pipeline])

  // ── When wallet resolves with no address, show empty state ──
  useEffect(() => {
    if (env.devMock) return
    if (walletResolved && !walletAddress) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      setTokenDataReady(true)
    }
  }, [walletResolved, walletAddress])

  // ── Throttled refresh (30s cooldown) ──
  const lastRefreshRef = useRef(0)
  const refresh = useCallback(() => {
    if (env.devMock) return // dev mock: no-op refresh
    if (!walletAddress) return
    const now = Date.now()
    if (now - lastRefreshRef.current < 30_000) return
    lastRefreshRef.current = now

    pipeline.invalidateWallet(walletAddress)
    setLoading(true)
    pipeline.loadPortfolio(walletAddress).then((res) => {
      setResult(res)
      setLoading(false)
      setTokenDataReady(res.positions.length === 0 || res.positions.some((p) => p.tokenXInfo !== null))
    })
    getCurrentSolUsdPrice().then(setSolUsdPrice).catch(() => setSolUsdPrice(null))
  }, [walletAddress, pipeline])

  // ── Dev mock mode: fetch SOL price once on mount so USD display is testable ──
  useEffect(() => {
    if (!env.devMock) return
    getCurrentSolUsdPrice().then(setSolUsdPrice).catch(() => setSolUsdPrice(null))
  }, [])

  // ── Dev mock mode: return static portfolio, bypass the pipeline ──
  // When "disconnected" (no wallet address), return empty data so the
  // empty state renders — lets us test the connected/empty UX in dev.
  if (env.devMock) {
    if (!walletAddress) {
      return {
        positions: [],
        summary: null,
        hasPnLData: false,
        outOfRangeCount: 0,
        poolAddresses: [],
        positionCount: 0,
        loading: false,
        tokenDataReady: true,
        solUsdPrice,
        refresh,
        walletResolved: true,
        walletAddress,
      }
    }
    return {
      positions: mockPortfolio.positions,
      summary: mockPortfolio.summary,
      hasPnLData: mockPortfolio.hasPnLData,
      outOfRangeCount: mockPortfolio.outOfRangeCount,
      poolAddresses: mockPortfolio.poolAddresses,
      positionCount: mockPortfolio.positionCount,
      loading: false,
      tokenDataReady: true,
      solUsdPrice,
      refresh,
      walletResolved: true,
      walletAddress,
    }
  }

  return {
    positions: result?.positions ?? [],
    summary: result?.summary ?? null,
    hasPnLData: result?.hasPnLData ?? false,
    outOfRangeCount: result?.outOfRangeCount ?? 0,
    poolAddresses: result?.poolAddresses ?? [],
    positionCount: result?.positionCount ?? 0,
    loading,
    tokenDataReady,
    solUsdPrice,
    refresh,
    walletResolved,
    walletAddress,
  }
}

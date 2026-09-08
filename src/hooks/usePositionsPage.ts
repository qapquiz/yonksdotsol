import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { env } from '../config/env'
import { Observe } from '../observe'
import { createMockPortfolioResult, MOCK_SOL_USD_PRICE } from '../services/mockPortfolio'
import { createPositionPipeline, type PortfolioResult } from '../services/positionPipeline'
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
  /** Refresh handler (pull / button); `silent: true` skips skeleton and spinner (auto-refresh) */
  refresh: (options?: { silent?: boolean }) => void
  /** Wallet ready status */
  walletReady: boolean
  /** Wallet address */
  walletAddress?: string
}

// ─── Hook implementation ─────────────────────────────────────────────

/** Foreground auto-refresh cadence — keeps bin/shape state current without pulls */
const AUTO_REFRESH_INTERVAL_MS = 60_000

export function usePositionsPage(walletAddress: string | undefined, walletReady: boolean): PositionsPageResult {
  const pipeline = useMemo(() => createPositionPipeline(), [])
  const mockPortfolio = useMemo(() => createMockPortfolioResult(), [])

  const [result, setResult] = useState<PortfolioResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [tokenDataReady, setTokenDataReady] = useState(false)
  // Mock mode seeds the SOL price synchronously (no RPC on web); live mode
  // starts null and is filled by the wallet-change / refresh effects below.
  const [solUsdPrice, setSolUsdPrice] = useState<number | null>(env.devMock ? MOCK_SOL_USD_PRICE : null)

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
      getCurrentSolUsdPrice()
        .then(setSolUsdPrice)
        .catch(() => setSolUsdPrice(null))
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
    if (walletReady && !walletAddress) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      setTokenDataReady(true)
    }
  }, [walletReady, walletAddress])

  // ── Throttled refresh (30s cooldown) ──
  const lastRefreshRef = useRef(0)
  const refresh = useCallback(
    (options?: { silent?: boolean }) => {
      if (env.devMock) return // dev mock: no-op refresh
      if (!walletAddress) return
      const now = Date.now()
      if (now - lastRefreshRef.current < 30_000) return
      lastRefreshRef.current = now

      const source = options?.silent ? 'auto' : 'pull'
      pipeline.invalidateWallet(walletAddress)
      // Silent (auto) refreshes keep the current data on screen — no skeleton,
      // no RefreshControl spinner; numbers just update in place.
      if (!options?.silent) setLoading(true)
      const startedAt = Date.now()
      pipeline.loadPortfolio(walletAddress).then((res) => {
        setResult(res)
        setLoading(false)
        setTokenDataReady(res.positions.length === 0 || res.positions.some((p) => p.tokenXInfo !== null))
        Observe.logEvent('positions.refreshed', {
          attributes: { durationMs: Date.now() - startedAt, positionCount: res.positionCount, source },
        })
      })
      getCurrentSolUsdPrice()
        .then(setSolUsdPrice)
        .catch(() => setSolUsdPrice(null))
    },
    [walletAddress, pipeline],
  )

  // ── Foreground auto-refresh (silent; skipped in dev mock) ──
  useEffect(() => {
    if (env.devMock || !walletAddress) return
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') refresh({ silent: true })
    }, AUTO_REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [walletAddress, refresh])

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
        walletReady: true,
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
      walletReady: true,
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
    walletReady,
    walletAddress,
  }
}

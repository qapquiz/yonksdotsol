import { useCallback, useEffect, useRef, useState } from 'react'
import DLMM from '@meteora-ag/dlmm'
import type { BinLiquidity } from '@meteora-ag/dlmm'
import { PublicKey } from '@solana/web3.js'

import { getSharedConnection } from '../config/connection'
import { fetchPoolMeta, type PoolMeta } from '../services/poolMeta'

// ─── Public types ────────────────────────────────────────────────────

/** Display-ready projection of a single DLMM bin for the depth chart. */
export interface PoolBinView {
  binId: number
  /** Numeric price of 1 base token in quote terms (x-axis value). */
  price: number
  /** Pre-formatted price for axis labels. */
  priceLabel: string
  /**
   * Total liquidity held in this bin, expressed in quote-token (Token Y) terms
   * — `yHuman + xHuman * price`. Used only to compare relative depth for bar
   * heights; the absolute value is not shown.
   */
  liquidity: number
}

/** On-chain bin depth + pool primitives required to render the chart. */
export interface PoolDepthData {
  bins: PoolBinView[]
  activeBinId: number
  binStep: number
  decimalsX: number
  decimalsY: number
  mintX: string
  mintY: string
}

export interface UsePoolDepthResult {
  meta: PoolMeta | null
  depth: PoolDepthData | null
  /** The DLMM SDK instance bound to this pool — lets the position overlay reuse it. */
  dlmm: DLMM | null
  loading: boolean
  error: Error | null
  refresh: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Number of bins to fetch on each side of the active bin (71 bins total). */
const BINS_EACH_SIDE = 35

/**
 * Convert a raw DLMM bin into a chart-ready view. Liquidity is valued in
 * quote (Token Y) terms so bins on both sides of the active bin share one
 * axis. `Number()` on the BN `.toString()` is safe here: we only compare
 * relative magnitudes for bar heights, so precision loss past 2^53 is
 * immaterial, and doubles cannot overflow on realistic token supplies.
 */
function projectBin(bin: BinLiquidity, decimalsX: number, decimalsY: number): PoolBinView {
  const pricePerToken = Number(bin.pricePerToken)
  const price = Number.isFinite(pricePerToken) && pricePerToken > 0 ? pricePerToken : Number(bin.price)

  const xHuman = Number(bin.xAmount.toString()) / 10 ** decimalsX
  const yHuman = Number(bin.yAmount.toString()) / 10 ** decimalsY
  const liquidity = yHuman + xHuman * price

  return {
    binId: bin.binId,
    price,
    priceLabel: formatPriceLabel(price),
    liquidity: Number.isFinite(liquidity) ? liquidity : 0,
  }
}

/** Compact price formatting that copes with tiny meme-token prices. */
function formatPriceLabel(price: number): string {
  if (!Number.isFinite(price) || price === 0) return '0'
  return price.toPrecision(6)
}

/**
 * Build on-chain depth via the DLMM SDK. The chart's core data — bins,
 * active bin id, bin step, and token decimals/mints — all come from here.
 */
interface OnChainDepthResult {
  depth: PoolDepthData
  /** Returned alongside the depth so the position overlay can reuse the SDK instance. */
  dlmm: DLMM
}

async function loadOnChainDepth(pairAddress: string): Promise<OnChainDepthResult> {
  const dlmm = await DLMM.create(getSharedConnection(), new PublicKey(pairAddress))

  const { activeBin, bins } = await dlmm.getBinsAroundActiveBin(BINS_EACH_SIDE, BINS_EACH_SIDE)
  const decimalsX = dlmm.tokenX.mint.decimals
  const decimalsY = dlmm.tokenY.mint.decimals

  const projected = bins.map((bin) => projectBin(bin, decimalsX, decimalsY))

  const depth: PoolDepthData = {
    bins: projected,
    activeBinId: activeBin,
    binStep: dlmm.lbPair.binStep,
    decimalsX,
    decimalsY,
    mintX: dlmm.tokenX.mint.address.toBase58(),
    mintY: dlmm.tokenY.mint.address.toBase58(),
  }

  return { depth, dlmm }
}

// ─── Hook ────────────────────────────────────────────────────────────

/**
 * Load everything the Pool Depth view needs: on-chain bin depth (required)
 * plus REST metadata (best-effort enrichment — symbols, name, TVL, fees).
 *
 * The two sources are fetched in parallel. On-chain failure is fatal (the
 * chart cannot render without bins); REST failure is tolerated and surfaces
 * only as missing header badges, never as a screen-level error.
 */
export function usePoolDepth(pairAddress: string | undefined): UsePoolDepthResult {
  const [meta, setMeta] = useState<PoolMeta | null>(null)
  const [depth, setDepth] = useState<PoolDepthData | null>(null)
  const [dlmm, setDlmm] = useState<DLMM | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!pairAddress) {
      return
    }

    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- flags spinner before async load (same pattern as usePoolOhlcv/usePositionsPage)
    setLoading(true)
    setError(null)

    Promise.allSettled([loadOnChainDepth(pairAddress), fetchPoolMeta(pairAddress)])
      .then(([depthResult, metaResult]) => {
        if (!active || !mountedRef.current) return

        // On-chain depth is the load-bearing fetch.
        if (depthResult.status === 'fulfilled') {
          setDepth(depthResult.value.depth)
          setDlmm(depthResult.value.dlmm)
          setError(null)
        } else {
          const reason = depthResult.reason
          const err = reason instanceof Error ? reason : new Error(String(reason))
          console.error('[usePoolDepth] on-chain depth failed:', err)
          setDepth(null)
          setDlmm(null)
          setError(err)
        }

        // REST meta is best-effort enrichment.
        if (metaResult.status === 'fulfilled') {
          setMeta(metaResult.value)
        } else {
          const reason = metaResult.reason
          const err = reason instanceof Error ? reason : new Error(String(reason))
          console.error('[usePoolDepth] pool meta failed:', err)
          setMeta(null)
        }
      })
      .finally(() => {
        if (active && mountedRef.current) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [pairAddress, refreshKey])

  return { meta, depth, dlmm, loading, error, refresh }
}

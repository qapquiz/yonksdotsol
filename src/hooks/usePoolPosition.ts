import type DLMM from '@meteora-ag/dlmm'
import { PublicKey } from '@solana/web3.js'
import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Public types ────────────────────────────────────────────────────

/** One bin's worth of a connected-wallet position. */
export interface UserPositionBinView {
  binId: number
  /** This position's Token X amount in the bin (raw base units). */
  positionXAmount: bigint
  /** This position's Token Y amount in the bin (raw base units). */
  positionYAmount: bigint
  /** Total Token X held in the bin across all positions (raw base units). */
  binXAmount: bigint
  /** Total Token Y held in the bin across all positions (raw base units). */
  binYAmount: bigint
  /** This position's share of the bin's total liquidity, by value (0..1). */
  share: number
}

/** A single connected-wallet position in this pool. */
export interface UserPositionView {
  id: string
  publicKey: string
  lowerBinId: number
  upperBinId: number
  /** Position-wide Token X total across the whole range (raw base units). */
  totalXAmount: bigint
  /** Position-wide Token Y total across the whole range (raw base units). */
  totalYAmount: bigint
  /** Per-bin liquidity, one entry per bin the position touches. */
  bins: UserPositionBinView[]
}

export interface UsePoolPositionResult {
  positions: UserPositionView[]
  loading: boolean
  error: Error | null
  refresh: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Parse an SDK amount string into a BigInt. DLMM amounts are integer base
 * units, but we guard against stray decimals or non-numeric values so a
 * malformed field can never crash the depth view.
 */
function toBigInt(value: string | undefined | null): bigint {
  if (!value) return 0n
  try {
    return value.includes('.') ? BigInt(value.split('.')[0] ?? '0') : BigInt(value)
  } catch {
    return 0n
  }
}

/**
 * Position's share of a bin's total liquidity, valued in quote (Token Y) terms
 * using the bin's own `pricePerToken`. `Number()` is safe here: this is a ratio,
 * so precision loss past 2^53 in numerator and denominator cancels for a 0..1
 * visualization (we only drive bar heights with it).
 */
function computeShare(positionX: string, positionY: string, binX: string, binY: string, pricePerToken: string): number {
  const price = Number(pricePerToken)
  const binValue = Number(binY) + Number(binX) * price
  if (!Number.isFinite(binValue) || binValue <= 0) return 0
  const posValue = Number(positionY) + Number(positionX) * price
  const share = posValue / binValue
  if (!Number.isFinite(share) || share < 0) return 0
  return Math.min(share, 1)
}

/** Positions are stored tagged with the wallet that fetched them. */
interface FetchedPositions {
  wallet: string
  positions: UserPositionView[]
}

// ─── Hook ────────────────────────────────────────────────────────────

/**
 * Fetch the connected wallet's positions in a single pool, reusing the depth
 * view's `DLMM` instance.
 *
 * Connected-wallet only: pass `walletAddress = undefined` to skip the fetch
 * entirely — the hook never queries another wallet, and returned positions are
 * scoped to the *current* address so a stale fetch from a previous wallet is
 * never exposed. Best-effort: a failed fetch surfaces as `error` + empty
 * positions and never blocks the depth view.
 */
export function usePoolPosition(dlmm: DLMM | null, walletAddress: string | undefined): UsePoolPositionResult {
  const [fetched, setFetched] = useState<FetchedPositions | null>(null)
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
    // Connected-wallet only: never fetch without an address.
    if (!dlmm || !walletAddress) {
      return
    }

    const owner = walletAddress
    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- flags spinner before async load (same pattern as usePoolDepth)
    setLoading(true)
    setError(null)

    dlmm
      .getPositionsByUserAndLbPair(new PublicKey(owner))
      .then(({ userPositions }) => {
        if (!active || !mountedRef.current) return

        const views: UserPositionView[] = userPositions.map((lp, index) => {
          const pd = lp.positionData
          const bins: UserPositionBinView[] = pd.positionBinData.map((b) => ({
            binId: b.binId,
            positionXAmount: toBigInt(b.positionXAmount),
            positionYAmount: toBigInt(b.positionYAmount),
            binXAmount: toBigInt(b.binXAmount),
            binYAmount: toBigInt(b.binYAmount),
            share: computeShare(b.positionXAmount, b.positionYAmount, b.binXAmount, b.binYAmount, b.pricePerToken),
          }))

          return {
            id: `${lp.publicKey.toBase58()}-${index}`,
            publicKey: lp.publicKey.toBase58(),
            lowerBinId: pd.lowerBinId,
            upperBinId: pd.upperBinId,
            totalXAmount: toBigInt(pd.totalXAmount),
            totalYAmount: toBigInt(pd.totalYAmount),
            bins,
          }
        })

        setFetched({ wallet: owner, positions: views })
        setError(null)
      })
      .catch((reason: unknown) => {
        if (!active || !mountedRef.current) return
        const err = reason instanceof Error ? reason : new Error(String(reason))
        console.error('[usePoolPosition] failed:', err)
        setFetched({ wallet: owner, positions: [] })
        setError(err)
      })
      .finally(() => {
        if (active && mountedRef.current) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [dlmm, walletAddress, refreshKey])

  // Never expose another wallet's positions — only the current owner's.
  const isCurrent = fetched != null && walletAddress !== undefined && fetched.wallet === walletAddress

  return {
    positions: isCurrent ? fetched.positions : [],
    loading: walletAddress !== undefined ? loading : false,
    error: isCurrent ? error : null,
    refresh,
  }
}

import { useCallback, useEffect, useRef, useState } from 'react'

import { applySafetyDefaults, fetchTopPools, type ExplorePool } from '../services/pools'

export interface UseExplorePoolsResult {
  /** Safety-filtered top pools (sorted by 24h volume desc). */
  pools: ExplorePool[]
  /** Total pool count reported by the API (across all pages). */
  total: number
  loading: boolean
  error: Error | null
  refresh: () => void
}

/**
 * Load the Explore discovery list: page-1 top-volume DLMM pools from the
 * Meteora REST API, filtered client-side by the safety defaults (Token X
 * market cap + 24h volume floors).
 *
 * Unauthenticated — no wallet required. Mirrors the usePoolDepth lifecycle:
 * mounted guard, refreshKey-driven reload, try/catch with console.error.
 *
 * NOTE: pagination beyond page 1 is a future task — only the first page is
 * surfaced today.
 */
export function useExplorePools(): UseExplorePoolsResult {
  const [pools, setPools] = useState<ExplorePool[]>([])
  const [total, setTotal] = useState(0)
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
    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- flags spinner before async load (same pattern as usePoolDepth/usePoolOhlcv)
    setLoading(true)
    setError(null)

    fetchTopPools()
      .then((page) => {
        if (!active || !mountedRef.current) return
        setTotal(page.total)
        setPools(applySafetyDefaults(page.pools))
        setError(null)
      })
      .catch((reason: unknown) => {
        if (!active || !mountedRef.current) return
        const err = reason instanceof Error ? reason : new Error(String(reason))
        console.error('[useExplorePools] fetch failed:', err)
        setPools([])
        setTotal(0)
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
  }, [refreshKey])

  return { pools, total, loading, error, refresh }
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { applySafetyDefaults, fetchTopPools, type ExplorePool, type PoolOrderBy } from '../services/pools'

export interface UseExplorePoolsResult {
  /** Safety-filtered pools, client-sorted by the active sort. */
  pools: ExplorePool[]
  /** Total pool count reported by the API (across all pages). */
  total: number
  loading: boolean
  error: Error | null
  refresh: () => void
}

/** Candidate page size — larger than the API default (10) so APR (client-sorted) has more to rank. */
const CANDIDATE_PAGE_SIZE = 100

/**
 * Load the Explore discovery list.
 *
 * The Meteora `/pools` endpoint does NOT honor `order_by=apr` (it silently
 * returns the volume order), so APR sorting is done client-side: fetch a
 * larger top-volume page as the candidate set, apply the safety defaults
 * (Token X market cap + 24h volume floors), then sort by the user's choice —
 * volume keeps the API order; APR re-orders the filtered set by apr desc.
 *
 * Unauthenticated — no wallet required. NOTE: pagination beyond this
 * candidate page is a future task.
 */
export function useExplorePools(sortBy: PoolOrderBy = 'volume_usd_24h'): UseExplorePoolsResult {
  const [filtered, setFiltered] = useState<ExplorePool[]>([])
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

    fetchTopPools({ orderBy: 'volume_usd_24h', pageSize: CANDIDATE_PAGE_SIZE })
      .then((page) => {
        if (!active || !mountedRef.current) return
        setTotal(page.total)
        setFiltered(applySafetyDefaults(page.pools))
        setError(null)
      })
      .catch((reason: unknown) => {
        if (!active || !mountedRef.current) return
        const err = reason instanceof Error ? reason : new Error(String(reason))
        console.error('[useExplorePools] fetch failed:', err)
        setFiltered([])
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

  const pools = useMemo(() => {
    if (sortBy === 'apr') {
      return [...filtered].sort((a, b) => (b.apr ?? -Infinity) - (a.apr ?? -Infinity))
    }
    return filtered
  }, [filtered, sortBy])

  return { pools, total, loading, error, refresh }
}

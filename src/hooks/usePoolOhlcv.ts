import { useEffect, useRef, useState } from 'react'
import { createDataServices } from '../services/data'
import { DEFAULT_OHLCV_TIMEFRAME, type OhlcvSeries, type OhlcvTimeframe } from '../services/ohlcv'
import { env } from '../config/env'

export interface UsePoolOhlcvResult {
  data: OhlcvSeries | null
  loading: boolean
  error: Error | null
}

/**
 * Lazily fetch display-only OHLCV candles for a pool.
 *
 * Fires on mount; the CacheManager handles TTL freshness and cross-card
 * dedup (one fetch per pool even with many positions). Self-guards
 * `env.devMock` — mock mode renders no price line, consistent with the
 * static mock portfolio.
 *
 * Per ADR 0001, this data is display-only and never enters the PnL/value
 * pipeline.
 */
export function usePoolOhlcv(
  pairAddress: string | null,
  timeframe: OhlcvTimeframe = DEFAULT_OHLCV_TIMEFRAME,
): UsePoolOhlcvResult {
  const [data, setData] = useState<OhlcvSeries | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!pairAddress || env.devMock) {
      return // nothing to fetch; initial state is already null/false
    }

    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- flags spinner before async fetch (same pattern as usePositionsPage)
    setLoading(true)

    createDataServices()
      .ohlcv.getOhlcv(pairAddress, timeframe)
      .then((series) => {
        if (active && mountedRef.current) {
          setData(series)
          setError(null)
        }
      })
      .catch((e: unknown) => {
        if (active && mountedRef.current) {
          setError(e instanceof Error ? e : new Error(String(e)))
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
  }, [pairAddress, timeframe])

  return { data, loading, error }
}

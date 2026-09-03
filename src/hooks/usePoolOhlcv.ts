import { useEffect, useRef, useState } from 'react'
import { createDataServices } from '../services/data'
import { DEFAULT_OHLCV_TIMEFRAME, type OhlcvSeries, type OhlcvTimeframe } from '../services/ohlcv'
import { getMockOhlcv } from '../services/mockOhlcv'
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
 * dedup (one fetch per pool even with many positions). In `env.devMock`
 * it serves a deterministic mock series instead (see `mockOhlcv.ts`) so
 * the web preview renders candles without wallet, RPC, or network.
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
    if (!pairAddress) {
      return
    }

    if (env.devMock) {
      // Mock mode: deterministic synthetic candles (display-only, same
      // series shape as the real fetch — exercises the identical render path).
      const series = getMockOhlcv(pairAddress, timeframe)
      /* eslint-disable react-hooks/set-state-in-effect -- synchronous mock path: sets the settled state directly, same rationale as setLoading below */
      if (series) {
        setData(series)
        setError(null)
      }
      /* eslint-enable react-hooks/set-state-in-effect */
      return
    }

    let active = true

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

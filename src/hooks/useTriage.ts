import { useEffect, useMemo, useRef, useState } from 'react'
import { createDataServices } from '../services/data'
import type { OhlcvCandle, OhlcvTimeframe } from '../services/ohlcv'
import type { ResolvedPosition } from '../services/positionPipeline'
import { computeTriage, isNearEdge, type TriageResult } from '../utils/positions/triage'

/** Shorter than the chart's 4h default — we want hours-scale velocity. */
const TRIAGE_VELOCITY_TIMEFRAME: OhlcvTimeframe = '1h'

export interface UseTriageResult {
  triage: TriageResult | null
  /** true while near-edge OHLCV velocity data is still loading */
  velocityLoading: boolean
}

/**
 * Compute the portfolio triage view from resolved positions.
 *
 * - The **bleeding** tier is available immediately (needs only `vm` fields).
 * - The **near-edge** tier's `timeToEdgeHours` needs recent OHLCV per pool; we
 *   fetch it only for pools that have a near-edge candidate (CacheManager
 *   dedupes per pool + TTL), and the items fill in progressively.
 *
 * Returns `triage: null` until the first computation settles.
 */
export function useTriage(positions: ResolvedPosition[]): UseTriageResult {
  // Pools that have ≥1 near-edge candidate — only these need an OHLCV fetch.
  const candidatePools = useMemo(() => {
    const set = new Set<string>()
    for (const p of positions) {
      if (isNearEdge({ liquidityShape: p.vm.liquidityShape })) {
        const addr = p.vm.liquidityShape?.pairAddress ?? p.poolAddress
        if (addr) set.add(addr)
      }
    }
    return Array.from(set)
  }, [positions])

  const [candlesByPool, setCandlesByPool] = useState<Record<string, OhlcvCandle[]>>({})
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (candidatePools.length === 0) return
    let active = true
    const svcs = createDataServices()
    Promise.all(
      candidatePools.map((addr) =>
        svcs.ohlcv
          .getOhlcv(addr, TRIAGE_VELOCITY_TIMEFRAME)
          .then((series) => [addr, series.candles] as const)
          .catch(() => [addr, [] as OhlcvCandle[]] as const),
      ),
    ).then((entries) => {
      if (!active || !mountedRef.current) return
      const map: Record<string, OhlcvCandle[]> = {}
      for (const [addr, c] of entries) map[addr] = c
      setCandlesByPool(map)
    })
    return () => {
      active = false
    }
  }, [candidatePools])

  const triage = useMemo(
    () =>
      computeTriage(
        positions.map((p) => ({
          positionId: p.id,
          pairAddress: p.vm.liquidityShape?.pairAddress ?? p.poolAddress,
          totalValueUsd: p.vm.totalValueUsd,
          feesTvl24h: p.vm.feesTvl24h,
          inRange: p.vm.inRange,
          liquidityShape: p.vm.liquidityShape,
        })),
        candlesByPool,
      ),
    [positions, candlesByPool],
  )

  const velocityLoading = candidatePools.length > 0 && Object.keys(candlesByPool).length < candidatePools.length

  return { triage, velocityLoading }
}

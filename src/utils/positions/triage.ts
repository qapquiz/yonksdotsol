import type { OhlcvCandle } from '../../services/ohlcv'
import type { LiquidityShape } from './computePositionViewData'

// ── Defaults (settled in plan 013; tunable) ──────────────────────────
/** A position is "near" its edge when the active bin is within this many bins. */
export const NEAR_EDGE_BIN_THRESHOLD = 2
/** Ignore price drift slower than this fraction of price over the velocity window. */
const VELOCITY_EPSILON_FRACTION = 0.0005
/** Trailing candle window for the velocity estimate. */
const VELOCITY_WINDOW = 6

// ── Foregone-fee urgency rate ────────────────────────────────────────
export interface ForegoneRateInput {
  totalValueUsd: number
  feesTvl24h: number | null // daily ratio (0.0131 = 1.31%/day)
  inRange: boolean
}

/**
 * $/hr a position is not earning while out of range.
 *
 * Applies the pool-level `feesTvl24h` (24h fees/TVL, a daily ratio) to the
 * position's value and divides by 24 → hourly. This is a first-order estimate:
 * it assumes the position would earn the pool-average rate if it were in range,
 * which is not true for concentrated/uneven positions. Acceptable for a glance.
 *
 * Returns 0 when in range or when either input is missing.
 */
export function foregoneFeeRateUsdPerHour(p: ForegoneRateInput): number {
  if (p.inRange || p.feesTvl24h == null || !Number.isFinite(p.totalValueUsd)) return 0
  return (p.totalValueUsd * p.feesTvl24h) / 24
}

// ── Near-edge detection (trigger = bins-from-edge; reliable, no modeling) ──
export interface NearEdgeInput {
  liquidityShape: LiquidityShape | null
}

/**
 * Bins from the active bin to the position's nearest edge.
 * null when there is no shape, or when the position is already out of range
 * (out-of-range is handled by the foregone-fee path, not the near-edge path).
 */
export function binsFromEdge(s: NearEdgeInput): number | null {
  const shape = s.liquidityShape
  if (!shape) return null
  const { minBinId, maxBinId } = shape.binRange
  const active = shape.currentActiveId
  if (active < minBinId || active > maxBinId) return null
  return Math.min(active - minBinId, maxBinId - active)
}

export function isNearEdge(s: NearEdgeInput): boolean {
  const d = binsFromEdge(s)
  return d !== null && d <= NEAR_EDGE_BIN_THRESHOLD
}

// ── Time-to-edge (display only; gated by isNearEdge so it can't cry wolf) ──
/**
 * Hours until price crosses the position's nearest edge, estimated from recent
 * OHLCV drift.
 *
 * Returns null when: no shape; out of range; fewer than 2 candles; velocity
 * below epsilon; or price moving AWAY from the edge. It never returns a scary
 * number from noise — callers always pair it with `isNearEdge()`, whose
 * discrete bin-distance trigger gates entry into the "About to bleed" tier.
 *
 * Display-only estimate (ADR 0001); never feeds any stored figure.
 */
export function timeToEdgeHours(args: {
  liquidityShape: LiquidityShape | null
  candles: OhlcvCandle[]
}): number | null {
  const shape = args.liquidityShape
  const candles = args.candles
  if (!shape || candles.length < 2) return null

  const { minBinId, maxBinId } = shape.binRange
  const active = shape.currentActiveId
  if (active < minBinId || active > maxBinId) return null

  // Which edge is the active bin closest to?
  const approachingLower = active - minBinId <= maxBinId - active
  const edgeBinId = approachingLower ? minBinId : maxBinId
  const edgeBin = shape.binDistribution.find((b) => b.binId === edgeBinId)
  if (!edgeBin || !Number.isFinite(edgeBin.price) || edgeBin.price <= 0) return null
  const edgePrice = edgeBin.price

  const last = candles[candles.length - 1]
  const currentPrice = last.close
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return null

  // Velocity from a trailing window, using real candle timestamps (robust to
  // timeframe): price-units per hour, signed.
  const n = Math.min(candles.length - 1, VELOCITY_WINDOW)
  const recent = candles[candles.length - 1 - n]
  const dtSec = last.timestamp - recent.timestamp
  if (dtSec <= 0) return null
  const velocity = (currentPrice - recent.close) / (dtSec / 3600)
  if (!Number.isFinite(velocity)) return null

  // towardEdgeRate > 0 means price is moving toward the respective edge.
  const towardEdgeRate = approachingLower ? -velocity : velocity
  const epsilon = currentPrice * VELOCITY_EPSILON_FRACTION
  if (towardEdgeRate <= epsilon) return null // stable, or drifting away from the edge

  const distance = approachingLower ? currentPrice - edgePrice : edgePrice - currentPrice
  if (distance <= 0) return null // already at/past the edge

  const hours = distance / towardEdgeRate
  return Number.isFinite(hours) && hours > 0 ? hours : null
}

// ── Two-tier triage aggregator ───────────────────────────────────────
export interface TriagePositionInput {
  positionId: string
  pairAddress: string
  totalValueUsd: number
  feesTvl24h: number | null
  inRange: boolean
  liquidityShape: LiquidityShape | null
}

export type TriageTier = 'bleeding' | 'near-edge'

export interface TriageItem {
  positionId: string
  tier: TriageTier
  /** $/hr not earning. 0 for near-edge items (they are still earning). */
  foregoneUsdPerHour: number
  binsFromEdge: number | null
  timeToEdgeHours: number | null
}

export interface TriageResult {
  /** Bleeding-first, then near-edge. */
  items: TriageItem[]
  /** Sum of bleeding-tier foregone rates — the urgency hero number. */
  totalForegoneUsdPerHour: number
}

/**
 * Build the two-tier triage result + the aggregate urgency rate.
 *
 * - Tier 1 "Bleeding now" = out-of-range positions, sorted by
 *   `foregoneUsdPerHour` desc.
 * - Tier 2 "About to bleed" = in-range AND near-edge, sorted by
 *   `timeToEdgeHours` asc (nulls last).
 * - `totalForegoneUsdPerHour` sums tier 1 only; near-edge items contribute 0
 *   (they are still earning).
 */
export function computeTriage(
  positions: TriagePositionInput[],
  candlesByPool: Record<string, OhlcvCandle[]>,
): TriageResult {
  const bleeding: TriageItem[] = []
  const nearEdge: TriageItem[] = []
  let totalForegoneUsdPerHour = 0

  for (const p of positions) {
    if (!p.inRange) {
      const foregone = foregoneFeeRateUsdPerHour(p)
      totalForegoneUsdPerHour += foregone
      bleeding.push({
        positionId: p.positionId,
        tier: 'bleeding',
        foregoneUsdPerHour: foregone,
        binsFromEdge: null,
        timeToEdgeHours: null,
      })
    } else if (isNearEdge({ liquidityShape: p.liquidityShape })) {
      const candles = p.pairAddress ? (candlesByPool[p.pairAddress] ?? []) : []
      nearEdge.push({
        positionId: p.positionId,
        tier: 'near-edge',
        foregoneUsdPerHour: 0,
        binsFromEdge: binsFromEdge({ liquidityShape: p.liquidityShape }),
        timeToEdgeHours: timeToEdgeHours({ liquidityShape: p.liquidityShape, candles }),
      })
    }
  }

  bleeding.sort((a, b) => b.foregoneUsdPerHour - a.foregoneUsdPerHour)
  nearEdge.sort((a, b) => {
    if (a.timeToEdgeHours == null && b.timeToEdgeHours == null) return 0
    if (a.timeToEdgeHours == null) return 1
    if (b.timeToEdgeHours == null) return -1
    return a.timeToEdgeHours - b.timeToEdgeHours
  })

  return { items: [...bleeding, ...nearEdge], totalForegoneUsdPerHour }
}

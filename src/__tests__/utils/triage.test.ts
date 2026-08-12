import { describe, it, expect } from 'vitest'
import type { OhlcvCandle } from '../../services/ohlcv'
import type { LiquidityShape } from '../../utils/positions/computePositionViewData'
import {
  foregoneFeeRateUsdPerHour,
  binsFromEdge,
  isNearEdge,
  timeToEdgeHours,
  computeTriage,
  NEAR_EDGE_BIN_THRESHOLD,
} from '../../utils/positions/triage'

// ── Fixtures ─────────────────────────────────────────────────────────

/** Build a LiquidityShape with a bin range; price defaults to binId * 0.01. */
function makeShape(opts: {
  min: number
  max: number
  active: number
  price?: (binId: number) => number
}): LiquidityShape {
  const { min, max, active } = opts
  const price = opts.price ?? ((id: number) => id * 0.01)
  const binDistribution = []
  for (let id = min; id <= max; id++) {
    binDistribution.push({ binId: id, positionXAmountInSOL: 1, positionYAmountInSOL: 1, price: price(id) })
  }
  return {
    positionAddress: 'p',
    pairAddress: 'pool',
    binRange: { minBinId: min, maxBinId: max, totalBins: max - min + 1 },
    binDistribution,
    tokenTotals: { tokenX: 0, tokenY: 0 },
    currentActiveId: active,
  }
}

/** Build a candle series (oldest first); all OHLC = close, 1h apart. */
function candles(closes: number[], hoursPerStep = 1): OhlcvCandle[] {
  const base = 1_000_000
  return closes.map((c, i) => ({
    timestamp: base + i * hoursPerStep * 3600,
    open: c,
    high: c,
    low: c,
    close: c,
    volume: 0,
  }))
}

// ── foregoneFeeRateUsdPerHour ────────────────────────────────────────

describe('foregoneFeeRateUsdPerHour', () => {
  it('returns 0 when in range', () => {
    expect(foregoneFeeRateUsdPerHour({ totalValueUsd: 1000, feesTvl24h: 0.0131, inRange: true })).toBe(0)
  })

  it('returns 0 when feesTvl24h is null', () => {
    expect(foregoneFeeRateUsdPerHour({ totalValueUsd: 1000, feesTvl24h: null, inRange: false })).toBe(0)
  })

  it('computes the hourly foregone rate from the daily ratio', () => {
    // 1000 * 0.0131 / 24 = 0.5458...
    expect(foregoneFeeRateUsdPerHour({ totalValueUsd: 1000, feesTvl24h: 0.0131, inRange: false })).toBeCloseTo(
      (1000 * 0.0131) / 24,
      10,
    )
  })
})

// ── binsFromEdge ─────────────────────────────────────────────────────

describe('binsFromEdge', () => {
  it('returns null when there is no shape', () => {
    expect(binsFromEdge({ liquidityShape: null })).toBeNull()
  })

  it('returns null when out of range (active below min)', () => {
    expect(binsFromEdge({ liquidityShape: makeShape({ min: 100, max: 110, active: 99 }) })).toBeNull()
  })

  it('returns null when out of range (active above max)', () => {
    expect(binsFromEdge({ liquidityShape: makeShape({ min: 100, max: 110, active: 111 }) })).toBeNull()
  })

  it('returns the distance to the nearest edge', () => {
    expect(binsFromEdge({ liquidityShape: makeShape({ min: 100, max: 110, active: 105 }) })).toBe(5)
    expect(binsFromEdge({ liquidityShape: makeShape({ min: 100, max: 110, active: 101 }) })).toBe(1)
    expect(binsFromEdge({ liquidityShape: makeShape({ min: 100, max: 110, active: 109 }) })).toBe(1)
  })
})

// ── isNearEdge ───────────────────────────────────────────────────────

describe('isNearEdge', () => {
  it(`is true at the threshold of ${NEAR_EDGE_BIN_THRESHOLD} bins`, () => {
    expect(isNearEdge({ liquidityShape: makeShape({ min: 100, max: 110, active: 102 }) })).toBe(true)
    expect(isNearEdge({ liquidityShape: makeShape({ min: 100, max: 110, active: 108 }) })).toBe(true)
  })

  it('is false beyond the threshold', () => {
    expect(isNearEdge({ liquidityShape: makeShape({ min: 100, max: 110, active: 103 }) })).toBe(false)
  })

  it('is false when out of range', () => {
    expect(isNearEdge({ liquidityShape: makeShape({ min: 100, max: 110, active: 120 }) })).toBe(false)
  })

  it('is false when there is no shape', () => {
    expect(isNearEdge({ liquidityShape: null })).toBe(false)
  })
})

// ── timeToEdgeHours ──────────────────────────────────────────────────

describe('timeToEdgeHours', () => {
  it('returns null with fewer than 2 candles', () => {
    const shape = makeShape({ min: 100, max: 110, active: 101 })
    expect(timeToEdgeHours({ liquidityShape: shape, candles: [candle(1.02)] })).toBeNull()
  })

  it('returns null when price is stable (no drift)', () => {
    const shape = makeShape({ min: 100, max: 110, active: 101 })
    expect(timeToEdgeHours({ liquidityShape: shape, candles: candles([1.04, 1.04, 1.04]) })).toBeNull()
  })

  it('returns null when price is moving AWAY from the nearest edge', () => {
    // active=101 → approaching the LOWER edge (1.00); price rising → away.
    const shape = makeShape({ min: 100, max: 110, active: 101 })
    expect(timeToEdgeHours({ liquidityShape: shape, candles: candles([1.02, 1.03, 1.04, 1.05]) })).toBeNull()
  })

  it('estimates finite hours when price drifts toward the lower edge', () => {
    // active=101 → lower edge at bin 100 → edgePrice 1.00.
    // Price drops 1.05 → 1.02 over 6h: velocity = -0.005/hr → towardEdgeRate 0.005/hr.
    // distance = 1.02 - 1.00 = 0.02 → hours = 0.02 / 0.005 = 4.
    const shape = makeShape({ min: 100, max: 110, active: 101 })
    const series = candles([1.05, 1.045, 1.04, 1.035, 1.03, 1.025, 1.02])
    expect(timeToEdgeHours({ liquidityShape: shape, candles: series })).toBeCloseTo(4, 6)
  })

  it('estimates finite hours when price drifts toward the upper edge', () => {
    // active=109 → upper edge at bin 110 → edgePrice 1.10.
    // Price rises 1.05 → 1.08 over 6h: velocity = +0.005/hr.
    // distance = 1.10 - 1.08 = 0.02 → hours = 0.02 / 0.005 = 4.
    const shape = makeShape({ min: 100, max: 110, active: 109 })
    const series = candles([1.05, 1.055, 1.06, 1.065, 1.07, 1.075, 1.08])
    expect(timeToEdgeHours({ liquidityShape: shape, candles: series })).toBeCloseTo(4, 6)
  })

  it('returns null when there is no shape', () => {
    expect(timeToEdgeHours({ liquidityShape: null, candles: candles([1, 2]) })).toBeNull()
  })
})

function candle(close: number): OhlcvCandle {
  return { timestamp: 1_000_000, open: close, high: close, low: close, close, volume: 0 }
}

// ── computeTriage ────────────────────────────────────────────────────

describe('computeTriage', () => {
  it('returns an empty result for no positions', () => {
    expect(computeTriage([], {})).toEqual({ items: [], totalForegoneUsdPerHour: 0 })
  })

  it('places an out-of-range position in the bleeding tier and sums its rate', () => {
    const res = computeTriage(
      [
        {
          positionId: 'a',
          pairAddress: 'p1',
          totalValueUsd: 1000,
          feesTvl24h: 0.0131,
          inRange: false,
          liquidityShape: null,
        },
      ],
      {},
    )
    expect(res.items).toHaveLength(1)
    expect(res.items[0].tier).toBe('bleeding')
    expect(res.items[0].foregoneUsdPerHour).toBeCloseTo((1000 * 0.0131) / 24, 10)
    expect(res.totalForegoneUsdPerHour).toBeCloseTo((1000 * 0.0131) / 24, 10)
  })

  it('places a near-edge in-range position in tier 2 WITHOUT adding to the total', () => {
    const shape = makeShape({ min: 100, max: 110, active: 101 })
    const res = computeTriage(
      [
        {
          positionId: 'b',
          pairAddress: 'p2',
          totalValueUsd: 500,
          feesTvl24h: 0.02,
          inRange: true,
          liquidityShape: shape,
        },
      ],
      {}, // no candles → timeToEdgeHours null
    )
    expect(res.items).toHaveLength(1)
    expect(res.items[0].tier).toBe('near-edge')
    expect(res.items[0].foregoneUsdPerHour).toBe(0)
    expect(res.items[0].timeToEdgeHours).toBeNull()
    expect(res.totalForegoneUsdPerHour).toBe(0) // near-edge contributes nothing
  })

  it('sorts bleeding items by foregone rate descending', () => {
    const res = computeTriage(
      [
        {
          positionId: 'small',
          pairAddress: 'p',
          totalValueUsd: 100,
          feesTvl24h: 0.01,
          inRange: false,
          liquidityShape: null,
        },
        {
          positionId: 'big',
          pairAddress: 'p',
          totalValueUsd: 10000,
          feesTvl24h: 0.01,
          inRange: false,
          liquidityShape: null,
        },
      ],
      {},
    )
    expect(res.items.map((i) => i.positionId)).toEqual(['big', 'small'])
  })

  it('sorts near-edge items by timeToEdgeHours ascending, nulls last', () => {
    const shapeWithHours = (active: number): LiquidityShape => makeShape({ min: 100, max: 110, active })
    // 'fast': 4h to edge; 'slow': larger distance → more hours; 'unknown': no candles → null
    const fastShape = shapeWithHours(101) // drops to 4h with the candle series below
    const slowShape = makeShape({ min: 100, max: 110, active: 102, price: (id) => id * 0.01 })
    const fastCandles = candles([1.05, 1.045, 1.04, 1.035, 1.03, 1.025, 1.02]) // → 4h for edge 1.00 from 1.02
    const res = computeTriage(
      [
        {
          positionId: 'unknown',
          pairAddress: 'px',
          totalValueUsd: 1,
          feesTvl24h: 0.01,
          inRange: true,
          liquidityShape: slowShape,
        },
        {
          positionId: 'fast',
          pairAddress: 'pf',
          totalValueUsd: 1,
          feesTvl24h: 0.01,
          inRange: true,
          liquidityShape: fastShape,
        },
      ],
      { pf: fastCandles }, // px has no candles → null
    )
    // fast (finite) before unknown (null)
    expect(res.items.map((i) => i.positionId)).toEqual(['fast', 'unknown'])
    expect(res.items[0].timeToEdgeHours).not.toBeNull()
    expect(res.items[1].timeToEdgeHours).toBeNull()
  })

  it('emits bleeding tier before near-edge tier in a mixed portfolio', () => {
    const nearShape = makeShape({ min: 100, max: 110, active: 101 })
    const res = computeTriage(
      [
        {
          positionId: 'near',
          pairAddress: 'p2',
          totalValueUsd: 500,
          feesTvl24h: 0.02,
          inRange: true,
          liquidityShape: nearShape,
        },
        {
          positionId: 'bleed',
          pairAddress: 'p1',
          totalValueUsd: 1000,
          feesTvl24h: 0.0131,
          inRange: false,
          liquidityShape: null,
        },
      ],
      {},
    )
    expect(res.items.map((i) => i.tier)).toEqual(['bleeding', 'near-edge'])
  })
})

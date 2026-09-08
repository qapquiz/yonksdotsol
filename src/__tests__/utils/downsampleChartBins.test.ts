import { describe, it, expect } from 'vitest'
import type { ChartBinData } from '../../utils/positions/computePositionViewData'
import { downsampleChartBins, MAX_CHART_BINS } from '../../utils/positions/downsampleChartBins'

function createBins(count: number, startBinId = 0): ChartBinData[] {
  return Array.from({ length: count }, (_, i) => ({
    binId: startBinId + i,
    positionXAmountInSOL: i + 1,
    positionYAmountInSOL: (i + 1) * 2,
    price: 1 + i * 0.01,
  }))
}

function createFlatBins(count: number, startBinId = 0): ChartBinData[] {
  return Array.from({ length: count }, (_, i) => ({
    binId: startBinId + i,
    positionXAmountInSOL: 1,
    positionYAmountInSOL: 2,
    price: 1 + i * 0.01,
  }))
}

describe('downsampleChartBins', () => {
  it('returns the input untouched when length is at or below maxBars', () => {
    const bins = createBins(50)
    expect(downsampleChartBins(bins, MAX_CHART_BINS, 25)).toBe(bins)
    expect(downsampleChartBins([], MAX_CHART_BINS, 25)).toHaveLength(0)
  })

  it('returns exactly maxBars buckets for a longer input', () => {
    const result = downsampleChartBins(createBins(300), MAX_CHART_BINS, 150)
    expect(result).toHaveLength(MAX_CHART_BINS)
  })

  it('keeps the peak bin per bucket (not the sum)', () => {
    // 300 bins into 100 buckets → exactly 3 bins per bucket
    const result = downsampleChartBins(createBins(300), 100, 150)

    // bucket 0 holds bins 0-2, peak is bin 2
    expect(result[0].positionXAmountInSOL).toBe(3)
    expect(result[0].positionYAmountInSOL).toBe(6)
    // bucket 1 holds bins 3-5, peak is bin 5
    expect(result[1].positionXAmountInSOL).toBe(6)
    expect(result[1].positionYAmountInSOL).toBe(12)
  })

  it('keeps uniform bars across uneven bucket sizes (no comb)', () => {
    // 250 bins into 100 buckets → buckets of 2 and 3 bins; equal-magnitude
    // inputs must yield equal-height buckets, which summing would break
    const result = downsampleChartBins(createFlatBins(250), 100, 125)

    for (const bucket of result) {
      expect(bucket.positionXAmountInSOL).toBe(1)
      expect(bucket.positionYAmountInSOL).toBe(2)
    }
  })

  it('preserves the global peak across the envelope', () => {
    const bins = createBins(300)
    const result = downsampleChartBins(bins, 100, 150)

    const globalPeak = Math.max(...bins.map((b) => b.positionXAmountInSOL + b.positionYAmountInSOL))
    const bucketPeak = Math.max(...result.map((b) => b.positionXAmountInSOL + b.positionYAmountInSOL))
    expect(bucketPeak).toBe(globalPeak)
  })

  it('keeps the first bin price per bucket in ascending order', () => {
    const result = downsampleChartBins(createBins(300), 100, 150)

    expect(result[0].price).toBe(1) // bin 0's price
    expect(result[1].price).toBe(1.03) // bin 3's price
    for (let i = 1; i < result.length; i++) {
      expect(result[i].price).toBeGreaterThanOrEqual(result[i - 1].price)
    }
  })

  it('flags the bucket containing the active bin via its binId', () => {
    // bin 4 lands in bucket floor(4 * 100 / 300) = 1
    const result = downsampleChartBins(createBins(300), 100, 4)

    expect(result[1].binId).toBe(4)
    expect(result.filter((b) => b.binId === 4)).toHaveLength(1)
    // other buckets keep their first bin id, ascending
    expect(result[0].binId).toBe(0)
    expect(result[2].binId).toBe(6)
    for (let i = 1; i < result.length; i++) {
      expect(result[i].binId).toBeGreaterThan(result[i - 1].binId)
    }
  })

  it('does not flag any bucket when activeBinId is outside the range', () => {
    const result = downsampleChartBins(createBins(300, 1000), 100, 9999)

    expect(result.filter((b) => b.binId === 9999)).toHaveLength(0)
    expect(result[0].binId).toBe(1000)
    expect(result[result.length - 1].binId).toBe(1297) // first bin of last bucket
  })
})

import type { ChartBinData } from './computePositionViewData'

/** Beyond this many bins the bars are sub-pixel noise at phone widths (~3.7px per bar at 370px). */
export const MAX_CHART_BINS = 100

/**
 * Aggregates a bin distribution into at most `maxBars` contiguous buckets for
 * chart rendering. At or below `maxBars` the input is returned untouched.
 *
 * Each bucket keeps its **peak bin** (largest combined SOL amount) rather than
 * a sum: bucket sizes are uneven whenever the bin count doesn't divide evenly,
 * and summed buckets with an extra bin sit systematically taller — a periodic
 * comb over smooth regions. The max preserves the distribution's envelope
 * independent of bucket size. A bucket reports its first bin's `price`
 * (prices ascend by bin, so buckets stay monotonic) and its first bin's
 * `binId` — except the bucket containing `activeBinId`, which reports
 * `activeBinId` as its `binId` so the chart's
 * `binId === currentActiveId` color check marks exactly that bucket.
 */
export function downsampleChartBins(bins: ChartBinData[], maxBars: number, activeBinId: number): ChartBinData[] {
  if (bins.length <= maxBars) return bins

  const buckets: ChartBinData[] = Array.from({ length: maxBars }, () => ({
    binId: 0,
    positionXAmountInSOL: 0,
    positionYAmountInSOL: 0,
    price: 0,
  }))

  let lastBucketIndex = -1
  for (let i = 0; i < bins.length; i++) {
    const bin = bins[i]
    const bucketIndex = Math.floor((i * maxBars) / bins.length)
    const bucket = buckets[bucketIndex]

    if (bucketIndex !== lastBucketIndex) {
      bucket.binId = bin.binId
      bucket.price = bin.price
      lastBucketIndex = bucketIndex
    }
    if (bin.binId === activeBinId) {
      bucket.binId = activeBinId
    }

    if (
      bin.positionXAmountInSOL + bin.positionYAmountInSOL >
      bucket.positionXAmountInSOL + bucket.positionYAmountInSOL
    ) {
      bucket.positionXAmountInSOL = bin.positionXAmountInSOL
      bucket.positionYAmountInSOL = bin.positionYAmountInSOL
    }
  }

  return buckets
}

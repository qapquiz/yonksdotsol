import { themeTokens } from '../config/theme'
import type { LiquidityShape } from '../utils/positions/computePositionViewData'

const C = themeTokens.dark
const MAX_BARS = 48
const PADDING = 6

export interface LiquidityGraph {
  svg: string
  minPrice: string
  maxPrice: string
  totalBins: number
}

function priceLabel(price: number | undefined): string {
  return price != null && Number.isFinite(price) && price > 0 ? price.toPrecision(4) : '—'
}

/** At most 48 grouped bars keep large bin ranges legible at home-screen size. */
export function buildLiquidityGraph(
  shape: LiquidityShape | null,
  width: number,
  height: number,
): LiquidityGraph | null {
  if (!shape?.binDistribution.length || !Number.isFinite(width) || !Number.isFinite(height)) return null
  const { minBinId, maxBinId } = shape.binRange
  const totalBins = maxBinId - minBinId + 1
  if (!Number.isSafeInteger(totalBins) || totalBins <= 0 || !Number.isFinite(shape.currentActiveId)) return null
  const count = Math.min(MAX_BARS, totalBins)
  const amounts = Array<number>(count).fill(0)
  const bins = [...shape.binDistribution].sort((left, right) => left.binId - right.binId)
  for (const bin of bins) {
    if (!Number.isInteger(bin.binId) || bin.binId < minBinId || bin.binId > maxBinId) continue
    const amount = bin.positionXAmountInSOL + bin.positionYAmountInSOL
    if (!Number.isFinite(amount) || amount <= 0) continue
    const index = Math.floor(((bin.binId - minBinId) / totalBins) * count)
    // Match the app's peak-bin sampling: uneven bucket sizes must not create
    // artificial spikes across an otherwise flat liquidity distribution.
    amounts[index] = Math.max(amounts[index], amount)
  }
  const maxAmount = Math.max(...amounts)
  const graphWidth = Math.max(32, width)
  const graphHeight = Math.max(32, height)
  const innerWidth = graphWidth - PADDING * 2
  const innerHeight = graphHeight - PADDING * 2
  const step = innerWidth / count
  const activeFraction = (shape.currentActiveId - minBinId + 0.5) / totalBins
  const inRange = shape.currentActiveId >= minBinId && shape.currentActiveId <= maxBinId
  const activeGroup = Math.min(count - 1, Math.floor(((shape.currentActiveId - minBinId) / totalBins) * count))
  const lines = [0, 0.5, 1]
    .map((ratio) => {
      const y = PADDING + ratio * innerHeight
      return `<line x1="${PADDING}" y1="${y}" x2="${graphWidth - PADDING}" y2="${y}" stroke="${C.border}" stroke-opacity="0.4"/>`
    })
    .join('')
  const bars = amounts
    .map((amount, index) => {
      const barHeight = maxAmount > 0 ? (amount / maxAmount) * innerHeight : 0
      const centerBin = minBinId + ((index + 0.5) / count) * totalBins
      const fill =
        inRange && index === activeGroup ? C.primary : centerBin < shape.currentActiveId ? C.secondary : C.border
      return `<rect x="${PADDING + index * step + step * 0.15}" y="${PADDING + innerHeight - barHeight}" width="${step * 0.7}" height="${barHeight}" rx="1" fill="${fill}"/>`
    })
    .join('')
  const markerX = PADDING + Math.max(0, Math.min(1, activeFraction)) * innerWidth
  const markerColor = inRange ? C.primary : C.secondary
  const marker = `<line x1="${markerX}" y1="1" x2="${markerX}" y2="${graphHeight - 1}" stroke="${markerColor}" stroke-width="1.5" stroke-dasharray="3 3"/><path d="M${markerX - 3},0 L${markerX + 3},0 L${markerX},5 Z" fill="${markerColor}"/>`
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${graphWidth}" height="${graphHeight}" viewBox="0 0 ${graphWidth} ${graphHeight}">${lines}${bars}${marker}</svg>`,
    minPrice: priceLabel(bins.find((bin) => bin.binId === minBinId)?.price),
    maxPrice: priceLabel(bins.find((bin) => bin.binId === maxBinId)?.price),
    totalBins,
  }
}

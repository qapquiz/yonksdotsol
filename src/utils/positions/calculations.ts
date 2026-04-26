import { PositionBinData, PositionData } from '@meteora-ag/dlmm'
import type { TokenInfo } from '../../tokens'
import { formatUSD } from './formatters'

export interface ChartBinData {
  binId: number
  positionXAmountInSOL: number
  positionYAmountInSOL: number
  price: number
}

export interface LiquidityShape {
  positionAddress: string
  pairAddress: string
  binRange: {
    minBinId: number
    maxBinId: number
    totalBins: number
  }
  binDistribution: ChartBinData[]
  tokenTotals: {
    tokenX: number
    tokenY: number
  }
  currentActiveId: number
}

export interface PriceRange {
  minPrice: string
  maxPrice: string
  maxLiquidity: number
}

export interface PriceTick {
  position: number
  price: string
  isCurrent: boolean
}

/** Core: convert a pair of raw BigInt token amounts to their combined USD value */
export function calculateTokenPairUSD(
  xRaw: bigint,
  yRaw: bigint,
  tokenXInfo: TokenInfo | null,
  tokenYInfo: TokenInfo | null,
): number {
  if (!tokenXInfo || !tokenYInfo) return 0

  const xAmount = Number(xRaw) / Number(10n ** BigInt(tokenXInfo.decimals))
  const yAmount = Number(yRaw) / Number(10n ** BigInt(tokenYInfo.decimals))

  return xAmount * tokenXInfo.price_info.price_per_token + yAmount * tokenYInfo.price_info.price_per_token
}

export function calculatePositionTotalValue(
  totalXAmount: bigint,
  totalYAmount: bigint,
  tokenXInfo: TokenInfo | null,
  tokenYInfo: TokenInfo | null,
): string {
  return formatUSD(calculateTokenPairUSD(totalXAmount, totalYAmount, tokenXInfo, tokenYInfo))
}

export function calculateUnrealizedFeesValue(
  feeXAmount: bigint,
  feeYAmount: bigint,
  tokenXInfo: TokenInfo | null,
  tokenYInfo: TokenInfo | null,
): string {
  return formatUSD(calculateTokenPairUSD(feeXAmount, feeYAmount, tokenXInfo, tokenYInfo))
}

export function calculateClaimedFeesValue(
  claimedFeeXAmount: bigint,
  claimedFeeYAmount: bigint,
  tokenXInfo: TokenInfo | null,
  tokenYInfo: TokenInfo | null,
): string {
  return formatUSD(calculateTokenPairUSD(claimedFeeXAmount, claimedFeeYAmount, tokenXInfo, tokenYInfo))
}

export function calculateIsInRange(currentActiveId: number, lowerBinId: number, upperBinId: number): boolean {
  return currentActiveId >= lowerBinId && currentActiveId <= upperBinId
}

export function calculateCurrentPrice(tokenXInfo: TokenInfo | null, tokenYInfo: TokenInfo | null): string {
  if (!tokenXInfo || !tokenYInfo) return '$0.00'

  const price = tokenXInfo.price_info.price_per_token / tokenYInfo.price_info.price_per_token

  return `$${price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })}`
}

export function generateLiquidityChartData(
  positionBinData: PositionBinData[],
  lowerBinId: number,
  upperBinId: number,
  tokenXDecimal: number,
  tokenYDecimal: number,
): ChartBinData[] {
  const binMap = new Map(positionBinData.map((b) => [Number(b.binId), b]))

  const chartBins: ChartBinData[] = []
  for (let i = lowerBinId; i <= upperBinId; i++) {
    const bin = binMap.get(i)
    const positionXAmountInSOL =
      (Number(bin?.positionXAmount || 0) / 10 ** tokenXDecimal) * Number(bin?.pricePerToken || 0)
    const positionYAmountInSOL = Number(bin?.positionYAmount || 0) / 10 ** tokenYDecimal
    chartBins.push({
      binId: i,
      positionXAmountInSOL,
      positionYAmountInSOL,
      price: bin ? Number(bin.pricePerToken) : 0,
    })
  }

  return chartBins
}

export function calculatePriceRange(chartBins: ChartBinData[], positionBinData: any[]): PriceRange {
  const minPrice =
    chartBins.length > 0
      ? positionBinData.length > 0
        ? Number(positionBinData[0].pricePerToken).toPrecision(6)
        : '0'
      : '0'

  const maxPrice =
    chartBins.length > 0
      ? positionBinData.length > 0
        ? Number(positionBinData[positionBinData.length - 1].pricePerToken).toPrecision(6)
        : '0'
      : '0'

  const maxLiquidity =
    chartBins.length > 0 ? Math.max(...chartBins.map((b) => b.positionXAmountInSOL + b.positionYAmountInSOL)) : 0

  return {
    minPrice,
    maxPrice,
    maxLiquidity,
  }
}

export function calculatePriceTicks(
  chartBins: ChartBinData[],
  currentActiveId: number,
  positionBinData: any[],
  tickCount: number = 3,
): PriceTick[] {
  if (chartBins.length === 0 || positionBinData.length === 0) {
    return []
  }

  const minPrice = Number(positionBinData[0].pricePerToken)
  const maxPrice = Number(positionBinData[positionBinData.length - 1].pricePerToken)

  const ticks: PriceTick[] = []

  for (let i = 0; i < tickCount; i++) {
    const position = (i / (tickCount - 1)) * 100
    const priceValue = minPrice + (maxPrice - minPrice) * (i / (tickCount - 1))
    const price = priceValue.toPrecision(5)

    const currentIndex = chartBins.findIndex((b) => b.binId === currentActiveId)
    const isCurrent = i === Math.round((currentIndex / (chartBins.length - 1)) * (tickCount - 1))

    ticks.push({ position, price: `$${price}`, isCurrent })
  }

  return ticks
}

export function calculateChartHeight(binCount: number): number {
  const minHeight = 24
  const maxHeight = 40

  if (binCount <= 20) return minHeight
  if (binCount >= 100) return maxHeight

  const scale = (binCount - 20) / (100 - 20)
  return minHeight + scale * (maxHeight - minHeight)
}

export function calculateActiveBinPosition(chartBins: ChartBinData[], currentActiveId: number): number {
  const activeIndex = chartBins.findIndex((b) => b.binId === currentActiveId)

  if (activeIndex === -1 || chartBins.length === 0) return 50

  return (activeIndex / (chartBins.length - 1)) * 100
}

export function generateLiquidityShape(
  positionData: PositionData,
  positionAddress: string,
  pairAddress: string,
  currentActiveId: number,
  tokenXDecimal: number,
  tokenYDecimal: number,
): LiquidityShape | null {
  if (!positionData) return null

  const minBinId = positionData.lowerBinId
  const maxBinId = positionData.upperBinId
  const totalBins = maxBinId - minBinId + 1

  const binDistribution = generateLiquidityChartData(
    positionData.positionBinData,
    minBinId,
    maxBinId,
    tokenXDecimal,
    tokenYDecimal,
  )

  const tokenTotals = binDistribution.reduce(
    (acc, bin) => ({
      tokenX: acc.tokenX + bin.positionXAmountInSOL,
      tokenY: acc.tokenY + bin.positionYAmountInSOL,
    }),
    { tokenX: 0, tokenY: 0 },
  )

  return {
    positionAddress,
    pairAddress,
    binRange: {
      minBinId,
      maxBinId,
      totalBins,
    },
    binDistribution,
    tokenTotals,
    currentActiveId,
  }
}

export function calculateInitialDepositValue(
  initialXAmount: bigint,
  initialYAmount: bigint,
  tokenXInfo: TokenInfo | null,
  tokenYInfo: TokenInfo | null,
): number {
  return calculateTokenPairUSD(initialXAmount, initialYAmount, tokenXInfo, tokenYInfo)
}

export function calculateUPNLValue(currentTotalValue: number, initialDepositValue: number): number {
  return currentTotalValue - initialDepositValue
}

export function calculateUPNLPercentage(currentTotalValue: number, initialDepositValue: number): number {
  if (initialDepositValue === 0) return 0
  return ((currentTotalValue - initialDepositValue) / initialDepositValue) * 100
}

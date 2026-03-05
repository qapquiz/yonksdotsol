import type { TokenInfo } from '../../tokens'

export interface ChartBinData {
  binId: number
  liquidity: number
  price: number
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

export function calculatePositionTotalValue(
  totalXAmount: bigint,
  totalYAmount: bigint,
  tokenXInfo: TokenInfo | null,
  tokenYInfo: TokenInfo | null,
): string {
  if (!tokenXInfo || !tokenYInfo) return '$0.00'

  const xDivisor = 10n ** BigInt(tokenXInfo.decimals)
  const yDivisor = 10n ** BigInt(tokenYInfo.decimals)

  const xAmount = Number(totalXAmount) / Number(xDivisor)
  const yAmount = Number(totalYAmount) / Number(yDivisor)

  const xValueUSD = xAmount * tokenXInfo.price_info.price_per_token
  const yValueUSD = yAmount * tokenYInfo.price_info.price_per_token

  const totalValueUSD = xValueUSD + yValueUSD

  return `$${totalValueUSD.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function calculateUnrealizedFeesValue(
  feeXAmount: bigint,
  feeYAmount: bigint,
  tokenXInfo: TokenInfo | null,
  tokenYInfo: TokenInfo | null,
): string {
  if (!tokenXInfo || !tokenYInfo) return '$0.00'

  const xDivisor = 10n ** BigInt(tokenXInfo.decimals)
  const yDivisor = 10n ** BigInt(tokenYInfo.decimals)

  const xAmount = Number(feeXAmount) / Number(xDivisor)
  const yAmount = Number(feeYAmount) / Number(yDivisor)

  const xValueUSD = xAmount * tokenXInfo.price_info.price_per_token
  const yValueUSD = yAmount * tokenYInfo.price_info.price_per_token

  const totalValueUSD = xValueUSD + yValueUSD

  return `$${totalValueUSD.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function calculateClaimedFeesValue(
  claimedFeeXAmount: bigint,
  claimedFeeYAmount: bigint,
  tokenXInfo: TokenInfo | null,
  tokenYInfo: TokenInfo | null,
): string {
  if (!tokenXInfo || !tokenYInfo) return '$0.00'

  const xDivisor = 10n ** BigInt(tokenXInfo.decimals)
  const yDivisor = 10n ** BigInt(tokenYInfo.decimals)

  const xAmount = Number(claimedFeeXAmount) / Number(xDivisor)
  const yAmount = Number(claimedFeeYAmount) / Number(yDivisor)

  const xValueUSD = xAmount * tokenXInfo.price_info.price_per_token
  const yValueUSD = yAmount * tokenYInfo.price_info.price_per_token

  const totalValueUSD = xValueUSD + yValueUSD

  return `$${totalValueUSD.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
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
  positionBinData: any[],
  lowerBinId: number,
  upperBinId: number,
): ChartBinData[] {
  const binMap = new Map(positionBinData.map((b) => [Number(b.binId), b]))

  const chartBins: ChartBinData[] = []
  for (let i = lowerBinId; i <= upperBinId; i++) {
    const bin = binMap.get(i)
    chartBins.push({
      binId: i,
      liquidity: bin ? Number(bin.positionLiquidity) : 0,
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

  const maxLiquidity = chartBins.length > 0 ? Math.max(...chartBins.map((b) => b.liquidity)) : 0

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

export function calculateInitialDepositValue(
  initialXAmount: bigint,
  initialYAmount: bigint,
  tokenXInfo: TokenInfo | null,
  tokenYInfo: TokenInfo | null,
): number {
  if (!tokenXInfo || !tokenYInfo) return 0

  const xDivisor = 10n ** BigInt(tokenXInfo.decimals)
  const yDivisor = 10n ** BigInt(tokenYInfo.decimals)

  const xAmount = Number(initialXAmount) / Number(xDivisor)
  const yAmount = Number(initialYAmount) / Number(yDivisor)

  const xValueUSD = xAmount * tokenXInfo.price_info.price_per_token
  const yValueUSD = yAmount * tokenYInfo.price_info.price_per_token

  return xValueUSD + yValueUSD
}

export function calculateUPNLValue(currentTotalValue: number, initialDepositValue: number): number {
  return currentTotalValue - initialDepositValue
}

export function calculateUPNLPercentage(currentTotalValue: number, initialDepositValue: number): number {
  if (initialDepositValue === 0) return 0
  return ((currentTotalValue - initialDepositValue) / initialDepositValue) * 100
}

export function formatUPNLDisplay(upnlValue: number, upnlPercentage: number): string {
  const sign = upnlValue >= 0 ? '+' : ''
  return `${sign}$${Math.abs(upnlValue).toFixed(2)} (${sign}${upnlPercentage.toFixed(2)}%)`
}

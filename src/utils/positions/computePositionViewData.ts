import { PositionBinData, type PositionData } from '@meteora-ag/dlmm'
import type { PositionPnLData } from 'metcomet'
import type { TokenInfo } from '../../tokens'
import { formatTokenAmount, formatUSD } from './formatters'

// ─── Exported types ──────────────────────────────────────────────────

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

export interface PositionViewModel {
  /** "$X.XX" formatted total position value */
  totalValue: string
  /** Whether position is in the active bin range */
  inRange: boolean
  /** Current price as formatted string */
  currentPrice: string
  /** Unrealized fees as "X TOKEN / Y TOKEN" */
  unrealizedFeesDisplay: string
  /** Claimed fees as "X TOKEN / Y TOKEN" */
  claimedFeesDisplay: string
  /** Unrealized fees value as "$X.XX" */
  unrealizedFeesValue: string
  /** Claimed fees value as "$X.XX" */
  claimedFeesValue: string
  /** Liquidity chart data */
  liquidityShape: LiquidityShape | null
  /** PnL data from external API */
  pnlSol: number | null
  pnlSolPctChange: number | null
}

export interface ComputePositionViewDataInput {
  positionData: PositionData | undefined
  activeId: number
  positionAddress: string
  poolAddress: string
  tokenXInfo: TokenInfo | null
  tokenYInfo: TokenInfo | null
  pnlData: PositionPnLData | null
}

// ─── Internal helpers (previously in calculations.ts) ────────────────

/** Convert a pair of raw BigInt token amounts to their combined USD value */
function calculateTokenPairUSD(
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

function generateLiquidityChartData(
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

function generateLiquidityShape(
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

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Pure function: transforms raw position data + token info + PnL into
 * a display-ready view model. No side effects, no store access.
 */
export function computePositionViewData(input: ComputePositionViewDataInput): PositionViewModel {
  const { positionData, activeId, positionAddress, poolAddress, tokenXInfo, tokenYInfo, pnlData } = input

  const hasTokenData = tokenXInfo !== null && tokenYInfo !== null

  // Inline: totalValue = formatUSD(calculateTokenPairUSD(...))
  const totalValue =
    positionData && hasTokenData
      ? formatUSD(
          calculateTokenPairUSD(
            BigInt(positionData.totalXAmount),
            BigInt(positionData.totalYAmount),
            tokenXInfo,
            tokenYInfo,
          ),
        )
      : '$0.00'

  // Inline: calculateIsInRange = activeId >= lowerBinId && activeId <= upperBinId
  const inRange = positionData ? activeId >= positionData.lowerBinId && activeId <= positionData.upperBinId : false

  // Inline: calculateCurrentPrice
  const currentPrice =
    tokenXInfo && tokenYInfo
      ? `$${(tokenXInfo.price_info.price_per_token / tokenYInfo.price_info.price_per_token).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        })}`
      : '$0.00'

  const unrealizedFeesDisplay =
    tokenXInfo && tokenYInfo && positionData
      ? `${formatTokenAmount(positionData.feeX.toString(), tokenXInfo.decimals)} ${tokenXInfo.symbol} / ${formatTokenAmount(positionData.feeY.toString(), tokenYInfo.decimals)} ${tokenYInfo.symbol}`
      : '-'

  const claimedFeesDisplay =
    tokenXInfo && tokenYInfo && positionData
      ? `${formatTokenAmount(positionData.totalClaimedFeeXAmount.toString(), tokenXInfo.decimals)} ${tokenXInfo.symbol} / ${formatTokenAmount(positionData.totalClaimedFeeYAmount.toString(), tokenYInfo.decimals)} ${tokenYInfo.symbol}`
      : '-'

  // Inline: unrealizedFeesValue = formatUSD(calculateTokenPairUSD(...))
  const unrealizedFeesValue =
    tokenXInfo && tokenYInfo && positionData
      ? formatUSD(
          calculateTokenPairUSD(
            BigInt(positionData.feeX.toString()),
            BigInt(positionData.feeY.toString()),
            tokenXInfo,
            tokenYInfo,
          ),
        )
      : '$0.00'

  // Inline: claimedFeesValue = formatUSD(calculateTokenPairUSD(...))
  const claimedFeesValue =
    tokenXInfo && tokenYInfo && positionData
      ? formatUSD(
          calculateTokenPairUSD(
            BigInt(positionData.totalClaimedFeeXAmount.toString()),
            BigInt(positionData.totalClaimedFeeYAmount.toString()),
            tokenXInfo,
            tokenYInfo,
          ),
        )
      : '$0.00'

  const liquidityShape =
    positionData && tokenXInfo && tokenYInfo
      ? generateLiquidityShape(
          positionData,
          positionAddress,
          poolAddress,
          activeId,
          tokenXInfo.decimals,
          tokenYInfo.decimals,
        )
      : null

  return {
    totalValue,
    inRange,
    currentPrice,
    unrealizedFeesDisplay,
    claimedFeesDisplay,
    unrealizedFeesValue,
    claimedFeesValue,
    liquidityShape,
    pnlSol: pnlData?.pnlSol ?? null,
    pnlSolPctChange: pnlData?.pnlSolPctChange ?? null,
  }
}

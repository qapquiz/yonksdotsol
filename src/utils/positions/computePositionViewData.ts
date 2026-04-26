import type { PositionData } from '@meteora-ag/dlmm'
import type { PositionPnLData } from 'metcomet'
import type { TokenInfo } from '../../tokens'
import {
  calculateClaimedFeesValue,
  calculateCurrentPrice,
  calculateIsInRange,
  calculatePositionTotalValue,
  calculateUnrealizedFeesValue,
  generateLiquidityShape,
  type LiquidityShape,
} from './calculations'
import { formatTokenAmount } from './formatters'

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

/**
 * Pure function: transforms raw position data + token info + PnL into
 * a display-ready view model. No side effects, no store access.
 */
export function computePositionViewData(input: ComputePositionViewDataInput): PositionViewModel {
  const { positionData, activeId, positionAddress, poolAddress, tokenXInfo, tokenYInfo, pnlData } = input

  const hasTokenData = tokenXInfo !== null || tokenYInfo !== null

  const totalValue =
    positionData && hasTokenData
      ? calculatePositionTotalValue(
          BigInt(positionData.totalXAmount),
          BigInt(positionData.totalYAmount),
          tokenXInfo,
          tokenYInfo,
        )
      : '$0.00'

  const inRange = positionData ? calculateIsInRange(activeId, positionData.lowerBinId, positionData.upperBinId) : false

  const currentPrice = calculateCurrentPrice(tokenXInfo, tokenYInfo)

  const unrealizedFeesDisplay =
    tokenXInfo && tokenYInfo && positionData
      ? `${formatTokenAmount(positionData.feeX.toString(), tokenXInfo.decimals)} ${tokenXInfo.symbol} / ${formatTokenAmount(positionData.feeY.toString(), tokenYInfo.decimals)} ${tokenYInfo.symbol}`
      : '-'

  const claimedFeesDisplay =
    tokenXInfo && tokenYInfo && positionData
      ? `${formatTokenAmount(positionData.totalClaimedFeeXAmount.toString(), tokenXInfo.decimals)} ${tokenXInfo.symbol} / ${formatTokenAmount(positionData.totalClaimedFeeYAmount.toString(), tokenYInfo.decimals)} ${tokenYInfo.symbol}`
      : '-'

  const unrealizedFeesValue =
    tokenXInfo && tokenYInfo && positionData
      ? calculateUnrealizedFeesValue(
          BigInt(positionData.feeX.toString()),
          BigInt(positionData.feeY.toString()),
          tokenXInfo,
          tokenYInfo,
        )
      : '$0.00'

  const claimedFeesValue =
    tokenXInfo && tokenYInfo && positionData
      ? calculateClaimedFeesValue(
          BigInt(positionData.totalClaimedFeeXAmount.toString()),
          BigInt(positionData.totalClaimedFeeYAmount.toString()),
          tokenXInfo,
          tokenYInfo,
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

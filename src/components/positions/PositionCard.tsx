import type { PositionInfo } from '@meteora-ag/dlmm'
import { memo, useMemo } from 'react'
import { View } from 'react-native'
import { usePnLStore, selectPositionPnL } from '../../stores/pnlStore'
import type { TokenInfo } from '../../tokens'
import {
  calculateCurrentPrice,
  calculateIsInRange,
  calculatePositionTotalValue,
  calculateUnrealizedFeesValue,
  calculateClaimedFeesValue,
  generateLiquidityShape,
} from '../../utils/positions/calculations'
import { formatTokenAmount } from '../../utils/positions/formatters'
import { LiquidityBarChart } from './LiquidityBarChart'
import PositionCardSkeleton from './PositionCardSkeleton'
import { PositionFooter } from './PositionFooter'
import { PositionHeader } from './PositionHeader'

interface PositionCardProps {
  position: PositionInfo
  lbPositionIndex?: number
  tokenXInfo: TokenInfo | null
  tokenYInfo: TokenInfo | null
  walletAddress?: string
  poolAddress: string
}

function PositionCardComponent({
  position,
  lbPositionIndex = 0,
  tokenXInfo,
  tokenYInfo,
  walletAddress,
  poolAddress,
}: PositionCardProps) {
  const lbPairPosition = position.lbPairPositionsData[lbPositionIndex]
  const positionData = lbPairPosition?.positionData

  const positionAddress = lbPairPosition?.publicKey.toBase58() || position.publicKey.toBase58()
  const wallet = walletAddress || ''

  // Stabilize selector to avoid re-subscribing every render
  const pnlSelector = useMemo(
    () => selectPositionPnL(poolAddress, wallet, positionAddress),
    [poolAddress, wallet, positionAddress],
  )
  const pnlData = usePnLStore(pnlSelector)

  const totalValue = useMemo(() => {
    if (!positionData) return '$0.00'
    return calculatePositionTotalValue(
      BigInt(positionData.totalXAmount),
      BigInt(positionData.totalYAmount),
      tokenXInfo,
      tokenYInfo,
    )
  }, [positionData, tokenXInfo, tokenYInfo])

  const inRange = useMemo(() => {
    if (!positionData) return false
    return calculateIsInRange(Number(position.lbPair.activeId), positionData.lowerBinId, positionData.upperBinId)
  }, [position, positionData])

  const currentPrice = useMemo(() => calculateCurrentPrice(tokenXInfo, tokenYInfo), [tokenXInfo, tokenYInfo])

  const unrealizedFeesDisplay = useMemo(() => {
    if (!tokenXInfo || !tokenYInfo || !positionData) return '-'
    const feeX = formatTokenAmount(positionData.feeX.toString(), tokenXInfo.decimals)
    const feeY = formatTokenAmount(positionData.feeY.toString(), tokenYInfo.decimals)
    return `${feeX} ${tokenXInfo.symbol} / ${feeY} ${tokenYInfo.symbol}`
  }, [positionData, tokenXInfo, tokenYInfo])

  const claimedFeesDisplay = useMemo(() => {
    if (!tokenXInfo || !tokenYInfo || !positionData) return '-'
    const claimedFeeX = formatTokenAmount(positionData.totalClaimedFeeXAmount.toString(), tokenXInfo.decimals)
    const claimedFeeY = formatTokenAmount(positionData.totalClaimedFeeYAmount.toString(), tokenYInfo.decimals)
    return `${claimedFeeX} ${tokenXInfo.symbol} / ${claimedFeeY} ${tokenYInfo.symbol}`
  }, [positionData, tokenXInfo, tokenYInfo])

  const unrealizedFeesValue = useMemo(() => {
    if (!tokenXInfo || !tokenYInfo || !positionData) return '$0.00'
    return calculateUnrealizedFeesValue(
      BigInt(positionData.feeX.toString()),
      BigInt(positionData.feeY.toString()),
      tokenXInfo,
      tokenYInfo,
    )
  }, [positionData, tokenXInfo, tokenYInfo])

  const claimedFeesValue = useMemo(() => {
    if (!tokenXInfo || !tokenYInfo || !positionData) return '$0.00'
    return calculateClaimedFeesValue(
      BigInt(positionData.totalClaimedFeeXAmount.toString()),
      BigInt(positionData.totalClaimedFeeYAmount.toString()),
      tokenXInfo,
      tokenYInfo,
    )
  }, [positionData, tokenXInfo, tokenYInfo])

  const activeIdNum = useMemo(() => Number(position.lbPair.activeId), [position.lbPair.activeId])

  const liquidityShape = useMemo(() => {
    if (!positionData || !tokenXInfo || !tokenYInfo) return null
    return generateLiquidityShape(
      positionData,
      positionAddress,
      poolAddress,
      activeIdNum,
      tokenXInfo.decimals,
      tokenYInfo.decimals,
    )
  }, [positionData, tokenXInfo, tokenYInfo, positionAddress, poolAddress, activeIdNum])

  if (!lbPairPosition) return null

  // Show skeleton while token data is loading
  if (!tokenXInfo && !tokenYInfo) {
    return <PositionCardSkeleton />
  }

  return (
    <View className="bg-app-surface rounded-3xl p-5 mb-4 border border-app-border">
      <PositionHeader
        tokenXInfo={tokenXInfo}
        tokenYInfo={tokenYInfo}
        inRange={inRange}
        totalValue={totalValue}
        upnlValue={pnlData?.pnlSol ?? null}
        upnlPercentage={pnlData?.pnlSolPctChange ?? null}
        upnlIsSol={true}
      />

      <LiquidityBarChart liquidityShape={liquidityShape} currentPrice={currentPrice} />

      <PositionFooter
        unrealizedFeesDisplay={unrealizedFeesDisplay}
        claimedFeesDisplay={claimedFeesDisplay}
        unrealizedFeesValue={unrealizedFeesValue}
        claimedFeesValue={claimedFeesValue}
      />
    </View>
  )
}

export default memo(PositionCardComponent)

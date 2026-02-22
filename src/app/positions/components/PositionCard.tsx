import { memo, useMemo } from 'react'
import { View } from 'react-native'
import type { PositionInfo } from '@meteora-ag/dlmm'
import { useTokenData } from '../hooks/useTokenData'
import {
  calculateCurrentPrice,
  calculateIsInRange,
  calculatePositionTotalValue,
  calculatePriceRange,
  generateLiquidityChartData,
} from '../utils/calculations'
import { formatTokenAmount } from '../utils/formatters'
import { PositionHeader } from './PositionHeader'
import { LiquidityChart } from './LiquidityChart'
import { PositionFooter } from './PositionFooter'

interface PositionCardProps {
  position: PositionInfo
}

function PositionCardComponent({ position }: PositionCardProps) {
  const tokenXMint = position.tokenX.mint.address.toBase58()
  const tokenYMint = position.tokenY.mint.address.toBase58()

  const { tokenXInfo, tokenYInfo, isLoading } = useTokenData(tokenXMint, tokenYMint)

  const lbPairPosition = position.lbPairPositionsData[0]
  const positionData = lbPairPosition?.positionData

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
    if (isLoading) return 'Loading...'
    if (!tokenXInfo || !tokenYInfo) return 'Loading...'
    if (!positionData) return 'Loading...'
    const feeX = formatTokenAmount(positionData.feeX.toString(), tokenXInfo.decimals)
    const feeY = formatTokenAmount(positionData.feeY.toString(), tokenYInfo.decimals)
    return `${feeX} ${tokenXInfo.symbol} / ${feeY} ${tokenYInfo.symbol}`
  }, [isLoading, positionData, tokenXInfo, tokenYInfo])

  const chartData = useMemo(() => {
    if (!positionData) return []
    return generateLiquidityChartData(positionData.positionBinData, positionData.lowerBinId, positionData.upperBinId)
  }, [positionData])

  const priceRange = useMemo(() => {
    if (!positionData) return { minPrice: '0', maxPrice: '0', maxLiquidity: 0 }
    return calculatePriceRange(chartData, positionData.positionBinData)
  }, [chartData, positionData])

  const activeIdNum = useMemo(() => Number(position.lbPair.activeId), [position.lbPair.activeId])

  if (!lbPairPosition) return null

  return (
    <View className="bg-zinc-900 rounded-3xl p-5 mb-4 border border-zinc-800">
      <PositionHeader tokenXInfo={tokenXInfo} tokenYInfo={tokenYInfo} inRange={inRange} totalValue={totalValue} />

      <LiquidityChart
        chartBins={chartData}
        currentActiveId={activeIdNum}
        currentPrice={currentPrice}
        minPrice={priceRange.minPrice}
        maxPrice={priceRange.maxPrice}
        maxLiquidity={priceRange.maxLiquidity}
      />

      <PositionFooter unrealizedFeesDisplay={unrealizedFeesDisplay} />
    </View>
  )
}

export default memo(PositionCardComponent)

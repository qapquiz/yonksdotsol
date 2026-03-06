import { memo, useMemo, useState, useEffect } from 'react'
import { View } from 'react-native'
import type { PositionInfo } from '@meteora-ag/dlmm'
import { useTokenData } from '../../hooks/positions/useTokenData'
import { useInitialDeposits } from '../../hooks/positions/useInitialDeposits'
import { useHistoricalInitialValue } from '../../hooks/positions/useHistoricalInitialValue'
import {
  calculateClaimedFeesValue,
  calculateCurrentPrice,
  calculateIsInRange,
  calculatePositionTotalValue,
  calculateUPNLPercentage,
  calculateUPNLValue,
  calculatePriceRange,
  calculateUnrealizedFeesValue,
  generateLiquidityChartData,
} from '../../utils/positions/calculations'
import { formatTokenAmount } from '../../utils/positions/formatters'
import { PositionHeader } from './PositionHeader'
import { LiquidityChart } from './LiquidityChart'
import { PositionFooter } from './PositionFooter'
import { env } from '../../config/env'

interface PositionCardProps {
  position: PositionInfo
  rpcUrl?: string
}

function PositionCardComponent({ position, rpcUrl }: PositionCardProps) {
  const tokenXMint = position.tokenX.mint.address.toBase58()
  const tokenYMint = position.tokenY.mint.address.toBase58()

  const { tokenXInfo, tokenYInfo, isLoading } = useTokenData(tokenXMint, tokenYMint)

  const lbPairPosition = position.lbPairPositionsData[0]
  const positionData = lbPairPosition?.positionData

  const effectiveRpcUrl = rpcUrl || env.rpcUrl || ''

  const { costBasis } = useInitialDeposits({
    rpcUrl: effectiveRpcUrl,
    positionPublicKey: position.publicKey.toBase58(),
    tokenXDecimals: tokenXInfo?.decimals || 0,
    tokenYDecimals: tokenYInfo?.decimals || 0,
    enabled: !isLoading && !!(tokenXInfo && tokenYInfo),
  })

  const poolAddress = (position.lbPair as any).publicKey?.toBase58() || ''
  const { initialValue: historicalInitialValue } = useHistoricalInitialValue({
    poolAddress,
    costBasis,
    tokenXDecimals: tokenXInfo?.decimals || 0,
    tokenYDecimals: tokenYInfo?.decimals || 0,
    tokenYSymbol: tokenYInfo?.symbol || 'unknown',
    enabled: !isLoading && !!(tokenXInfo && tokenYInfo && costBasis),
  })

  const totalValue = useMemo(() => {
    if (!positionData) return '$0.00'
    return calculatePositionTotalValue(
      BigInt(positionData.totalXAmount),
      BigInt(positionData.totalYAmount),
      tokenXInfo,
      tokenYInfo,
    )
  }, [positionData, tokenXInfo, tokenYInfo])

  const [upnlValue, setUPNLValue] = useState<number | null>(null)
  const [upnlPercentage, setUPNLPercentage] = useState<number | null>(null)

  useEffect(() => {
    if (historicalInitialValue > 0 && tokenXInfo && tokenYInfo && positionData) {
      const currentTotalValue = calculatePositionTotalValue(
        BigInt(positionData.totalXAmount),
        BigInt(positionData.totalYAmount),
        tokenXInfo,
        tokenYInfo,
      )

      const currentValue = parseFloat(currentTotalValue.replace(/[$,]/g, ''))

      setUPNLValue(calculateUPNLValue(currentValue, historicalInitialValue))
      setUPNLPercentage(calculateUPNLPercentage(currentValue, historicalInitialValue))
    }
  }, [historicalInitialValue, tokenXInfo, tokenYInfo, positionData])

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

  const claimedFeesDisplay = useMemo(() => {
    if (isLoading) return 'Loading...'
    if (!tokenXInfo || !tokenYInfo) return 'Loading...'
    if (!positionData) return 'Loading...'
    const claimedFeeX = formatTokenAmount(positionData.totalClaimedFeeXAmount.toString(), tokenXInfo.decimals)
    const claimedFeeY = formatTokenAmount(positionData.totalClaimedFeeYAmount.toString(), tokenYInfo.decimals)
    return `${claimedFeeX} ${tokenXInfo.symbol} / ${claimedFeeY} ${tokenYInfo.symbol}`
  }, [isLoading, positionData, tokenXInfo, tokenYInfo])

  const unrealizedFeesValue = useMemo(() => {
    if (isLoading) return '$0.00'
    if (!tokenXInfo || !tokenYInfo) return '$0.00'
    if (!positionData) return '$0.00'
    return calculateUnrealizedFeesValue(
      BigInt(positionData.feeX.toString()),
      BigInt(positionData.feeY.toString()),
      tokenXInfo,
      tokenYInfo,
    )
  }, [isLoading, positionData, tokenXInfo, tokenYInfo])

  const claimedFeesValue = useMemo(() => {
    if (isLoading) return '$0.00'
    if (!tokenXInfo || !tokenYInfo) return '$0.00'
    if (!positionData) return '$0.00'
    return calculateClaimedFeesValue(
      BigInt(positionData.totalClaimedFeeXAmount.toString()),
      BigInt(positionData.totalClaimedFeeYAmount.toString()),
      tokenXInfo,
      tokenYInfo,
    )
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
      <PositionHeader
        tokenXInfo={tokenXInfo}
        tokenYInfo={tokenYInfo}
        inRange={inRange}
        totalValue={totalValue}
        upnlValue={upnlValue}
        upnlPercentage={upnlPercentage}
      />

      <LiquidityChart
        chartBins={chartData}
        currentActiveId={activeIdNum}
        currentPrice={currentPrice}
        minPrice={priceRange.minPrice}
        maxPrice={priceRange.maxPrice}
        maxLiquidity={priceRange.maxLiquidity}
      />

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

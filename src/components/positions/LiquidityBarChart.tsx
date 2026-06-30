import { memo, useCallback, useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import { Line, Rect, Svg } from 'react-native-svg'
import type { LiquidityShape } from '../../utils/positions/computePositionViewData'
import { useThemeTokens } from '../../hooks/useThemeTokens'
import { ChartPanel } from './ChartPanel'

interface LiquidityBarChartProps {
  liquidityShape: LiquidityShape | null
  currentPrice: string
}

const CHART_HEIGHT = 120
const CHART_PADDING = { top: 10, bottom: 10, left: 0, right: 0 }
const BAR_GAP_RATIO = 0.3

// 8-digit hex alpha suffixes for grid lines (≈0.3 opacity)
const GRID_ALPHA = '4D'

function LiquidityBarChartComponent({ liquidityShape, currentPrice }: LiquidityBarChartProps) {
  const tokens = useThemeTokens()
  const [containerWidth, setContainerWidth] = useState(0)

  // Bar colors — all derived from the app palette so they theme correctly:
  //   active bin → primary (sage), below active → secondary (copper), above → neutral
  const colors = useMemo(
    () => ({
      active: tokens.primary,
      below: tokens.secondary,
      above: tokens.border,
      grid: `${tokens.border}${GRID_ALPHA}`,
    }),
    [tokens],
  )

  const handleLayout = useCallback((event: { nativeEvent: { layout: { width: number } } }) => {
    setContainerWidth(event.nativeEvent.layout.width)
  }, [])

  const chartData = useMemo(() => {
    if (!liquidityShape?.binDistribution || liquidityShape.binDistribution.length === 0) {
      return []
    }

    const maxLiquidity = Math.max(
      ...liquidityShape.binDistribution.map((b) => b.positionXAmountInSOL + b.positionYAmountInSOL),
    )
    const currentActiveId = liquidityShape.currentActiveId

    return liquidityShape.binDistribution.map((bin) => {
      const liquidity = bin.positionXAmountInSOL + bin.positionYAmountInSOL
      const isActive = bin.binId === currentActiveId
      const isLeft = bin.binId < currentActiveId

      let color = colors.above
      if (isActive) {
        color = colors.active
      } else if (isLeft) {
        color = colors.below
      }

      return {
        value: maxLiquidity > 0 ? (liquidity / maxLiquidity) * 100 : 0,
        binId: bin.binId,
        price: bin.price,
        color,
      }
    })
  }, [liquidityShape, colors])

  const minPrice = useMemo(() => {
    if (!liquidityShape?.binDistribution || liquidityShape.binDistribution.length === 0) return '0'
    return liquidityShape.binDistribution[0].price.toPrecision(6)
  }, [liquidityShape])

  const maxPrice = useMemo(() => {
    if (!liquidityShape?.binDistribution || liquidityShape.binDistribution.length === 0) return '0'
    return liquidityShape.binDistribution[liquidityShape.binDistribution.length - 1].price.toPrecision(6)
  }, [liquidityShape])

  const svgContent = useMemo(() => {
    if (chartData.length === 0 || containerWidth === 0) return null

    const chartWidth = containerWidth
    const chartInnerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom

    const barWidth = chartWidth / chartData.length
    const gapWidth = barWidth * BAR_GAP_RATIO
    const actualBarWidth = barWidth - gapWidth

    const bars = chartData.map((bar, index) => {
      const x = index * barWidth + gapWidth / 2
      const barHeight = (bar.value / 100) * chartInnerHeight
      const y = CHART_PADDING.top + chartInnerHeight - barHeight

      return (
        <Rect key={`bar-${bar.binId}`} x={x} y={y} width={actualBarWidth} height={barHeight} fill={bar.color} rx={2} />
      )
    })

    // Add horizontal grid lines
    const gridLines = [0, 25, 50, 75, 100].map((percent) => {
      const y = CHART_PADDING.top + chartInnerHeight - (percent / 100) * chartInnerHeight
      return <Line key={`grid-${percent}`} x1="0" y1={y} x2={chartWidth} y2={y} stroke={colors.grid} strokeWidth="1" />
    })

    return (
      <Svg width={chartWidth} height={CHART_HEIGHT}>
        {gridLines}
        {bars}
      </Svg>
    )
  }, [chartData, containerWidth, colors])

  const legend = (
    <View className="flex-row items-center justify-center mt-2 gap-4">
      <View className="flex-row items-center">
        <View className="w-2 h-2 rounded-sm bg-app-secondary mr-1.5" />
        <Text className="text-app-text-secondary text-[10px]">Below Price</Text>
      </View>
      <View className="flex-row items-center">
        <View className="w-2 h-2 rounded-sm bg-app-primary mr-1.5" />
        <Text className="text-app-primary text-[10px]">Active</Text>
      </View>
      <View className="flex-row items-center">
        <View className="w-2 h-2 rounded-sm bg-app-text-muted mr-1.5" />
        <Text className="text-app-text-secondary text-[10px]">Above Price</Text>
      </View>
    </View>
  )

  if (chartData.length === 0) {
    return (
      <ChartPanel title="LIQUIDITY SHAPE" currentPrice={currentPrice}>
        <View className="h-[120px] items-center justify-center">
          <Text className="text-app-text-muted text-xs">No liquidity data</Text>
        </View>
        <View className="flex-row justify-between px-1 mt-2">
          <Text className="text-app-text-muted text-[10px] font-mono">-</Text>
          <Text className="text-app-text-muted text-[10px] font-mono">-</Text>
        </View>
        {legend}
      </ChartPanel>
    )
  }

  return (
    <ChartPanel title="LIQUIDITY SHAPE" currentPrice={currentPrice}>
      <View className="w-full" style={{ height: CHART_HEIGHT }} onLayout={handleLayout}>
        {svgContent}
      </View>

      <View className="flex-row justify-between px-1 mt-2">
        <Text className="text-app-text-muted text-[10px] font-mono">{minPrice}</Text>
        <Text className="text-app-text-muted text-[10px] font-mono">{maxPrice}</Text>
      </View>

      {legend}
    </ChartPanel>
  )
}

export const LiquidityBarChart = memo(LiquidityBarChartComponent)

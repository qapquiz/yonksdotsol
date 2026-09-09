import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Text, View } from 'react-native'
import { Line, Path, Rect, Svg } from 'react-native-svg'
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated'
import type { LiquidityShape } from '../../utils/positions/computePositionViewData'
import { downsampleChartBins, MAX_CHART_BINS } from '../../utils/positions/downsampleChartBins'
import { useThemeTokens } from '../../hooks/useThemeTokens'
import { ChartPanel } from './ChartPanel'

interface LiquidityBarChartProps {
  liquidityShape: LiquidityShape | null
  currentPrice: string
}

const CHART_HEIGHT = 120
const CHART_PADDING = { top: 10, bottom: 10, left: 0, right: 0 }
const CHART_INNER_HEIGHT = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom
const BAR_GAP_RATIO = 0.3

// Active-bin marker slide duration
const ACTIVE_SLIDE_MS = 500

// 8-digit hex alpha suffixes for grid lines (≈0.3 opacity)
const GRID_ALPHA = '4D'

const AnimatedLine = Animated.createAnimatedComponent(Line)
const AnimatedPath = Animated.createAnimatedComponent(Path)

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

    const distribution = downsampleChartBins(
      liquidityShape.binDistribution,
      MAX_CHART_BINS,
      liquidityShape.currentActiveId,
    )
    const currentActiveId = liquidityShape.currentActiveId

    let maxLiquidity = 0
    for (const bin of distribution) {
      const liquidity = bin.positionXAmountInSOL + bin.positionYAmountInSOL
      if (liquidity > maxLiquidity) maxLiquidity = liquidity
    }

    return distribution.map((bin) => {
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

  const barGeometry = useMemo(() => {
    if (chartData.length === 0 || containerWidth === 0) return null
    const barWidth = containerWidth / chartData.length
    return { barWidth, actualBarWidth: barWidth * (1 - BAR_GAP_RATIO) }
  }, [chartData.length, containerWidth])

  const activeMarkerX = useMemo(() => {
    if (!barGeometry) return null
    const index = chartData.findIndex((b) => b.binId === liquidityShape?.currentActiveId)
    if (index === -1) return null // The active bin is outside the position's range.
    return (index + 0.5) * barGeometry.barWidth
  }, [barGeometry, chartData, liquidityShape?.currentActiveId])

  // The dashed line and pointer share an X coordinate as the active bin moves.
  const activeX = useSharedValue(0)
  const slideScopeRef = useRef<string | null>(null)

  useEffect(() => {
    if (activeMarkerX == null) {
      slideScopeRef.current = null
      return
    }
    // Slide only when the same position at the same layout sees its active
    // bin move — mount, FlashList card recycling, and relayout jump directly.
    const scope = `${liquidityShape?.positionAddress ?? ''}|${containerWidth}`
    const shouldSlide = slideScopeRef.current !== null && slideScopeRef.current === scope
    slideScopeRef.current = scope
    activeX.value = shouldSlide
      ? withTiming(activeMarkerX, { duration: ACTIVE_SLIDE_MS, easing: Easing.out(Easing.cubic) })
      : activeMarkerX
  }, [activeMarkerX, activeX, containerWidth, liquidityShape?.positionAddress])

  const activeLineProps = useAnimatedProps(() => ({ x1: activeX.value, x2: activeX.value }))
  const activePointerProps = useAnimatedProps(() => ({
    d: `M${activeX.value - 3},0 L${activeX.value + 3},0 L${activeX.value},5 Z`,
  }))

  const svgContent = useMemo(() => {
    if (!barGeometry || containerWidth === 0) return null

    const chartWidth = containerWidth
    const { barWidth, actualBarWidth } = barGeometry

    const bars = chartData.map((bar, index) => {
      const x = index * barWidth + (barWidth * BAR_GAP_RATIO) / 2
      const barHeight = (bar.value / 100) * CHART_INNER_HEIGHT
      const y = CHART_PADDING.top + CHART_INNER_HEIGHT - barHeight

      return (
        <Rect key={`bar-${bar.binId}`} x={x} y={y} width={actualBarWidth} height={barHeight} fill={bar.color} rx={2} />
      )
    })

    // Add horizontal grid lines
    const gridLines = [0, 25, 50, 75, 100].map((percent) => {
      const y = CHART_PADDING.top + CHART_INNER_HEIGHT - (percent / 100) * CHART_INNER_HEIGHT
      return <Line key={`grid-${percent}`} x1="0" y1={y} x2={chartWidth} y2={y} stroke={colors.grid} strokeWidth="1" />
    })

    return (
      <Svg width={chartWidth} height={CHART_HEIGHT}>
        {gridLines}
        {bars}
        {activeMarkerX != null && (
          <>
            <AnimatedLine
              animatedProps={activeLineProps}
              y1={1}
              y2={CHART_HEIGHT - 1}
              stroke={colors.active}
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
            <AnimatedPath animatedProps={activePointerProps} fill={colors.active} />
          </>
        )}
      </Svg>
    )
  }, [chartData, containerWidth, colors, barGeometry, activeMarkerX, activeLineProps, activePointerProps])

  const legend = (
    <View className="flex-row items-center justify-center mt-2 gap-4">
      <View className="flex-row items-center">
        <View className="w-2 h-2 rounded-sm bg-app-secondary mr-1.5" />
        <Text className="text-app-text-secondary text-[10px]">Below Price</Text>
      </View>
      <View className="flex-row items-center">
        <View className="mr-1.5">
          <Svg width={8} height={10}>
            <Line x1={4} y1={0} x2={4} y2={10} stroke={colors.active} strokeWidth={1.5} strokeDasharray="3 3" />
          </Svg>
        </View>
        <Text className="text-app-primary text-[10px]">Active bin</Text>
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

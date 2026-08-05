import { memo, useCallback, useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import { Line, Rect, Svg } from 'react-native-svg'

import { useThemeTokens } from '../../hooks/useThemeTokens'
import type { PoolDepthData } from '../../hooks/usePoolDepth'
import { ChartPanel } from '../positions/ChartPanel'

interface PoolDepthChartProps {
  depth: PoolDepthData
  /** Formatted current price for the eyebrow reference label. */
  currentPrice: string
}

const CHART_HEIGHT = 160
const CHART_PADDING = { top: 10, bottom: 10, left: 0, right: 0 }
const BAR_GAP_RATIO = 0.3

// 8-digit hex alpha suffixes for overlay elements
const GRID_ALPHA = '4D' // ≈ 0.3
const ACTIVE_LINE_ALPHA = 'B3' // ≈ 0.7

function PoolDepthChartComponent({ depth, currentPrice }: PoolDepthChartProps) {
  const tokens = useThemeTokens()
  const [containerWidth, setContainerWidth] = useState(0)

  // Bar colors reuse the position-chart semantic mapping so the two charts
  // read as one design language:
  //   active bin → primary (sage), below active → secondary (copper), above → muted
  const colors = useMemo(
    () => ({
      active: tokens.primary,
      below: tokens.secondary,
      above: tokens.border,
      grid: `${tokens.border}${GRID_ALPHA}`,
      activeLine: `${tokens.primary}${ACTIVE_LINE_ALPHA}`,
    }),
    [tokens],
  )

  const handleLayout = useCallback((event: { nativeEvent: { layout: { width: number } } }) => {
    setContainerWidth(event.nativeEvent.layout.width)
  }, [])

  const maxLiquidity = useMemo(() => {
    if (depth.bins.length === 0) return 0
    return depth.bins.reduce((max, b) => (b.liquidity > max ? b.liquidity : max), 0)
  }, [depth.bins])

  // Pre-compute per-bar geometry metadata (color + relative height).
  const chartData = useMemo(() => {
    if (depth.bins.length === 0 || maxLiquidity <= 0) return []

    return depth.bins.map((bin) => {
      const isActive = bin.binId === depth.activeBinId
      const isBelow = bin.binId < depth.activeBinId

      let color = colors.above
      if (isActive) {
        color = colors.active
      } else if (isBelow) {
        color = colors.below
      }

      return {
        binId: bin.binId,
        heightPct: maxLiquidity > 0 ? (bin.liquidity / maxLiquidity) * 100 : 0,
        color,
        isActive,
      }
    })
  }, [depth.bins, depth.activeBinId, maxLiquidity, colors])

  const axisLabels = useMemo(() => {
    if (depth.bins.length === 0) {
      return { min: '0', max: '0' }
    }
    return {
      min: depth.bins[0].priceLabel,
      max: depth.bins[depth.bins.length - 1].priceLabel,
    }
  }, [depth.bins])

  const svgContent = useMemo(() => {
    if (chartData.length === 0 || containerWidth === 0) return null

    const chartWidth = containerWidth
    const chartInnerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom

    const barWidth = chartWidth / chartData.length
    const gapWidth = barWidth * BAR_GAP_RATIO
    const actualBarWidth = barWidth - gapWidth

    const bars = chartData.map((bar, index) => {
      const x = index * barWidth + gapWidth / 2
      const barHeight = (bar.heightPct / 100) * chartInnerHeight
      const y = CHART_PADDING.top + chartInnerHeight - barHeight
      return (
        <Rect key={`bar-${bar.binId}`} x={x} y={y} width={actualBarWidth} height={barHeight} fill={bar.color} rx={1} />
      )
    })

    // Horizontal grid lines — same cadence as the position charts.
    const gridLines = [0, 25, 50, 75, 100].map((percent) => {
      const y = CHART_PADDING.top + chartInnerHeight - (percent / 100) * chartInnerHeight
      return <Line key={`grid-${percent}`} x1="0" y1={y} x2={chartWidth} y2={y} stroke={colors.grid} strokeWidth="1" />
    })

    // Vertical active-bin marker — a faint full-height line at the active bar,
    // so the "current price" reads clearly even where liquidity is thin.
    const activeIndex = chartData.findIndex((b) => b.isActive)
    const activeLine =
      activeIndex >= 0 ? (
        <Line
          key="active-marker"
          x1={activeIndex * barWidth + barWidth / 2}
          y1={CHART_PADDING.top}
          x2={activeIndex * barWidth + barWidth / 2}
          y2={CHART_PADDING.top + chartInnerHeight}
          stroke={colors.activeLine}
          strokeWidth="1"
          strokeDasharray="2 3"
        />
      ) : null

    return (
      <Svg width={chartWidth} height={CHART_HEIGHT}>
        {gridLines}
        {bars}
        {activeLine}
      </Svg>
    )
  }, [chartData, containerWidth, colors])

  const legend = (
    <View className="flex-row items-center justify-center mt-2 gap-4">
      <View className="flex-row items-center">
        <View className="w-2 h-2 rounded-sm bg-app-secondary mr-1.5" />
        <Text className="text-app-text-secondary text-[10px]">Below active</Text>
      </View>
      <View className="flex-row items-center">
        <View className="w-2 h-2 rounded-sm bg-app-primary mr-1.5" />
        <Text className="text-app-primary text-[10px]">Active bin</Text>
      </View>
      <View className="flex-row items-center">
        <View className="w-2 h-2 rounded-sm bg-app-text-muted mr-1.5" />
        <Text className="text-app-text-secondary text-[10px]">Above active</Text>
      </View>
    </View>
  )

  if (chartData.length === 0) {
    return (
      <ChartPanel title="LIQUIDITY DEPTH" currentPrice={currentPrice}>
        <View className="h-[160px] items-center justify-center">
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
    <ChartPanel title="LIQUIDITY DEPTH" currentPrice={currentPrice}>
      <View className="w-full" style={{ height: CHART_HEIGHT }} onLayout={handleLayout}>
        {svgContent}
      </View>

      <View className="flex-row justify-between px-1 mt-2">
        <Text className="text-app-text-muted text-[10px] font-mono">{axisLabels.min}</Text>
        <Text className="text-app-text-muted text-[10px] font-mono">{axisLabels.max}</Text>
      </View>

      {legend}
    </ChartPanel>
  )
}

export const PoolDepthChart = memo(PoolDepthChartComponent)

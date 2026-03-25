import { memo, useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import { Line, Rect, Svg } from 'react-native-svg'
import type { LiquidityShape } from '../../utils/positions/calculations'

interface LiquidityBarChartProps {
  liquidityShape: LiquidityShape | null
  currentPrice: string
}

const CHART_HEIGHT = 120
const CHART_PADDING = { top: 10, bottom: 10, left: 0, right: 0 }
const BAR_GAP_RATIO = 0.3

function LiquidityBarChartComponent({ liquidityShape, currentPrice }: LiquidityBarChartProps) {
  const [containerWidth, setContainerWidth] = useState(0)

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

      let color = 'rgb(63, 63, 70)'
      if (isActive) {
        color = 'rgb(34, 211, 238)'
      } else if (isLeft) {
        color = 'rgb(16, 185, 129)'
      }

      return {
        value: maxLiquidity > 0 ? (liquidity / maxLiquidity) * 100 : 0,
        binId: bin.binId,
        price: bin.price,
        color,
      }
    })
  }, [liquidityShape])

  const minPrice = useMemo(() => {
    if (!liquidityShape?.binDistribution || liquidityShape.binDistribution.length === 0) return '0'
    return liquidityShape.binDistribution[0].price.toPrecision(6)
  }, [liquidityShape])

  const maxPrice = useMemo(() => {
    if (!liquidityShape?.binDistribution || liquidityShape.binDistribution.length === 0) return '0'
    return liquidityShape.binDistribution[liquidityShape.binDistribution.length - 1].price.toPrecision(6)
  }, [liquidityShape])

  const activeBinIndex = useMemo(() => {
    if (!liquidityShape?.currentActiveId || !liquidityShape?.binDistribution) return -1
    return liquidityShape.binDistribution.findIndex((b) => b.binId === liquidityShape.currentActiveId)
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
      return (
        <Line
          key={`grid-${percent}`}
          x1="0"
          y1={y}
          x2={chartWidth}
          y2={y}
          stroke="rgba(63, 63, 70, 0.3)"
          strokeWidth="1"
        />
      )
    })

    return (
      <Svg width={chartWidth} height={CHART_HEIGHT}>
        {gridLines}
        {bars}
      </Svg>
    )
  }, [chartData, containerWidth])

  if (chartData.length === 0) {
    return (
      <View className="bg-zinc-950/50 rounded-xl p-4 mb-6 border border-zinc-800/50">
        <View className="flex-row justify-between items-start mb-3">
          <Text className="text-zinc-500 text-[10px] font-bold tracking-widest">LIQUIDITY SHAPE</Text>
          <View className="bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
            <Text className="text-zinc-300 text-[10px] font-mono">{currentPrice}</Text>
          </View>
        </View>
        <View className="h-[120px] items-center justify-center">
          <Text className="text-zinc-500 text-xs">No liquidity data</Text>
        </View>
        <View className="flex-row justify-between px-1 mt-2">
          <Text className="text-zinc-600 text-[10px] font-mono">-</Text>
          <Text className="text-zinc-600 text-[10px] font-mono">-</Text>
        </View>
        <View className="flex-row items-center justify-center mt-2 space-x-4 gap-4">
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-sm bg-emerald-500 mr-1.5" />
            <Text className="text-zinc-400 text-[10px]">Below Price</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-sm bg-cyan-400 mr-1.5" />
            <Text className="text-cyan-400 text-[10px]">Active</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-sm bg-zinc-600 mr-1.5" />
            <Text className="text-zinc-400 text-[10px]">Above Price</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className="bg-zinc-950/50 rounded-xl p-4 mb-6 border border-zinc-800/50">
      <View className="flex-row justify-between items-start mb-3">
        <Text className="text-zinc-500 text-[10px] font-bold tracking-widest">LIQUIDITY SHAPE</Text>
        <View className="bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
          <Text className="text-zinc-300 text-[10px] font-mono">{currentPrice}</Text>
        </View>
      </View>

      <View
        className="w-full"
        onLayout={(event) => {
          const { width } = event.nativeEvent.layout
          setContainerWidth(width)
        }}
      >
        {svgContent}
      </View>

      <View className="flex-row justify-between px-1 mt-2">
        <Text className="text-zinc-600 text-[10px] font-mono">{minPrice}</Text>
        <Text className="text-zinc-600 text-[10px] font-mono">{maxPrice}</Text>
      </View>

      {activeBinIndex >= 0 && (
        <View className="flex-row items-center justify-center mt-2 space-x-4 gap-4">
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-sm bg-emerald-500 mr-1.5" />
            <Text className="text-zinc-400 text-[10px]">Below Price</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-sm bg-cyan-400 mr-1.5" />
            <Text className="text-cyan-400 text-[10px]">Active</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-sm bg-zinc-600 mr-1.5" />
            <Text className="text-zinc-400 text-[10px]">Above Price</Text>
          </View>
        </View>
      )}
    </View>
  )
}

export const LiquidityBarChart = memo(LiquidityBarChartComponent)

import { memo, useMemo } from 'react'
import { Text, View, Platform } from 'react-native'
import type { LiquidityShape, ChartBinData } from '../../utils/positions/calculations'

interface LiquidityChartProps {
  liquidityShape: LiquidityShape | null
  currentPrice: string
}

// Block characters for liquidity depth
const BLOCK_CHARS = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█']
const TARGET_WIDTH = 45 // Target character width for the chart

function getBlockChar(liquidity: number, maxLiquidity: number): string {
  if (liquidity === 0 || maxLiquidity === 0) return ' '

  const ratio = liquidity / maxLiquidity
  const index = Math.max(1, Math.ceil(ratio * (BLOCK_CHARS.length - 1)))
  return BLOCK_CHARS[index]
}

function LiquidityChartComponent({ liquidityShape, currentPrice }: LiquidityChartProps) {
  const chartBins = useMemo(() => liquidityShape?.binDistribution || [], [liquidityShape])
  const currentActiveId = liquidityShape?.currentActiveId || 0
  const maxLiquidity = liquidityShape ? Math.max(...chartBins.map((b) => b.tokenXAmount + b.tokenYAmount)) : 0
  const minPrice = chartBins.length > 0 ? chartBins[0].price.toPrecision(6) : '0'
  const maxPrice = chartBins.length > 0 ? chartBins[chartBins.length - 1].price.toPrecision(6) : '0'

  // Resample bins to fit TARGET_WIDTH to avoid wrapping or truncation
  const resampledData = useMemo(() => {
    if (chartBins.length === 0) return []

    // If we have fewer bins than target, just use them (centered by layout)
    if (chartBins.length <= TARGET_WIDTH) {
      return chartBins.map((b: ChartBinData) => ({
        liquidity: b.tokenXAmount + b.tokenYAmount,
        isActive: b.binId === currentActiveId,
        isLeft: b.binId < currentActiveId,
      }))
    }

    // Downsample: Group bins into buckets
    const result: any[] = []
    const step = chartBins.length / TARGET_WIDTH

    for (let i = 0; i < TARGET_WIDTH; i++) {
      const start = Math.floor(i * step)
      const end = Math.min(Math.floor((i + 1) * step), chartBins.length)
      const slice = chartBins.slice(start, end)

      if (slice.length === 0) continue

      // Use max liquidity in the bucket to preserve peaks
      const maxSliceLiquidity = Math.max(...slice.map((b: ChartBinData) => b.tokenXAmount + b.tokenYAmount))

      // If the bucket contains the active bin, mark the whole char as active
      const hasActive = slice.some((b: ChartBinData) => b.binId === currentActiveId)

      // If all bins in bucket are to the left, color it left (green)
      const isLeft = slice.every((b: ChartBinData) => b.binId < currentActiveId)

      result.push({
        liquidity: maxSliceLiquidity,
        isActive: hasActive,
        isLeft: isLeft && !hasActive,
      })
    }
    return result
  }, [chartBins, currentActiveId])

  const chartTextComponents = useMemo(() => {
    return resampledData.map((bin: any, i: number) => {
      const char = getBlockChar(bin.liquidity, maxLiquidity)
      const { isActive, isLeft } = bin

      let colorClass = 'text-zinc-700'
      if (isActive) {
        colorClass = 'text-cyan-400'
      } else if (isLeft) {
        colorClass = 'text-emerald-600'
      }

      // If active bin is effectively empty/invisible, use a marker to show where current price is
      const displayChar = isActive && char === ' ' ? '·' : char

      return (
        <Text key={i} className={colorClass}>
          {displayChar}
        </Text>
      )
    })
  }, [resampledData, maxLiquidity])

  return (
    <View className="bg-zinc-950/50 rounded-xl p-4 mb-6 border border-zinc-800/50">
      <View className="flex-row justify-between items-start mb-3">
        <Text className="text-zinc-500 text-[10px] font-bold tracking-widest">LIQUIDITY SHAPE</Text>
        <View className="bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
          <Text className="text-zinc-300 text-[10px] font-mono">{currentPrice}</Text>
        </View>
      </View>

      <View className="items-center justify-center py-4 bg-zinc-950 rounded-lg border border-zinc-900 mb-2 overflow-hidden px-2">
        <Text
          className="text-xs text-center"
          style={{
            fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
            letterSpacing: Platform.OS === 'ios' ? -1 : 0,
            lineHeight: 14,
          }}
          numberOfLines={1}
          ellipsizeMode="clip"
        >
          {chartTextComponents}
        </Text>
      </View>

      <View className="flex-row justify-between px-1">
        <Text className="text-zinc-600 text-[10px] font-mono">{minPrice}</Text>
        <Text className="text-zinc-600 text-[10px] font-mono">{maxPrice}</Text>
      </View>
    </View>
  )
}

export const LiquidityChart = memo(LiquidityChartComponent)

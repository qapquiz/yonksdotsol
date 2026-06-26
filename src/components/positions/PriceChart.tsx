import { memo, useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { Line, Polyline, Rect, Svg } from 'react-native-svg'
import type { LiquidityShape } from '../../utils/positions/computePositionViewData'
import { usePoolOhlcv } from '../../hooks/usePoolOhlcv'

interface PriceChartProps {
  liquidityShape: LiquidityShape | null
  currentPrice: string
}

const CHART_HEIGHT = 120
const PADDING = { top: 10, bottom: 10 }

// Chart colors — aligned with app palette (sage primary, cyan accent)
const PRICE_LINE_COLOR = '#8FA893' // app-primary — the price line
const BAND_FILL = 'rgba(143, 168, 147, 0.12)' // app-primary, low alpha — range band
const BAND_EDGE_COLOR = 'rgba(143, 168, 147, 0.5)' // range low/high edges
const GRID_LINE_COLOR = 'rgba(63, 63, 70, 0.3)'

/** Format a price compactly for axis labels (handles tiny meme-token prices). */
function formatPriceLabel(price: number): string {
  if (!Number.isFinite(price) || price === 0) return '0'
  return price.toPrecision(6)
}

function PriceChartComponent({ liquidityShape, currentPrice }: PriceChartProps) {
  const [containerWidth, setContainerWidth] = useState(0)
  const pairAddress = liquidityShape?.pairAddress ?? null
  const { data: ohlcv, loading } = usePoolOhlcv(pairAddress)

  const handleLayout = useCallback((event: { nativeEvent: { layout: { width: number } } }) => {
    setContainerWidth(event.nativeEvent.layout.width)
  }, [])

  // Range low/high price — the price endpoints of the Position's bin range.
  const rangeLowPrice = useMemo(() => {
    const bins = liquidityShape?.binDistribution
    return bins && bins.length > 0 ? bins[0].price : null
  }, [liquidityShape])

  const rangeHighPrice = useMemo(() => {
    const bins = liquidityShape?.binDistribution
    return bins && bins.length > 0 ? bins[bins.length - 1].price : null
  }, [liquidityShape])

  const candles = useMemo(() => ohlcv?.candles ?? [], [ohlcv])

  const svgContent = useMemo(() => {
    if (candles.length === 0 || containerWidth === 0) return null

    const lows = candles.map((c) => c.low)
    const highs = candles.map((c) => c.high)
    const dataMin = Math.min(...lows)
    const dataMax = Math.max(...highs)

    const lo = rangeLowPrice != null ? Math.min(dataMin, rangeLowPrice) : dataMin
    const hi = rangeHighPrice != null ? Math.max(dataMax, rangeHighPrice) : dataMax
    const span = hi - lo || 1
    const padded = span * 0.1
    const domainLo = lo - padded
    const domainHi = hi + padded
    const domain = domainHi - domainLo || 1

    const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom

    const yScale = (price: number) => PADDING.top + innerHeight * (1 - (price - domainLo) / domain)
    const xScale = (i: number) => {
      if (candles.length === 1) return containerWidth / 2
      return (i / (candles.length - 1)) * containerWidth
    }

    // Range band — shaded rectangle between Range high price (top) and Range low price (bottom).
    const band =
      rangeLowPrice != null && rangeHighPrice != null ? (
        <>
          <Rect
            x={0}
            y={yScale(rangeHighPrice)}
            width={containerWidth}
            height={yScale(rangeLowPrice) - yScale(rangeHighPrice)}
            fill={BAND_FILL}
          />
          <Line
            x1={0}
            y1={yScale(rangeHighPrice)}
            x2={containerWidth}
            y2={yScale(rangeHighPrice)}
            stroke={BAND_EDGE_COLOR}
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <Line
            x1={0}
            y1={yScale(rangeLowPrice)}
            x2={containerWidth}
            y2={yScale(rangeLowPrice)}
            stroke={BAND_EDGE_COLOR}
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        </>
      ) : null

    // Price line — close prices connected.
    const points = candles.map((c, i) => `${xScale(i)},${yScale(c.close)}`).join(' ')

    // Horizontal grid lines.
    const gridLines = [0, 25, 50, 75, 100].map((percent) => {
      const y = PADDING.top + innerHeight - (percent / 100) * innerHeight
      return (
        <Line
          key={`grid-${percent}`}
          x1="0"
          y1={y}
          x2={containerWidth}
          y2={y}
          stroke={GRID_LINE_COLOR}
          strokeWidth="1"
        />
      )
    })

    return (
      <Svg width={containerWidth} height={CHART_HEIGHT}>
        {gridLines}
        {band}
        <Polyline points={points} fill="none" stroke={PRICE_LINE_COLOR} strokeWidth="2" strokeLinejoin="round" />
      </Svg>
    )
  }, [candles, containerWidth, rangeLowPrice, rangeHighPrice])

  // No data yet (loading, devMock, or empty series)
  if (candles.length === 0) {
    return (
      <View className="bg-app-bg/50 rounded-xl p-4 mb-6 border border-app-border/50">
        <View className="flex-row justify-between items-start mb-3">
          <Text className="text-app-text-muted text-[10px] font-bold tracking-widest">PRICE</Text>
          <View className="bg-app-surface px-2 py-1 rounded border border-app-border">
            <Text className="text-app-text-secondary text-[10px] font-mono">{currentPrice}</Text>
          </View>
        </View>
        <View className="h-[120px] items-center justify-center">
          {loading ? (
            <ActivityIndicator size="small" color={PRICE_LINE_COLOR} />
          ) : (
            <Text className="text-app-text-muted text-xs">No price data</Text>
          )}
        </View>
        <View className="flex-row justify-between px-1 mt-2">
          <Text className="text-app-text-muted text-[10px] font-mono">
            {rangeLowPrice != null ? formatPriceLabel(rangeLowPrice) : '-'}
          </Text>
          <Text className="text-app-text-muted text-[10px] font-mono">
            {rangeHighPrice != null ? formatPriceLabel(rangeHighPrice) : '-'}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View className="bg-app-bg/50 rounded-xl p-4 mb-6 border border-app-border/50">
      <View className="flex-row justify-between items-start mb-3">
        <Text className="text-app-text-muted text-[10px] font-bold tracking-widest">PRICE</Text>
        <View className="bg-app-surface px-2 py-1 rounded border border-app-border">
          <Text className="text-app-text-secondary text-[10px] font-mono">{currentPrice}</Text>
        </View>
      </View>

      <View className="w-full" style={{ height: CHART_HEIGHT }} onLayout={handleLayout}>
        {svgContent}
      </View>

      <View className="flex-row justify-between px-1 mt-2">
        <Text className="text-app-text-muted text-[10px] font-mono">
          {rangeLowPrice != null ? formatPriceLabel(rangeLowPrice) : '-'}
        </Text>
        <Text className="text-app-text-muted text-[10px] font-mono">
          {rangeHighPrice != null ? formatPriceLabel(rangeHighPrice) : '-'}
        </Text>
      </View>

      <View className="flex-row items-center justify-center mt-2 gap-4">
        <View className="flex-row items-center">
          <View className="w-3 h-0.5 bg-[#8FA893] mr-1.5" />
          <Text className="text-app-text-secondary text-[10px]">Price</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-2 h-2 rounded-sm bg-[#8FA893]/20 border border-[#8FA893]/50 mr-1.5" />
          <Text className="text-app-text-secondary text-[10px]">Range</Text>
        </View>
      </View>
    </View>
  )
}

export const PriceChart = memo(PriceChartComponent)

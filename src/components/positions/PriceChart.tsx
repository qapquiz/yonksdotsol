import { memo, useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { Line, G, Rect, Svg } from 'react-native-svg'
import type { LiquidityShape } from '../../utils/positions/computePositionViewData'
import { usePoolOhlcv } from '../../hooks/usePoolOhlcv'
import { useThemeTokens } from '../../hooks/useThemeTokens'
import { ChartPanel } from './ChartPanel'

interface PriceChartProps {
  liquidityShape: LiquidityShape | null
  currentPrice: string
}

const CHART_HEIGHT = 120
const PADDING = { top: 10, bottom: 10 }

// 8-digit hex alpha suffixes
const BAND_FILL_ALPHA = '1F' // ≈ 0.12
const BAND_EDGE_ALPHA = '80' // ≈ 0.5
const GRID_ALPHA = '4D' // ≈ 0.3

// Candle geometry — body fills ~70% of its slot, capped so few candles don't balloon.
const CANDLE_BODY_SLOT_RATIO = 0.7
const CANDLE_BODY_MAX_WIDTH = 10
const CANDLE_MIN_BODY_HEIGHT = 1 // doji (open === close) still renders a visible dash

/** Format a price compactly for axis labels (handles tiny meme-token prices). */
function formatPriceLabel(price: number): string {
  if (!Number.isFinite(price) || price === 0) return '0'
  return price.toPrecision(6)
}

function PriceChartComponent({ liquidityShape, currentPrice }: PriceChartProps) {
  const tokens = useThemeTokens()
  const [containerWidth, setContainerWidth] = useState(0)
  const pairAddress = liquidityShape?.pairAddress ?? null
  const { data: ohlcv, loading } = usePoolOhlcv(pairAddress)

  // Chart colors — up candles derive from app-primary (profit), down from
  // app-negative (loss), per the semantic mapping. Band stays primary-tinted.
  const colors = useMemo(
    () => ({
      candleUp: tokens.primary,
      candleDown: tokens.negative,
      bandFill: `${tokens.primary}${BAND_FILL_ALPHA}`,
      bandEdge: `${tokens.primary}${BAND_EDGE_ALPHA}`,
      grid: `${tokens.border}${GRID_ALPHA}`,
    }),
    [tokens],
  )

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

    // Range band — shaded rectangle between Range high price (top) and Range low price (bottom).
    const band =
      rangeLowPrice != null && rangeHighPrice != null ? (
        <>
          <Rect
            x={0}
            y={yScale(rangeHighPrice)}
            width={containerWidth}
            height={yScale(rangeLowPrice) - yScale(rangeHighPrice)}
            fill={colors.bandFill}
          />
          <Line
            x1={0}
            y1={yScale(rangeHighPrice)}
            x2={containerWidth}
            y2={yScale(rangeHighPrice)}
            stroke={colors.bandEdge}
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <Line
            x1={0}
            y1={yScale(rangeLowPrice)}
            x2={containerWidth}
            y2={yScale(rangeLowPrice)}
            stroke={colors.bandEdge}
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        </>
      ) : null

    // Candles — wick spans high→low, body spans open→close. Each candle is
    // centered in its horizontal slot; up (close ≥ open) fills primary, down negative.
    const slot = containerWidth / candles.length
    const bodyWidth = Math.max(1.5, Math.min(slot * CANDLE_BODY_SLOT_RATIO, CANDLE_BODY_MAX_WIDTH))

    const candleEls = candles.map((c, i) => {
      const x = slot * (i + 0.5)
      const isUp = c.close >= c.open
      const color = isUp ? colors.candleUp : colors.candleDown
      const bodyTop = yScale(Math.max(c.open, c.close))
      const bodyHeight = Math.max(CANDLE_MIN_BODY_HEIGHT, yScale(Math.min(c.open, c.close)) - bodyTop)
      return (
        <G key={`${c.timestamp}-${i}`}>
          <Line x1={x} x2={x} y1={yScale(c.high)} y2={yScale(c.low)} stroke={color} strokeWidth="1" />
          <Rect x={x - bodyWidth / 2} y={bodyTop} width={bodyWidth} height={bodyHeight} fill={color} />
        </G>
      )
    })

    // Horizontal grid lines.
    const gridLines = [0, 25, 50, 75, 100].map((percent) => {
      const y = PADDING.top + innerHeight - (percent / 100) * innerHeight
      return (
        <Line key={`grid-${percent}`} x1="0" y1={y} x2={containerWidth} y2={y} stroke={colors.grid} strokeWidth="1" />
      )
    })

    return (
      <Svg width={containerWidth} height={CHART_HEIGHT}>
        {gridLines}
        {band}
        {candleEls}
      </Svg>
    )
  }, [candles, containerWidth, rangeLowPrice, rangeHighPrice, colors])

  const legend = (
    <View className="flex-row items-center justify-center mt-2 gap-4">
      <View className="flex-row items-center">
        <View className="w-2 h-2 rounded-sm bg-app-primary mr-1.5" />
        <Text className="text-app-text-secondary text-[10px]">Up</Text>
      </View>
      <View className="flex-row items-center">
        <View className="w-2 h-2 rounded-sm bg-app-negative mr-1.5" />
        <Text className="text-app-text-secondary text-[10px]">Down</Text>
      </View>
      <View className="flex-row items-center">
        <View className="w-2 h-2 rounded-sm bg-app-primary-dim border border-app-primary mr-1.5" />
        <Text className="text-app-text-secondary text-[10px]">Range</Text>
      </View>
    </View>
  )

  const axisLabels = (
    <View className="flex-row justify-between px-1 mt-2">
      <Text className="text-app-text-muted text-[10px] font-mono">
        {rangeLowPrice != null ? formatPriceLabel(rangeLowPrice) : '-'}
      </Text>
      <Text className="text-app-text-muted text-[10px] font-mono">
        {rangeHighPrice != null ? formatPriceLabel(rangeHighPrice) : '-'}
      </Text>
    </View>
  )

  // The measuring View mounts unconditionally (same as LiquidityBarChart) — RN Web
  // doesn't fire onLayout for a View that gains the prop after mount, so the
  // spinner/empty state renders INSIDE the measured box rather than in a branch
  // that swaps it in once data arrives.
  return (
    <ChartPanel title="PRICE" currentPrice={currentPrice}>
      <View className="w-full items-center justify-center" style={{ height: CHART_HEIGHT }} onLayout={handleLayout}>
        {svgContent ??
          (loading ? (
            <ActivityIndicator size="small" color={colors.candleUp} />
          ) : (
            <Text className="text-app-text-muted text-xs">No price data</Text>
          ))}
      </View>

      {axisLabels}
      {candles.length > 0 && legend}
    </ChartPanel>
  )
}

export const PriceChart = memo(PriceChartComponent)

import { memo, useCallback, useMemo, useState, type ReactElement } from 'react'
import { Text, View } from 'react-native'
import { Line, Rect, Svg } from 'react-native-svg'

import { useThemeTokens } from '../../hooks/useThemeTokens'
import type { PoolDepthData } from '../../hooks/usePoolDepth'
import { ChartPanel } from '../positions/ChartPanel'

/** One bin's worth of overlaid position share, for the active chart window. */
export interface PositionOverlayBin {
  binId: number
  /** This position's share of the bin's total liquidity, 0..1. */
  share: number
}

/**
 * A single connected-wallet position projected onto the depth chart. Only
 * bins inside the visible window are drawn; the range bracket is clamped to
 * the window so positions wider than the chart still read clearly.
 */
export interface PositionOverlay {
  id: string
  lowerBinId: number
  upperBinId: number
  /** Whether the active bin sits inside [lowerBinId, upperBinId]. */
  inRange: boolean
  /** Per-bin shares within the position's range. */
  bins: PositionOverlayBin[]
}

interface PoolDepthChartProps {
  depth: PoolDepthData
  /** Formatted current price for the eyebrow reference label. */
  currentPrice: string
  /** Connected-wallet positions to overlay (empty/undefined → no overlay). */
  positionOverlays?: PositionOverlay[]
}

/** Referentially-stable empty array so the no-overlay path never re-renders. */
const EMPTY_OVERLAYS: readonly PositionOverlay[] = []

const CHART_HEIGHT = 160
const CHART_PADDING = { top: 10, bottom: 10, left: 0, right: 0 }
const BAR_GAP_RATIO = 0.3

// 8-digit hex alpha suffixes for overlay elements
const GRID_ALPHA = '4D' // ≈ 0.3
const ACTIVE_LINE_ALPHA = 'B3' // ≈ 0.7
const RANGE_BAND_ALPHA = '1F' // ≈ 0.12 — background tint for a position's range
const RANGE_EDGE_ALPHA = '99' // ≈ 0.6 — dashed edges bracketing a position's range
const SHARE_BAR_RATIO = 0.45 // width of the per-bin "your share" marker vs the total bar

function PoolDepthChartComponent({ depth, currentPrice, positionOverlays }: PoolDepthChartProps) {
  const tokens = useThemeTokens()
  const [containerWidth, setContainerWidth] = useState(0)

  // Bar colors reuse the position-chart semantic mapping so the two charts
  // read as one design language:
  //   active bin → primary (sage), below active → secondary (copper), above → muted
  // Position overlays: in-range → primary, out-of-range → negative.
  const colors = useMemo(
    () => ({
      active: tokens.primary,
      below: tokens.secondary,
      above: tokens.border,
      grid: `${tokens.border}${GRID_ALPHA}`,
      activeLine: `${tokens.primary}${ACTIVE_LINE_ALPHA}`,
      inRangeBand: `${tokens.primary}${RANGE_BAND_ALPHA}`,
      inRangeEdge: `${tokens.primary}${RANGE_EDGE_ALPHA}`,
      inRangeBar: tokens.primary,
      outOfRangeBand: `${tokens.negative}${RANGE_BAND_ALPHA}`,
      outOfRangeEdge: `${tokens.negative}${RANGE_EDGE_ALPHA}`,
      outOfRangeBar: tokens.negative,
    }),
    [tokens],
  )

  const overlays = positionOverlays ?? EMPTY_OVERLAYS

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

    // binId → bar index, for projecting position bins onto the visible window.
    const binIndexById = new Map<number, number>()
    for (let i = 0; i < depth.bins.length; i++) {
      binIndexById.set(depth.bins[i].binId, i)
    }
    const firstBinId = depth.bins[0].binId
    const lastBinId = depth.bins[depth.bins.length - 1].binId

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

    // ── Position overlay layers ──────────────────────────────────────
    // Range bands sit behind the bars as a low-alpha tint; per-bin share
    // markers ride on top as narrower centered bars so they never fully
    // merge with the active-bin total bar. Ranges wider than the window are
    // clamped to the nearest visible bin; bins outside the window are skipped.
    const rangeBands: ReactElement[] = []
    const shareBars: ReactElement[] = []
    const rangeEdges: ReactElement[] = []
    const shareBarWidth = Math.max(2, actualBarWidth * SHARE_BAR_RATIO)
    const shareInset = (barWidth - shareBarWidth) / 2

    for (const overlay of overlays) {
      const bandFill = overlay.inRange ? colors.inRangeBand : colors.outOfRangeBand
      const edgeStroke = overlay.inRange ? colors.inRangeEdge : colors.outOfRangeEdge
      const barFill = overlay.inRange ? colors.inRangeBar : colors.outOfRangeBar

      const lowerIdx = overlay.lowerBinId >= firstBinId ? (binIndexById.get(overlay.lowerBinId) ?? 0) : 0
      const upperIdx =
        overlay.upperBinId <= lastBinId
          ? (binIndexById.get(overlay.upperBinId) ?? chartData.length - 1)
          : chartData.length - 1

      if (upperIdx >= lowerIdx) {
        const bandX = lowerIdx * barWidth
        const bandW = (upperIdx + 1 - lowerIdx) * barWidth
        const bandBottom = CHART_PADDING.top + chartInnerHeight
        rangeBands.push(
          <Rect
            key={`band-${overlay.id}`}
            x={bandX}
            y={CHART_PADDING.top}
            width={bandW}
            height={chartInnerHeight}
            fill={bandFill}
          />,
        )
        rangeEdges.push(
          <Line
            key={`edge-l-${overlay.id}`}
            x1={bandX}
            y1={CHART_PADDING.top}
            x2={bandX}
            y2={bandBottom}
            stroke={edgeStroke}
            strokeWidth="1"
            strokeDasharray="3 2"
          />,
          <Line
            key={`edge-r-${overlay.id}`}
            x1={bandX + bandW}
            y1={CHART_PADDING.top}
            x2={bandX + bandW}
            y2={bandBottom}
            stroke={edgeStroke}
            strokeWidth="1"
            strokeDasharray="3 2"
          />,
        )
      }

      for (const b of overlay.bins) {
        const idx = binIndexById.get(b.binId)
        if (idx == null) continue
        const totalHeightPct = chartData[idx].heightPct
        if (totalHeightPct <= 0 || b.share <= 0) continue
        const shareHeight = b.share * (totalHeightPct / 100) * chartInnerHeight
        const x = idx * barWidth + shareInset
        const y = CHART_PADDING.top + chartInnerHeight - shareHeight
        shareBars.push(
          <Rect
            key={`share-${overlay.id}-${b.binId}`}
            x={x}
            y={y}
            width={shareBarWidth}
            height={shareHeight}
            fill={barFill}
            rx={1}
          />,
        )
      }
    }

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
        {rangeBands}
        {bars}
        {shareBars}
        {rangeEdges}
        {activeLine}
      </Svg>
    )
  }, [chartData, depth.bins, containerWidth, colors, overlays])

  const positionLegend = useMemo(() => {
    if (overlays.length === 0) return null
    const hasInRange = overlays.some((o) => o.inRange)
    const hasOutOfRange = overlays.some((o) => !o.inRange)
    if (!hasInRange && !hasOutOfRange) return null
    return (
      <View className="flex-row items-center justify-center mt-1.5 gap-4">
        {hasInRange ? (
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-sm bg-app-primary mr-1.5" />
            <Text className="text-app-primary text-[10px]">Your position · in range</Text>
          </View>
        ) : null}
        {hasOutOfRange ? (
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-sm bg-app-negative mr-1.5" />
            <Text className="text-app-negative text-[10px]">Your position · out of range</Text>
          </View>
        ) : null}
      </View>
    )
  }, [overlays])

  const legend = (
    <View>
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
      {positionLegend}
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

import { memo, type ReactNode } from 'react'
import { Text, View } from 'react-native'

interface ChartPanelProps {
  /** Uppercase eyebrow label, e.g. "LIQUIDITY SHAPE" / "PRICE" */
  title: string
  /** Current price shown top-right, as quiet mono reference text */
  currentPrice: string
  children: ReactNode
}

/**
 * Chart header + body, rendered directly on the card surface (no nested
 * container). Holds the shared eyebrow title and current-price label; the chart
 * body, axis labels, and legend are passed as children so each chart keeps
 * control of its own contents.
 *
 * Previously this wrapped the chart in a recessed `bg-app-bg/50` panel — that
 * created a box-in-a-box inside the position card. The chart now sits directly
 * on the card, framed by its eyebrow and grid lines instead of a container.
 */
function ChartPanelComponent({ title, currentPrice, children }: ChartPanelProps) {
  return (
    <View className="mb-4">
      <View className="flex-row justify-between items-baseline mb-3">
        <Text className="text-app-text-muted text-[10px] font-sans-bold tracking-wider">{title}</Text>
        <Text className="text-app-text-muted text-[10px] font-mono">{currentPrice}</Text>
      </View>
      {children}
    </View>
  )
}

export const ChartPanel = memo(ChartPanelComponent)

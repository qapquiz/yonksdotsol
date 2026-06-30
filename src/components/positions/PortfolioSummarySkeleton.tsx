import { memo } from 'react'
import { View } from 'react-native'
import { ShimmerBlock } from '../ui/ShimmerBlock'

/**
 * Skeleton for the portfolio hero readout. Matches the loaded layout exactly:
 * bare (no card chrome), so the hero placeholder reads as distinct from the
 * boxed PositionCard skeletons beneath it. See PortfolioSummary.tsx.
 */
function PortfolioSummarySkeleton() {
  return (
    <View className="pt-3 pb-6 mb-2">
      {/* meta row — count + currency toggle */}
      <View className="flex-row items-center justify-between mb-5">
        <ShimmerBlock className="h-3 bg-app-border rounded w-20" />
        <ShimmerBlock className="h-6 bg-app-border rounded w-24" />
      </View>

      {/* hero value — matches text-4xl */}
      <ShimmerBlock className="h-9 bg-app-border rounded-lg w-40 mb-2" />

      {/* delta */}
      <ShimmerBlock className="h-4 bg-app-border rounded w-32 mb-6" />

      {/* stats row — matches DEPOSITED / UNCLAIMED FEES / 24H FEES / TVL */}
      <View className="border-t border-app-border pt-4 flex-row justify-between">
        <View className="flex-1 items-start">
          <ShimmerBlock className="h-3 bg-app-border rounded w-16 mb-1.5" />
          <ShimmerBlock className="h-4 bg-app-border rounded w-20" />
        </View>
        <View className="flex-1 items-start">
          <ShimmerBlock className="h-3 bg-app-border rounded w-20 mb-1.5" />
          <ShimmerBlock className="h-4 bg-app-border rounded w-20" />
        </View>
        <View className="flex-1 items-start">
          <ShimmerBlock className="h-3 bg-app-border rounded w-16 mb-1.5" />
          <ShimmerBlock className="h-4 bg-app-border rounded w-16" />
        </View>
      </View>
    </View>
  )
}

export default memo(PortfolioSummarySkeleton)

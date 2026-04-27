import { memo } from 'react'
import { View } from 'react-native'
import { ShimmerBlock } from '../ui/ShimmerBlock'

function PortfolioSummarySkeleton() {
  return (
    <View className="bg-app-surface rounded-3xl p-5 mb-4 border border-app-border">
      {/* Title row — matches: "PORTFOLIO SUMMARY" + count badge */}
      <View className="flex-row items-center gap-2 mb-3">
        <ShimmerBlock className="h-3 bg-app-border rounded w-32" />
        <ShimmerBlock className="bg-app-border rounded-full w-5 h-5" />
      </View>

      {/* PnL value — matches: large SOL value + percentage */}
      <View className="mb-4">
        <View className="flex-row items-baseline">
          <ShimmerBlock className="h-8 bg-app-border rounded-lg w-28 mb-1.5" />
          <ShimmerBlock className="h-4 bg-app-border rounded w-8 ml-1" />
        </View>
        <ShimmerBlock className="h-5 bg-app-border rounded-lg w-20" />
      </View>

      {/* Stats row — matches: VALUE / DEPOSITED / UNCLAIMED FEES */}
      <View className="flex-row justify-between">
        <View className="items-start">
          <ShimmerBlock className="h-3 bg-app-border rounded w-14 mb-1.5" />
          <View className="flex-row items-baseline">
            <ShimmerBlock className="h-4 bg-app-border rounded w-16" />
            <ShimmerBlock className="h-3 bg-app-border rounded w-6 ml-0.5" />
          </View>
        </View>
        <View className="items-start">
          <ShimmerBlock className="h-3 bg-app-border rounded w-20 mb-1.5" />
          <View className="flex-row items-baseline">
            <ShimmerBlock className="h-4 bg-app-border rounded w-16" />
            <ShimmerBlock className="h-3 bg-app-border rounded w-6 ml-0.5" />
          </View>
        </View>
        <View className="items-start">
          <ShimmerBlock className="h-3 bg-app-border rounded w-24 mb-1.5" />
          <View className="flex-row items-baseline">
            <ShimmerBlock className="h-4 bg-app-border rounded w-16" />
            <ShimmerBlock className="h-3 bg-app-border rounded w-6 ml-0.5" />
          </View>
        </View>
      </View>
    </View>
  )
}

export default memo(PortfolioSummarySkeleton)

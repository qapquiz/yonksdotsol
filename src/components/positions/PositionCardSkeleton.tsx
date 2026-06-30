import { memo } from 'react'
import { View } from 'react-native'
import { ShimmerBlock } from '../ui/ShimmerBlock'

function PositionCardSkeleton() {
  return (
    <View className="bg-app-surface rounded-3xl p-5 mb-4 border border-app-border">
      {/* Header — matches PositionHeader: mb-6, flex-row justify-between items-start */}
      <View className="flex-row justify-between items-start mb-6">
        <View className="flex-row items-center gap-3 flex-1">
          <ShimmerBlock className="w-10 h-10 rounded-full bg-app-border" />
          <View>
            <ShimmerBlock className="w-28 h-5 rounded-lg bg-app-border mb-1" />
            <ShimmerBlock className="w-24 h-3 rounded bg-app-border" />
          </View>
        </View>
        <View className="items-end gap-1">
          <ShimmerBlock className="w-16 h-4 rounded-md bg-app-border" />
          <ShimmerBlock className="w-20 h-6 rounded-lg bg-app-border" />
          <ShimmerBlock className="w-16 h-3 rounded bg-app-border" />
        </View>
      </View>

      {/* Chart section — matches LiquidityBarChart wrapper */}
      <View className="bg-app-bg/50 rounded-xl p-4 mb-6 border border-app-border/50">
        <View className="flex-row justify-between items-start mb-3">
          <ShimmerBlock className="w-28 h-3 rounded bg-app-border" />
          <ShimmerBlock className="w-16 h-5 rounded bg-app-border" />
        </View>
        {/* CHART_HEIGHT = 120 */}
        <ShimmerBlock className="h-[120px] rounded-lg bg-app-border" />
        <View className="flex-row justify-between mt-2">
          <ShimmerBlock className="w-12 h-3 rounded bg-app-border" />
          <ShimmerBlock className="w-12 h-3 rounded bg-app-border" />
        </View>
        <View className="flex-row items-center justify-center mt-2 gap-4">
          <ShimmerBlock className="w-16 h-3 rounded bg-app-border" />
          <ShimmerBlock className="w-12 h-3 rounded bg-app-border" />
          <ShimmerBlock className="w-16 h-3 rounded bg-app-border" />
        </View>
      </View>

      {/* Footer — matches PositionFooter: 24H FEES/TVL + two fee blocks */}
      <View className="mb-4">
        <ShimmerBlock className="w-16 h-3 rounded bg-app-border mb-1.5" />
        <ShimmerBlock className="w-14 h-4 rounded bg-app-border" />
      </View>

      <View className="mb-4">
        <ShimmerBlock className="w-28 h-3 rounded bg-app-border mb-1.5" />
        <ShimmerBlock className="w-36 h-4 rounded bg-app-border" />
        <ShimmerBlock className="w-20 h-3 rounded bg-app-border mt-1" />
      </View>

      <View>
        <ShimmerBlock className="w-24 h-3 rounded bg-app-border mb-1.5" />
        <ShimmerBlock className="w-36 h-4 rounded bg-app-border" />
        <ShimmerBlock className="w-20 h-3 rounded bg-app-border mt-1" />
      </View>
    </View>
  )
}

export default memo(PositionCardSkeleton)

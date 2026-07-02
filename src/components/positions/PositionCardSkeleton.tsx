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

      {/* Chart-mode toggle — matches SegmentedControl (fill) */}
      <View className="flex-row bg-app-bg/50 rounded-lg p-1 border border-app-border/50 mb-3">
        <ShimmerBlock className="flex-1 h-5 rounded-md bg-app-border" />
      </View>

      {/* Chart — matches ChartPanel (flat on card, no nested box) */}
      <View className="mb-4">
        <View className="flex-row justify-between items-baseline mb-3">
          <ShimmerBlock className="w-28 h-3 rounded bg-app-border" />
          <ShimmerBlock className="w-16 h-3 rounded bg-app-border" />
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

      {/* Footer — matches PositionFooter: hairline + inline 24H + two full-width fee blocks */}
      <View className="border-t border-app-border pt-4 gap-4">
        {/* 24H FEES / TVL — inline label-left / value-right */}
        <View className="flex-row items-center justify-between">
          <ShimmerBlock className="w-20 h-3 rounded bg-app-border" />
          <ShimmerBlock className="w-10 h-4 rounded bg-app-border" />
        </View>

        {/* UNREALIZED FEES — full row */}
        <View>
          <ShimmerBlock className="w-28 h-3 rounded bg-app-border mb-1.5" />
          <ShimmerBlock className="w-36 h-4 rounded bg-app-border" />
          <ShimmerBlock className="w-20 h-3 rounded bg-app-border mt-1" />
        </View>

        {/* CLAIMED FEES — full row */}
        <View>
          <ShimmerBlock className="w-24 h-3 rounded bg-app-border mb-1.5" />
          <ShimmerBlock className="w-36 h-4 rounded bg-app-border" />
          <ShimmerBlock className="w-20 h-3 rounded bg-app-border mt-1" />
        </View>
      </View>
    </View>
  )
}

export default memo(PositionCardSkeleton)

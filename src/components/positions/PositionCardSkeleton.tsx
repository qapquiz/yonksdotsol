import { memo, useEffect } from 'react'
import Animated, { useAnimatedStyle, withRepeat, withTiming, useSharedValue } from 'react-native-reanimated'
import { View } from 'react-native'

const SHIMMER_DURATION = 2000

function PositionCardSkeleton() {
  const shimmerValue = useSharedValue(0)

  useEffect(() => {
    shimmerValue.value = withRepeat(withTiming(1, { duration: SHIMMER_DURATION }), -1, false)
    return () => {
      shimmerValue.value = 0
    }
  }, [shimmerValue])

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + shimmerValue.value * 0.2,
  }))

  return (
    <View className="bg-zinc-900 rounded-3xl p-5 mb-4 border border-zinc-800 overflow-hidden">
      <Animated.View style={shimmerStyle} className="absolute inset-0 bg-[#8FA893]" />

      <Animated.View style={shimmerStyle} className="relative z-10">
        {/* Header — matches PositionHeader: mb-6, flex-row justify-between items-start */}
        <View className="flex-row justify-between items-start mb-6">
          <View className="flex-row items-center gap-3 flex-1">
            <View className="w-10 h-10 rounded-full bg-zinc-800" />
            <View>
              <View className="w-28 h-5 rounded-lg bg-zinc-800 mb-1" />
              <View className="w-24 h-3 rounded bg-zinc-800" />
            </View>
          </View>
          <View className="items-end gap-1">
            <View className="w-16 h-4 rounded-md bg-zinc-800" />
            <View className="w-20 h-6 rounded-lg bg-zinc-800" />
            <View className="w-16 h-3 rounded bg-zinc-800" />
          </View>
        </View>

        {/* Chart section — matches LiquidityBarChart wrapper: bg-zinc-950/50 rounded-xl p-4 mb-6 */}
        <View className="bg-zinc-950/50 rounded-xl p-4 mb-6 border border-zinc-800/50">
          <View className="flex-row justify-between items-start mb-3">
            <View className="w-28 h-3 rounded bg-zinc-800" />
            <View className="w-16 h-5 rounded bg-zinc-800" />
          </View>
          {/* CHART_HEIGHT = 120 */}
          <View className="h-[120px] rounded-lg bg-zinc-800" />
          <View className="flex-row justify-between mt-2">
            <View className="w-12 h-3 rounded bg-zinc-800" />
            <View className="w-12 h-3 rounded bg-zinc-800" />
          </View>
          <View className="flex-row items-center justify-center mt-2 gap-4">
            <View className="w-16 h-3 rounded bg-zinc-800" />
            <View className="w-12 h-3 rounded bg-zinc-800" />
            <View className="w-16 h-3 rounded bg-zinc-800" />
          </View>
        </View>

        {/* Footer — matches PositionFooter: two fee blocks */}
        <View className="mb-4">
          <View className="w-28 h-3 rounded bg-zinc-800 mb-1.5" />
          <View className="flex-row items-center gap-1">
            <View className="w-36 h-4 rounded bg-zinc-800" />
          </View>
          <View className="w-20 h-3 rounded bg-zinc-800 mt-1" />
        </View>

        <View>
          <View className="w-24 h-3 rounded bg-zinc-800 mb-1.5" />
          <View className="flex-row items-center gap-1">
            <View className="w-36 h-4 rounded bg-zinc-800" />
          </View>
          <View className="w-20 h-3 rounded bg-zinc-800 mt-1" />
        </View>
      </Animated.View>
    </View>
  )
}

export default memo(PositionCardSkeleton)

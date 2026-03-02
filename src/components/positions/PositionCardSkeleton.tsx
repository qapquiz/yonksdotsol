import { useEffect } from 'react'
import Animated, { useAnimatedStyle, withRepeat, withTiming, useSharedValue } from 'react-native-reanimated'
import { View } from 'react-native'

const SHIMMER_DURATION = 2000

export default function PositionCardSkeleton() {
  const shimmerValue = useSharedValue(0)

  useEffect(() => {
    shimmerValue.value = withRepeat(withTiming(1, { duration: SHIMMER_DURATION }), -1, false)
    return () => {
      shimmerValue.value = 0
    }
  }, [])

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + shimmerValue.value * 0.2,
  }))

  return (
    <View className="bg-zinc-900 rounded-3xl p-5 mb-4 border border-zinc-800 overflow-hidden">
      <Animated.View style={shimmerStyle} className="absolute inset-0 bg-[#8FA893]" />

      <Animated.View style={shimmerStyle} className="relative z-10">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-zinc-800" />
            <View className="w-32 h-5 rounded-lg bg-zinc-800" />
          </View>
          <View className="w-24 h-5 rounded-lg bg-zinc-800" />
        </View>

        <View className="w-full h-40 rounded-2xl bg-zinc-800 mb-4" />

        <View className="flex-row items-center justify-between">
          <View className="w-32 h-4 rounded-lg bg-zinc-800" />
          <View className="w-24 h-4 rounded-lg bg-zinc-800" />
        </View>
      </Animated.View>
    </View>
  )
}

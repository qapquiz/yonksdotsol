import { useEffect } from 'react'
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import type { ViewProps } from 'react-native'

const SHIMMER_DURATION = 2000

interface ShimmerBlockProps extends ViewProps {
  className?: string
}

export function ShimmerBlock({ className, ...rest }: ShimmerBlockProps) {
  const shimmerValue = useSharedValue(0)

  useEffect(() => {
    shimmerValue.value = withRepeat(withTiming(1, { duration: SHIMMER_DURATION }), -1, false)
    return () => {
      shimmerValue.value = 0
    }
  }, [shimmerValue])

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + shimmerValue.value * 0.3,
  }))

  return <Animated.View style={shimmerStyle} className={className} {...rest} />
}

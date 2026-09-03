import { memo, useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { LayoutChangeEvent } from 'react-native'
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useThemeTokens } from '../../hooks/useThemeTokens'

interface SegmentedOption<T extends string> {
  value: T
  /** Display label; defaults to `value`. */
  label?: string
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  /**
   * 'fill' makes items grow equally (flex-1) — full-width control.
   * 'inline' sizes items to their content — compact control for headers.
   */
  variant?: 'fill' | 'inline'
  /** Extra classes on the track (e.g. 'mb-3'). */
  className?: string
}

interface SegmentGeometry {
  x: number
  w: number
}

/**
 * M3-style selection indicator motion, tuned for the instrument identity:
 * stiff and nearly critically damped — fast arrival, one whisper of
 * overshoot, never bouncy. `ReduceMotion.System` honors OS reduce-motion.
 */
const SPRING = { damping: 26, stiffness: 320, mass: 0.8, reduceMotion: ReduceMotion.System }
const COLOR_TIMING = { duration: 130, reduceMotion: ReduceMotion.System }

/** Label whose color crossfades between selected and muted roles. */
function SegmentLabel({ selected, children }: { selected: boolean; children: string }) {
  const tokens = useThemeTokens()
  const animated = useAnimatedStyle(() => ({
    color: withTiming(selected ? tokens.primaryDimText : tokens.textMuted, COLOR_TIMING),
  }))
  return (
    <Animated.Text style={animated} className="text-[10px] font-sans-bold">
      {children}
    </Animated.Text>
  )
}

/**
 * Single segmented toggle. The shared inset-track treatment (recessed
 * `bg-app-bg/50` track + `p-1` inset + `rounded-md` items) is the source of
 * truth — both the chart-mode and currency toggles render through this so their
 * padding rhythm, radius, and selected/unselected colors stay in lockstep.
 *
 * Rhythm: track `p-1` inset, items `py-1.5`, selection = a sliding
 * `bg-app-primary-dim` indicator pill (M3 Expressive segmented-button motion),
 * label color crossfades behind it. Works for both variants because the pill
 * tracks each item's measured geometry, not an assumed equal width.
 */
function SegmentedControlComponent<T extends string>({
  options,
  value,
  onChange,
  variant = 'inline',
  className = '',
}: SegmentedControlProps<T>) {
  const tokens = useThemeTokens()
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )
  const geometry = useSharedValue<SegmentGeometry[]>([])
  const index = useSharedValue(selectedIndex)
  const [measured, setMeasured] = useState(false)

  useEffect(() => {
    index.value = selectedIndex
  }, [selectedIndex, index])

  const indicatorStyle = useAnimatedStyle(() => {
    const pos = geometry.value[index.value]
    if (!pos) return { opacity: 0 }
    return {
      opacity: 1,
      width: withSpring(pos.w, SPRING),
      transform: [{ translateX: withSpring(pos.x, SPRING) }],
    }
  })

  const handleItemLayout = (i: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout
    const next = [...geometry.value]
    next[i] = { x, w: width }
    geometry.value = next
    if (next.filter(Boolean).length === options.length) setMeasured(true)
  }

  return (
    <View className={`flex-row bg-app-bg/50 rounded-lg p-1 border border-app-border/50 ${className}`}>
      {measured && (
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', top: 4, bottom: 4, left: 0, borderRadius: 6, backgroundColor: tokens.primaryDim },
            indicatorStyle,
          ]}
        />
      )}
      {options.map((option, i) => (
        <Pressable
          key={option.value}
          onPress={() => onChange(option.value)}
          onLayout={handleItemLayout(i)}
          className={`${variant === 'fill' ? 'flex-1' : 'px-3'} py-1.5 rounded-md items-center justify-center active:opacity-80`}
        >
          <SegmentLabel selected={option.value === value}>{option.label ?? option.value}</SegmentLabel>
        </Pressable>
      ))}
    </View>
  )
}

export const SegmentedControl = memo(SegmentedControlComponent) as typeof SegmentedControlComponent

import { memo } from 'react'
import { Pressable, Text, View } from 'react-native'

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

/**
 * Single segmented toggle. The shared inset-track treatment (recessed
 * `bg-app-bg/50` track + `p-1` inset + `rounded-md` items) is the source of
 * truth — both the chart-mode and currency toggles render through this so their
 * padding rhythm, radius, and selected/unselected colors stay in lockstep.
 *
 * Rhythm: track `p-1` inset, items `py-1.5`, selected `bg-app-primary-dim`.
 */
function SegmentedControlComponent<T extends string>({
  options,
  value,
  onChange,
  variant = 'inline',
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <View className={`flex-row bg-app-bg/50 rounded-lg p-1 border border-app-border/50 ${className}`}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className={`${variant === 'fill' ? 'flex-1' : 'px-3'} py-1.5 rounded-md items-center justify-center active:opacity-80 ${selected ? 'bg-app-primary-dim' : ''}`}
          >
            <Text className={`text-[10px] font-sans-bold ${selected ? 'text-app-primary' : 'text-app-text-muted'}`}>
              {option.label ?? option.value}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export const SegmentedControl = memo(SegmentedControlComponent) as typeof SegmentedControlComponent

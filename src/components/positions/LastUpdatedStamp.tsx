import { Ionicons } from '@expo/vector-icons'
import { memo, useCallback } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useThemeTokens } from '../../hooks/useThemeTokens'
import { formatUpdateTime } from '../../utils/positions/formatters'

interface LastUpdatedStampProps {
  /** Epoch ms of the last successful load; null renders nothing.
   *  Host decides placement — PositionsList shows it in its data branch only. */
  lastUpdatedAt: number | null
  /** True while a (non-silent) fetch is in flight — shows "Updating…" and blocks the tap target */
  loading: boolean
  /** Manual refresh — same handler as pull-to-refresh, honors its cooldown */
  onRefresh: () => void
}

/**
 * Quiet data-freshness caption shown under the portfolio summary.
 * Shows the absolute load time, so it repaints only when data lands —
 * no aging tick. Tapping refreshes (subject to the shared 30s cooldown).
 */
function LastUpdatedStamp({ lastUpdatedAt, loading, onRefresh }: LastUpdatedStampProps) {
  const tokens = useThemeTokens()

  const handlePress = useCallback(() => {
    if (!loading) onRefresh()
  }, [loading, onRefresh])

  if (lastUpdatedAt == null) return null

  const label = loading ? 'Updating…' : `Updated ${formatUpdateTime(lastUpdatedAt)}`

  return (
    <View className="flex-row justify-end mb-3 px-1">
      <Pressable
        onPress={handlePress}
        disabled={loading}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        className="flex-row items-center gap-1.5 active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Ionicons name="time-outline" size={13} color={tokens.textMuted} />
        <Text className="text-xs font-sans-bold text-app-text-muted">{label}</Text>
      </Pressable>
    </View>
  )
}

export default memo(LastUpdatedStamp)

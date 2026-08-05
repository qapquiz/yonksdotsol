import { memo, useCallback } from 'react'
import { Pressable, Text, View } from 'react-native'

import { useThemeTokens } from '../../hooks/useThemeTokens'
import { formatUSD } from '../../utils/positions/formatters'
import type { ExplorePool } from '../../services/pools'

interface ExploreRowProps {
  pool: ExplorePool
  onPress: (address: string) => void
}

/**
 * Format a USD amount with compact magnitude (e.g. $1.2M) for large stats.
 * Mirrors the private helper in PoolHeaderBadges — duplicated here to keep
 * the Explore feature additive (no edits to existing components).
 */
function formatUSDCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return formatUSD(value)
}

/** Format a percentage with fixed 2-decimal precision and trailing %. */
function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${value.toFixed(2)}%`
}

interface StatProps {
  label: string
  value: string
  accent?: boolean
}

function Stat({ label, value, accent = false }: StatProps) {
  return (
    <View className="flex-1">
      <Text className="text-app-text-muted text-[10px] font-sans-bold tracking-wider mb-0.5">{label}</Text>
      <Text className={`text-xs font-sans-bold ${accent ? 'text-app-primary' : 'text-app-text'}`}>{value}</Text>
    </View>
  )
}

function ExploreRowComponent({ pool, onPress }: ExploreRowProps) {
  const tokens = useThemeTokens()
  const handlePress = useCallback(() => onPress(pool.address), [onPress, pool.address])

  const symbolX = pool.symbolX ?? '—'
  const symbolY = pool.symbolY ?? '—'
  const title = pool.name ?? `${symbolX}/${symbolY}`

  return (
    <Pressable
      onPress={handlePress}
      className="bg-app-surface rounded-2xl p-4 mb-3 border border-app-border active:opacity-80"
      style={({ pressed }) => (pressed ? { borderColor: tokens.primary } : undefined)}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1 mr-3">
          <Text className="text-base text-app-text font-sans-bold" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-app-text-muted text-[11px] font-mono mt-0.5">
            {symbolX} / {symbolY}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-app-text-muted text-[10px] font-sans-bold tracking-wider mb-0.5">APR</Text>
          <Text className="text-app-primary text-sm font-sans-bold">{formatPct(pool.apr)}</Text>
        </View>
      </View>

      <View className="flex-row border-t border-app-border pt-3 gap-2">
        <Stat label="TVL" value={formatUSDCompact(pool.tvl)} />
        <Stat label="24H VOL" value={formatUSDCompact(pool.volume24h)} />
        <Stat label="MKT CAP" value={formatUSDCompact(pool.marketCapX)} />
        <Stat label="BIN STEP" value={pool.binStep != null ? String(pool.binStep) : '—'} />
      </View>
    </Pressable>
  )
}

export const ExploreRow = memo(ExploreRowComponent)

import { memo } from 'react'
import { Text, View } from 'react-native'

import { formatUSD } from '../../utils/positions/formatters'
import type { PoolMeta } from '../../services/poolMeta'

interface PoolHeaderBadgesProps {
  meta: PoolMeta | null
  /** On-chain Token X mint — fallback when REST has no symbol. */
  mintX: string
  /** On-chain Token Y mint — fallback when REST has no symbol. */
  mintY: string
  /** On-chain bin step — authoritative fallback for the REST value. */
  binStep: number
}

/** Format a percentage with a fixed 2-decimal precision and trailing %. */
function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${value.toFixed(2)}%`
}

/** Format a USD amount with compact magnitude (e.g. $1.2M) for large stats. */
function formatUSDCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return formatUSD(value)
}

/** Format a token price, preserving precision for tiny meme-token values. */
function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value === 0) return '—'
  if (value >= 1) return value.toLocaleString('en-US', { maximumFractionDigits: 6 })
  // Sub-1 prices need significant digits, not fixed decimals.
  return value.toPrecision(6)
}

/** Truncate a mint address for compact display. */
function shortMint(mint: string): string {
  if (!mint) return '—'
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <View className="flex-1">
      <Text className="text-app-text-muted text-[10px] font-sans-bold tracking-wider mb-1">{label}</Text>
      <Text className={`text-sm font-sans-bold ${accent ? 'text-app-primary' : 'text-app-text'}`}>{value}</Text>
    </View>
  )
}

function PoolHeaderBadgesComponent({ meta, mintX, mintY, binStep }: PoolHeaderBadgesProps) {
  // Resolve display symbols: REST symbols are authoritative; fall back to a
  // truncated mint so the header is never blank when the REST fetch fails.
  const symbolX = meta?.symbolX || shortMint(mintX)
  const symbolY = meta?.symbolY || shortMint(mintY)
  const title = meta?.name ?? `${symbolX} - ${symbolY}`

  return (
    <View className="bg-app-surface rounded-3xl p-5 mb-4 border border-app-border">
      <View className="flex-row items-baseline justify-between mb-1">
        <Text className="text-xl text-app-text font-sans-bold">{title}</Text>
        <Text className="text-app-primary text-xs font-mono">
          {symbolX} / {symbolY}
        </Text>
      </View>
      <Text className="text-app-text-muted text-[10px] font-mono mb-4">{meta?.pairAddress ?? '—'}</Text>

      <View className="flex-row border-t border-app-border pt-4 gap-3">
        <Stat label="BIN STEP" value={`${meta?.binStep ?? binStep}`} />
        <Stat label="BASE FEE" value={formatPct(meta?.baseFeePct)} />
        <Stat label="DYN FEE" value={formatPct(meta?.dynamicFeePct)} />
      </View>

      <View className="flex-row border-t border-app-border pt-4 mt-4 gap-3">
        <Stat label="TVL" value={formatUSDCompact(meta?.tvl)} />
        <Stat label="24H VOL" value={formatUSDCompact(meta?.volume24h)} />
        <Stat label="APR" value={formatPct(meta?.apr)} accent />
      </View>

      <View className="flex-row border-t border-app-border pt-4 mt-4 gap-3">
        <Stat label="MKT CAP" value={formatUSDCompact(meta?.marketCapX)} />
        <Stat label="PRICE" value={formatPrice(meta?.currentPrice)} accent />
        <View className="flex-1" />
      </View>
    </View>
  )
}

export const PoolHeaderBadges = memo(PoolHeaderBadgesComponent)

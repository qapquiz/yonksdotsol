import { Ionicons } from '@expo/vector-icons'
import { memo, useMemo } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'

import { useThemeTokens } from '../../hooks/useThemeTokens'
import type { UserPositionView } from '../../hooks/usePoolPosition'

interface PoolPositionCardProps {
  /** Current connected wallet address, or undefined when signed out. */
  walletAddress: string | undefined
  /** True while a wallet sign-in attempt is in flight. */
  isConnecting: boolean
  /** True while the position fetch is in flight. */
  loading: boolean
  /** Non-fatal error from the position fetch (depth view keeps working). */
  error: Error | null
  /** Resolved positions for this wallet in this pool. */
  positions: UserPositionView[]
  /** Active bin id of the pool — drives the in/out-of-range badge. */
  activeBinId: number
  /** Token decimals, for humanizing raw base-unit amounts. */
  decimalsX: number
  decimalsY: number
  /** Best-effort token symbols (REST meta); fall back to "Token X/Y". */
  symbolX: string | null
  symbolY: string | null
  /** Initiate wallet sign-in. */
  onConnect: () => void
  /** Re-run the position fetch. */
  onRetry: () => void
}

/**
 * The "your position in this pool" affordance for the Pool Depth view.
 *
 * Wallet-aware, non-blocking, and never crashes the screen:
 *  - no wallet → subtle "connect to see your position" row;
 *  - connected, loading → quiet spinner;
 *  - connected, fetch failed → inline error with retry;
 *  - connected, no position → "You have no position in this pool";
 *  - connected, has position(s) → one row per position with range, in/out-of
 *    range badge vs the active bin, and per-token totals.
 *
 * In/out-of-range colouring mirrors the chart overlay: in-range → app-primary,
 * out-of-range → app-negative.
 */
function PoolPositionCardComponent({
  walletAddress,
  isConnecting,
  loading,
  error,
  positions,
  activeBinId,
  decimalsX,
  decimalsY,
  symbolX,
  symbolY,
  onConnect,
  onRetry,
}: PoolPositionCardProps) {
  const tokens = useThemeTokens()

  // No wallet connected → subtle, non-blocking connect affordance.
  if (!walletAddress) {
    return (
      <View className="bg-app-surface rounded-3xl p-4 border border-app-border">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-row items-center gap-2 flex-1">
            <Ionicons name="wallet-outline" size={16} color={tokens.textMuted} />
            <Text className="text-app-text-secondary text-xs flex-1 flex-wrap">
              Connect wallet to see your position in this pool
            </Text>
          </View>
          <Pressable
            onPress={onConnect}
            disabled={isConnecting}
            className="bg-app-primary-dim border border-app-primary rounded-full px-3 py-1.5 active:opacity-80"
          >
            <Text className="text-app-primary text-xs font-sans-bold">{isConnecting ? 'Connecting…' : 'Connect'}</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  // Connected, fetching, nothing to show yet → quiet spinner.
  if (loading && positions.length === 0) {
    return (
      <View className="bg-app-surface rounded-3xl p-4 border border-app-border flex-row items-center gap-2">
        <ActivityIndicator size="small" color={tokens.textMuted} />
        <Text className="text-app-text-muted text-xs">Loading your position…</Text>
      </View>
    )
  }

  // Connected, fetch failed, nothing to show → inline error + retry.
  if (error != null && positions.length === 0) {
    return (
      <View className="bg-app-surface rounded-3xl p-4 border border-app-border">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-row items-center gap-2 flex-1">
            <Ionicons name="alert-circle-outline" size={16} color={tokens.negative} />
            <Text className="text-app-text-secondary text-xs flex-1 flex-wrap">
              Couldn&apos;t load your position. The pool still works.
            </Text>
          </View>
          <Pressable
            onPress={onRetry}
            className="bg-app-negative-dim border border-app-negative rounded-full px-3 py-1.5 active:opacity-80"
          >
            <Text className="text-app-negative text-xs font-sans-bold">Retry</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  // Connected, resolved, no position in this pool.
  if (positions.length === 0) {
    return (
      <View className="bg-app-surface rounded-3xl p-4 border border-app-border flex-row items-center gap-2">
        <Ionicons name="information-circle-outline" size={14} color={tokens.textMuted} />
        <Text className="text-app-text-muted text-xs">You have no position in this pool</Text>
      </View>
    )
  }

  return (
    <View className="bg-app-surface rounded-3xl p-4 border border-app-border">
      <Text className="text-app-text-muted text-[10px] font-sans-bold tracking-wider mb-3">
        YOUR POSITION{positions.length > 1 ? `S (${positions.length})` : ''}
      </Text>
      {positions.map((p) => (
        <PositionRow
          key={p.id}
          position={p}
          activeBinId={activeBinId}
          decimalsX={decimalsX}
          decimalsY={decimalsY}
          symbolX={symbolX}
          symbolY={symbolY}
        />
      ))}
      {error != null ? (
        <View className="flex-row items-center gap-1.5 mt-3 pt-3 border-t border-app-border">
          <Ionicons name="alert-circle-outline" size={12} color={tokens.secondary} />
          <Text className="text-app-secondary text-[10px]">Showing cached position — refresh failed.</Text>
        </View>
      ) : null}
    </View>
  )
}

interface PositionRowProps {
  position: UserPositionView
  activeBinId: number
  decimalsX: number
  decimalsY: number
  symbolX: string | null
  symbolY: string | null
}

function PositionRow({ position, activeBinId, decimalsX, decimalsY, symbolX, symbolY }: PositionRowProps) {
  const inRange = activeBinId >= position.lowerBinId && activeBinId <= position.upperBinId
  const accentDot = inRange ? 'bg-app-primary' : 'bg-app-negative'
  const accentText = inRange ? 'text-app-primary' : 'text-app-negative'

  const amountX = useMemo(() => formatTokenAmount(position.totalXAmount, decimalsX), [position.totalXAmount, decimalsX])
  const amountY = useMemo(() => formatTokenAmount(position.totalYAmount, decimalsY), [position.totalYAmount, decimalsY])

  return (
    <View className="rounded-2xl border border-app-border px-3.5 py-3 mb-2">
      <View className="flex-row items-center justify-between mb-2.5">
        <View className="flex-row items-center gap-1.5">
          <View className={`w-1.5 h-1.5 rounded-full ${accentDot}`} />
          <Text className={`text-xs font-sans-bold ${accentText}`}>{inRange ? 'In range' : 'Out of range'}</Text>
        </View>
        <Text className="text-app-text-muted text-[10px] font-mono">
          Bins {position.lowerBinId}–{position.upperBinId}
        </Text>
      </View>
      <View className="flex-row gap-3">
        <AmountChip label={symbolX ?? 'Token X'} value={amountX} />
        <View className="w-px bg-app-border" />
        <AmountChip label={symbolY ?? 'Token Y'} value={amountY} />
      </View>
    </View>
  )
}

function AmountChip({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text className="text-app-text-muted text-[10px] font-sans-bold tracking-wider mb-0.5">{label}</Text>
      <Text className="text-app-text text-sm font-mono" numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}

/**
 * Humanize a raw base-unit amount into a compact display string. Uses BigInt
 * for the integer part (so large supplies don't overflow) and falls back to a
 * few fraction digits for small balances. Precision beyond ~4 decimals is not
 * meaningful for an at-a-glance card.
 */
function formatTokenAmount(amount: bigint, decimals: number): string {
  if (amount === 0n) return '0'
  const dec = Math.max(0, decimals)
  const divisor = 10n ** BigInt(dec)
  const whole = amount / divisor
  const wholeNum = Number(whole)

  if (Number.isFinite(wholeNum) && wholeNum >= 1_000_000_000) return `${(wholeNum / 1_000_000_000).toFixed(2)}B`
  if (Number.isFinite(wholeNum) && wholeNum >= 1_000_000) return `${(wholeNum / 1_000_000).toFixed(2)}M`
  if (Number.isFinite(wholeNum) && wholeNum >= 10_000) return `${(wholeNum / 1_000).toFixed(1)}K`

  const frac = amount % divisor
  const value = Number(whole) + Number(frac) / Number(divisor)
  if (!Number.isFinite(value)) return whole.toString()
  if (value >= 1) return value.toFixed(Math.min(4, dec))
  if (value > 0) return value.toPrecision(4)
  return '0'
}

export const PoolPositionCard = memo(PoolPositionCardComponent)

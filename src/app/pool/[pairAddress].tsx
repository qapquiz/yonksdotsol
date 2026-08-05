import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useMemo } from 'react'
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PoolDepthChart } from '../../components/pool/PoolDepthChart'
import type { PositionOverlay } from '../../components/pool/PoolDepthChart'
import { PoolDepthSkeleton } from '../../components/pool/PoolDepthSkeleton'
import { PoolHeaderBadges } from '../../components/pool/PoolHeaderBadges'
import { PoolPositionCard } from '../../components/pool/PoolPositionCard'
import { usePoolDepth } from '../../hooks/usePoolDepth'
import { usePoolPosition } from '../../hooks/usePoolPosition'
import { useThemeTokens } from '../../hooks/useThemeTokens'
import { useWalletLifecycle } from '../../hooks/useWalletLifecycle'

/**
 * Pool Depth view (v2 hero feature).
 *
 * Unauthenticated base — no wallet required. Renders REST-sourced pool
 * metadata badges above an on-chain bin-by-bin liquidity depth chart with the
 * active bin highlighted. When a wallet is connected, the user's position(s)
 * in this pool are overlaid on the chart (range + per-bin share, in/out-of
 * range vs the active bin) and summarized in a card below.
 */
export default function PoolDepthScreen() {
  const router = useRouter()
  const tokens = useThemeTokens()
  const params = useLocalSearchParams<{ pairAddress: string }>()
  const pairAddress = typeof params.pairAddress === 'string' ? params.pairAddress : undefined

  const { meta, depth, dlmm, loading, error, refresh } = usePoolDepth(pairAddress)

  // Connected-wallet position overlay — reuses the depth view's DLMM instance.
  // Hooked unconditionally; it no-ops while there's no wallet or no dlmm yet.
  const { walletAddress, isConnecting, handleConnect } = useWalletLifecycle()
  const {
    positions,
    loading: posLoading,
    error: posError,
    refresh: refreshPositions,
  } = usePoolPosition(dlmm, walletAddress)

  // Project positions onto the chart: range + per-bin share, with in/out-of
  // range computed from the depth view's active bin so the overlay and the
  // active-bin marker always agree.
  const positionOverlays = useMemo<PositionOverlay[]>(
    () =>
      positions.map((p) => ({
        id: p.id,
        lowerBinId: p.lowerBinId,
        upperBinId: p.upperBinId,
        inRange: depth != null && depth.activeBinId >= p.lowerBinId && depth.activeBinId <= p.upperBinId,
        bins: p.bins.map((b) => ({ binId: b.binId, share: b.share })),
      })),
    [positions, depth],
  )

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/')
    }
  }, [router])

  // Current price label for the chart eyebrow: REST spot price is best,
  // falling back to the active bin's price from the on-chain depth.
  const metaPrice = meta?.currentPrice ?? null
  const currentPriceLabel = useMemo(() => {
    if (metaPrice != null) {
      return metaPrice >= 1 ? metaPrice.toLocaleString('en-US', { maximumFractionDigits: 6 }) : metaPrice.toPrecision(6)
    }
    const activeBin = depth?.bins.find((b) => b.binId === depth?.activeBinId)
    return activeBin?.priceLabel ?? '—'
  }, [metaPrice, depth])

  const showSkeleton = loading && !depth
  const showError = !loading && error != null && !depth

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      {/* Top bar */}
      <View className="px-4 py-3 flex-row items-center gap-3">
        <Pressable
          onPress={handleBack}
          className="h-10 w-10 items-center justify-center rounded-full bg-app-surface-highlight active:opacity-80"
        >
          <Ionicons name="chevron-back" size={22} color={tokens.textSecondary} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xs font-sans-bold uppercase tracking-wider text-app-text-secondary">Pool Depth</Text>
        </View>
      </View>

      {showSkeleton ? (
        <PoolDepthSkeleton />
      ) : showError ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="mb-4 opacity-60">
            <Ionicons name="cloud-offline-outline" size={48} color={tokens.textMuted} />
          </View>
          <Text className="text-lg font-sans-bold text-app-text mb-2 text-center">Couldn&apos;t load this pool</Text>
          <Text className="text-sm text-app-text-secondary text-center mb-6">
            The on-chain depth data failed to load. Check your connection and try again.
          </Text>
          <Pressable
            onPress={refresh}
            className="flex-row items-center gap-2 bg-app-primary-dim border border-app-primary rounded-full px-5 py-2.5 active:opacity-80"
          >
            <Ionicons name="refresh" size={16} color={tokens.primary} />
            <Text className="text-app-primary text-sm font-sans-bold">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={tokens.refreshTint} />}
        >
          <PoolHeaderBadges
            meta={meta}
            mintX={depth?.mintX ?? ''}
            mintY={depth?.mintY ?? ''}
            binStep={depth?.binStep ?? 0}
          />

          {depth ? (
            <View className="bg-app-surface rounded-3xl p-5 border border-app-border">
              <PoolDepthChart depth={depth} currentPrice={currentPriceLabel} positionOverlays={positionOverlays} />
            </View>
          ) : (
            // REST meta resolved but on-chain bins still pending — keep the
            // header visible and show a quiet chart placeholder.
            <View className="bg-app-surface rounded-3xl p-5 border border-app-border">
              <Text className="text-app-text-muted text-xs text-center py-10">Loading depth…</Text>
            </View>
          )}

          {/* Connected-wallet position overlay summary. Non-blocking: depth
              stays fully usable with no wallet, no position, or a failed fetch. */}
          {depth ? (
            <View className="mt-4">
              <PoolPositionCard
                walletAddress={walletAddress}
                isConnecting={isConnecting}
                loading={posLoading}
                error={posError}
                positions={positions}
                activeBinId={depth.activeBinId}
                decimalsX={depth.decimalsX}
                decimalsY={depth.decimalsY}
                symbolX={meta?.symbolX ?? null}
                symbolY={meta?.symbolY ?? null}
                onConnect={handleConnect}
                onRetry={refreshPositions}
              />
            </View>
          ) : null}

          {error && depth && (
            <View className="mt-4 flex-row items-center gap-2 px-1">
              <View className="w-4 h-4 rounded-full bg-app-secondary-dim items-center justify-center">
                <Text className="text-app-secondary text-[10px] font-sans-bold">!</Text>
              </View>
              <Text className="text-app-secondary text-xs">Some details unavailable — showing on-chain data only.</Text>
            </View>
          )}
        </ScrollView>
      )}

      <StatusBar style={tokens.statusBar} />
    </SafeAreaView>
  )
}

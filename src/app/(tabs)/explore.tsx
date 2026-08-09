import { Ionicons } from '@expo/vector-icons'
import { LegendList } from '@legendapp/list/react-native'
import { StatusBar } from 'expo-status-bar'
import { useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, RefreshControl, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ExploreRow } from '../../components/explore/ExploreRow'
import { ExploreRowSkeleton } from '../../components/explore/ExploreRowSkeleton'
import { useExplorePools } from '../../hooks/useExplorePools'
import { useThemeTokens } from '../../hooks/useThemeTokens'
import type { ExplorePool, PoolOrderBy } from '../../services/pools'

interface ExploreListItem {
  id: string
  pool: ExplorePool
}

/**
 * Explore (v2 discovery list).
 *
 * Unauthenticated — no wallet required. Lists the top Meteora DLMM pools by
 * 24h volume, filtered client-side by the safety defaults (Token X market
 * cap ≥ $5M and 24h volume ≥ $500K). Tap a row to open that pool's Depth
 * view (`/pool/<pairAddress>`).
 *
 * NOTE: pagination beyond page 1 is a future task — only the first page is
 * shown today.
 */
export default function ExploreScreen() {
  const router = useRouter()
  const tokens = useThemeTokens()
  const [orderBy, setOrderBy] = useState<PoolOrderBy>('volume_usd_24h')
  const { pools, loading, error, refresh } = useExplorePools(orderBy)

  const handlePressRow = useCallback(
    (address: string) => {
      router.push(`/pool/${address}`)
    },
    [router],
  )

  const renderItem = useCallback(
    ({ item }: { item: ExploreListItem }) => <ExploreRow pool={item.pool} onPress={handlePressRow} />,
    [handlePressRow],
  )

  const listData = useMemo<ExploreListItem[]>(() => pools.map((pool) => ({ id: pool.address, pool })), [pools])

  // Stale-state banner: a refresh that failed while prior data is still on
  // screen. It overlays the Data state and never replaces it.
  const listHeader = useMemo(() => {
    if (!error || pools.length === 0) return null
    return (
      <View className="flex-row items-center gap-2 mb-3 px-1">
        <View className="w-4 h-4 rounded-full bg-app-secondary-dim items-center justify-center">
          <Text className="text-app-secondary text-[10px] font-sans-bold">!</Text>
        </View>
        <Text className="text-app-secondary text-xs">Couldn&apos;t refresh — showing the last loaded pools.</Text>
      </View>
    )
  }, [error, pools.length])

  const showSkeleton = loading && pools.length === 0
  const showError = !loading && error != null && pools.length === 0
  const showEmpty = !loading && error == null && pools.length === 0

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      {/* Top bar */}
      <View className="px-4 py-3 flex-row items-center gap-3">
        <View className="flex-1">
          <Text className="text-xs font-sans-bold uppercase tracking-wider text-app-text-secondary">Explore</Text>
          <Text className="text-lg text-app-text font-sans-bold">Top DLMM Pools</Text>
        </View>
      </View>
      <View className="flex-row gap-2 px-4 pb-2">
        <Pressable
          onPress={() => setOrderBy('volume_usd_24h')}
          className={`rounded-full px-3 py-1.5 active:opacity-80 ${
            orderBy === 'volume_usd_24h' ? 'border border-app-primary bg-app-primary-dim' : 'bg-app-surface-highlight'
          }`}
        >
          <Text
            className={`text-xs font-sans-bold ${orderBy === 'volume_usd_24h' ? 'text-app-primary' : 'text-app-text-secondary'}`}
          >
            24h Vol
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setOrderBy('apr')}
          className={`rounded-full px-3 py-1.5 active:opacity-80 ${
            orderBy === 'apr' ? 'border border-app-primary bg-app-primary-dim' : 'bg-app-surface-highlight'
          }`}
        >
          <Text
            className={`text-xs font-sans-bold ${orderBy === 'apr' ? 'text-app-primary' : 'text-app-text-secondary'}`}
          >
            APR
          </Text>
        </Pressable>
      </View>

      {showSkeleton ? (
        <View className="px-4 pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <ExploreRowSkeleton key={i} />
          ))}
        </View>
      ) : showError ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="mb-4 opacity-60">
            <Ionicons name="cloud-offline-outline" size={48} color={tokens.textMuted} />
          </View>
          <Text className="text-lg font-sans-bold text-app-text mb-2 text-center">Couldn&apos;t load pools</Text>
          <Text className="text-sm text-app-text-secondary text-center mb-6">
            The discovery feed failed to load. Check your connection and try again.
          </Text>
          <Pressable
            onPress={refresh}
            className="flex-row items-center gap-2 bg-app-primary-dim border border-app-primary rounded-full px-5 py-2.5 active:opacity-80"
          >
            <Ionicons name="refresh" size={16} color={tokens.primary} />
            <Text className="text-app-primary text-sm font-sans-bold">Retry</Text>
          </Pressable>
        </View>
      ) : showEmpty ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="mb-4 opacity-60">
            <Ionicons name="search-outline" size={48} color={tokens.textMuted} />
          </View>
          <Text className="text-lg font-sans-bold text-app-text mb-2 text-center">No pools match right now</Text>
          <Text className="text-sm text-app-text-secondary text-center">
            Nothing currently clears the market-cap and 24h-volume safety floors. Pull to refresh later.
          </Text>
        </View>
      ) : (
        <LegendList
          data={listData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={listHeader}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={tokens.refreshTint} />}
          recycleItems
          estimatedItemSize={140}
        />
      )}

      <StatusBar style={tokens.statusBar} />
    </SafeAreaView>
  )
}

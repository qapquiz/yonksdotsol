import { LegendList } from '@legendapp/list/react-native'
import { useCallback, useMemo } from 'react'
import { RefreshControl, ScrollView, Text, View } from 'react-native'
import EmptyState from '../../components/positions/EmptyState'
import PortfolioSummary from '../../components/positions/PortfolioSummary'
import PortfolioSummarySkeleton from '../../components/positions/PortfolioSummarySkeleton'
import PositionCard from '../../components/positions/PositionCard'
import PositionCardSkeleton from '../../components/positions/PositionCardSkeleton'
import { useThemeTokens } from '../../hooks/useThemeTokens'
import type { ResolvedPosition, PortfolioSummaryData } from '../../hooks/usePositionsPage'

interface PositionsListProps {
  positions: ResolvedPosition[]
  summary: PortfolioSummaryData | null
  hasPnLData: boolean
  outOfRangeCount: number
  positionCount: number
  loading: boolean
  tokenDataReady: boolean
  walletResolved: boolean
  walletAddress?: string
  refresh: () => void
}

export default function PositionsList({
  positions,
  summary,
  hasPnLData,
  outOfRangeCount,
  positionCount,
  loading,
  tokenDataReady,
  walletResolved,
  walletAddress,
  refresh,
}: PositionsListProps) {
  const tokens = useThemeTokens()

  const listData = useMemo(() => positions.map((resolved) => ({ id: resolved.id, resolved })), [positions])

  const renderItem = useCallback(({ item }: { item: (typeof listData)[number] }) => {
    const r = item.resolved
    return <PositionCard vm={r.vm} tokenXInfo={r.tokenXInfo} tokenYInfo={r.tokenYInfo} />
  }, [])

  const listHeader = useMemo(
    () => (
      <>
        <PortfolioSummary summary={summary} hasData={hasPnLData} positionCount={positionCount} />
        {outOfRangeCount > 0 && (
          <View className="flex-row items-center gap-2 mb-4 px-1">
            <View className="w-4 h-4 rounded-full bg-orange-500/20 items-center justify-center">
              <Text className="text-orange-500 text-[10px] font-sans-bold">!</Text>
            </View>
            <Text className="text-orange-400 text-xs font-sans-bold">
              {outOfRangeCount} {outOfRangeCount === 1 ? 'position' : 'positions'} out of range
            </Text>
          </View>
        )}
      </>
    ),
    [summary, hasPnLData, positionCount, outOfRangeCount],
  )

  // Show skeleton until wallet is resolved, positions fetch completes, AND token
  // data is ready.  Waiting for tokenDataReady avoids a blank LegendList frame that
  // occurs when positions exist but token prices haven't loaded yet.
  const showSkeleton = !walletResolved || !tokenDataReady || (positions.length === 0 && loading)
  const showEmpty = walletResolved && !loading && positions.length === 0

  if (showSkeleton) {
    return (
      <View className="px-4 pt-2">
        <PortfolioSummarySkeleton />
        <PositionCardSkeleton />
        <View className="h-20" />
      </View>
    )
  }

  if (showEmpty) {
    return (
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={tokens.refreshTint} />}
      >
        <EmptyState />
      </ScrollView>
    )
  }

  return (
    <LegendList
      data={listData}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={listHeader}
      ListFooterComponent={<View className="h-20" />}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={tokens.refreshTint} />}
      recycleItems
    />
  )
}

import { FlashList } from '@shopify/flash-list'
import { useCallback, useMemo } from 'react'
import { RefreshControl, Text, View } from 'react-native'
import EmptyState from '../../components/positions/EmptyState'
import PortfolioSummary from '../../components/positions/PortfolioSummary'
import PortfolioSummarySkeleton from '../../components/positions/PortfolioSummarySkeleton'
import PositionCard from '../../components/positions/PositionCard'
import PositionCardSkeleton from '../../components/positions/PositionCardSkeleton'
import { useThemeTokens } from '../../hooks/useThemeTokens'
import type { ResolvedPosition, PortfolioSummaryData } from '../../hooks/usePositionsPage'

type ListItem =
  | { type: 'summary'; id: string }
  | { type: 'warning'; id: string; count: number }
  | {
      type: 'position'
      id: string
      resolved: ResolvedPosition
    }

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

  const listData = useMemo(() => {
    const items: ListItem[] = []

    items.push({ type: 'summary', id: 'portfolio-summary' })

    if (outOfRangeCount > 0) {
      items.push({
        type: 'warning',
        id: 'out-of-range-warning',
        count: outOfRangeCount,
      })
    }

    for (const resolved of positions) {
      items.push({
        type: 'position',
        id: resolved.id,
        resolved,
      })
    }

    return items
  }, [positions, outOfRangeCount])

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      switch (item.type) {
        case 'summary':
          return <PortfolioSummary summary={summary} hasData={hasPnLData} positionCount={positionCount} />
        case 'warning':
          return (
            <View className="flex-row items-center gap-2 mb-4 px-1">
              <View className="w-4 h-4 rounded-full bg-orange-500/20 items-center justify-center">
                <Text className="text-orange-500 text-[10px] font-sans-bold">!</Text>
              </View>
              <Text className="text-orange-400 text-xs font-sans-bold">
                {item.count} {item.count === 1 ? 'position' : 'positions'} out of range
              </Text>
            </View>
          )
        case 'position': {
          const r = item.resolved
          return <PositionCard vm={r.vm} tokenXInfo={r.tokenXInfo} tokenYInfo={r.tokenYInfo} />
        }
      }
    },
    [summary, hasPnLData, positionCount],
  )

  // Show skeleton until wallet is resolved, positions fetch completes, AND token
  // data is ready.  Waiting for tokenDataReady avoids a blank FlashList frame that
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
      <View className="flex-1 px-4 pt-2">
        <EmptyState />
      </View>
    )
  }

  return (
    <FlashList
      data={listData}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      getItemType={(item) => item.type}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
      ListFooterComponent={<View className="h-20" />}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={tokens.refreshTint} />}
    />
  )
}

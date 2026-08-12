import { LegendList } from '@legendapp/list/react-native'
import { useCallback, useMemo } from 'react'
import { RefreshControl, ScrollView, View } from 'react-native'
import EmptyState from '../../components/positions/EmptyState'
import PortfolioSummary from '../../components/positions/PortfolioSummary'
import PortfolioSummarySkeleton from '../../components/positions/PortfolioSummarySkeleton'
import PositionCard from '../../components/positions/PositionCard'
import PositionCardSkeleton from '../../components/positions/PositionCardSkeleton'
import { useThemeTokens } from '../../hooks/useThemeTokens'
import { useTriage } from '../../hooks/useTriage'
import type { ResolvedPosition, PortfolioSummaryData } from '../../hooks/usePositionsPage'

interface PositionsListProps {
  positions: ResolvedPosition[]
  summary: PortfolioSummaryData | null
  hasPnLData: boolean
  outOfRangeCount: number
  positionCount: number
  loading: boolean
  tokenDataReady: boolean
  /** Live SOL→USD price for the SOL/USD display toggle */
  solUsdPrice: number | null
  walletReady: boolean
  walletAddress?: string
  refresh: () => void
}

export default function PositionsList({
  positions,
  summary,
  hasPnLData,
  positionCount,
  loading,
  tokenDataReady,
  solUsdPrice,
  walletReady,
  walletAddress,
  refresh,
}: PositionsListProps) {
  const tokens = useThemeTokens()
  const { triage, velocityLoading } = useTriage(positions)

  const listData = useMemo(() => positions.map((resolved) => ({ id: resolved.id, resolved })), [positions])

  const renderItem = useCallback(
    ({ item }: { item: (typeof listData)[number] }) => {
      const r = item.resolved
      return <PositionCard vm={r.vm} tokenXInfo={r.tokenXInfo} tokenYInfo={r.tokenYInfo} solUsdPrice={solUsdPrice} />
    },
    [solUsdPrice],
  )

  const listHeader = useMemo(
    () => (
      <PortfolioSummary
        summary={summary}
        hasData={hasPnLData}
        positionCount={positionCount}
        solUsdPrice={solUsdPrice}
        triage={triage}
        positions={positions}
        velocityLoading={velocityLoading}
      />
    ),
    [summary, hasPnLData, positionCount, solUsdPrice, triage, positions, velocityLoading],
  )

  // Show skeleton until wallet is resolved, positions fetch completes, AND token
  // data is ready.  Waiting for tokenDataReady avoids a blank LegendList frame that
  // occurs when positions exist but token prices haven't loaded yet.
  const showSkeleton = !walletReady || !tokenDataReady || (positions.length === 0 && loading)
  const showEmpty = walletReady && !loading && positions.length === 0

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
      estimatedItemSize={440}
    />
  )
}

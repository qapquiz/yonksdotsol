import { FlashList } from '@shopify/flash-list'
import { useCallback, useMemo, useRef, useState } from 'react'
import { RefreshControl, ScrollView, Text, View } from 'react-native'
import { useClaimFee } from '../../hooks/useClaimFee'
import { useThemeTokens } from '../../hooks/useThemeTokens'
import EmptyState from '../../components/positions/EmptyState'
import PortfolioSummary from '../../components/positions/PortfolioSummary'
import PortfolioSummarySkeleton from '../../components/positions/PortfolioSummarySkeleton'
import PositionCard from '../../components/positions/PositionCard'
import PositionCardSkeleton from '../../components/positions/PositionCardSkeleton'
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

  // Track which position is currently being claimed
  const [claimingId, setClaimingId] = useState<string | null>(null)

  // Claim fee input for the currently selected position
  const claimInput = useMemo(() => {
    if (!claimingId || !walletAddress) return null
    const pos = positions.find((p) => p.id === claimingId)
    if (!pos) return null

    const lbPosition = pos.position.lbPairPositionsData[pos.lbPositionIndex]
    const positionAddress = lbPosition?.publicKey.toBase58() ?? pos.id

    return {
      pairAddress: pos.poolAddress,
      positionAddress,
      ownerAddress: walletAddress,
    }
  }, [claimingId, walletAddress, positions])

  const { claiming, claimSignature, error: claimError, claimFee: executeClaim } = useClaimFee(claimInput)

  // When claim completes, clear the claiming state and refresh data
  const prevClaimingRef = useRef(claiming)
  if (prevClaimingRef.current && !claiming) {
    // Claim just finished
    setClaimingId(null)
    if (claimSignature) {
      refresh()
    }
  }
  prevClaimingRef.current = claiming

  const handleClaimFee = useCallback(
    (positionId: string) => {
      setClaimingId(positionId)
      executeClaim()
    },
    [executeClaim],
  )

  const listData = useMemo(() => positions.map((resolved) => ({ id: resolved.id, resolved })), [positions])

  const renderItem = useCallback(
    ({ item }: { item: (typeof listData)[number] }) => {
      const r = item.resolved
      const lbPosition = r.position.lbPairPositionsData[r.lbPositionIndex]
      const positionData = lbPosition?.positionData
      const hasFees = positionData ? !positionData.feeX.isZero() || !positionData.feeY.isZero() : false
      const isClaiming = claimingId === item.id

      return (
        <PositionCard
          vm={r.vm}
          tokenXInfo={r.tokenXInfo}
          tokenYInfo={r.tokenYInfo}
          hasUnrealizedFees={hasFees}
          claiming={isClaiming && claiming}
          onClaimFee={hasFees && walletAddress ? () => handleClaimFee(item.id) : undefined}
        />
      )
    },
    [claimingId, claiming, walletAddress, handleClaimFee],
  )

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
        {claimError && (
          <View className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 mb-4">
            <Text className="text-red-400 text-xs font-sans-bold">Claim failed: {claimError}</Text>
          </View>
        )}
      </>
    ),
    [summary, hasPnLData, positionCount, outOfRangeCount, claimError],
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
    <FlashList
      data={listData}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={listHeader}
      ListFooterComponent={<View className="h-20" />}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={tokens.refreshTint} />}
    />
  )
}

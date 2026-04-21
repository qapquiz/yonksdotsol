import type { PositionInfo } from '@meteora-ag/dlmm'
import { FlashList } from '@shopify/flash-list'
import { useCallback, useEffect, useMemo } from 'react'
import { RefreshControl, Text, View } from 'react-native'
import EmptyState from '../../components/positions/EmptyState'
import PortfolioSummary from '../../components/positions/PortfolioSummary'
import PositionCard from '../../components/positions/PositionCard'
import PositionCardSkeleton from '../../components/positions/PositionCardSkeleton'
import { useBatchTokenData } from '../../hooks/positions/useBatchTokenData'
import { usePortfolioWidget } from '../../hooks/usePortfolioWidget'
import { usePnLStore } from '../../stores/pnlStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { calculateIsInRange } from '../../utils/positions/calculations'

type ListItem =
  | { type: 'summary'; id: string }
  | { type: 'warning'; id: string; count: number }
  | {
      type: 'position'
      id: string
      position: PositionInfo
      lbPositionIndex: number
      poolAddress: string
      tokenXMint: string
      tokenYMint: string
    }

interface PositionsListProps {
  positions: Map<string, PositionInfo>
  isLoadingPositions: boolean
  walletResolved: boolean
  ownerAddress?: string
  onRefresh?: () => void
}

export default function PositionsList({
  positions,
  isLoadingPositions,
  walletResolved,
  ownerAddress,
  onRefresh,
}: PositionsListProps) {
  // Keep entries to preserve pair address (Map key)
  const positionsEntries = useMemo(() => Array.from(positions.entries()), [positions])
  const positionsArray = useMemo(() => positionsEntries.map(([, pos]) => pos), [positionsEntries])

  // Extract pool addresses for PnL fetching
  const poolAddresses = useMemo(() => positionsEntries.map(([pairAddress]) => pairAddress), [positionsEntries])

  const theme = useSettingsStore((s) => s.theme)

  const positionCount = useMemo(
    () => positionsArray.reduce((sum, p) => sum + p.lbPairPositionsData.length, 0),
    [positionsArray],
  )

  const wallet = ownerAddress || ''

  // Sync portfolio data to Android home screen widget
  usePortfolioWidget(ownerAddress, positionCount, poolAddresses)

  // Collect unique token mints across all positions
  const uniqueMints = useMemo(() => {
    const mintSet = new Set<string>()
    for (const position of positionsArray) {
      mintSet.add(position.tokenX.mint.address.toBase58())
      mintSet.add(position.tokenY.mint.address.toBase58())
    }
    return Array.from(mintSet)
  }, [positionsArray])

  const { tokenData } = useBatchTokenData({
    mints: uniqueMints,
    enabled: positionsArray.length > 0,
  })

  // Single orchestration point for PnL fetching — avoids duplicate
  // fetches from each PositionCard + PortfolioSummary
  const fetchPoolPnL = usePnLStore((state) => state.fetchPoolPnL)
  useEffect(() => {
    if (wallet && poolAddresses.length > 0) {
      poolAddresses.forEach((poolAddress) => {
        fetchPoolPnL(poolAddress, wallet)
      })
    }
  }, [wallet, poolAddresses, fetchPoolPnL])

  // Count out-of-range positions
  const outOfRangeCount = useMemo(() => {
    let count = 0
    for (const position of positionsArray) {
      const activeId = Number(position.lbPair.activeId)
      for (const lbPosition of position.lbPairPositionsData) {
        const pd = lbPosition.positionData
        if (pd && !calculateIsInRange(activeId, pd.lowerBinId, pd.upperBinId)) {
          count++
        }
      }
    }
    return count
  }, [positionsArray])

  // Build flat data array for FlashList
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

    for (const [pairAddress, position] of positionsEntries) {
      for (let idx = 0; idx < position.lbPairPositionsData.length; idx++) {
        items.push({
          type: 'position',
          id: `${position.publicKey.toString()}-${idx}`,
          position,
          lbPositionIndex: idx,
          poolAddress: pairAddress,
          tokenXMint: position.tokenX.mint.address.toBase58(),
          tokenYMint: position.tokenY.mint.address.toBase58(),
        })
      }
    }

    return items
  }, [positionsEntries, outOfRangeCount])

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      switch (item.type) {
        case 'summary':
          return <PortfolioSummary walletAddress={wallet} positionCount={positionCount} poolAddresses={poolAddresses} />
        case 'warning':
          return (
            <View className="flex-row items-center gap-2 mb-4 px-1">
              <Text className="text-orange-500 text-xs font-sans-bold">!</Text>
              <Text className="text-orange-400 text-xs font-sans-bold">
                {item.count} {item.count === 1 ? 'position' : 'positions'} out of range
              </Text>
            </View>
          )
        case 'position':
          return (
            <PositionCard
              position={item.position}
              lbPositionIndex={item.lbPositionIndex}
              tokenXInfo={tokenData.get(item.tokenXMint) ?? null}
              tokenYInfo={tokenData.get(item.tokenYMint) ?? null}
              walletAddress={ownerAddress}
              poolAddress={item.poolAddress}
            />
          )
      }
    },
    [wallet, positionCount, poolAddresses, tokenData, ownerAddress],
  )

  // Show skeleton until wallet status is resolved AND first fetch completes
  // This prevents the empty-state → skeleton → data flash on cold start
  const showSkeleton = !walletResolved || (positionsArray.length === 0 && isLoadingPositions)
  const showEmpty = walletResolved && !isLoadingPositions && positionsArray.length === 0

  if (showSkeleton) {
    return (
      <View className="px-4 pt-2">
        {[1, 2, 3].map((key) => (
          <PositionCardSkeleton key={key} />
        ))}
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
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isLoadingPositions}
            onRefresh={onRefresh}
            tintColor={theme === 'dark' ? '#8FA893' : '#6b8f71'}
          />
        ) : undefined
      }
    />
  )
}

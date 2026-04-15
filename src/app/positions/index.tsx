import type { PositionInfo } from '@meteora-ag/dlmm'
import { FlashList } from '@shopify/flash-list'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Text, View } from 'react-native'
import EmptyState from '../../components/positions/EmptyState'
import PortfolioSummary from '../../components/positions/PortfolioSummary'
import PositionCard from '../../components/positions/PositionCard'
import PositionCardSkeleton from '../../components/positions/PositionCardSkeleton'
import { useBatchTokenData } from '../../hooks/positions/useBatchTokenData'
import { usePnLStore } from '../../stores/pnlStore'
import { calculateIsInRange } from '../../utils/positions/calculations'

interface PositionsListProps {
  positions: Map<string, PositionInfo>
  isLoadingPositions: boolean
  ownerAddress?: string
  onRefresh?: () => void
}

interface FlatPositionItem {
  position: PositionInfo
  lbPositionIndex: number
  poolAddress: string
  tokenXInfo: import('../../tokens').TokenInfo | null
  tokenYInfo: import('../../tokens').TokenInfo | null
}

export default function PositionsList({ positions, isLoadingPositions, ownerAddress, onRefresh }: PositionsListProps) {
  // Keep entries to preserve pair address (Map key)
  const positionsEntries = useMemo(() => Array.from(positions.entries()), [positions])
  const positionsArray = useMemo(() => positionsEntries.map(([, pos]) => pos), [positionsEntries])

  // Extract pool addresses for PnL fetching
  const poolAddresses = useMemo(() => positionsEntries.map(([pairAddress]) => pairAddress), [positionsEntries])

  const positionCount = useMemo(
    () => positionsArray.reduce((sum, p) => sum + p.lbPairPositionsData.length, 0),
    [positionsArray],
  )

  const wallet = ownerAddress || ''

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

  // Centralized PnL fetch — single source of truth for all pool addresses
  const fetchPoolPnL = usePnLStore((state) => state.fetchPoolPnL)
  useEffect(() => {
    if (wallet && poolAddresses.length > 0) {
      poolAddresses.forEach((addr) => {
        fetchPoolPnL(addr, wallet)
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

  // Flatten nested positions into a flat array for virtualized list
  const flatData = useMemo<FlatPositionItem[]>(() => {
    const items: FlatPositionItem[] = []
    for (const [pairAddress, position] of positionsEntries) {
      const tokenXMint = position.tokenX.mint.address.toBase58()
      const tokenYMint = position.tokenY.mint.address.toBase58()
      for (let idx = 0; idx < position.lbPairPositionsData.length; idx++) {
        items.push({
          position,
          lbPositionIndex: idx,
          poolAddress: pairAddress,
          tokenXInfo: tokenData.get(tokenXMint) ?? null,
          tokenYInfo: tokenData.get(tokenYMint) ?? null,
        })
      }
    }
    return items
  }, [positionsEntries, tokenData])

  // Track whether we've completed at least one positions fetch
  const hasLoadedOnce = useRef(false)
  if (!isLoadingPositions) {
    hasLoadedOnce.current = true
  }

  const renderItem = useCallback(
    ({ item }: { item: FlatPositionItem }) => (
      <PositionCard
        position={item.position}
        lbPositionIndex={item.lbPositionIndex}
        tokenXInfo={item.tokenXInfo}
        tokenYInfo={item.tokenYInfo}
        walletAddress={ownerAddress}
        poolAddress={item.poolAddress}
      />
    ),
    [ownerAddress],
  )

  const keyExtractor = useCallback(
    (item: FlatPositionItem) => `${item.position.publicKey.toString()}-${item.lbPositionIndex}`,
    [],
  )

  const ListHeader = useMemo(() => {
    if (positionCount === 0) return null
    return (
      <View>
        <PortfolioSummary walletAddress={wallet} positionCount={positionCount} poolAddresses={poolAddresses} />
        {outOfRangeCount > 0 ? (
          <View className="flex-row items-center gap-2 mb-4 px-1">
            <Text className="text-orange-500 text-xs">⚠</Text>
            <Text className="text-orange-400 text-xs font-bold">
              {outOfRangeCount} {outOfRangeCount === 1 ? 'position' : 'positions'} out of range
            </Text>
          </View>
        ) : null}
      </View>
    )
  }, [wallet, positionCount, poolAddresses, outOfRangeCount])

  const ListFooter = useMemo(() => <View className="h-20" />, [])

  // Skeleton only on true first load — empty state stays during refresh
  if (positionsArray.length === 0) {
    if (!hasLoadedOnce.current) {
      return (
        <View>
          {[1, 2, 3].map((key) => (
            <PositionCardSkeleton key={key} />
          ))}
          <View className="h-20" />
        </View>
      )
    }
    return <EmptyState />
  }

  return (
    <FlashList
      data={flatData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeader}
      ListFooterComponent={ListFooter}
      refreshing={isLoadingPositions}
      onRefresh={onRefresh}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
    />
  )
}

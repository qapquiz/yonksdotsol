import type { PositionInfo } from '@meteora-ag/dlmm'
import { useMemo, useRef } from 'react'
import { Text, View } from 'react-native'
import EmptyState from '../../components/positions/EmptyState'
import PortfolioSummary from '../../components/positions/PortfolioSummary'
import PositionCard from '../../components/positions/PositionCard'
import PositionCardSkeleton from '../../components/positions/PositionCardSkeleton'
import { useBatchTokenData } from '../../hooks/positions/useBatchTokenData'
import { useUpnlPerPosition } from '../../hooks/positions/useUpnlPerPosition'
import { calculateIsInRange } from '../../utils/positions/calculations'

interface PositionsListProps {
  positions: Map<string, PositionInfo>
  isLoadingPositions: boolean
  ownerAddress?: string
}

export default function PositionsList({ positions, isLoadingPositions, ownerAddress }: PositionsListProps) {
  const positionsArray = useMemo(() => Array.from(positions.values()), [positions])

  const positionCount = useMemo(
    () => positionsArray.reduce((sum, p) => sum + p.lbPairPositionsData.length, 0),
    [positionsArray],
  )

  const { data: upnlData, isLoading: isLoadingUpnl } = useUpnlPerPosition({
    walletAddress: ownerAddress || '',
    enabled: !!ownerAddress,
  })

  // Aggregate portfolio-level uPnL from all positions
  const portfolioSummary = useMemo(() => {
    if (!upnlData || upnlData.size === 0) {
      return {
        totalPnlSol: 0,
        totalPnlPercent: 0,
        totalValueSol: 0,
        totalInitialDepositSol: 0,
        totalUnclaimedFeesSol: 0,
      }
    }

    let totalPnlSol = 0
    let totalValueSol = 0
    let totalInitialDepositSol = 0
    let totalUnclaimedFeesSol = 0

    for (const upnl of upnlData.values()) {
      totalPnlSol += upnl.upnlWithFees
      totalValueSol += upnl.currentValueInSol
      totalInitialDepositSol += upnl.initialDepositInSol
      totalUnclaimedFeesSol += upnl.unclaimedFeesInSol
    }

    const totalPnlPercent = totalInitialDepositSol > 0 ? (totalPnlSol / totalInitialDepositSol) * 100 : 0

    return {
      totalPnlSol,
      totalPnlPercent,
      totalValueSol,
      totalInitialDepositSol,
      totalUnclaimedFeesSol,
    }
  }, [upnlData])

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

  // Track whether we've completed at least one positions fetch
  const hasLoadedOnce = useRef(false)
  if (!isLoadingPositions) {
    hasLoadedOnce.current = true
  }

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
    <View>
      <PortfolioSummary {...portfolioSummary} positionCount={positionCount} isLoading={isLoadingUpnl && !upnlData} />

      {outOfRangeCount > 0 && (
        <View className="flex-row items-center gap-2 mb-4 px-1">
          <Text className="text-orange-500 text-xs">⚠</Text>
          <Text className="text-orange-400 text-xs font-bold">
            {outOfRangeCount} {outOfRangeCount === 1 ? 'position' : 'positions'} out of range
          </Text>
        </View>
      )}

      {positionsArray.map((position) =>
        position.lbPairPositionsData.map((lbPosition, idx) => {
          const positionAddress = lbPosition.publicKey.toBase58()
          const tokenXMint = position.tokenX.mint.address.toBase58()
          const tokenYMint = position.tokenY.mint.address.toBase58()
          return (
            <PositionCard
              key={`${position.publicKey.toString()}-${idx}`}
              position={position}
              lbPositionIndex={idx}
              upnlData={upnlData?.get(positionAddress) ?? null}
              tokenXInfo={tokenData.get(tokenXMint) ?? null}
              tokenYInfo={tokenData.get(tokenYMint) ?? null}
            />
          )
        }),
      )}
      {/* Add bottom padding for scroll */}
      <View className="h-20" />
    </View>
  )
}

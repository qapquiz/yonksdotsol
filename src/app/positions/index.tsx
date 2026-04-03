import type { PositionInfo } from '@meteora-ag/dlmm'
import { useMemo } from 'react'
import { Text, View } from 'react-native'
import EmptyState from '../../components/positions/EmptyState'
import PositionCard from '../../components/positions/PositionCard'
import PositionCardSkeleton from '../../components/positions/PositionCardSkeleton'
import { useBatchTokenData } from '../../hooks/positions/useBatchTokenData'
import { useUpnlPerPosition } from '../../hooks/positions/useUpnlPerPosition'

interface PositionsListProps {
  positions: Map<string, PositionInfo>
  isLoadingPositions: boolean
  ownerAddress?: string
}

export default function PositionsList({ positions, isLoadingPositions, ownerAddress }: PositionsListProps) {
  const positionsArray = useMemo(() => Array.from(positions.values()), [positions])

  const { data: upnlData, isLoading: upnlLoading } = useUpnlPerPosition({
    walletAddress: ownerAddress || '',
    enabled: !!ownerAddress,
  })

  // Collect unique token mints across all positions
  const uniqueMints = useMemo(() => {
    const mintSet = new Set<string>()
    for (const position of positionsArray) {
      mintSet.add(position.tokenX.mint.address.toBase58())
      mintSet.add(position.tokenY.mint.address.toBase58())
    }
    return Array.from(mintSet)
  }, [positionsArray])

  const { tokenData, isLoading: tokenLoading } = useBatchTokenData({
    mints: uniqueMints,
    enabled: positionsArray.length > 0,
  })

  if (isLoadingPositions || upnlLoading) {
    return (
      <View className="flex-1 px-4 pt-6">
        <View className="flex-row justify-between items-center mb-6">
          <View className="flex-row items-center gap-2">
            <Text className="text-xl font-bold text-white">Active Positions</Text>
          </View>
        </View>
        {[1, 2, 3].map((key) => (
          <PositionCardSkeleton key={key} />
        ))}
        <View className="h-20" />
      </View>
    )
  }

  if (positionsArray.length === 0) {
    return <EmptyState />
  }

  return (
    <View className="flex-1 px-4 pt-6">
      <View className="flex-row justify-between items-center mb-6">
        <View className="flex-row items-center gap-2">
          <Text className="text-xl font-bold text-white">Active Positions</Text>
          <View className="bg-zinc-800 rounded-full w-6 h-6 items-center justify-center">
            <Text className="text-zinc-400 text-xs font-bold">{positionsArray.length}</Text>
          </View>
        </View>
        {/*
        <TouchableOpacity>
           <Text className="text-zinc-500 text-xs font-bold tracking-wider">MANAGE {'>'}</Text>
        </TouchableOpacity>
				*/}
      </View>

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

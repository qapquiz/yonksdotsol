import type { PositionInfo } from '@meteora-ag/dlmm'
import { useMemo } from 'react'
import { ScrollView, Text, View } from 'react-native'
import EmptyState from '../../components/positions/EmptyState'
import PositionCard from '../../components/positions/PositionCard'
import PositionCardSkeleton from '../../components/positions/PositionCardSkeleton'

interface PositionsListProps {
  positions: Map<string, PositionInfo>
  isLoadingPositions: boolean
}

export default function PositionsList({ positions, isLoadingPositions }: PositionsListProps) {
  const positionsArray = useMemo(() => Array.from(positions.values()), [positions])

  if (isLoadingPositions) {
    return (
      <View className="flex-1 px-4 pt-6">
        <View className="flex-row justify-between items-center mb-6">
          <View className="flex-row items-center gap-2">
            <Text className="text-xl font-bold text-white">Active Positions</Text>
          </View>
        </View>
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {[1, 2, 3].map((key) => (
            <PositionCardSkeleton key={key} />
          ))}
          <View className="h-20" />
        </ScrollView>
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

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {positionsArray.map((position) => (
          <PositionCard key={position.publicKey.toString()} position={position} />
        ))}
        {/* Add bottom padding for scroll */}
        <View className="h-20" />
      </ScrollView>
    </View>
  )
}

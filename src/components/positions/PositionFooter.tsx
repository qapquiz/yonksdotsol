import { memo } from 'react'
import { Text, View } from 'react-native'

interface PositionFooterProps {
  unrealizedFeesDisplay: string
  claimedFeesDisplay: string
  unrealizedFeesValue: string
  claimedFeesValue: string
}

function PositionFooterComponent({
  unrealizedFeesDisplay,
  claimedFeesDisplay,
  unrealizedFeesValue,
  claimedFeesValue,
}: PositionFooterProps) {
  return (
    <View className="flex-row justify-between items-center">
      <View className="flex-1">
        <Text className="text-zinc-500 text-[10px] font-bold mb-1 tracking-wider">UNREALIZED FEES</Text>
        <View className="flex-row items-center gap-1">
          <Text className="text-white font-bold text-sm">{unrealizedFeesDisplay}</Text>
          <Text className="text-emerald-400 text-xs">✨</Text>
        </View>
        <Text className="text-zinc-400 text-xs mt-1">{unrealizedFeesValue}</Text>
      </View>

      <View className="flex-1">
        <Text className="text-zinc-500 text-[10px] font-bold mb-1 tracking-wider">CLAIMED FEES</Text>
        <View className="flex-row items-center gap-1">
          <Text className="text-white font-bold text-sm">{claimedFeesDisplay}</Text>
          <Text className="text-amber-400 text-xs">💰</Text>
        </View>
        <Text className="text-zinc-400 text-xs mt-1">{claimedFeesValue}</Text>
      </View>

      {/*
			<View className="flex-row gap-2">
				<TouchableOpacity className="bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-700">
					<Text className="text-zinc-300 font-bold text-xs">CLAIM</Text>
				</TouchableOpacity>
				<TouchableOpacity className="bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-700">
					<Text className="text-zinc-300 font-bold text-xs">ADD</Text>
				</TouchableOpacity>
			</View>
			*/}
    </View>
  )
}

export const PositionFooter = memo(PositionFooterComponent)

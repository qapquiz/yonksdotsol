import { memo } from 'react'
import { Text, View } from 'react-native'
import type { TokenInfo } from '../../tokens'
import { TokenIcons } from './TokenIcons'

interface PositionHeaderProps {
  tokenXInfo: TokenInfo | null
  tokenYInfo: TokenInfo | null
  inRange: boolean
  totalValue: string
}

function PositionHeaderComponent({ tokenXInfo, tokenYInfo, inRange, totalValue }: PositionHeaderProps) {
  return (
    <View className="flex-row justify-between items-start mb-6">
      <View className="flex-row items-center gap-3">
        <TokenIcons tokenXInfo={tokenXInfo} tokenYInfo={tokenYInfo} />
        <View>
          <Text className="text-white font-bold text-lg">
            {tokenXInfo?.symbol} / {tokenYInfo?.symbol}
          </Text>
          <Text className="text-zinc-500 text-xs font-medium">SPOT · CURVE</Text>
        </View>
      </View>
      <View className="items-end gap-1">
        <View className={`px-2 py-1 rounded-md ${inRange ? 'bg-emerald-500/20' : 'bg-orange-500/20'}`}>
          <Text className={`text-[10px] font-bold ${inRange ? 'text-emerald-500' : 'text-orange-500'}`}>
            {inRange ? 'IN RANGE' : 'OUT OF RANGE'}
          </Text>
        </View>
        <Text className="text-white font-bold text-lg">{totalValue}</Text>
      </View>
    </View>
  )
}

export const PositionHeader = memo(PositionHeaderComponent)

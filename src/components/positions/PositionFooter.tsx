import { memo } from 'react'
import { Text, View } from 'react-native'
import { usePixelFont } from '../../hooks/useFontConfig'
import { formatAPR24h } from '../../utils/positions/formatters'

interface PositionFooterProps {
  unrealizedFeesDisplay: string
  claimedFeesDisplay: string
  unrealizedFeesValue: string
  claimedFeesValue: string
  apr24h: number | null
}

function PositionFooterComponent({
  unrealizedFeesDisplay,
  claimedFeesDisplay,
  unrealizedFeesValue,
  claimedFeesValue,
  apr24h,
}: PositionFooterProps) {
  const pixelFont = usePixelFont()

  return (
    <View>
      <View className="mb-4">
        <Text className="text-app-text-muted text-[10px] font-sans-bold mb-1 tracking-wider">24H APR</Text>
        <Text className="text-app-text text-sm" style={{ fontFamily: pixelFont }}>
          {formatAPR24h(apr24h)}
        </Text>
      </View>

      <View className="mb-4">
        <Text className="text-app-text-muted text-[10px] font-sans-bold mb-1 tracking-wider">UNREALIZED FEES</Text>
        <View className="flex-row items-center gap-1">
          <Text className="text-app-text text-sm" style={{ fontFamily: pixelFont }}>
            {unrealizedFeesDisplay}
          </Text>
          <Text className="text-emerald-400 text-xs">✨</Text>
        </View>
        <Text className="text-app-text-secondary text-xs mt-1" style={{ fontFamily: pixelFont }}>
          {unrealizedFeesValue}
        </Text>
      </View>

      <View>
        <Text className="text-app-text-muted text-[10px] font-sans-bold mb-1 tracking-wider">CLAIMED FEES</Text>
        <View className="flex-row items-center gap-1">
          <Text className="text-app-text text-sm" style={{ fontFamily: pixelFont }}>
            {claimedFeesDisplay}
          </Text>
          <Text className="text-amber-400 text-xs">💰</Text>
        </View>
        <Text className="text-app-text-secondary text-xs mt-1" style={{ fontFamily: pixelFont }}>
          {claimedFeesValue}
        </Text>
      </View>
    </View>
  )
}

export const PositionFooter = memo(PositionFooterComponent)

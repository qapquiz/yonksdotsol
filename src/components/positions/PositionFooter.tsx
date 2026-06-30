import { memo } from 'react'
import { Text, View } from 'react-native'
import { usePixelFont } from '../../hooks/useFontConfig'
import { formatFeesTvl24h } from '../../utils/positions/formatters'

interface PositionFooterProps {
  unrealizedFeesDisplay: string
  claimedFeesDisplay: string
  unrealizedFeesValue: string
  claimedFeesValue: string
  feesTvl24h: number | null
}

function PositionFooterComponent({
  unrealizedFeesDisplay,
  claimedFeesDisplay,
  unrealizedFeesValue,
  claimedFeesValue,
  feesTvl24h,
}: PositionFooterProps) {
  const pixelFont = usePixelFont()

  return (
    // Label-left / value-right rows, separated from the chart by a hairline.
    // State is carried by color, not emoji: unrealized (accruing) → primary
    // (sage), claimed → secondary (copper). Sub-values (USD conversions) sit
    // under each value, right-aligned.
    <View className="border-t border-app-border pt-4 gap-4">
      <View className="flex-row items-start justify-between">
        <Text className="text-app-text-muted text-[10px] font-sans-bold tracking-wider">24H FEES / TVL</Text>
        <Text className="text-app-text text-sm" style={{ fontFamily: pixelFont }}>
          {formatFeesTvl24h(feesTvl24h)}
        </Text>
      </View>

      <View className="flex-row items-start justify-between">
        <Text className="text-app-text-muted text-[10px] font-sans-bold tracking-wider">UNREALIZED FEES</Text>
        <View className="items-end">
          <Text className="text-app-primary text-sm" style={{ fontFamily: pixelFont }}>
            {unrealizedFeesDisplay}
          </Text>
          <Text className="text-app-text-secondary text-xs mt-0.5" style={{ fontFamily: pixelFont }}>
            {unrealizedFeesValue}
          </Text>
        </View>
      </View>

      <View className="flex-row items-start justify-between">
        <Text className="text-app-text-muted text-[10px] font-sans-bold tracking-wider">CLAIMED FEES</Text>
        <View className="items-end">
          <Text className="text-app-secondary text-sm" style={{ fontFamily: pixelFont }}>
            {claimedFeesDisplay}
          </Text>
          <Text className="text-app-text-secondary text-xs mt-0.5" style={{ fontFamily: pixelFont }}>
            {claimedFeesValue}
          </Text>
        </View>
      </View>
    </View>
  )
}

export const PositionFooter = memo(PositionFooterComponent)

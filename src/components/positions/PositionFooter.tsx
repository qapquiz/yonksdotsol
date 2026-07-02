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

/**
 * Fee display, separated from the chart by a hairline.
 *
 * Layout is chosen by value length, not uniformity:
 * - The 24H FEES / TVL value is always short ("0.031%" / "—"), so it sits
 *   inline on the right of its label.
 * - The unrealized/claimed fee values are dual-token pairs
 *   ("1234.56 BONK / 0.0023 SOL") and can run 30+ chars — those get a full
 *   row each (label above, value below) so they never overflow.
 *
 * State is carried by color, not emoji: unrealized (accruing) → primary
 * (sage), claimed → secondary (copper). USD sub-values sit under each value.
 */
function PositionFooterComponent({
  unrealizedFeesDisplay,
  claimedFeesDisplay,
  unrealizedFeesValue,
  claimedFeesValue,
  feesTvl24h,
}: PositionFooterProps) {
  const pixelFont = usePixelFont()

  return (
    <View className="border-t border-app-border pt-4 gap-4">
      {/* Short value → inline label-left / value-right */}
      <View className="flex-row items-center justify-between">
        <Text className="text-app-text-muted text-[10px] font-sans-bold tracking-wider">24H FEES / TVL</Text>
        <Text className="text-app-text text-sm" style={{ fontFamily: pixelFont }}>
          {formatFeesTvl24h(feesTvl24h)}
        </Text>
      </View>

      {/* Long dual-token value → full row (label above, value below) */}
      <View>
        <Text className="text-app-text-muted text-[10px] font-sans-bold tracking-wider mb-1">UNREALIZED FEES</Text>
        <Text className="text-app-primary text-sm" style={{ fontFamily: pixelFont }}>
          {unrealizedFeesDisplay}
        </Text>
        <Text className="text-app-text-secondary text-xs mt-0.5" style={{ fontFamily: pixelFont }}>
          {unrealizedFeesValue}
        </Text>
      </View>

      <View>
        <Text className="text-app-text-muted text-[10px] font-sans-bold tracking-wider mb-1">CLAIMED FEES</Text>
        <Text className="text-app-secondary text-sm" style={{ fontFamily: pixelFont }}>
          {claimedFeesDisplay}
        </Text>
        <Text className="text-app-text-secondary text-xs mt-0.5" style={{ fontFamily: pixelFont }}>
          {claimedFeesValue}
        </Text>
      </View>
    </View>
  )
}

export const PositionFooter = memo(PositionFooterComponent)

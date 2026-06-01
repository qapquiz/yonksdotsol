import { memo } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { useThemeTokens } from '../../hooks/useThemeTokens'
import type { TokenInfo } from '../../tokens'
import type { PositionViewModel } from '../../utils/positions/computePositionViewData'
import { LiquidityBarChart } from './LiquidityBarChart'
import PositionCardSkeleton from './PositionCardSkeleton'
import { PositionFooter } from './PositionFooter'
import { PositionHeader } from './PositionHeader'

interface PositionCardProps {
  vm: PositionViewModel
  tokenXInfo: TokenInfo | null
  tokenYInfo: TokenInfo | null
  hasUnrealizedFees?: boolean
  claiming?: boolean
  onClaimFee?: () => void
}

function PositionCardComponent({
  vm,
  tokenXInfo,
  tokenYInfo,
  hasUnrealizedFees = false,
  claiming = false,
  onClaimFee,
}: PositionCardProps) {
  const tokens = useThemeTokens()

  // Show skeleton while token data is loading
  if (!tokenXInfo && !tokenYInfo) {
    return <PositionCardSkeleton />
  }

  return (
    <View className="bg-app-surface rounded-3xl mb-4 border border-app-border">
      <View className="p-5 pb-0">
        <PositionHeader
          tokenXInfo={tokenXInfo}
          tokenYInfo={tokenYInfo}
          inRange={vm.inRange}
          totalValue={vm.totalValue}
          upnlValue={vm.pnlSol}
          upnlPercentage={vm.pnlSolPctChange}
          upnlIsSol={true}
        />

        <LiquidityBarChart liquidityShape={vm.liquidityShape} currentPrice={vm.currentPrice} />

        <PositionFooter
          unrealizedFeesDisplay={vm.unrealizedFeesDisplay}
          claimedFeesDisplay={vm.claimedFeesDisplay}
          unrealizedFeesValue={vm.unrealizedFeesValue}
          claimedFeesValue={vm.claimedFeesValue}
        />
      </View>

      {hasUnrealizedFees && onClaimFee && (
        <Pressable
          onPress={onClaimFee}
          disabled={claiming}
          className="border-t border-app-border bg-app-primary-dim rounded-b-3xl py-3 flex-row items-center justify-center gap-1.5 active:bg-app-primary-dark disabled:opacity-50"
        >
          {claiming ? (
            <ActivityIndicator size="small" color={tokens.primary} />
          ) : (
            <Text className="text-app-primary text-xs font-sans-bold tracking-wider">
              Claim {vm.unrealizedFeesValue} →
            </Text>
          )}
        </Pressable>
      )}
    </View>
  )
}

export default memo(PositionCardComponent)

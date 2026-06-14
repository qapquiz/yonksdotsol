import { memo } from 'react'
import { View } from 'react-native'
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
  /** Live SOL→USD price; forwarded to PositionHeader for the uPnL line */
  solUsdPrice: number | null
}

function PositionCardComponent({ vm, tokenXInfo, tokenYInfo, solUsdPrice }: PositionCardProps) {
  // Show skeleton while token data is loading
  if (!tokenXInfo && !tokenYInfo) {
    return <PositionCardSkeleton />
  }

  return (
    <View className="bg-app-surface rounded-3xl p-5 mb-4 border border-app-border">
      <PositionHeader
        tokenXInfo={tokenXInfo}
        tokenYInfo={tokenYInfo}
        inRange={vm.inRange}
        totalValue={vm.totalValue}
        upnlValue={vm.pnlSol}
        upnlPercentage={vm.pnlSolPctChange}
        solUsdPrice={solUsdPrice}
      />

      <LiquidityBarChart liquidityShape={vm.liquidityShape} currentPrice={vm.currentPrice} />

      <PositionFooter
        unrealizedFeesDisplay={vm.unrealizedFeesDisplay}
        claimedFeesDisplay={vm.claimedFeesDisplay}
        unrealizedFeesValue={vm.unrealizedFeesValue}
        claimedFeesValue={vm.claimedFeesValue}
        feesTvl24h={vm.feesTvl24h}
      />
    </View>
  )
}

export default memo(PositionCardComponent)

import { memo, useState } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import type { TokenInfo } from '../../tokens'
import type { PositionViewModel } from '../../utils/positions/computePositionViewData'
import { LiquidityBarChart } from './LiquidityBarChart'
import PositionCardSkeleton from './PositionCardSkeleton'
import { PriceChart } from './PriceChart'
import { PositionFooter } from './PositionFooter'
import { PositionHeader } from './PositionHeader'

interface PositionCardProps {
  vm: PositionViewModel
  tokenXInfo: TokenInfo | null
  tokenYInfo: TokenInfo | null
  /** Live SOL→USD price; forwarded to PositionHeader for the uPnL line */
  solUsdPrice: number | null
}

type ChartMode = 'liquidity' | 'price'

function PositionCardComponent({ vm, tokenXInfo, tokenYInfo, solUsdPrice }: PositionCardProps) {
  const [chartMode, setChartMode] = useState<ChartMode>('liquidity')

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

      <View className="flex-row bg-app-bg/50 rounded-lg p-1 mb-3 border border-app-border/50">
        {(['liquidity', 'price'] as const).map((mode) => (
          <TouchableOpacity
            key={mode}
            onPress={() => setChartMode(mode)}
            className={`flex-1 py-1.5 rounded-md items-center ${chartMode === mode ? 'bg-app-primary-dim' : ''}`}
            activeOpacity={0.7}
          >
            <Text
              className={`text-[10px] font-sans-bold capitalize ${chartMode === mode ? 'text-app-primary' : 'text-app-text-muted'}`}
            >
              {mode}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {chartMode === 'liquidity' ? (
        <LiquidityBarChart liquidityShape={vm.liquidityShape} currentPrice={vm.currentPrice} />
      ) : (
        <PriceChart liquidityShape={vm.liquidityShape} currentPrice={vm.currentPrice} />
      )}

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

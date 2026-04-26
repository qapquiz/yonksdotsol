import type { PositionInfo } from '@meteora-ag/dlmm'
import { memo, useMemo } from 'react'
import { View } from 'react-native'
import { usePnLStore, selectPositionPnL } from '../../stores/pnlStore'
import { computePositionViewData } from '../../utils/positions/computePositionViewData'
import type { TokenInfo } from '../../tokens'
import { LiquidityBarChart } from './LiquidityBarChart'
import PositionCardSkeleton from './PositionCardSkeleton'
import { PositionFooter } from './PositionFooter'
import { PositionHeader } from './PositionHeader'

interface PositionCardProps {
  position: PositionInfo
  lbPositionIndex?: number
  tokenXInfo: TokenInfo | null
  tokenYInfo: TokenInfo | null
  walletAddress?: string
  poolAddress: string
}

function PositionCardComponent({
  position,
  lbPositionIndex = 0,
  tokenXInfo,
  tokenYInfo,
  walletAddress,
  poolAddress,
}: PositionCardProps) {
  const lbPairPosition = position.lbPairPositionsData[lbPositionIndex]
  const positionData = lbPairPosition?.positionData

  const positionAddress = lbPairPosition?.publicKey.toBase58() || position.publicKey.toBase58()
  const wallet = walletAddress || ''

  // Memoize selector to avoid creating a new function on every render
  const pnlSelector = useMemo(
    () => selectPositionPnL(poolAddress, wallet, positionAddress),
    [poolAddress, wallet, positionAddress],
  )
  const pnlData = usePnLStore(pnlSelector)

  const activeId = useMemo(() => Number(position.lbPair.activeId), [position.lbPair.activeId])

  // Single computation — all derived view data in one pure function
  const vm = useMemo(
    () =>
      computePositionViewData({
        positionData,
        activeId,
        positionAddress,
        poolAddress,
        tokenXInfo,
        tokenYInfo,
        pnlData,
      }),
    [positionData, activeId, positionAddress, poolAddress, tokenXInfo, tokenYInfo, pnlData],
  )

  if (!lbPairPosition) return null

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
  )
}

export default memo(PositionCardComponent)

import { memo } from 'react'
import { Text, View } from 'react-native'

interface PortfolioSummaryProps {
  totalPnlSol: number
  totalPnlPercent: number
  totalValueSol: number
  totalInitialDepositSol: number
  totalUnclaimedFeesSol: number
  positionCount: number
  isLoading: boolean
}

function formatSol(value: number): string {
  if (Math.abs(value) >= 1) {
    return `${value.toFixed(2)} SOL`
  }
  if (Math.abs(value) >= 0.001) {
    return `${value.toFixed(4)} SOL`
  }
  return `${value.toFixed(6)} SOL`
}

function PortfolioSummaryComponent({
  totalPnlSol,
  totalPnlPercent,
  totalValueSol,
  totalInitialDepositSol,
  totalUnclaimedFeesSol,
  positionCount,
  isLoading,
}: PortfolioSummaryProps) {
  if (isLoading) {
    return (
      <View className="bg-zinc-900 rounded-3xl p-5 mb-4 border border-zinc-800">
        <View className="flex-row items-center gap-2 mb-4">
          <Text className="text-zinc-500 text-[10px] font-bold tracking-wider">PORTFOLIO SUMMARY</Text>
          <View className="bg-zinc-800 rounded-full w-5 h-5 items-center justify-center">
            <Text className="text-zinc-500 text-[10px] font-bold">{positionCount}</Text>
          </View>
        </View>
        <View className="h-8 bg-zinc-800 rounded-lg mb-3" />
        <View className="flex-row justify-between">
          <View className="h-4 bg-zinc-800 rounded w-20" />
          <View className="h-4 bg-zinc-800 rounded w-20" />
        </View>
      </View>
    )
  }

  const isProfit = totalPnlSol >= 0
  const pnlColorClass = isProfit ? 'text-emerald-400' : 'text-red-400'
  const sign = isProfit ? '+' : ''

  return (
    <View className="bg-zinc-900 rounded-3xl p-5 mb-4 border border-zinc-800">
      <View className="flex-row items-center gap-2 mb-3">
        <Text className="text-zinc-500 text-[10px] font-bold tracking-wider">PORTFOLIO SUMMARY</Text>
        <View className="bg-zinc-800 rounded-full w-5 h-5 items-center justify-center">
          <Text className="text-zinc-400 text-[10px] font-bold">{positionCount}</Text>
        </View>
      </View>

      {/* Main PnL display */}
      <View className="mb-4">
        <Text className={`text-2xl font-bold ${pnlColorClass}`}>
          {sign}
          {formatSol(totalPnlSol)}
        </Text>
        <Text className={`text-sm font-bold ${pnlColorClass}`}>
          {sign}
          {totalPnlPercent.toFixed(2)}%
        </Text>
      </View>

      {/* Stats row */}
      <View className="flex-row justify-between">
        <View>
          <Text className="text-zinc-500 text-[10px] font-bold tracking-wider mb-1">VALUE</Text>
          <Text className="text-white text-sm font-bold">{formatSol(totalValueSol)}</Text>
        </View>
        <View>
          <Text className="text-zinc-500 text-[10px] font-bold tracking-wider mb-1">DEPOSITED</Text>
          <Text className="text-zinc-300 text-sm font-bold">{formatSol(totalInitialDepositSol)}</Text>
        </View>
        <View>
          <Text className="text-zinc-500 text-[10px] font-bold tracking-wider mb-1">FEES</Text>
          <Text className="text-emerald-400 text-sm font-bold">+{formatSol(totalUnclaimedFeesSol)}</Text>
        </View>
      </View>
    </View>
  )
}

export default memo(PortfolioSummaryComponent)

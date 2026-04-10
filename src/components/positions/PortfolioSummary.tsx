import { memo } from 'react'
import { Text, View } from 'react-native'
import { ShimmerBlock } from '../ui/ShimmerBlock'

interface PortfolioSummaryProps {
  totalPnlSol: number
  totalPnlPercent: number
  totalValueSol: number
  totalInitialDepositSol: number
  totalUnclaimedFeesSol: number
  positionCount: number
  isLoading: boolean
}

function countLeadingZeros(value: number): number {
  if (value >= 0.01) return 0
  const str = value.toFixed(9).replace(/0+$/, '')
  const decimalPart = str.split('.')[1] || ''
  const match = decimalPart.match(/^0*/)
  return match ? match[0].length : 0
}

function SolValue({ value, className }: { value: number; className?: string }) {
  const leadingZeros = countLeadingZeros(value)

  // Only use subscript notation when toFixed(4) can't capture the first significant digit
  if (leadingZeros < 4) {
    return <Text className={className}>{value.toFixed(4)}</Text>
  }

  const str = value.toFixed(9).replace(/0+$/, '')
  const decimalPart = str.split('.')[1] || ''
  const rawDigits = decimalPart.slice(leadingZeros)
  const significantDigits = (rawDigits + '0000').slice(0, 4)
  const additionalZeros = leadingZeros - 2

  return (
    <Text className={className}>
      0.00
      <Text className="text-[10px]">{additionalZeros}</Text>
      {significantDigits}
    </Text>
  )
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
      <View className="bg-app-surface rounded-3xl p-5 mb-4 border border-app-border">
        {/* Title row — matches real: text + badge */}
        <View className="flex-row items-center gap-2 mb-3">
          <Text className="text-app-text-muted text-[10px] font-bold tracking-wider">PORTFOLIO SUMMARY</Text>
          <View className="bg-app-surface-highlight rounded-full w-5 h-5 items-center justify-center">
            <Text className="text-app-text-muted text-[10px] font-bold">{positionCount}</Text>
          </View>
        </View>

        {/* PnL block */}
        <View className="mb-4">
          <ShimmerBlock className="h-8 bg-app-border rounded-lg mb-1.5" />
          <ShimmerBlock className="h-5 bg-app-border rounded-lg w-24" />
        </View>

        {/* Stats row */}
        <View className="flex-row justify-between">
          <View className="items-start">
            <ShimmerBlock className="h-3 bg-app-border rounded w-14 mb-1.5" />
            <ShimmerBlock className="h-4 bg-app-border rounded w-16" />
          </View>
          <View className="items-start">
            <ShimmerBlock className="h-3 bg-app-border rounded w-20 mb-1.5" />
            <ShimmerBlock className="h-4 bg-app-border rounded w-16" />
          </View>
          <View className="items-start">
            <ShimmerBlock className="h-3 bg-app-border rounded w-24 mb-1.5" />
            <ShimmerBlock className="h-4 bg-app-border rounded w-16" />
          </View>
        </View>
      </View>
    )
  }

  const isProfit = totalPnlSol >= 0
  const pnlColorClass = isProfit ? 'text-emerald-400' : 'text-red-400'
  const sign = isProfit ? '+' : ''

  return (
    <View className="bg-app-surface rounded-3xl p-5 mb-4 border border-app-border">
      <View className="flex-row items-center gap-2 mb-3">
        <Text className="text-app-text-muted text-[10px] font-bold tracking-wider">PORTFOLIO SUMMARY</Text>
        <View className="bg-app-surface-highlight rounded-full w-5 h-5 items-center justify-center">
          <Text className="text-app-text-secondary text-[10px] font-bold">{positionCount}</Text>
        </View>
      </View>

      {/* Main PnL display */}
      <View className="mb-4">
        <View className="flex-row items-baseline">
          {sign && <Text className={`text-2xl font-bold ${pnlColorClass}`}>{sign}</Text>}
          <SolValue value={Math.abs(totalPnlSol)} className={`text-2xl font-bold ${pnlColorClass}`} />
          <Text className={`text-sm font-bold ${pnlColorClass} ml-0.5 opacity-60`}>SOL</Text>
        </View>
        <Text className={`text-sm font-bold ${pnlColorClass}`}>
          {sign}
          {totalPnlPercent.toFixed(2)}%
        </Text>
      </View>

      {/* Stats row */}
      <View className="flex-row justify-between">
        <View>
          <Text className="text-app-text-muted text-[10px] font-bold tracking-wider mb-1">VALUE</Text>
          <View className="flex-row items-baseline">
            <SolValue value={totalValueSol} className="text-app-text text-sm font-bold" />
            <Text className="text-app-text text-[10px] font-bold ml-0.5 opacity-60">SOL</Text>
          </View>
        </View>
        <View>
          <Text className="text-app-text-muted text-[10px] font-bold tracking-wider mb-1">DEPOSITED</Text>
          <View className="flex-row items-baseline">
            <SolValue value={totalInitialDepositSol} className="text-app-text text-sm font-bold" />
            <Text className="text-app-text text-[10px] font-bold ml-0.5 opacity-60">SOL</Text>
          </View>
        </View>
        <View>
          <Text className="text-app-text-muted text-[10px] font-bold tracking-wider mb-1">UNCLAIMED FEES</Text>
          <View className="flex-row items-baseline">
            <SolValue value={totalUnclaimedFeesSol} className="text-app-text text-sm font-bold" />
            <Text className="text-app-text text-[10px] font-bold ml-0.5 opacity-60">SOL</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

export default memo(PortfolioSummaryComponent)

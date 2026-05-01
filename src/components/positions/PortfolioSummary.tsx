import { memo, useMemo } from 'react'
import { Text, View } from 'react-native'
import type { PortfolioSummaryData } from '../../hooks/usePositionsPage'
import { usePixelFont } from '../../hooks/useFontConfig'
import { ShimmerBlock } from '../ui/ShimmerBlock'

interface PortfolioSummaryProps {
  summary: PortfolioSummaryData | null
  hasData: boolean
  positionCount: number
}

function formatSmallValue(value: number): { leadingText: string; superscript: string; digits: string } | null {
  if (!Number.isFinite(value) || value >= 0.01) return null
  const str = value.toFixed(9).replace(/0+$/, '')
  const decimalPart = str.split('.')[1] || ''
  const match = decimalPart.match(/^0*/)
  const leadingZeros = match ? match[0].length : 0
  if (leadingZeros < 4) return null
  const rawDigits = decimalPart.slice(leadingZeros)
  const significantDigits = (rawDigits + '0004').slice(0, 4)
  const additionalZeros = leadingZeros - 2
  return {
    leadingText: '0.00',
    superscript: String(additionalZeros),
    digits: significantDigits,
  }
}

function SolValue({ value, className, fontFamily }: { value: number; className?: string; fontFamily: string }) {
  const content = useMemo(() => {
    if (!Number.isFinite(value))
      return (
        <Text className={className} style={{ fontFamily }}>
          0.0000
        </Text>
      )

    const small = formatSmallValue(value)
    if (!small) {
      return (
        <Text className={className} style={{ fontFamily }}>
          {value.toFixed(4)}
        </Text>
      )
    }

    return (
      <Text className={className} style={{ fontFamily }}>
        {small.leadingText}
        <Text className="text-[10px]">{small.superscript}</Text>
        {small.digits}
      </Text>
    )
  }, [value, className, fontFamily])

  return content
}

function PortfolioSummaryComponent({ summary, hasData, positionCount }: PortfolioSummaryProps) {
  const pixelFont = usePixelFont()
  const isLoading = positionCount > 0 && !hasData
  if (isLoading) {
    return (
      <View className="bg-app-surface rounded-3xl p-5 mb-4 border border-app-border">
        <View className="flex-row items-center gap-2 mb-3">
          <Text className="text-app-text-muted text-[10px] font-sans-bold tracking-wider">PORTFOLIO SUMMARY</Text>
          <View className="bg-app-surface-highlight rounded-full w-5 h-5 items-center justify-center">
            <Text className="text-app-text-muted text-[10px] font-sans-bold">{positionCount}</Text>
          </View>
        </View>

        <View className="mb-4">
          <ShimmerBlock className="h-8 bg-app-border rounded-lg mb-1.5" />
          <ShimmerBlock className="h-5 bg-app-border rounded-lg w-24" />
        </View>

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

  // No data yet (no positions or summary not computed)
  if (!summary) {
    return null
  }

  const { totalPnlSol, totalPnlPercent, totalValueSol, totalInitialDepositSol, totalUnclaimedFeesSol } = summary

  const isProfit = totalPnlSol >= 0
  const pnlColorClass = isProfit ? 'text-emerald-400' : 'text-red-400'
  const sign = isProfit ? '+' : ''

  return (
    <View className="bg-app-surface rounded-3xl p-5 mb-4 border border-app-border">
      <View className="flex-row items-center gap-2 mb-3">
        <Text className="text-app-text-muted text-[10px] font-sans-bold tracking-wider">PORTFOLIO SUMMARY</Text>
        <View className="bg-app-surface-highlight rounded-full w-5 h-5 items-center justify-center">
          <Text className="text-app-text-secondary text-[10px] font-sans-bold">{positionCount}</Text>
        </View>
      </View>

      <View className="mb-4">
        <View className="flex-row items-baseline">
          {sign && (
            <Text className={`text-2xl ${pnlColorClass}`} style={{ fontFamily: pixelFont }}>
              {sign}
            </Text>
          )}
          <SolValue value={Math.abs(totalPnlSol)} className={`text-2xl ${pnlColorClass}`} fontFamily={pixelFont} />
          <Text className={`text-sm ${pnlColorClass} ml-0.5 opacity-60`} style={{ fontFamily: pixelFont }}>
            SOL
          </Text>
        </View>
        <Text className={`text-sm ${pnlColorClass}`} style={{ fontFamily: pixelFont }}>
          {sign}
          {isNaN(totalPnlPercent) ? '0.00' : totalPnlPercent.toFixed(2)}%
        </Text>
      </View>

      <View className="flex-row justify-between">
        <View>
          <Text className="text-app-text-muted text-[10px] font-sans-bold tracking-wider mb-1">VALUE</Text>
          <View className="flex-row items-baseline">
            <SolValue value={totalValueSol} className="text-app-text text-sm" fontFamily={pixelFont} />
            <Text className="text-app-text text-[10px] ml-0.5 opacity-60" style={{ fontFamily: pixelFont }}>
              SOL
            </Text>
          </View>
        </View>
        <View>
          <Text className="text-app-text-muted text-[10px] font-sans-bold tracking-wider mb-1">DEPOSITED</Text>
          <View className="flex-row items-baseline">
            <SolValue value={totalInitialDepositSol} className="text-app-text text-sm" fontFamily={pixelFont} />
            <Text className="text-app-text text-[10px] ml-0.5 opacity-60" style={{ fontFamily: pixelFont }}>
              SOL
            </Text>
          </View>
        </View>
        <View>
          <Text className="text-app-text-muted text-[10px] font-sans-bold tracking-wider mb-1">UNCLAIMED FEES</Text>
          <View className="flex-row items-baseline">
            <SolValue value={totalUnclaimedFeesSol} className="text-app-text text-sm" fontFamily={pixelFont} />
            <Text className="text-app-text text-[10px] ml-0.5 opacity-60" style={{ fontFamily: pixelFont }}>
              SOL
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}

export default memo(PortfolioSummaryComponent)

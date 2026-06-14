import { memo, useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { PortfolioSummaryData } from '../../hooks/usePositionsPage'
import { usePixelFont } from '../../hooks/useFontConfig'
import { ShimmerBlock } from '../ui/ShimmerBlock'
import { useSettingsStore } from '../../stores/settingsStore'
import { formatFeesTvl24h, formatUsdFromSol, type DisplayCurrency } from '../../utils/positions/formatters'

interface PortfolioSummaryProps {
  summary: PortfolioSummaryData | null
  hasData: boolean
  positionCount: number
  /** Live SOL→USD price; used when displayCurrency === 'USD' */
  solUsdPrice: number | null
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

const CURRENCY_OPTIONS: readonly DisplayCurrency[] = ['SOL', 'USD']

/** Compact SOL/USD segmented control. Mirrors FontPicker's selected tokens. */
const CurrencyToggle = memo(function CurrencyToggle() {
  const displayCurrency = useSettingsStore((s) => s.displayCurrency)
  const setDisplayCurrency = useSettingsStore((s) => s.setDisplayCurrency)

  return (
    <View className="flex-row rounded-full border border-app-border overflow-hidden">
      {CURRENCY_OPTIONS.map((currency) => {
        const selected = displayCurrency === currency
        return (
          <Pressable
            key={currency}
            onPress={() => setDisplayCurrency(currency)}
            className={`px-2.5 py-0.5 ${selected ? 'bg-app-primary-dim' : 'bg-transparent'} active:opacity-80`}
          >
            <Text className={`text-[10px] font-sans-bold ${selected ? 'text-app-primary' : 'text-app-text-muted'}`}>
              {currency}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
})

/**
 * Renders a summary figure in the active currency. In SOL mode delegates to the
 * existing SolValue renderer (byte-for-byte unchanged); in USD mode renders a
 * plain Text with the converted value (the `$` is part of the formatted string).
 */
function SummaryValue({
  sol,
  className,
  fontFamily,
  displayCurrency,
  solUsdPrice,
}: {
  sol: number
  className?: string
  fontFamily: string
  displayCurrency: DisplayCurrency
  solUsdPrice: number | null
}) {
  if (displayCurrency === 'USD') {
    return (
      <Text className={className} style={{ fontFamily }}>
        {formatUsdFromSol(sol, solUsdPrice)}
      </Text>
    )
  }
  return <SolValue value={sol} className={className} fontFamily={fontFamily} />
}

function PortfolioSummaryComponent({ summary, hasData, positionCount, solUsdPrice }: PortfolioSummaryProps) {
  const pixelFont = usePixelFont()
  const displayCurrency = useSettingsStore((s) => s.displayCurrency)
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

        <View className="flex-row justify-between mb-4">
          <View className="flex-1 items-start">
            <ShimmerBlock className="h-3 bg-app-border rounded w-14 mb-1.5" />
            <View className="flex-row items-baseline">
              <ShimmerBlock className="h-4 bg-app-border rounded w-16" />
              <ShimmerBlock className="h-3 bg-app-border rounded w-6 ml-0.5" />
            </View>
          </View>
          <View className="flex-1 items-start">
            <ShimmerBlock className="h-3 bg-app-border rounded w-20 mb-1.5" />
            <View className="flex-row items-baseline">
              <ShimmerBlock className="h-4 bg-app-border rounded w-16" />
              <ShimmerBlock className="h-3 bg-app-border rounded w-6 ml-0.5" />
            </View>
          </View>
          <View className="flex-1 items-start">
            <ShimmerBlock className="h-3 bg-app-border rounded w-24 mb-1.5" />
            <View className="flex-row items-baseline">
              <ShimmerBlock className="h-4 bg-app-border rounded w-16" />
              <ShimmerBlock className="h-3 bg-app-border rounded w-6 ml-0.5" />
            </View>
          </View>
        </View>

        <View className="border-t border-app-border pt-3 flex-row justify-between">
          <ShimmerBlock className="h-3 bg-app-border rounded w-20" />
          <ShimmerBlock className="h-4 bg-app-border rounded w-10" />
        </View>
      </View>
    )
  }

  // No data yet (no positions or summary not computed)
  if (!summary) {
    return null
  }

  const { totalPnlSol, totalPnlPercent, totalValueSol, totalInitialDepositSol, totalUnclaimedFeesSol, feesTvl24h } =
    summary

  const isProfit = totalPnlSol >= 0
  const pnlColorClass = isProfit ? 'text-emerald-400' : 'text-red-400'
  const sign = isProfit ? '+' : ''
  const isUsd = displayCurrency === 'USD'

  return (
    <View className="bg-app-surface rounded-3xl p-5 mb-4 border border-app-border">
      <View className="flex-row items-center gap-2 mb-3">
        <Text className="text-app-text-muted text-[10px] font-sans-bold tracking-wider">PORTFOLIO SUMMARY</Text>
        <View className="bg-app-surface-highlight rounded-full w-5 h-5 items-center justify-center">
          <Text className="text-app-text-secondary text-[10px] font-sans-bold">{positionCount}</Text>
        </View>
        <View className="ml-auto">
          <CurrencyToggle />
        </View>
      </View>

      <View className="mb-4">
        <View className="flex-row items-baseline">
          {sign && (
            <Text className={`text-2xl ${pnlColorClass}`} style={{ fontFamily: pixelFont }}>
              {sign}
            </Text>
          )}
          <SummaryValue
            sol={Math.abs(totalPnlSol)}
            className={`text-2xl ${pnlColorClass}`}
            fontFamily={pixelFont}
            displayCurrency={displayCurrency}
            solUsdPrice={solUsdPrice}
          />
          {!isUsd && (
            <Text className={`text-sm ${pnlColorClass} ml-0.5 opacity-60`} style={{ fontFamily: pixelFont }}>
              SOL
            </Text>
          )}
        </View>
        <Text className={`text-sm ${pnlColorClass}`} style={{ fontFamily: pixelFont }}>
          {sign}
          {isNaN(totalPnlPercent) ? '0.00' : totalPnlPercent.toFixed(2)}%
        </Text>
      </View>

      <View className="flex-row justify-between mb-4">
        <View className="flex-1">
          <Text className="text-app-text-muted text-[10px] font-sans-bold tracking-wider mb-1">VALUE</Text>
          <View className="flex-row items-baseline">
            <SummaryValue
              sol={totalValueSol}
              className="text-app-text text-sm"
              fontFamily={pixelFont}
              displayCurrency={displayCurrency}
              solUsdPrice={solUsdPrice}
            />
            {!isUsd && (
              <Text className="text-app-text text-[10px] ml-0.5 opacity-60" style={{ fontFamily: pixelFont }}>
                SOL
              </Text>
            )}
          </View>
        </View>
        <View className="flex-1">
          <Text className="text-app-text-muted text-[10px] font-sans-bold tracking-wider mb-1">DEPOSITED</Text>
          <View className="flex-row items-baseline">
            <SummaryValue
              sol={totalInitialDepositSol}
              className="text-app-text text-sm"
              fontFamily={pixelFont}
              displayCurrency={displayCurrency}
              solUsdPrice={solUsdPrice}
            />
            {!isUsd && (
              <Text className="text-app-text text-[10px] ml-0.5 opacity-60" style={{ fontFamily: pixelFont }}>
                SOL
              </Text>
            )}
          </View>
        </View>
        <View className="flex-1">
          <Text className="text-app-text-muted text-[10px] font-sans-bold tracking-wider mb-1">UNCLAIMED FEES</Text>
          <View className="flex-row items-baseline">
            <SummaryValue
              sol={totalUnclaimedFeesSol}
              className="text-app-text text-sm"
              fontFamily={pixelFont}
              displayCurrency={displayCurrency}
              solUsdPrice={solUsdPrice}
            />
            {!isUsd && (
              <Text className="text-app-text text-[10px] ml-0.5 opacity-60" style={{ fontFamily: pixelFont }}>
                SOL
              </Text>
            )}
          </View>
        </View>
      </View>

      <View className="border-t border-app-border pt-3 flex-row items-baseline justify-between">
        <Text className="text-app-text-muted text-[10px] font-sans-bold tracking-wider">24H FEES / TVL</Text>
        <Text className="text-app-text text-sm" style={{ fontFamily: pixelFont }}>
          {formatFeesTvl24h(feesTvl24h)}
        </Text>
      </View>
    </View>
  )
}

export default memo(PortfolioSummaryComponent)

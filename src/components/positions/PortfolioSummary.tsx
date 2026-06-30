import { memo, useMemo, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import type { PortfolioSummaryData } from '../../hooks/usePositionsPage'
import { usePixelFont } from '../../hooks/useFontConfig'
import { SegmentedControl } from '../ui/SegmentedControl'
import { useSettingsStore } from '../../stores/settingsStore'
import { formatFeesTvl24h, formatUsdFromSol, type DisplayCurrency } from '../../utils/positions/formatters'
import PortfolioSummarySkeleton from './PortfolioSummarySkeleton'

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

const CURRENCY_OPTIONS: readonly { value: DisplayCurrency }[] = [{ value: 'SOL' }, { value: 'USD' }]

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

/** Quiet label/value column used in the hero's supporting stat row. */
function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="flex-1">
      <Text className="text-app-text-muted text-[10px] font-sans-bold tracking-wider mb-1">{label}</Text>
      {children}
    </View>
  )
}

function PortfolioSummaryComponent({ summary, hasData, positionCount, solUsdPrice }: PortfolioSummaryProps) {
  const pixelFont = usePixelFont()
  const displayCurrency = useSettingsStore((s) => s.displayCurrency)
  const setDisplayCurrency = useSettingsStore((s) => s.setDisplayCurrency)

  if (positionCount > 0 && !hasData) {
    return <PortfolioSummarySkeleton />
  }

  // No data yet (no positions or summary not computed)
  if (!summary) {
    return null
  }

  const { totalPnlSol, totalPnlPercent, totalValueSol, totalInitialDepositSol, totalUnclaimedFeesSol, feesTvl24h } =
    summary

  const isProfit = totalPnlSol >= 0
  const pnlColorClass = isProfit ? 'text-app-primary' : 'text-app-negative'
  const sign = isProfit ? '+' : ''
  const isUsd = displayCurrency === 'USD'

  return (
    // Hero readout — no card chrome. The total value sits bare on the
    // background at instrument scale; the bare treatment distinguishes "the
    // portfolio" from the boxed position cards below it.
    <View className="pt-3 pb-6 mb-2">
      {/* meta row — count + currency toggle */}
      <View className="flex-row items-center justify-between mb-5">
        <Text className="text-app-text-muted text-[10px] font-sans-bold tracking-wider">
          {positionCount} {positionCount === 1 ? 'POSITION' : 'POSITIONS'}
        </Text>
        <SegmentedControl options={CURRENCY_OPTIONS} value={displayCurrency} onChange={setDisplayCurrency} />
      </View>

      {/* HERO — PnL delta at instrument scale (the colored story) */}
      <View className="flex-row items-baseline mb-1.5">
        {sign && (
          <Text className={`text-4xl ${pnlColorClass}`} style={{ fontFamily: pixelFont }}>
            {sign}
          </Text>
        )}
        <SummaryValue
          sol={Math.abs(totalPnlSol)}
          className={`text-4xl ${pnlColorClass}`}
          fontFamily={pixelFont}
          displayCurrency={displayCurrency}
          solUsdPrice={solUsdPrice}
        />
        {!isUsd && (
          <Text className={`text-base ${pnlColorClass} opacity-70 ml-2`} style={{ fontFamily: pixelFont }}>
            SOL
          </Text>
        )}
      </View>

      {/* VALUE — total portfolio value, the anchor beneath the delta */}
      <View className="flex-row items-baseline gap-2 mb-6">
        <View className="flex-row items-baseline">
          <SummaryValue
            sol={totalValueSol}
            className="text-app-text text-lg"
            fontFamily={pixelFont}
            displayCurrency={displayCurrency}
            solUsdPrice={solUsdPrice}
          />
          {!isUsd && (
            <Text className="text-app-text-muted text-sm ml-1" style={{ fontFamily: pixelFont }}>
              SOL
            </Text>
          )}
        </View>
        <Text className={`text-sm ${pnlColorClass} opacity-70`} style={{ fontFamily: pixelFont }}>
          {sign}
          {isNaN(totalPnlPercent) ? '0.00' : totalPnlPercent.toFixed(2)}%
        </Text>
      </View>

      {/* supporting stats — anchored by a hairline, no box */}
      <View className="flex-row border-t border-app-border pt-4">
        <Stat label="DEPOSITED">
          <View className="flex-row items-baseline">
            <SummaryValue
              sol={totalInitialDepositSol}
              className="text-app-text text-sm"
              fontFamily={pixelFont}
              displayCurrency={displayCurrency}
              solUsdPrice={solUsdPrice}
            />
            {!isUsd && (
              <Text className="text-app-text-muted text-[10px] ml-1" style={{ fontFamily: pixelFont }}>
                SOL
              </Text>
            )}
          </View>
        </Stat>
        <Stat label="UNCLAIMED FEES">
          <View className="flex-row items-baseline">
            <SummaryValue
              sol={totalUnclaimedFeesSol}
              className="text-app-text text-sm"
              fontFamily={pixelFont}
              displayCurrency={displayCurrency}
              solUsdPrice={solUsdPrice}
            />
            {!isUsd && (
              <Text className="text-app-text-muted text-[10px] ml-1" style={{ fontFamily: pixelFont }}>
                SOL
              </Text>
            )}
          </View>
        </Stat>
        <Stat label="24H FEES / TVL">
          <Text className="text-app-text text-sm" style={{ fontFamily: pixelFont }}>
            {formatFeesTvl24h(feesTvl24h)}
          </Text>
        </Stat>
      </View>
    </View>
  )
}

export default memo(PortfolioSummaryComponent)

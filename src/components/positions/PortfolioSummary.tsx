import { memo, useEffect, useMemo } from 'react'
import { Text, View } from 'react-native'
import { ShimmerBlock } from '../ui/ShimmerBlock'
import { usePnLStore } from '../../stores/pnlStore'

interface PortfolioSummaryProps {
  walletAddress?: string
  positionCount: number
  poolAddresses: string[]
}

function countLeadingZeros(value: number): number {
  if (!Number.isFinite(value) || value >= 0.01) return 0
  const str = value.toFixed(9).replace(/0+$/, '')
  const decimalPart = str.split('.')[1] || ''
  const match = decimalPart.match(/^0*/)
  return match ? match[0].length : 0
}

function SolValue({ value, className }: { value: number; className?: string }) {
  // Handle NaN, Infinity, and other non-finite values
  if (!Number.isFinite(value)) {
    return <Text className={className}>0.0000</Text>
  }
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

function PortfolioSummaryComponent({ walletAddress, positionCount, poolAddresses }: PortfolioSummaryProps) {
  const wallet = walletAddress || ''

  // Get fetch action and pool data from store
  const fetchPoolPnL = usePnLStore((state) => state.fetchPoolPnL)
  const poolPnLData = usePnLStore((state) => state.poolPnLData)

  // Fetch PnL for all pools when component mounts
  useEffect(() => {
    if (wallet && poolAddresses.length > 0) {
      // Fetch all pools in parallel
      poolAddresses.forEach((poolAddress) => {
        fetchPoolPnL(poolAddress, wallet)
      })
    }
  }, [wallet, poolAddresses, fetchPoolPnL])

  // Compute portfolio summary from pool PnL data
  // Uses weighted average of position percentages to match position card display
  const { totalPnlSol, totalPnlPercent, totalValueSol, totalInitialDepositSol, totalUnclaimedFeesSol } = useMemo(() => {
    if (!wallet || poolAddresses.length === 0) {
      return {
        totalPnlSol: 0,
        totalPnlPercent: 0,
        totalValueSol: 0,
        totalInitialDepositSol: 0,
        totalUnclaimedFeesSol: 0,
      }
    }

    let pnlSol = 0
    let valueSol = 0
    let initialDepositSol = 0
    let feesSol = 0
    let hasData = false

    // Track for weighted average calculation (matching position card percentages)
    let weightedPnlPercentSum = 0
    let totalWeight = 0

    for (const poolAddress of poolAddresses) {
      const cacheKey = `${poolAddress}:${wallet}`
      const entry = poolPnLData.get(cacheKey)
      if (!entry) continue

      hasData = true
      for (const pos of entry.positions) {
        // PnL in SOL - parse as number in case API returns string
        const posPnlSol = pos.pnlSol != null ? Number(pos.pnlSol) : 0
        pnlSol += posPnlSol

        // Current value in SOL (convert from USD if balancesSol not available)
        let posValueSol = 0
        if (pos.unrealizedPnl?.balancesSol) {
          posValueSol = parseFloat(pos.unrealizedPnl.balancesSol)
          valueSol += posValueSol
        } else if (pos.unrealizedPnl?.balances) {
          // Rough estimate: convert USD to SOL
          posValueSol = pos.unrealizedPnl.balances / 200
          valueSol += posValueSol
        }

        // Initial deposit from allTimeDeposits (actual historical deposit in SOL)
        const posInitialDeposit = pos.allTimeDeposits.total.sol
          ? parseFloat(pos.allTimeDeposits.total.sol)
          : posValueSol - posPnlSol
        initialDepositSol += posInitialDeposit

        // Use the position's pnlSolPctChange for weighted average (matches position card)
        const posPct = pos.pnlSolPctChange != null ? Number(pos.pnlSolPctChange) : null
        if (posPct != null && posInitialDeposit > 0) {
          // Weight by absolute value of initial deposit for weighted average
          weightedPnlPercentSum += posPct * Math.abs(posInitialDeposit)
          totalWeight += Math.abs(posInitialDeposit)
        }

        // Unclaimed fees in SOL (sum of tokenX and tokenY amounts converted to SOL)
        const feeXSol = pos.unrealizedPnl?.unclaimedFeeTokenX?.amountSol
          ? parseFloat(pos.unrealizedPnl.unclaimedFeeTokenX.amountSol)
          : 0
        const feeYSol = pos.unrealizedPnl?.unclaimedFeeTokenY?.amountSol
          ? parseFloat(pos.unrealizedPnl.unclaimedFeeTokenY.amountSol)
          : 0
        feesSol += feeXSol + feeYSol
      }
    }

    if (!hasData) {
      return {
        totalPnlSol: 0,
        totalPnlPercent: 0,
        totalValueSol: 0,
        totalInitialDepositSol: 0,
        totalUnclaimedFeesSol: 0,
      }
    }

    // Use weighted average of position percentages (matches position card display)
    const pnlPercent = totalWeight > 0 ? weightedPnlPercentSum / totalWeight : 0

    return {
      totalPnlSol: pnlSol,
      totalPnlPercent: pnlPercent,
      totalValueSol: valueSol,
      totalInitialDepositSol: initialDepositSol,
      totalUnclaimedFeesSol: feesSol,
    }
  }, [wallet, poolAddresses, poolPnLData])

  // Loading while we have positions but no PnL data yet
  const hasAnyPoolData = useMemo(() => {
    if (!wallet) return false
    for (const poolAddress of poolAddresses) {
      const cacheKey = `${poolAddress}:${wallet}`
      if (poolPnLData.has(cacheKey)) return true
    }
    return false
  }, [wallet, poolAddresses, poolPnLData])

  const isLoading = positionCount > 0 && !hasAnyPoolData
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
          {isNaN(totalPnlPercent) ? '0.00' : totalPnlPercent.toFixed(2)}%
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

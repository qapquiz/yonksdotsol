import type { PositionPnLData } from 'metcomet'

export interface PoolPnLSummary {
  totalPnlSol: number
  totalPnlPercent: number
  totalValueSol: number
  totalInitialDepositSol: number
  totalUnclaimedFeesSol: number
}

const EMPTY_SUMMARY: PoolPnLSummary = {
  totalPnlSol: 0,
  totalPnlPercent: 0,
  totalValueSol: 0,
  totalInitialDepositSol: 0,
  totalUnclaimedFeesSol: 0,
}

/**
 * Aggregate PnL data across multiple positions into a portfolio summary.
 * Pure function — no store, no async, no side effects.
 */
export function computePoolPnLSummary(positions: PositionPnLData[]): PoolPnLSummary {
  if (positions.length === 0) {
    return { ...EMPTY_SUMMARY }
  }

  let pnlSol = 0
  let valueSol = 0
  let initialDepositSol = 0
  let feesSol = 0
  let weightedPnlPercentSum = 0
  let totalWeight = 0

  for (const pos of positions) {
    const posPnlSol = pos.pnlSol != null ? Number(pos.pnlSol) : 0
    pnlSol += posPnlSol

    let posValueSol = 0
    if (pos.unrealizedPnl?.balancesSol) {
      posValueSol = parseFloat(pos.unrealizedPnl.balancesSol)
      valueSol += posValueSol
    } else if (pos.unrealizedPnl?.balances) {
      posValueSol = pos.unrealizedPnl.balances / 200
      valueSol += posValueSol
    }

    const posInitialDeposit = pos.allTimeDeposits.total.sol
      ? parseFloat(pos.allTimeDeposits.total.sol)
      : posValueSol - posPnlSol
    initialDepositSol += posInitialDeposit

    const posPct = pos.pnlSolPctChange != null ? Number(pos.pnlSolPctChange) : null
    if (posPct != null && posInitialDeposit > 0) {
      weightedPnlPercentSum += posPct * Math.abs(posInitialDeposit)
      totalWeight += Math.abs(posInitialDeposit)
    }

    const feeXSol = pos.unrealizedPnl?.unclaimedFeeTokenX?.amountSol
      ? parseFloat(pos.unrealizedPnl.unclaimedFeeTokenX.amountSol)
      : 0
    const feeYSol = pos.unrealizedPnl?.unclaimedFeeTokenY?.amountSol
      ? parseFloat(pos.unrealizedPnl.unclaimedFeeTokenY.amountSol)
      : 0
    feesSol += feeXSol + feeYSol
  }

  const pnlPercent = totalWeight > 0 ? weightedPnlPercentSum / totalWeight : 0

  return {
    totalPnlSol: pnlSol,
    totalPnlPercent: pnlPercent,
    totalValueSol: valueSol,
    totalInitialDepositSol: initialDepositSol,
    totalUnclaimedFeesSol: feesSol,
  }
}

/**
 * Find PnL data for a specific position within a list.
 * Pure function.
 */
export function findPositionPnL(positions: PositionPnLData[], positionAddress: string): PositionPnLData | null {
  return positions.find((p) => p.positionAddress === positionAddress) ?? null
}

/**
 * Check if any positions exist in the PnL data.
 */
export function hasAnyPnLData(positions: PositionPnLData[]): boolean {
  return positions.length > 0
}

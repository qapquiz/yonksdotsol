import { describe, expect, it } from 'vitest'
import type { PositionPnLData } from 'metcomet'
import { computePoolPnLSummary } from '../../utils/positions/pnlAggregation'

// ─── Helpers ─────────────────────────────────────────────────────────

/** Minimal PositionPnLData builder; only the fields computePoolPnLSummary reads. */
function makePos(overrides: Partial<PositionPnLData> = {}): PositionPnLData {
  return {
    positionAddress: 'pos-addr',
    minPrice: '0.5',
    maxPrice: '2.0',
    lowerBinId: 40,
    upperBinId: 60,
    feePerTvl24h: '1.31',
    isClosed: false,
    pnlUsd: '0',
    pnlPctChange: '0',
    pnlSol: 0,
    pnlSolPctChange: 0,
    allTimeDeposits: {
      tokenX: { amount: '0', amountSol: null, usd: '0' },
      tokenY: { amount: '0', amountSol: null, usd: '0' },
      total: { usd: '0', sol: null },
    },
    allTimeWithdrawals: {
      tokenX: { amount: '0', amountSol: null, usd: '0' },
      tokenY: { amount: '0', amountSol: null, usd: '0' },
      total: { usd: '0', sol: null },
    },
    allTimeFees: {
      tokenX: { amount: '0', amountSol: null, usd: '0' },
      tokenY: { amount: '0', amountSol: null, usd: '0' },
      total: { usd: '0', sol: null },
    },
    unrealizedPnl: null,
    isOutOfRange: false,
    poolActiveBinId: 50,
    poolActivePrice: '1.0',
    ...overrides,
  } as PositionPnLData
}

describe('computePoolPnLSummary', () => {
  describe('totalInitialDepositSol (net cost basis)', () => {
    it('subtracts withdrawals from deposits (deposit → withdraw → redeposit)', () => {
      // The reported bug: deposit 4.5, withdraw 4.5 (without closing), deposit
      // 4.5 again. Gross deposits = 9.0; the real net cost basis is 4.5.
      const pos = makePos({
        pnlSol: 0,
        pnlSolPctChange: 0,
        unrealizedPnl: {
          balances: 0,
          balancesSol: '4.5',
          balanceTokenX: { amount: '0', amountSol: null, usd: '0' },
          balanceTokenY: { amount: '0', amountSol: null, usd: '0' },
          unclaimedFeeTokenX: { amount: '0', amountSol: null, usd: '0' },
          unclaimedFeeTokenY: { amount: '0', amountSol: null, usd: '0' },
          unclaimedRewardTokenX: { amount: '0', amountSol: null, usd: '0' },
          unclaimedRewardTokenY: { amount: '0', amountSol: null, usd: '0' },
        },
        allTimeDeposits: {
          tokenX: { amount: '0', amountSol: null, usd: '0' },
          tokenY: { amount: '0', amountSol: null, usd: '0' },
          total: { usd: '900', sol: '9.0' },
        },
        allTimeWithdrawals: {
          tokenX: { amount: '0', amountSol: null, usd: '0' },
          tokenY: { amount: '0', amountSol: null, usd: '0' },
          total: { usd: '450', sol: '4.5' },
        },
      })

      const summary = computePoolPnLSummary([pos])

      // Regression: was 9.0 (gross), now 4.5 (net).
      expect(summary.totalInitialDepositSol).toBe(4.5)
    })

    it('partial withdrawal reduces the cost basis proportionally', () => {
      const pos = makePos({
        allTimeDeposits: {
          tokenX: { amount: '0', amountSol: null, usd: '0' },
          tokenY: { amount: '0', amountSol: null, usd: '0' },
          total: { usd: '500', sol: '5.0' },
        },
        allTimeWithdrawals: {
          tokenX: { amount: '0', amountSol: null, usd: '0' },
          tokenY: { amount: '0', amountSol: null, usd: '0' },
          total: { usd: '120', sol: '1.2' },
        },
      })

      const summary = computePoolPnLSummary([pos])

      expect(summary.totalInitialDepositSol).toBeCloseTo(3.8, 10)
    })

    it('treats a null withdrawal SOL value as zero (no withdrawal)', () => {
      const pos = makePos({
        allTimeDeposits: {
          tokenX: { amount: '0', amountSol: null, usd: '0' },
          tokenY: { amount: '0', amountSol: null, usd: '0' },
          total: { usd: '100', sol: '1.0' },
        },
        allTimeWithdrawals: {
          tokenX: { amount: '0', amountSol: null, usd: '0' },
          tokenY: { amount: '0', amountSol: null, usd: '0' },
          total: { usd: '0', sol: null },
        },
      })

      const summary = computePoolPnLSummary([pos])

      expect(summary.totalInitialDepositSol).toBe(1.0)
    })

    it('falls back to value − uPnL when no deposit SOL data exists', () => {
      // No allTimeDeposits.total.sol; derive net basis from value and pnl.
      const pos = makePos({
        pnlSol: 0.5,
        unrealizedPnl: {
          balances: 0,
          balancesSol: '5.0',
          balanceTokenX: { amount: '0', amountSol: null, usd: '0' },
          balanceTokenY: { amount: '0', amountSol: null, usd: '0' },
          unclaimedFeeTokenX: { amount: '0', amountSol: null, usd: '0' },
          unclaimedFeeTokenY: { amount: '0', amountSol: null, usd: '0' },
          unclaimedRewardTokenX: { amount: '0', amountSol: null, usd: '0' },
          unclaimedRewardTokenY: { amount: '0', amountSol: null, usd: '0' },
        },
        allTimeDeposits: {
          tokenX: { amount: '0', amountSol: null, usd: '0' },
          tokenY: { amount: '0', amountSol: null, usd: '0' },
          total: { usd: '0', sol: null },
        },
      })

      const summary = computePoolPnLSummary([pos])

      // 5.0 value − 0.5 uPnL = 4.5 net basis.
      expect(summary.totalInitialDepositSol).toBe(4.5)
    })

    it('aggregates net cost basis across multiple positions', () => {
      const a = makePos({
        positionAddress: 'a',
        allTimeDeposits: {
          tokenX: { amount: '0', amountSol: null, usd: '0' },
          tokenY: { amount: '0', amountSol: null, usd: '0' },
          total: { usd: '0', sol: '4.5' },
        },
        allTimeWithdrawals: {
          tokenX: { amount: '0', amountSol: null, usd: '0' },
          tokenY: { amount: '0', amountSol: null, usd: '0' },
          total: { usd: '0', sol: '4.5' },
        },
      })
      const b = makePos({
        positionAddress: 'b',
        allTimeDeposits: {
          tokenX: { amount: '0', amountSol: null, usd: '0' },
          tokenY: { amount: '0', amountSol: null, usd: '0' },
          total: { usd: '0', sol: '3.0' },
        },
        allTimeWithdrawals: {
          tokenX: { amount: '0', amountSol: null, usd: '0' },
          tokenY: { amount: '0', amountSol: null, usd: '0' },
          total: { usd: '0', sol: null },
        },
      })

      const summary = computePoolPnLSummary([a, b])

      // a: 4.5 − 4.5 = 0 (fully withdrawn dust); b: 3.0 − 0 = 3.0.
      expect(summary.totalInitialDepositSol).toBe(3.0)
    })
  })
})

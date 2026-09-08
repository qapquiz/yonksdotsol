import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchPortfolioSummary } from '../../widgets/updatePortfolioWidget'
import type { OpenPortfolioSummary } from '../../services/dlmmApi'

// The widget module renders RemoteViews components and reads MMKV at module
// scope — neither exists under Vitest, so stub both. dlmmApi is mocked so the
// mapping logic is tested against a fixed server snapshot.
const { fetchOpenPortfolioSummaryMock } = vi.hoisted(() => ({ fetchOpenPortfolioSummaryMock: vi.fn() }))

vi.mock('react-native-mmkv', () => ({
  createMMKV: () => ({ set: vi.fn(), getString: () => undefined }),
}))

vi.mock('react-native-android-widget', () => ({
  FlexWidget: () => null,
  TextWidget: () => null,
  SvgWidget: () => null,
}))

vi.mock('../../services/dlmmApi', () => ({
  fetchOpenPortfolioSummary: (...args: unknown[]) => fetchOpenPortfolioSummaryMock(...args),
}))

function serverSummary(overrides: Partial<OpenPortfolioSummary> = {}): OpenPortfolioSummary {
  return {
    pools: [],
    total: {
      balances: '400',
      balancesSol: '4.2356',
      unclaimedFees: '0.07',
      unclaimedFeesSol: '0.0007',
      pnl: '-18',
      pnlPctChange: '-1.99',
      pnlSol: '-0.1854',
      pnlSolPctChange: '-1.99',
    },
    solPrice: 100,
    totalCount: 1,
    outOfRangeCount: 0,
    feesTvl24h: 0.0154,
    ...overrides,
  }
}

describe('fetchPortfolioSummary (widget)', () => {
  beforeEach(() => {
    fetchOpenPortfolioSummaryMock.mockReset()
  })

  it('derives deposited as net cost basis (value − uPnL) from the server snapshot', async () => {
    fetchOpenPortfolioSummaryMock.mockResolvedValue(serverSummary())

    const summary = await fetchPortfolioSummary('WALLET')

    expect(summary).not.toBeNull()
    expect(summary!.totalValueSol).toBe(4.2356)
    expect(summary!.totalPnlSol).toBe(-0.1854)
    // gross server deposits are never surfaced; 4.2356 − (−0.1854)
    expect(summary!.totalInitialDepositSol).toBeCloseTo(4.421, 10)
    expect(summary!.totalUnclaimedFeesSol).toBe(0.0007)
    expect(summary!.feesTvl24h).toBe(0.0154)
  })

  it('treats null server pnl as zero, making deposited equal to value', async () => {
    const snapshot = serverSummary()
    snapshot.total.pnlSol = null
    fetchOpenPortfolioSummaryMock.mockResolvedValue(snapshot)

    const summary = await fetchPortfolioSummary('WALLET')

    expect(summary!.totalPnlSol).toBe(0)
    expect(summary!.totalInitialDepositSol).toBe(4.2356)
  })

  it('returns null when the wallet has no open positions', async () => {
    fetchOpenPortfolioSummaryMock.mockResolvedValue(serverSummary({ totalCount: 0 }))

    expect(await fetchPortfolioSummary('WALLET')).toBeNull()
  })
})

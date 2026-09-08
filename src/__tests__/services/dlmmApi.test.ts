import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DLMM_API_BASE,
  DlmmApiError,
  fetchOpenPortfolio,
  fetchOpenPortfolioSummary,
  fetchPositionPnL,
  type PoolOpenPortfolioItem,
} from '../../services/dlmmApi'

// ─── fetch stub ──────────────────────────────────────────────────────

const fetchMock = vi.fn()

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(body) }
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ─── Fixtures ────────────────────────────────────────────────────────

function poolItem(overrides: Partial<PoolOpenPortfolioItem>): PoolOpenPortfolioItem {
  return {
    poolAddress: 'POOL',
    binStep: 10,
    baseFee: 0.0025,
    tokenXMint: 'SOL_MINT',
    tokenYMint: 'USDC_MINT',
    tokenXIcon: '',
    tokenYIcon: '',
    tokenX: 'SOL',
    tokenY: 'USDC',
    rewardX: '',
    rewardY: '',
    balances: '30',
    balancesSol: '0.2',
    unclaimedFees: '0',
    unclaimedFeesSol: '0',
    feePerTvl24h: '0',
    pnl: '0',
    pnlPctChange: '0',
    pnlSol: '0',
    pnlSolPctChange: '0',
    totalDeposit: '100',
    totalDepositSol: '0.5',
    openPositionCount: 1,
    listPositions: ['pos0'],
    positionsOutOfRange: [],
    outOfRange: false,
    poolPrice: 150,
    poolStateUpdatedAtSlot: 1,
    poolStateUpdatedAtBlockTime: 1,
    ...overrides,
  }
}

function openPage(pools: PoolOpenPortfolioItem[], opts?: { hasNext?: boolean; page?: number }) {
  return jsonResponse({
    pools,
    total: {
      balances: '30',
      balancesSol: '0.2',
      unclaimedFees: '1',
      unclaimedFeesSol: '0.0066',
      pnl: '5',
      pnlPctChange: '20',
      pnlSol: '0.0333',
      pnlSolPctChange: '20',
    },
    solPrice: '150',
    totalCount: pools.length,
    page: opts?.page ?? 1,
    pageSize: 50,
    hasNext: opts?.hasNext ?? false,
  })
}

// ─── fetchPositionPnL ────────────────────────────────────────────────

describe('fetchPositionPnL', () => {
  it('builds the documented URL with query params', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ positions: [], hasNext: false }))
    await fetchPositionPnL({ poolAddress: 'POOL', user: 'WALLET', status: 'open' })
    expect(fetchMock.mock.calls[0][0]).toBe(`${DLMM_API_BASE}/positions/POOL/pnl?user=WALLET&status=open`)
  })

  it('throws DlmmApiError with status on non-OK responses', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 500))
    const err = await fetchPositionPnL({ poolAddress: 'POOL', user: 'WALLET' }).catch((e) => e)
    expect(err).toBeInstanceOf(DlmmApiError)
    expect(err.status).toBe(500)
  })

  it('throws DlmmApiError with null status on network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'))
    const err = await fetchPositionPnL({ poolAddress: 'POOL', user: 'WALLET' }).catch((e) => e)
    expect(err).toBeInstanceOf(DlmmApiError)
    expect(err.status).toBeNull()
  })
})

// ─── fetchOpenPortfolio ──────────────────────────────────────────────

describe('fetchOpenPortfolio', () => {
  it('builds the documented URL with page params', async () => {
    fetchMock.mockResolvedValue(openPage([]))
    await fetchOpenPortfolio({ user: 'WALLET', page: 2, page_size: 50 })
    expect(fetchMock.mock.calls[0][0]).toBe(`${DLMM_API_BASE}/portfolio/open?user=WALLET&page=2&page_size=50`)
  })
})

// ─── fetchOpenPortfolioSummary ───────────────────────────────────────

describe('fetchOpenPortfolioSummary', () => {
  it('returns a single page with server totals surfaced', async () => {
    fetchMock.mockResolvedValue(openPage([poolItem({ poolAddress: 'A' })]))
    const summary = await fetchOpenPortfolioSummary({ user: 'WALLET' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(summary.totalCount).toBe(1)
    expect(summary.total.pnlSol).toBe('0.0333') // strings pass through untouched
    expect(summary.solPrice).toBe(150) // numbers are converted
  })

  it('walks pagination until hasNext is false', async () => {
    fetchMock
      .mockResolvedValueOnce(openPage([poolItem({ poolAddress: 'A' })], { hasNext: true, page: 1 }))
      .mockResolvedValueOnce(openPage([poolItem({ poolAddress: 'B' })], { hasNext: false, page: 2 }))

    const summary = await fetchOpenPortfolioSummary({ user: 'WALLET' })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toContain('page=2&page_size=50')
    expect(summary.pools.map((p) => p.poolAddress)).toEqual(['A', 'B'])
    expect(summary.totalCount).toBe(1) // last page's server-global count
  })

  it('rolls up deposits, out-of-range count, and pool-value-weighted fees/TVL', async () => {
    fetchMock.mockResolvedValue(
      openPage([
        poolItem({
          poolAddress: 'A',
          totalDepositSol: '1.5',
          positionsOutOfRange: ['pos1'],
          feePerTvl24h: '1.00', // → 0.01 ratio
          balancesSol: '0.2',
        }),
        poolItem({
          poolAddress: 'B',
          totalDepositSol: '2.25',
          positionsOutOfRange: ['pos2', 'pos3'],
          feePerTvl24h: '2.00', // → 0.02 ratio
          balancesSol: '0.6',
        }),
      ]),
    )
    const summary = await fetchOpenPortfolioSummary({ user: 'WALLET' })

    expect(summary.totalInitialDepositSol).toBe(3.75)
    expect(summary.outOfRangeCount).toBe(3)
    // (0.01×0.2 + 0.02×0.6) / 0.8
    expect(summary.feesTvl24h).toBeCloseTo(0.0175, 10)
  })

  it('maps an empty portfolio to zeroed rollups and null fees/TVL', async () => {
    fetchMock.mockResolvedValue(openPage([]))
    const summary = await fetchOpenPortfolioSummary({ user: 'WALLET' })

    expect(summary.totalCount).toBe(0)
    expect(summary.pools).toEqual([])
    expect(summary.totalInitialDepositSol).toBe(0)
    expect(summary.outOfRangeCount).toBe(0)
    expect(summary.feesTvl24h).toBeNull()
  })

  it('throws DlmmApiError when a page request fails', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 503))
    const err = await fetchOpenPortfolioSummary({ user: 'WALLET' }).catch((e) => e)
    expect(err).toBeInstanceOf(DlmmApiError)
    expect(err.status).toBe(503)
  })

  it('rejects an incomplete summary when the page limit is reached', async () => {
    fetchMock.mockResolvedValue(openPage([poolItem({})], { hasNext: true }))

    await expect(fetchOpenPortfolioSummary({ user: 'WALLET' })).rejects.toThrow(DlmmApiError)
    expect(fetchMock).toHaveBeenCalledTimes(10)
  })

  it('accepts a complete summary ending on the last allowed page', async () => {
    for (let page = 1; page <= 10; page++) {
      fetchMock.mockResolvedValueOnce(
        openPage([poolItem({ poolAddress: `POOL-${page}` })], { hasNext: page < 10, page }),
      )
    }

    const summary = await fetchOpenPortfolioSummary({ user: 'WALLET' })

    expect(summary.pools).toHaveLength(10)
    expect(fetchMock).toHaveBeenCalledTimes(10)
  })

  it('does not return partial rollups when a later page fails', async () => {
    fetchMock
      .mockResolvedValueOnce(openPage([poolItem({})], { hasNext: true }))
      .mockResolvedValueOnce(jsonResponse({}, false, 503))

    await expect(fetchOpenPortfolioSummary({ user: 'WALLET' })).rejects.toThrow(DlmmApiError)
  })
})

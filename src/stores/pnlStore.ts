import { create } from 'zustand'
import { fetchPositionPnL, type PositionPnLData } from 'metcomet'
import { env } from '../config/env'

const TTL_MS = 60_000

interface PnLCacheEntry {
  positions: PositionPnLData[]
  timestamp: number
}

interface PnLStore {
  poolPnLData: Record<string, PnLCacheEntry>
  pendingPoolPnL: Record<string, Promise<PositionPnLData[] | null>>
  fetchPoolPnL: (poolAddress: string, walletAddress: string) => Promise<PositionPnLData[] | null>
  invalidateWallet: (walletAddress: string) => void
  clearAll: () => void
}

export const usePnLStore = create<PnLStore>((set, get) => ({
  poolPnLData: {},
  pendingPoolPnL: {},

  fetchPoolPnL: async (poolAddress: string, walletAddress: string) => {
    if (!env.heliusApiKey) {
      return null
    }

    const cacheKey = `${poolAddress}:${walletAddress}`
    const state = get()

    const cached = state.poolPnLData[cacheKey]
    if (cached && Date.now() - cached.timestamp < TTL_MS) {
      return cached.positions
    }

    const existingRequest = state.pendingPoolPnL[cacheKey]
    if (existingRequest) {
      return existingRequest
    }

    const requestPromise = fetchPositionPnL({
      poolAddress,
      user: walletAddress,
      status: 'open',
    }).then((response) => response?.positions ?? null)

    set((s) => ({
      pendingPoolPnL: { ...s.pendingPoolPnL, [cacheKey]: requestPromise },
    }))

    try {
      const positions = await requestPromise

      set((s) => ({
        poolPnLData: {
          ...s.poolPnLData,
          [cacheKey]: { positions: positions ?? [], timestamp: Date.now() },
        },
      }))

      return positions
    } finally {
      set((s) => {
        const { [cacheKey]: _, ...rest } = s.pendingPoolPnL
        return { pendingPoolPnL: rest }
      })
    }
  },

  invalidateWallet: (walletAddress: string) => {
    set((s) => {
      const newPoolPnLData = { ...s.poolPnLData }
      for (const key of Object.keys(newPoolPnLData)) {
        if (key.endsWith(`:${walletAddress}`)) {
          delete newPoolPnLData[key]
        }
      }
      return { poolPnLData: newPoolPnLData }
    })
  },

  clearAll: () => {
    set({
      poolPnLData: {},
      pendingPoolPnL: {},
    })
  },
}))

export function selectPositionPnL(
  poolAddress: string,
  walletAddress: string,
  positionAddress: string,
): (state: PnLStore) => PositionPnLData | null {
  return (state) => {
    const cacheKey = `${poolAddress}:${walletAddress}`
    const entry = state.poolPnLData[cacheKey]
    if (!entry) return null
    return entry.positions.find((p) => p.positionAddress === positionAddress) ?? null
  }
}

export interface PoolPnLSummary {
  totalPnlSol: number
  totalPnlPercent: number
  totalValueSol: number
  totalInitialDepositSol: number
  totalUnclaimedFeesSol: number
}

export function selectPoolPnLSummary(
  walletAddress: string,
  poolAddresses: string[],
): (state: PnLStore) => PoolPnLSummary {
  return (state) => {
    if (!walletAddress || poolAddresses.length === 0) {
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
    let weightedPnlPercentSum = 0
    let totalWeight = 0

    for (const poolAddress of poolAddresses) {
      const cacheKey = `${poolAddress}:${walletAddress}`
      const entry = state.poolPnLData[cacheKey]
      if (!entry) continue

      hasData = true
      for (const pos of entry.positions) {
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

    const pnlPercent = totalWeight > 0 ? weightedPnlPercentSum / totalWeight : 0

    return {
      totalPnlSol: pnlSol,
      totalPnlPercent: pnlPercent,
      totalValueSol: valueSol,
      totalInitialDepositSol: initialDepositSol,
      totalUnclaimedFeesSol: feesSol,
    }
  }
}

export function selectHasPoolData(walletAddress: string, poolAddresses: string[]): (state: PnLStore) => boolean {
  return (state) => {
    if (!walletAddress) return false
    for (const poolAddress of poolAddresses) {
      if (`${poolAddress}:${walletAddress}` in state.poolPnLData) return true
    }
    return false
  }
}

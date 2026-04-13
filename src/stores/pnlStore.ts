import { create } from 'zustand'
import { PublicKey } from '@solana/web3.js'
import { fetchPositionPnL, getUpnlPerPosition, type PositionPnLData, type PositionUpnl } from 'metcomet'
import { env } from '../config/env'
import { getSharedConnection } from '../config/connection'

const TTL_MS = 60_000

interface PnLCacheEntry {
  positions: PositionPnLData[]
  timestamp: number
}

interface UpnlCacheEntry {
  positions: PositionUpnl[]
  timestamp: number
}

interface PortfolioSummary {
  totalPnlSol: number
  totalPnlPercent: number
  totalValueSol: number
  totalInitialDepositSol: number
  totalUnclaimedFeesSol: number
}

interface PnLStore {
  // Per-pool PnL: poolAddress:walletAddress → PositionPnLData[] (for cards)
  poolPnLData: Map<string, PnLCacheEntry>

  // Per-wallet uPnL: walletAddress → PositionUpnl[] (for portfolio summary)
  walletUpnlData: Map<string, UpnlCacheEntry>

  // Pending requests
  pendingPoolPnL: Map<string, Promise<PositionPnLData[] | null>>
  pendingUpnl: Map<string, Promise<PositionUpnl[] | null>>

  // Fetch PnL for a specific pool (for PositionCard)
  fetchPoolPnL: (poolAddress: string, walletAddress: string) => Promise<PositionPnLData[] | null>

  // Fetch uPnL for a wallet (for PortfolioSummary)
  fetchWalletUpnl: (walletAddress: string) => Promise<PositionUpnl[] | null>

  // Invalidate all cached data for a wallet (for pull-to-refresh)
  invalidateWallet: (walletAddress: string) => void

  // Clear all cached data
  clearAll: () => void
}

export const usePnLStore = create<PnLStore>((set, get) => ({
  poolPnLData: new Map(),
  walletUpnlData: new Map(),
  pendingPoolPnL: new Map(),
  pendingUpnl: new Map(),

  fetchPoolPnL: async (poolAddress: string, walletAddress: string) => {
    if (!env.heliusApiKey) {
      return null
    }

    const cacheKey = `${poolAddress}:${walletAddress}`
    const state = get()

    // Check cache (with TTL)
    const cached = state.poolPnLData.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < TTL_MS) {
      return cached.positions
    }

    // Check if already pending
    const existingRequest = state.pendingPoolPnL.get(cacheKey)
    if (existingRequest) {
      return existingRequest
    }

    // Create new request
    const requestPromise = fetchPositionPnL({
      poolAddress,
      user: walletAddress,
      status: 'all',
    }).then((response) => response?.positions ?? null)

    // Store pending promise
    set((s) => {
      const newPending = new Map(s.pendingPoolPnL)
      newPending.set(cacheKey, requestPromise)
      return { pendingPoolPnL: newPending }
    })

    try {
      const positions = await requestPromise

      // Cache result
      set((s) => {
        const newPoolPnLData = new Map(s.poolPnLData)
        newPoolPnLData.set(cacheKey, {
          positions: positions ?? [],
          timestamp: Date.now(),
        })
        return { poolPnLData: newPoolPnLData }
      })

      return positions
    } finally {
      set((s) => {
        const newPending = new Map(s.pendingPoolPnL)
        newPending.delete(cacheKey)
        return { pendingPoolPnL: newPending }
      })
    }
  },

  fetchWalletUpnl: async (walletAddress: string) => {
    if (!env.heliusApiKey || !env.rpcUrl) {
      return null
    }

    const state = get()

    // Check cache (with TTL)
    const cached = state.walletUpnlData.get(walletAddress)
    if (cached && Date.now() - cached.timestamp < TTL_MS) {
      return cached.positions
    }

    // Check if already pending
    const existingRequest = state.pendingUpnl.get(walletAddress)
    if (existingRequest) {
      return existingRequest
    }

    // Create new request
    const requestPromise = (async () => {
      if (!env.heliusApiKey) return null
      const connection = getSharedConnection()
      const publicKey = new PublicKey(walletAddress)
      return getUpnlPerPosition({
        connection,
        walletAddress: publicKey,
        heliusApiKey: env.heliusApiKey,
      })
    })()

    // Store pending promise
    set((s) => {
      const newPending = new Map(s.pendingUpnl)
      newPending.set(walletAddress, requestPromise)
      return { pendingUpnl: newPending }
    })

    try {
      const positions = await requestPromise

      // Cache result
      set((s) => {
        const newWalletUpnlData = new Map(s.walletUpnlData)
        newWalletUpnlData.set(walletAddress, {
          positions: positions ?? [],
          timestamp: Date.now(),
        })
        return { walletUpnlData: newWalletUpnlData }
      })

      return positions
    } finally {
      set((s) => {
        const newPending = new Map(s.pendingUpnl)
        newPending.delete(walletAddress)
        return { pendingUpnl: newPending }
      })
    }
  },

  invalidateWallet: (walletAddress: string) => {
    set((s) => {
      // Clear pool PnL data for this wallet
      const newPoolPnLData = new Map(s.poolPnLData)
      for (const [key] of newPoolPnLData) {
        if (key.endsWith(`:${walletAddress}`)) {
          newPoolPnLData.delete(key)
        }
      }

      // Clear wallet uPnL data
      const newWalletUpnlData = new Map(s.walletUpnlData)
      newWalletUpnlData.delete(walletAddress)

      return { poolPnLData: newPoolPnLData, walletUpnlData: newWalletUpnlData }
    })
  },

  clearAll: () => {
    set({
      poolPnLData: new Map(),
      walletUpnlData: new Map(),
      pendingPoolPnL: new Map(),
      pendingUpnl: new Map(),
    })
  },
}))

// Selectors

/**
 * Get a single position's PnL data from the store.
 * Used by PositionCard.
 */
export function selectPositionPnL(
  poolAddress: string,
  walletAddress: string,
  positionAddress: string,
): (state: PnLStore) => PositionPnLData | null {
  return (state) => {
    const cacheKey = `${poolAddress}:${walletAddress}`
    const entry = state.poolPnLData.get(cacheKey)
    if (!entry) return null
    return entry.positions.find((p) => p.positionAddress === positionAddress) ?? null
  }
}

/**
 * Get portfolio summary for a wallet.
 * Used by PortfolioSummary.
 */
export function selectPortfolioSummary(walletAddress: string): (state: PnLStore) => PortfolioSummary {
  return (state) => {
    const entry = state.walletUpnlData.get(walletAddress)
    if (!entry) {
      return {
        totalPnlSol: 0,
        totalPnlPercent: 0,
        totalValueSol: 0,
        totalInitialDepositSol: 0,
        totalUnclaimedFeesSol: 0,
      }
    }

    let totalPnlSol = 0
    let totalValueSol = 0
    let totalInitialDepositSol = 0
    let totalUnclaimedFeesSol = 0

    for (const pos of entry.positions) {
      totalPnlSol += pos.upnlWithFees
      totalValueSol += pos.currentValueInSol
      totalInitialDepositSol += pos.initialDepositInSol
      totalUnclaimedFeesSol += pos.unclaimedFeesInSol
    }

    const totalPnlPercent = totalInitialDepositSol > 0 ? (totalPnlSol / totalInitialDepositSol) * 100 : 0

    return {
      totalPnlSol,
      totalPnlPercent,
      totalValueSol,
      totalInitialDepositSol,
      totalUnclaimedFeesSol,
    }
  }
}

/**
 * Check if any pool PnL data exists for a wallet (for loading state)
 */
export function selectHasPoolPnLData(walletAddress: string): (state: PnLStore) => boolean {
  return (state) => {
    for (const key of state.poolPnLData.keys()) {
      if (key.endsWith(`:${walletAddress}`)) {
        return true
      }
    }
    return false
  }
}

/**
 * Check if wallet uPnL data exists (for PortfolioSummary loading)
 */
export function selectHasWalletUpnlData(walletAddress: string): (state: PnLStore) => boolean {
  return (state) => {
    return state.walletUpnlData.has(walletAddress)
  }
}

/**
 * Get a single position's PnL data from the wallet uPnL store.
 * Used by PositionCard to ensure consistency with PortfolioSummary.
 *
 * Returns the same data source as PortfolioSummary (upnlWithFees).
 */
export function selectPositionUpnlFromWallet(
  walletAddress: string,
  positionAddress: string,
): (state: PnLStore) => PositionUpnl | null {
  return (state) => {
    const entry = state.walletUpnlData.get(walletAddress)
    if (!entry) return null
    return entry.positions.find((p) => p.positionAddress === positionAddress) ?? null
  }
}

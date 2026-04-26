import { create } from 'zustand'
import { fetchPositionPnL, type PositionPnLData } from 'metcomet'
import { env } from '../config/env'
import { CacheManager } from '../utils/cache/CacheManager'
import { CACHE_TTL } from '../config/cache'

interface PnLStore {
  poolPnLData: Record<string, PositionPnLData[]>
  fetchPoolPnL: (poolAddress: string, walletAddress: string) => Promise<PositionPnLData[] | null>
  getPoolPnL: (poolAddress: string, walletAddress: string) => PositionPnLData[] | null
  invalidateWallet: (walletAddress: string) => void
  clearAll: () => void
}

export const usePnLStore = create<PnLStore>((set, get) => ({
  poolPnLData: {},

  fetchPoolPnL: async (poolAddress: string, walletAddress: string) => {
    if (!env.heliusApiKey) {
      return null
    }

    const cacheKey = `pnl:${poolAddress}:${walletAddress}`

    try {
      const positions = await CacheManager.getInstance().getOrFetch(
        cacheKey,
        () => fetchPositionPnL({ poolAddress, user: walletAddress, status: 'open' }).then((r) => r?.positions ?? []),
        CACHE_TTL.TOKEN_DATA,
      )

      set((s) => ({
        poolPnLData: { ...s.poolPnLData, [cacheKey]: positions },
      }))

      return positions
    } catch {
      return null
    }
  },

  getPoolPnL: (poolAddress: string, walletAddress: string) => {
    const cacheKey = `pnl:${poolAddress}:${walletAddress}`
    return get().poolPnLData[cacheKey] ?? null
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
    set({ poolPnLData: {} })
  },
}))

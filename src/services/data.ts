import { CacheManager } from '../utils/cache/CacheManager'
import { CACHE_TTL } from '../config/cache'
import { fetchTokenFromRpc, type TokenInfo } from '../tokens'
import { fetchOHLCVPriceAtTimestamp } from '../utils/positions/meteora-ohlcv'
import { fetchHistoricalSOLPriceFromApi } from '../utils/positions/pyth-benchmarks'

// ─── Cache key generators (internalized) ─────────────────────────────

function getTokenDataKey(mint: string): string {
  return `token_data:${mint}`
}

function getOHLCVKey(poolAddress: string, hourBucket: string): string {
  return `ohlcv:${poolAddress}:${hourBucket}`
}

function getPythPriceKey(tokenSymbol: string, hourBucket: string): string {
  return `pyth_price:${tokenSymbol}:${hourBucket}`
}

// ─── Token Service ───────────────────────────────────────────────────

export interface TokenService {
  /** Fetch token metadata + price for a single mint (cached) */
  getPrice(mint: string): Promise<TokenInfo>
  /** Batch-fetch token prices for multiple mints (cached, parallel, error-isolated) */
  getPrices(mints: string[]): Promise<Map<string, TokenInfo>>
}

// ─── Price Service ───────────────────────────────────────────────────

export interface PriceService {
  /** Fetch OHLCV candle closest to timestamp for a pool (cached) */
  getPoolPrice(poolAddress: string, timestamp: number, timeframe?: string): Promise<number | null>
  /** Fetch historical SOL price from Pyth (cached) */
  getHistoricalSOLPrice(timestamp: number): Promise<number | null>
}

// ─── Data Services ───────────────────────────────────────────────────

export interface DataServices {
  tokens: TokenService
  prices: PriceService
}

/** Create the data services. Pass a fresh CacheManager for testing. */
export function createDataServices(cache?: CacheManager): DataServices {
  const cm = cache ?? CacheManager.getInstance()

  const tokens: TokenService = {
    async getPrice(mint: string): Promise<TokenInfo> {
      return cm.getOrFetch(getTokenDataKey(mint), () => fetchTokenFromRpc(mint), CACHE_TTL.TOKEN_DATA)
    },

    async getPrices(mints: string[]): Promise<Map<string, TokenInfo>> {
      const results = await Promise.allSettled(
        mints.map((mint) =>
          cm
            .getOrFetch(getTokenDataKey(mint), () => fetchTokenFromRpc(mint), CACHE_TTL.TOKEN_DATA)
            .then((info) => [mint, info] as const),
        ),
      )

      const data = new Map<string, TokenInfo>()
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const [mint, info] = result.value
          data.set(mint, info)
        }
      }
      return data
    },
  }

  const prices: PriceService = {
    async getPoolPrice(poolAddress: string, timestamp: number, timeframe?: string): Promise<number | null> {
      const hourBucket = String(Math.floor(timestamp / 3600))
      return cm.getOrFetch(
        getOHLCVKey(poolAddress, hourBucket),
        () => fetchOHLCVPriceAtTimestamp(poolAddress, timestamp, timeframe as any),
        CACHE_TTL.OHLCV_PRICE,
      )
    },

    async getHistoricalSOLPrice(timestamp: number): Promise<number | null> {
      const hourBucket = String(Math.floor(timestamp / 3600))
      return cm.getOrFetch(
        getPythPriceKey('SOL', hourBucket),
        () => fetchHistoricalSOLPriceFromApi(timestamp),
        CACHE_TTL.PYTH_PRICE,
      )
    },
  }

  return { tokens, prices }
}

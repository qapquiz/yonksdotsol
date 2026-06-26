import { CacheManager } from '../utils/cache/CacheManager'
import { CACHE_TTL } from '../config/cache'
import { fetchPoolOhlcv, DEFAULT_OHLCV_TIMEFRAME, type OhlcvSeries, type OhlcvTimeframe } from './ohlcv'
import { fetchTokenFromRpc, type TokenInfo } from '../tokens'

// ─── Cache key generators (internalized) ─────────────────────────────

function getTokenDataKey(mint: string): string {
  return `token_data:${mint}`
}

function getOhlcvKey(pairAddress: string, timeframe: string): string {
  return `ohlcv:${pairAddress}:${timeframe}`
}

// ─── Token Service ───────────────────────────────────────────────────

export interface TokenService {
  /** Fetch token metadata + price for a single mint (cached) */
  getPrice(mint: string): Promise<TokenInfo>
  /** Batch-fetch token prices for multiple mints (cached, parallel, error-isolated) */
  getPrices(mints: string[]): Promise<Map<string, TokenInfo>>
}

// ─── OHLCV Service (display-only) ────────────────────────────────────

export interface OhlcvService {
  /** Fetch OHLCV candles for a pool (cached, dedup'd). Display-only — ADR 0001. */
  getOhlcv(pairAddress: string, timeframe?: OhlcvTimeframe): Promise<OhlcvSeries>
}

// ─── Data Services ───────────────────────────────────────────────────

export interface DataServices {
  tokens: TokenService
  ohlcv: OhlcvService
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

  const ohlcv: OhlcvService = {
    async getOhlcv(pairAddress: string, timeframe: OhlcvTimeframe = DEFAULT_OHLCV_TIMEFRAME): Promise<OhlcvSeries> {
      return cm.getOrFetch(
        getOhlcvKey(pairAddress, timeframe),
        () => fetchPoolOhlcv(pairAddress, timeframe),
        CACHE_TTL.OHLCV,
      )
    },
  }

  return { tokens, ohlcv }
}

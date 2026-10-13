import { CacheManager } from '../utils/cache/CacheManager'
import { CACHE_TTL } from '../config/cache'
import { fetchPoolOhlcv, DEFAULT_OHLCV_TIMEFRAME, type OhlcvSeries, type OhlcvTimeframe } from './ohlcv'
import { fetchTokenFromRpc, fetchTokensFromRpc, type TokenInfo } from '../tokens'

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
      const data = new Map<string, TokenInfo>()

      // Serve fresh per-mint cache hits; batch-fetch only the misses in one
      // getAssetBatch POST instead of one request per mint.
      const missing: string[] = []
      for (const mint of mints) {
        const cached = cm.get<TokenInfo>(getTokenDataKey(mint))
        if (cached) {
          data.set(mint, cached)
        } else {
          missing.push(mint)
        }
      }
      if (missing.length === 0) return data

      try {
        const batchKey = `token_batch:${missing.slice().sort().join(',')}`
        const fetched = await cm.getOrFetch(batchKey, () => fetchTokensFromRpc(missing), CACHE_TTL.TOKEN_DATA)
        for (const [mint, info] of fetched) {
          // Seed the per-mint keys so getPrice() (e.g. the SOL price path)
          // shares this cache instead of refetching.
          cm.set(getTokenDataKey(mint), info, CACHE_TTL.TOKEN_DATA)
          data.set(mint, info)
        }
      } catch {
        // Best-effort: failed mints are simply absent, same as the old
        // per-mint allSettled semantics.
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

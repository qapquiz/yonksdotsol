import { CacheManager } from '../utils/cache/CacheManager'
import { CACHE_TTL } from '../config/cache'
import { fetchTokenFromRpc, type TokenInfo } from '../tokens'

// ─── Cache key generators (internalized) ─────────────────────────────

function getTokenDataKey(mint: string): string {
  return `token_data:${mint}`
}

// ─── Token Service ───────────────────────────────────────────────────

export interface TokenService {
  /** Fetch token metadata + price for a single mint (cached) */
  getPrice(mint: string): Promise<TokenInfo>
  /** Batch-fetch token prices for multiple mints (cached, parallel, error-isolated) */
  getPrices(mints: string[]): Promise<Map<string, TokenInfo>>
}

// ─── Data Services ───────────────────────────────────────────────────

export interface DataServices {
  tokens: TokenService
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

  return { tokens }
}

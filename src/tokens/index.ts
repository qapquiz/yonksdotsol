import { env } from '../config/env'

export interface TokenInfo {
  mint: string
  symbol: string
  supply: number
  decimals: number
  cdn_url: string
  price_info: {
    price_per_token: number
    currency: string
  }
}

const TOKEN_CACHE_TTL = 60 * 1000 // 1 minute
const MAX_CACHE_SIZE = 200
const pendingRequests = new Map<string, Promise<TokenInfo>>()
const responseCache = new Map<string, { data: TokenInfo; expiresAt: number }>()

function evictExpired(): void {
  const now = Date.now()
  for (const [key, entry] of responseCache) {
    if (now >= entry.expiresAt) {
      responseCache.delete(key)
    }
  }
}

function evictOldest(): void {
  if (responseCache.size < MAX_CACHE_SIZE) return
  const firstKey = responseCache.keys().next().value
  if (firstKey !== undefined) {
    responseCache.delete(firstKey)
  }
}

export const fetchTokenPriceData = async (mint: string): Promise<TokenInfo> => {
  const cached = responseCache.get(mint)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data
  }
  responseCache.delete(mint)

  const existing = pendingRequests.get(mint)
  if (existing) {
    return existing
  }

  const requestPromise = (async () => {
    try {
      const response = await fetch(env.rpcUrl || '', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: '1',
          method: 'getAsset',
          params: {
            id: mint,
            displayOptions: {
              showFungible: true,
            },
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error.message || 'RPC error')
      }

      const tokenInfo: TokenInfo = {
        mint: data.result.id,
        symbol: data.result.token_info.symbol,
        supply: data.result.token_info.supply,
        cdn_url: data.result.content.links.image,
        decimals: data.result.token_info.decimals,
        price_info: data.result.token_info.price_info,
      } as TokenInfo

      evictExpired()
      evictOldest()
      responseCache.set(mint, { data: tokenInfo, expiresAt: Date.now() + TOKEN_CACHE_TTL })
      return tokenInfo
    } finally {
      pendingRequests.delete(mint)
    }
  })()

  pendingRequests.set(mint, requestPromise)
  return requestPromise
}

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

const pendingRequests = new Map<string, Promise<TokenInfo>>()

export const fetchTokenPriceData = async (mint: string): Promise<TokenInfo> => {
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

      return {
        mint: data.result.id,
        symbol: data.result.token_info.symbol,
        supply: data.result.token_info.supply,
        cdn_url: data.result.content.links.image,
        decimals: data.result.token_info.decimals,
        price_info: data.result.token_info.price_info,
      } as TokenInfo
    } finally {
      pendingRequests.delete(mint)
    }
  })()

  pendingRequests.set(mint, requestPromise)
  return requestPromise
}

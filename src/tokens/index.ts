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

export const fetchTokenPriceData = async (mint: string) => {
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
        id: mint, // Bonk token mint address
        displayOptions: {
          showFungible: true,
        },
      },
    }),
  })

  const data = await response.json()

  return {
    mint: data.result.id,
    symbol: data.result.token_info.symbol,
    supply: data.result.token_info.supply,
    cdn_url: data.result.content.links.image,
    decimals: data.result.token_info.decimals,
    price_info: data.result.token_info.price_info,
  } as TokenInfo
}

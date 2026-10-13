import { env } from '../config/env'
import { fetchWithTimeout } from '../services/fetchWithTimeout'

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

/** Wrapped SOL mint — used to fetch a live SOL→USD price via the token service. */
export const WRAPPED_SOL_MINT = 'So11111111111111111111111111111111111111112'

/**
 * Pure fetch — calls RPC and parses the response.
 * No caching, no singleton. Fully testable.
 */
export async function fetchTokenFromRpc(mint: string): Promise<TokenInfo> {
  const response = await fetchWithTimeout(env.rpcUrl || '', {
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
}

/** Raw `getAsset`/`getAssetBatch` result item — parsed defensively, entries can be null. */
interface RawAsset {
  id?: string
  token_info?: {
    symbol: string
    supply: number
    decimals: number
    price_info: TokenInfo['price_info']
  }
  content?: { links?: { image?: string } }
}

function parseAsset(asset: RawAsset | null, fallbackMint: string): TokenInfo | null {
  if (!asset?.token_info || !asset.content?.links?.image) return null
  return {
    mint: asset.id ?? fallbackMint,
    symbol: asset.token_info.symbol,
    supply: asset.token_info.supply,
    cdn_url: asset.content.links.image,
    decimals: asset.token_info.decimals,
    price_info: asset.token_info.price_info,
  }
}

/**
 * Batch fetch — one `getAssetBatch` POST for all mints. Entries that come
 * back null (unknown/unsupported mint) are omitted, mirroring the
 * error-isolated semantics of the per-mint path.
 */
export async function fetchTokensFromRpc(mints: string[]): Promise<Map<string, TokenInfo>> {
  if (mints.length === 0) return new Map()

  const response = await fetchWithTimeout(env.rpcUrl || '', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: '1',
      method: 'getAssetBatch',
      params: {
        ids: mints,
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

  const result = new Map<string, TokenInfo>()
  mints.forEach((mint, i) => {
    const info = parseAsset(data.result?.[i] ?? null, mint)
    if (info) result.set(mint, info)
  })
  return result
}

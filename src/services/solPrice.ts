import { WRAPPED_SOL_MINT, type TokenInfo } from '../tokens'
import { createDataServices } from './data'

/**
 * Fetch the current SOL→USD price via the wrapped-SOL mint token info.
 * Uses the shared CacheManager-backed token service (60s TTL), so repeated
 * calls are cheap. Returns null on any failure.
 */
export async function getCurrentSolUsdPrice(): Promise<number | null> {
  try {
    const { tokens } = createDataServices()
    const info: TokenInfo = await tokens.getPrice(WRAPPED_SOL_MINT)
    const price = info?.price_info?.price_per_token
    return typeof price === 'number' && Number.isFinite(price) ? price : null
  } catch (e) {
    console.error('solPrice: failed to fetch SOL price:', e)
    return null
  }
}

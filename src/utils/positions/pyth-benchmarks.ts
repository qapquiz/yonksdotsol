import { CacheManager } from '../cache/CacheManager'
import { getPythPriceKey } from '../cache/cacheKeys'
import { CACHE_TTL } from '../../config/cache'

const SOL_FEED_ID = 'ef0d6b0e69a93ef5dbfefe14c3a43147ea85f3d7706c74b38f8dbb8a8f492100'
const PYTH_BENCHMARKS_API = 'https://benchmarks.pyth.network'

interface PythBenchmarkResponse {
  parsed: {
    price: {
      price: number
      conf: number
      expo: number
      publish_time: number
    }
    id: string
  }[]
}

/**
 * Pure fetch — calls Pyth Benchmarks API for historical SOL price.
 * No caching, no singleton. Fully testable.
 */
export async function fetchHistoricalSOLPriceFromApi(timestamp: number): Promise<number | null> {
  const response = await fetch(`${PYTH_BENCHMARKS_API}/v1/updates/price/${timestamp}?ids=${SOL_FEED_ID}`)

  if (!response.ok) {
    console.error(`Pyth Benchmarks API error: ${response.status}`)
    return null
  }

  const data: PythBenchmarkResponse = await response.json()

  if (!data.parsed || data.parsed.length === 0) {
    console.warn(`No price data found for SOL at timestamp ${timestamp}`)
    return null
  }

  const priceData = data.parsed[0].price
  return priceData.price * 10 ** priceData.expo
}

/** Cached wrapper — checks cache, fetches on miss, caches non-null results */
export async function fetchHistoricalSOLPrice(timestamp: number): Promise<number | null> {
  const hourBucket = Math.floor(timestamp / 3600)
  const cacheKey = getPythPriceKey('SOL', String(hourBucket))

  const cacheManager = CacheManager.getInstance()
  const cachedPrice = cacheManager.get<number>(cacheKey)
  if (cachedPrice !== null) {
    return cachedPrice
  }

  const price = await fetchHistoricalSOLPriceFromApi(timestamp)

  if (price !== null) {
    cacheManager.set(cacheKey, price, CACHE_TTL.PYTH_PRICE)
  }

  return price
}

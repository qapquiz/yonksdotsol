import { CacheManager } from '../cache/CacheManager'
import { getOHLCVKey } from '../cache/cacheKeys'
import { CACHE_TTL } from '../../config/cache'

export interface MeteoraOHLCVCandle {
  timestamp: number
  timestamp_str: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface MeteoraOHLCVResponse {
  data: MeteoraOHLCVCandle[]
  start_time: number
  end_time: number
  timeframe: string
}

export async function fetchPoolPriceAtTimestamp(
  poolAddress: string,
  targetTimestamp: number,
  timeframe: '5m' | '30m' | '1h' | '2h' | '4h' | '12h' | '24h' = '5m',
): Promise<number | null> {
  const dateStr = new Date(targetTimestamp * 1000).toISOString().split('T')[0]
  const cacheKey = getOHLCVKey(poolAddress, dateStr)

  const cacheManager = CacheManager.getInstance()
  const cachedPrice = cacheManager.get<number>(cacheKey)
  if (cachedPrice !== null) {
    return cachedPrice
  }

  try {
    const response = await fetch(
      `https://dlmm.datapi.meteora.ag/pools/${poolAddress}/ohlcv` +
        `?timeframe=${timeframe}&start_time=${targetTimestamp - 3600}&end_time=${targetTimestamp + 3600}`,
    )

    if (!response.ok) {
      console.error(`Meteora OHLCV API error: ${response.status}`)
      return null
    }

    const data: MeteoraOHLCVResponse = await response.json()

    let closestCandle: MeteoraOHLCVCandle | null = null
    let minTimeDiff = Infinity

    for (const candle of data.data) {
      const timeDiff = Math.abs(candle.timestamp - targetTimestamp)
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff
        closestCandle = candle
      }
    }

    if (closestCandle && minTimeDiff <= 1800) {
      cacheManager.set(cacheKey, closestCandle.close, CACHE_TTL.OHLCV_PRICE)
      return closestCandle.close
    }

    return null
  } catch (error) {
    console.error('Error fetching OHLCV data:', error)
    return null
  }
}

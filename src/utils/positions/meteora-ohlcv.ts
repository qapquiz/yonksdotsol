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

const METEORA_OHLCV_BASE_URL = 'https://dlmm.datapi.meteora.ag/pools'

/** Max acceptable time difference (seconds) between target and closest candle */
const MAX_TIME_DIFF = 1800

/**
 * Pure fetch — calls Meteora OHLCV API and finds the closest candle.
 * No caching, no singleton. Fully testable.
 */
export async function fetchOHLCVPriceAtTimestamp(
  poolAddress: string,
  targetTimestamp: number,
  timeframe: '5m' | '30m' | '1h' | '2h' | '4h' | '12h' | '24h' = '5m',
): Promise<number | null> {
  const response = await fetch(
    `${METEORA_OHLCV_BASE_URL}/${poolAddress}/ohlcv` +
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

  if (closestCandle && minTimeDiff <= MAX_TIME_DIFF) {
    return closestCandle.close
  }

  return null
}

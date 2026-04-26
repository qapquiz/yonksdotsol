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

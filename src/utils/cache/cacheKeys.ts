const INITIAL_DEPOSITS_KEY = 'initial_deposits'
const OHLCV_KEY = 'ohlcv'

export function getInitialDepositsKey(positionAddress: string): string {
  return `${INITIAL_DEPOSITS_KEY}:${positionAddress}`
}

export function getOHLCVKey(poolAddress: string, dateStr: string): string {
  return `${OHLCV_KEY}:${poolAddress}:${dateStr}`
}

export function isInitialDepositsKey(key: string): boolean {
  return key.startsWith(INITIAL_DEPOSITS_KEY + ':')
}

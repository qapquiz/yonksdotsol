const INITIAL_DEPOSITS_KEY = 'initial_deposits'
const HELIUS_INITIAL_DEPOSITS_KEY = 'helius_initial_deposits'
const OHLCV_KEY = 'ohlcv'
const PYTH_KEY = 'pyth_price'

export function getInitialDepositsKey(positionAddress: string): string {
  return `${INITIAL_DEPOSITS_KEY}:${positionAddress}`
}

export function getInitialDepositsHeliusKey(positionAddress: string): string {
  return `${HELIUS_INITIAL_DEPOSITS_KEY}:${positionAddress}`
}

export function getOHLCVKey(poolAddress: string, dateStr: string): string {
  return `${OHLCV_KEY}:${poolAddress}:${dateStr}`
}

export function getPythPriceKey(tokenSymbol: string, dateStr: string): string {
  return `${PYTH_KEY}:${tokenSymbol}:${dateStr}`
}

export function isInitialDepositsKey(key: string): boolean {
  return key.startsWith(INITIAL_DEPOSITS_KEY + ':') || key.startsWith(HELIUS_INITIAL_DEPOSITS_KEY + ':')
}

const COMET_UPNL_KEY = 'comet_upnl'

export function getCometUpnlKey(walletAddress: string): string {
  return `${COMET_UPNL_KEY}:${walletAddress}`
}

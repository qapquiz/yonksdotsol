const UPNL_PER_POSITION_KEY = 'upnl_per_position'
const TOKEN_DATA_KEY = 'token_data'
const OHLCV_KEY = 'ohlcv'
const PYTH_KEY = 'pyth_price'

export function getUpnlPerPositionKey(walletAddress: string): string {
  return `${UPNL_PER_POSITION_KEY}:${walletAddress}`
}

export function getTokenDataKey(mint: string): string {
  return `${TOKEN_DATA_KEY}:${mint}`
}

export function getOHLCVKey(poolAddress: string, hourBucket: string): string {
  return `${OHLCV_KEY}:${poolAddress}:${hourBucket}`
}

export function getPythPriceKey(tokenSymbol: string, hourBucket: string): string {
  return `${PYTH_KEY}:${tokenSymbol}:${hourBucket}`
}

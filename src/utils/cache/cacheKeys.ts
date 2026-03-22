const UPNL_PER_POSITION_KEY = 'upnl_per_position'
const OHLCV_KEY = 'ohlcv'
const PYTH_KEY = 'pyth_price'

export function getUpnlPerPositionKey(walletAddress: string): string {
  return `${UPNL_PER_POSITION_KEY}:${walletAddress}`
}

export function getOHLCVKey(poolAddress: string, dateStr: string): string {
  return `${OHLCV_KEY}:${poolAddress}:${dateStr}`
}

export function getPythPriceKey(tokenSymbol: string, dateStr: string): string {
  return `${PYTH_KEY}:${tokenSymbol}:${dateStr}`
}

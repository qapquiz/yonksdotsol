export const CACHE_TTL = {
  /** On-chain positions map — the heaviest RPC (getProgramAccounts-class); explicit refresh invalidates */
  POSITIONS: 60 * 1000,
  UPNL_PER_POSITION: 15 * 60 * 1000,
  TOKEN_DATA: 60 * 1000, // 1 minute
  OHLCV: 60 * 1000, // 1 minute — display-only recent movement (ADR 0001)
}

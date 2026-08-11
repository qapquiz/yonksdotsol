export const CACHE_TTL = {
  UPNL_PER_POSITION: 15 * 60 * 1000,
  TOKEN_DATA: 60 * 1000, // 1 minute
  TOKEN_LOGO: 60 * 60 * 1000, // 1 hour — logos are stable; only icon+symbol are consumed
  OHLCV: 60 * 1000, // 1 minute — display-only recent movement (ADR 0001)
}

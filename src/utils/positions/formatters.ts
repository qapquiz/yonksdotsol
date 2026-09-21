export function formatUSD(value: number): string {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export type DisplayCurrency = 'SOL' | 'USD'

/** Convert a SOL-denominated amount to a USD string. Null/missing price → $0.00. */
export function formatUsdFromSol(solAmount: number, solUsdPrice: number | null): string {
  if (solUsdPrice == null || !Number.isFinite(solAmount) || !Number.isFinite(solUsdPrice)) {
    return '$0.00'
  }
  return formatUSD(solAmount * solUsdPrice)
}

export function formatTokenAmount(amount: string | bigint, decimals: number): string {
  let amountValue: bigint
  if (typeof amount === 'string') {
    amountValue = BigInt(amount)
  } else {
    amountValue = amount
  }
  const divisor = 10n ** BigInt(decimals)
  const whole = BigInt(amountValue) / divisor
  const remainder = BigInt(amountValue) % divisor
  const decimalStr = remainder.toString().padStart(decimals, '0').slice(0, 6)
  const trimmedDecimal = decimalStr.replace(/0+$/, '')
  return `${whole.toString()}.${trimmedDecimal || '0'}`
}

export function formatUPNLDisplaySol(upnl: number | undefined | null, percent: number | undefined | null): string {
  if (upnl == null || percent == null) return ''
  const sign = upnl >= 0 ? '+' : ''
  return `${sign}${Math.abs(upnl).toFixed(4)} SOL (${sign}${Number(percent).toFixed(2)}%)`
}

export function formatUPNLDisplay(upnl: number | undefined | null, percent: number | undefined | null): string {
  if (upnl == null || percent == null) return ''
  const sign = upnl >= 0 ? '+' : ''
  return `${sign}$${Math.abs(upnl).toFixed(2)} (${sign}${Number(percent).toFixed(2)}%)`
}

/**
 * Parse the Meteora API's `feePerTvl24h` into the internal ratio representation.
 *
 * The API returns a **percentage** string (e.g. "1.31" means 1.31% daily), not a
 * ratio. Internally we store a ratio (0.0131 = 1.31%) so that
 * `formatFeesTvl24h` can multiply by 100 for display. Dividing by 100 here
 * keeps the value consistent everywhere it is consumed.
 *
 * Returns null for missing, non-finite, or negative values.
 */
export function parseFeePerTvl24h(apiValue: string | null | undefined): number | null {
  if (!apiValue) return null
  const pct = parseFloat(apiValue)
  if (!Number.isFinite(pct) || pct < 0) return null
  return pct / 100
}

export function formatFeesTvl24h(feePerTvl: number | null): string {
  if (feePerTvl == null || !Number.isFinite(feePerTvl)) return '—'
  const pct = feePerTvl * 100
  if (pct >= 100) return `${pct.toFixed(0)}%`
  return `${pct.toFixed(2)}%`
}

/**
 * Format a data-freshness caption time: "2:47 PM" (device-local, 12-hour).
 * Absolute local time — unlike a relative label it needs no re-render tick,
 * so the stamp only repaints when new data actually lands.
 * Built manually (not Intl) so output is identical on Node and Hermes.
 */
export function formatUpdateTime(timestampMs: number): string {
  const d = new Date(timestampMs)
  const hours24 = d.getHours()
  const suffix = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours12}:${minutes} ${suffix}`
}

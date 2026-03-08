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

export function formatPriceRange(lower: number, upper: number): string {
  return `${lower} - ${upper}`
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

export function shortenPublicKey(key: string, chars = 8): string {
  return `${key.slice(0, chars)}...${key.slice(-chars)}`
}

export function formatFees(feeX: any, feeY: any): string {
  const fees = []
  if (feeX && feeX.toString() !== '0') fees.push(`X: ${feeX.toString()}`)
  if (feeY && feeY.toString() !== '0') fees.push(`Y: ${feeY.toString()}`)
  return fees.length > 0 ? fees.join(' | ') : 'None'
}

export function formatUPNLDisplaySol(upnl: number, percent: number): string {
  const sign = upnl >= 0 ? '+' : ''
  return `${sign}${Math.abs(upnl).toFixed(4)} SOL (${sign}${percent.toFixed(2)}%)`
}

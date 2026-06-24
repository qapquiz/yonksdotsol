import { describe, it, expect } from 'vitest'
import {
  formatUSD,
  formatUsdFromSol,
  formatTokenAmount,
  formatUPNLDisplaySol,
  formatUPNLDisplay,
  parseFeePerTvl24h,
  formatFeesTvl24h,
} from '../../utils/positions/formatters'

describe('formatUSD', () => {
  it('formats zero', () => {
    expect(formatUSD(0)).toBe('$0.00')
  })

  it('formats small values', () => {
    expect(formatUSD(2.5)).toBe('$2.50')
  })

  it('formats large values with comma grouping', () => {
    expect(formatUSD(15000)).toBe('$15,000.00')
  })

  it('formats with many decimal places', () => {
    expect(formatUSD(1.23456)).toBe('$1.23')
  })

  it('formats negative values', () => {
    expect(formatUSD(-100.5)).toBe('$-100.50')
  })
})

describe('formatUsdFromSol', () => {
  it('converts a SOL amount using the live price', () => {
    // 1.5 SOL * $100 = $150.00
    expect(formatUsdFromSol(1.5, 100)).toBe('$150.00')
  })

  it('formats with comma grouping for large USD values', () => {
    // 10 SOL * $145 = $1,450.00
    expect(formatUsdFromSol(10, 145)).toBe('$1,450.00')
  })

  it('returns $0.00 for a null price', () => {
    expect(formatUsdFromSol(1.5, null)).toBe('$0.00')
  })

  it('returns $0.00 for a non-finite SOL amount', () => {
    expect(formatUsdFromSol(Number.NaN, 100)).toBe('$0.00')
    expect(formatUsdFromSol(Number.POSITIVE_INFINITY, 100)).toBe('$0.00')
  })

  it('returns $0.00 for a non-finite price', () => {
    expect(formatUsdFromSol(1.5, Number.NaN)).toBe('$0.00')
  })

  it('returns $0.00 for zero SOL', () => {
    expect(formatUsdFromSol(0, 100)).toBe('$0.00')
  })
})

describe('formatTokenAmount', () => {
  it('formats whole number with 9 decimals', () => {
    expect(formatTokenAmount(1000000000n, 9)).toBe('1.0')
  })

  it('formats decimal number', () => {
    expect(formatTokenAmount(1500000000n, 9)).toBe('1.5')
  })

  it('handles string input', () => {
    expect(formatTokenAmount('1000000000', 9)).toBe('1.0')
  })

  it('trims trailing zeros', () => {
    expect(formatTokenAmount(1230000000n, 9)).toBe('1.23')
  })

  it('handles zero', () => {
    expect(formatTokenAmount(0n, 9)).toBe('0.0')
  })

  it('handles very small amounts', () => {
    expect(formatTokenAmount(1n, 9)).toBe('0.0')
  })

  it('handles 6 decimal tokens', () => {
    expect(formatTokenAmount(1000000n, 6)).toBe('1.0')
  })

  it('handles large amounts', () => {
    expect(formatTokenAmount(1000000000000000000n, 18)).toBe('1.0')
  })

  it('handles amount with many decimal places', () => {
    expect(formatTokenAmount(123456789n, 9)).toBe('0.123456')
  })

  it('handles fractional amounts', () => {
    expect(formatTokenAmount(555555555n, 9)).toBe('0.555555')
  })
})

describe('formatUPNLDisplaySol', () => {
  it('returns empty string for null upnl', () => {
    expect(formatUPNLDisplaySol(null, 5)).toBe('')
  })

  it('returns empty string for null percent', () => {
    expect(formatUPNLDisplaySol(10, null)).toBe('')
  })

  it('returns empty string for undefined upnl', () => {
    expect(formatUPNLDisplaySol(undefined, 5)).toBe('')
  })

  it('formats positive SOL values', () => {
    expect(formatUPNLDisplaySol(0.5, 10.5)).toBe('+0.5000 SOL (+10.50%)')
  })

  it('formats negative SOL values', () => {
    expect(formatUPNLDisplaySol(-0.5, -10.5)).toBe('0.5000 SOL (-10.50%)')
  })

  it('formats zero values', () => {
    expect(formatUPNLDisplaySol(0, 0)).toBe('+0.0000 SOL (+0.00%)')
  })
})

describe('formatUPNLDisplay', () => {
  it('returns empty string for undefined values', () => {
    expect(formatUPNLDisplay(undefined, undefined)).toBe('')
  })

  it('returns empty string for null upnl', () => {
    expect(formatUPNLDisplay(null, 5)).toBe('')
  })

  it('returns empty string for null percent', () => {
    expect(formatUPNLDisplay(10, null)).toBe('')
  })

  it('formats positive USD values', () => {
    expect(formatUPNLDisplay(100.5, 15.25)).toBe('+$100.50 (+15.25%)')
  })

  it('formats negative USD values', () => {
    expect(formatUPNLDisplay(-100.5, -15.25)).toBe('$100.50 (-15.25%)')
  })

  it('formats zero values', () => {
    expect(formatUPNLDisplay(0, 0)).toBe('+$0.00 (+0.00%)')
  })

  it('handles small decimal values', () => {
    expect(formatUPNLDisplay(0.01, 0.01)).toBe('+$0.01 (+0.01%)')
  })
})

describe('parseFeePerTvl24h', () => {
  it('converts an API percentage string to the internal ratio', () => {
    // API returns a percentage (1.31 = 1.31%); internally we store a ratio.
    expect(parseFeePerTvl24h('1.31')).toBeCloseTo(0.0131)
  })

  it('converts whole-number percentages', () => {
    expect(parseFeePerTvl24h('5')).toBeCloseTo(0.05)
  })

  it('handles zero', () => {
    expect(parseFeePerTvl24h('0')).toBe(0)
  })

  it('returns null for missing values', () => {
    expect(parseFeePerTvl24h(undefined)).toBeNull()
    expect(parseFeePerTvl24h(null)).toBeNull()
    expect(parseFeePerTvl24h('')).toBeNull()
  })

  it('returns null for non-finite or negative values', () => {
    expect(parseFeePerTvl24h('not-a-number')).toBeNull()
    expect(parseFeePerTvl24h('-1')).toBeNull()
  })
})

describe('formatFeesTvl24h', () => {
  it('renders a ratio as a percentage (end-to-end with parser)', () => {
    // API "1.31" (1.31%) -> ratio 0.0131 -> displayed "1.31%".
    expect(formatFeesTvl24h(parseFeePerTvl24h('1.31'))).toBe('1.31%')
  })

  it('renders small ratios with two decimals', () => {
    expect(formatFeesTvl24h(0.0042)).toBe('0.42%')
  })

  it('rounds large ratios to a whole percent', () => {
    expect(formatFeesTvl24h(1.5)).toBe('150%')
  })

  it('returns an em dash for null or non-finite input', () => {
    expect(formatFeesTvl24h(null)).toBe('—')
    expect(formatFeesTvl24h(Number.NaN)).toBe('—')
  })
})

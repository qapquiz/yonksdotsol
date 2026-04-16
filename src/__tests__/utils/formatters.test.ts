import { describe, it, expect } from 'vitest'
import {
  formatTokenAmount,
  formatPriceRange,
  formatTimestamp,
  shortenPublicKey,
  formatFees,
  formatUPNLDisplaySol,
  formatUPNLDisplay,
} from '../../utils/positions/formatters'

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

describe('formatPriceRange', () => {
  it('formats price range correctly', () => {
    expect(formatPriceRange(0.5, 2.0)).toBe('0.5 - 2')
  })

  it('handles integers', () => {
    expect(formatPriceRange(1, 100)).toBe('1 - 100')
  })

  it('handles zero', () => {
    expect(formatPriceRange(0, 10)).toBe('0 - 10')
  })
})

describe('formatTimestamp', () => {
  const now = Math.floor(Date.now() / 1000)

  it('returns "Just now" for recent timestamps', () => {
    expect(formatTimestamp(now)).toBe('Just now')
  })

  it('formats minutes ago', () => {
    const thirtyMinAgo = now - 30 * 60
    expect(formatTimestamp(thirtyMinAgo)).toBe('30m ago')
  })

  it('formats hours ago', () => {
    const fiveHoursAgo = now - 5 * 60 * 60
    expect(formatTimestamp(fiveHoursAgo)).toBe('5h ago')
  })

  it('formats days ago', () => {
    const twoDaysAgo = now - 2 * 24 * 60 * 60
    expect(formatTimestamp(twoDaysAgo)).toBe('2d ago')
  })

  it('handles 1 minute ago', () => {
    const oneMinAgo = now - 60
    expect(formatTimestamp(oneMinAgo)).toBe('1m ago')
  })

  it('handles 1 hour ago', () => {
    const oneHourAgo = now - 60 * 60
    expect(formatTimestamp(oneHourAgo)).toBe('1h ago')
  })
})

describe('shortenPublicKey', () => {
  const testKey = '11111111111111111111111111111111'

  it('shortens with default 8 chars', () => {
    expect(shortenPublicKey(testKey)).toBe('11111111...11111111')
  })

  it('shortens with custom chars', () => {
    expect(shortenPublicKey(testKey, 4)).toBe('1111...1111')
  })

  it('handles short strings', () => {
    expect(shortenPublicKey('abc', 2)).toBe('ab...bc')
  })

  it('handles single character', () => {
    expect(shortenPublicKey('a', 1)).toBe('a...a')
  })
})

describe('formatFees', () => {
  it('formats both fees when present', () => {
    expect(formatFees('100', '200')).toBe('X: 100 | Y: 200')
  })

  it('formats only X fee when Y is zero', () => {
    expect(formatFees('100', '0')).toBe('X: 100')
  })

  it('formats only Y fee when X is zero', () => {
    expect(formatFees('0', '200')).toBe('Y: 200')
  })

  it('returns None for zero fees', () => {
    expect(formatFees('0', '0')).toBe('None')
  })

  it('handles bigint inputs', () => {
    expect(formatFees(100n, 200n)).toBe('X: 100 | Y: 200')
  })

  it('handles empty strings as zero', () => {
    expect(formatFees('', '')).toBe('None')
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

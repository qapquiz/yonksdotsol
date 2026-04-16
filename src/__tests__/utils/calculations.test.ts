import { describe, it, expect } from 'vitest'
import type { TokenInfo } from '../../tokens'
import {
  calculatePositionTotalValue,
  calculateUnrealizedFeesValue,
  calculateClaimedFeesValue,
  calculateIsInRange,
  calculateCurrentPrice,
  generateLiquidityChartData,
  calculatePriceRange,
  calculateChartHeight,
  calculateActiveBinPosition,
  calculateInitialDepositValue,
  calculateUPNLValue,
  calculateUPNLPercentage,
  formatUPNLDisplay,
} from '../../utils/positions/calculations'

// Mock TokenInfo for tests
const mockTokenX: TokenInfo = {
  address: 'So11111111111111111111111111111111111111112',
  symbol: 'SOL',
  name: 'Solana',
  decimals: 9,
  price_info: {
    price_per_token: 1.5,
    total_price: 1.5,
  },
} as TokenInfo

const mockTokenY: TokenInfo = {
  address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  price_info: {
    price_per_token: 1.0,
    total_price: 1.0,
  },
} as TokenInfo

describe('calculatePositionTotalValue', () => {
  it('returns $0.00 when tokenXInfo is null', () => {
    expect(calculatePositionTotalValue(1000n, 2000n, null, mockTokenY)).toBe('$0.00')
  })

  it('returns $0.00 when tokenYInfo is null', () => {
    expect(calculatePositionTotalValue(1000n, 2000n, mockTokenX, null)).toBe('$0.00')
  })

  it('returns $0.00 when both tokens are null', () => {
    expect(calculatePositionTotalValue(1000n, 2000n, null, null)).toBe('$0.00')
  })

  it('calculates correct total value', () => {
    // 1 SOL ($1.5) + 1 USDC ($1.0) = $2.50
    const result = calculatePositionTotalValue(1000000000n, 1000000n, mockTokenX, mockTokenY)
    expect(result).toBe('$2.50')
  })

  it('handles large BigInt values', () => {
    // 1000 SOL ($1.5) + 0 USDC = $1500
    const result = calculatePositionTotalValue(1000000000000n, 0n, mockTokenX, mockTokenY)
    expect(result).toBe('$1,500.00')
  })

  it('handles zero amounts', () => {
    const result = calculatePositionTotalValue(0n, 0n, mockTokenX, mockTokenY)
    expect(result).toBe('$0.00')
  })

  it('formats with proper locale', () => {
    // 10000 SOL ($1.5) = $15000
    const result = calculatePositionTotalValue(10000000000000n, 0n, mockTokenX, mockTokenY)
    expect(result).toBe('$15,000.00')
  })
})

describe('calculateUnrealizedFeesValue', () => {
  it('returns $0.00 when tokenXInfo is null', () => {
    expect(calculateUnrealizedFeesValue(100n, 200n, null, mockTokenY)).toBe('$0.00')
  })

  it('returns $0.00 when tokenYInfo is null', () => {
    expect(calculateUnrealizedFeesValue(100n, 200n, mockTokenX, null)).toBe('$0.00')
  })

  it('calculates fees correctly', () => {
    // 0.5 SOL ($1.5) + 0.5 USDC ($1.0) = $0.75 + $0.50 = $1.25
    const result = calculateUnrealizedFeesValue(500000000n, 500000n, mockTokenX, mockTokenY)
    expect(result).toBe('$1.25')
  })

  it('handles zero fees', () => {
    const result = calculateUnrealizedFeesValue(0n, 0n, mockTokenX, mockTokenY)
    expect(result).toBe('$0.00')
  })
})

describe('calculateClaimedFeesValue', () => {
  it('returns $0.00 when tokenXInfo is null', () => {
    expect(calculateClaimedFeesValue(100n, 200n, null, mockTokenY)).toBe('$0.00')
  })

  it('returns $0.00 when tokenYInfo is null', () => {
    expect(calculateClaimedFeesValue(100n, 200n, mockTokenX, null)).toBe('$0.00')
  })

  it('calculates claimed fees', () => {
    // 1 SOL ($1.5) = $1.50
    const result = calculateClaimedFeesValue(1000000000n, 0n, mockTokenX, mockTokenY)
    expect(result).toBe('$1.50')
  })
})

describe('calculateIsInRange', () => {
  it('returns true when activeId is in range', () => {
    expect(calculateIsInRange(50, 40, 60)).toBe(true)
  })

  it('returns false when activeId is below range', () => {
    expect(calculateIsInRange(30, 40, 60)).toBe(false)
  })

  it('returns false when activeId is above range', () => {
    expect(calculateIsInRange(70, 40, 60)).toBe(false)
  })

  it('returns true at exact lower boundary', () => {
    expect(calculateIsInRange(40, 40, 60)).toBe(true)
  })

  it('returns true at exact upper boundary', () => {
    expect(calculateIsInRange(60, 40, 60)).toBe(true)
  })
})

describe('calculateCurrentPrice', () => {
  it('returns $0.00 when tokenXInfo is null', () => {
    expect(calculateCurrentPrice(null, mockTokenY)).toBe('$0.00')
  })

  it('returns $0.00 when tokenYInfo is null', () => {
    expect(calculateCurrentPrice(mockTokenX, null)).toBe('$0.00')
  })

  it('calculates price ratio', () => {
    // tokenX ($1.5) / tokenY ($1.0) = 1.5
    const result = calculateCurrentPrice(mockTokenX, mockTokenY)
    expect(result).toBe('$1.50')
  })

  it('handles equal prices', () => {
    const tokenA = { ...mockTokenX, price_info: { price_per_token: 1.0, total_price: 1.0 } } as TokenInfo
    const tokenB = { ...mockTokenY, price_info: { price_per_token: 1.0, total_price: 1.0 } } as TokenInfo
    const result = calculateCurrentPrice(tokenA, tokenB)
    expect(result).toBe('$1.00')
  })
})

describe('generateLiquidityChartData', () => {
  it('returns array of zeros for empty bins input', () => {
    const result = generateLiquidityChartData([], 10, 12, 9, 6)
    expect(result).toHaveLength(3)
    expect(result[0].binId).toBe(10)
    expect(result[0].positionXAmountInSOL).toBe(0)
    expect(result[0].positionYAmountInSOL).toBe(0)
  })

  it('generates correct bin data', () => {
    const mockBins = [
      { binId: 100n, positionXAmount: 1000000000n, positionYAmount: 1000000n, pricePerToken: 1.5 },
      { binId: 101n, positionXAmount: 2000000000n, positionYAmount: 2000000n, pricePerToken: 1.6 },
    ] as any[]

    const result = generateLiquidityChartData(mockBins, 100, 101, 9, 6)

    expect(result).toHaveLength(2)
    expect(result[0].binId).toBe(100)
    expect(result[1].binId).toBe(101)
    expect(result[0].positionXAmountInSOL).toBeCloseTo(1.5, 2)
    expect(result[0].positionYAmountInSOL).toBeCloseTo(1.0, 2)
  })

  it('fills missing bins with zero values', () => {
    const mockBins = [
      { binId: 100n, positionXAmount: 1000000000n, positionYAmount: 1000000n, pricePerToken: 1.5 },
    ] as any[]

    const result = generateLiquidityChartData(mockBins, 100, 102, 9, 6)

    expect(result).toHaveLength(3)
    expect(result[1].positionXAmountInSOL).toBe(0)
    expect(result[2].positionXAmountInSOL).toBe(0)
  })
})

describe('calculatePriceRange', () => {
  it('returns zeros for empty bins', () => {
    const result = calculatePriceRange([], [])
    expect(result).toEqual({
      minPrice: '0',
      maxPrice: '0',
      maxLiquidity: 0,
    })
  })

  it('calculates correct range', () => {
    const mockChartBins = [
      { binId: 100, positionXAmountInSOL: 1, positionYAmountInSOL: 1, price: 1.5 },
      { binId: 101, positionXAmountInSOL: 2, positionYAmountInSOL: 2, price: 1.6 },
    ]

    const mockPositionData = [
      { pricePerToken: 1.5 },
      { pricePerToken: 1.6 },
    ] as any[]

    const result = calculatePriceRange(mockChartBins, mockPositionData)

    expect(result.minPrice).toBe('1.50000')
    expect(result.maxPrice).toBe('1.60000')
    expect(result.maxLiquidity).toBe(4)
  })
})

describe('calculateChartHeight', () => {
  it('returns min height (24) for small bin counts', () => {
    expect(calculateChartHeight(10)).toBe(24)
    expect(calculateChartHeight(20)).toBe(24)
  })

  it('returns max height (40) for large bin counts', () => {
    expect(calculateChartHeight(100)).toBe(40)
    expect(calculateChartHeight(150)).toBe(40)
  })

  it('scales linearly for medium bin counts', () => {
    // 60 bins = 24 + ((60-20)/(100-20)) * (40-24) = 24 + 0.5 * 16 = 32
    expect(calculateChartHeight(60)).toBe(32)
  })
})

describe('calculateActiveBinPosition', () => {
  it('returns 50 for no match', () => {
    expect(calculateActiveBinPosition([], 100)).toBe(50)
  })

  it('calculates correct position at start', () => {
    const mockBins = [
      { binId: 100, positionXAmountInSOL: 1, positionYAmountInSOL: 1, price: 1 },
      { binId: 101, positionXAmountInSOL: 1, positionYAmountInSOL: 1, price: 1 },
      { binId: 102, positionXAmountInSOL: 1, positionYAmountInSOL: 1, price: 1 },
    ]

    expect(calculateActiveBinPosition(mockBins, 100)).toBe(0)
  })

  it('calculates correct position at end', () => {
    const mockBins = [
      { binId: 100, positionXAmountInSOL: 1, positionYAmountInSOL: 1, price: 1 },
      { binId: 101, positionXAmountInSOL: 1, positionYAmountInSOL: 1, price: 1 },
      { binId: 102, positionXAmountInSOL: 1, positionYAmountInSOL: 1, price: 1 },
    ]

    expect(calculateActiveBinPosition(mockBins, 102)).toBe(100)
  })

  it('calculates correct position in middle', () => {
    const mockBins = [
      { binId: 100, positionXAmountInSOL: 1, positionYAmountInSOL: 1, price: 1 },
      { binId: 101, positionXAmountInSOL: 1, positionYAmountInSOL: 1, price: 1 },
      { binId: 102, positionXAmountInSOL: 1, positionYAmountInSOL: 1, price: 1 },
    ]

    expect(calculateActiveBinPosition(mockBins, 101)).toBe(50)
  })
})

describe('calculateInitialDepositValue', () => {
  it('returns 0 with null tokens', () => {
    expect(calculateInitialDepositValue(1000n, 2000n, null, null)).toBe(0)
  })

  it('returns 0 with null tokenX', () => {
    expect(calculateInitialDepositValue(1000n, 2000n, null, mockTokenY)).toBe(0)
  })

  it('calculates deposit value correctly', () => {
    // 1 SOL ($1.5) + 1 USDC ($1.0) = $2.50
    const result = calculateInitialDepositValue(1000000000n, 1000000n, mockTokenX, mockTokenY)
    expect(result).toBe(2.5)
  })

  it('handles zero amounts', () => {
    const result = calculateInitialDepositValue(0n, 0n, mockTokenX, mockTokenY)
    expect(result).toBe(0)
  })
})

describe('calculateUPNLValue', () => {
  it('calculates positive PnL', () => {
    expect(calculateUPNLValue(150, 100)).toBe(50)
  })

  it('calculates negative PnL', () => {
    expect(calculateUPNLValue(80, 100)).toBe(-20)
  })

  it('handles zero values', () => {
    expect(calculateUPNLValue(0, 0)).toBe(0)
  })

  it('handles equal values', () => {
    expect(calculateUPNLValue(100, 100)).toBe(0)
  })
})

describe('calculateUPNLPercentage', () => {
  it('returns 0 for zero initial value', () => {
    expect(calculateUPNLPercentage(100, 0)).toBe(0)
  })

  it('calculates positive percentage', () => {
    expect(calculateUPNLPercentage(150, 100)).toBe(50)
  })

  it('calculates negative percentage', () => {
    expect(calculateUPNLPercentage(75, 100)).toBe(-25)
  })

  it('calculates 100% gain', () => {
    expect(calculateUPNLPercentage(200, 100)).toBe(100)
  })

  it('calculates -50% loss', () => {
    expect(calculateUPNLPercentage(50, 100)).toBe(-50)
  })
})

describe('formatUPNLDisplay (calculations)', () => {
  it('formats positive display', () => {
    expect(formatUPNLDisplay(10.5, 5.25)).toBe('+$10.50 (+5.25%)')
  })

  it('formats negative display', () => {
    expect(formatUPNLDisplay(-10.5, -5.25)).toBe('$10.50 (-5.25%)')
  })

  it('formats zero values', () => {
    expect(formatUPNLDisplay(0, 0)).toBe('+$0.00 (+0.00%)')
  })
})

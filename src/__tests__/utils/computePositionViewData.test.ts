import { describe, it, expect } from 'vitest'
import type { PositionPnLData } from 'metcomet'
import type { PositionBinData, PositionData } from '@meteora-ag/dlmm'
import { computePositionViewData } from '../../utils/positions/computePositionViewData'
import type { TokenInfo } from '../../tokens'

const mockTokenX: TokenInfo = {
  mint: 'So11111111111111111111111111111111111111112',
  symbol: 'SOL',
  supply: 1_000_000_000,
  decimals: 9,
  cdn_url: 'https://example.com/sol.png',
  price_info: {
    price_per_token: 150,
    currency: 'USD',
  },
}

const mockTokenY: TokenInfo = {
  mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  symbol: 'USDC',
  supply: 1_000_000_000,
  decimals: 6,
  cdn_url: 'https://example.com/usdc.png',
  price_info: {
    price_per_token: 1.0,
    currency: 'USD',
  },
}

function createMockPositionData(overrides: Partial<PositionData> = {}): PositionData {
  return {
    totalXAmount: '1000000000', // 1 SOL
    totalYAmount: '1000000', // 1 USDC
    positionBinData: [
      {
        binId: 50n,
        positionXAmount: 500000000n,
        positionYAmount: 500000n,
        pricePerToken: 150,
      } as unknown as PositionBinData,
      {
        binId: 51n,
        positionXAmount: 500000000n,
        positionYAmount: 500000n,
        pricePerToken: 151,
      } as unknown as PositionBinData,
    ],
    lastUpdatedAt: { toNumber: () => Date.now() } as any,
    upperBinId: 51,
    lowerBinId: 50,
    feeX: { toString: () => '100000000' } as any, // 0.1 SOL
    feeY: { toString: () => '100000' } as any, // 0.1 USDC
    rewardOne: {} as any,
    rewardTwo: {} as any,
    feeOwner: {} as any,
    totalClaimedFeeXAmount: { toString: () => '200000000' } as any, // 0.2 SOL
    totalClaimedFeeYAmount: { toString: () => '200000' } as any, // 0.2 USDC
    feeXExcludeTransferFee: {} as any,
    feeYExcludeTransferFee: {} as any,
    rewardOneExcludeTransferFee: {} as any,
    rewardTwoExcludeTransferFee: {} as any,
    totalXAmountExcludeTransferFee: {} as any,
    totalYAmountExcludeTransferFee: {} as any,
    owner: {} as any,
    ...overrides,
  } as PositionData
}

describe('computePositionViewData', () => {
  it('returns defaults when positionData is undefined', () => {
    const vm = computePositionViewData({
      positionData: undefined,
      activeId: 50,
      positionAddress: 'pos1',
      poolAddress: 'pool1',
      tokenXInfo: mockTokenX,
      tokenYInfo: mockTokenY,
      pnlData: null,
    })

    expect(vm.totalValue).toBe('$0.00')
    expect(vm.inRange).toBe(false)
    expect(vm.unrealizedFeesDisplay).toBe('-')
    expect(vm.claimedFeesDisplay).toBe('-')
    expect(vm.unrealizedFeesValue).toBe('$0.00')
    expect(vm.claimedFeesValue).toBe('$0.00')
    expect(vm.liquidityShape).toBeNull()
    expect(vm.pnlSol).toBeNull()
    expect(vm.pnlSolPctChange).toBeNull()
  })

  it('returns defaults when both tokens are null', () => {
    const vm = computePositionViewData({
      positionData: createMockPositionData(),
      activeId: 50,
      positionAddress: 'pos1',
      poolAddress: 'pool1',
      tokenXInfo: null,
      tokenYInfo: null,
      pnlData: null,
    })

    expect(vm.totalValue).toBe('$0.00')
    expect(vm.unrealizedFeesDisplay).toBe('-')
    expect(vm.claimedFeesDisplay).toBe('-')
  })

  it('computes total value from position amounts', () => {
    // 1 SOL ($150) + 1 USDC ($1) = $151.00
    const vm = computePositionViewData({
      positionData: createMockPositionData(),
      activeId: 50,
      positionAddress: 'pos1',
      poolAddress: 'pool1',
      tokenXInfo: mockTokenX,
      tokenYInfo: mockTokenY,
      pnlData: null,
    })

    expect(vm.totalValue).toBe('$151.00')
  })

  it('detects in-range position', () => {
    const vm = computePositionViewData({
      positionData: createMockPositionData({ lowerBinId: 40, upperBinId: 60 }),
      activeId: 50,
      positionAddress: 'pos1',
      poolAddress: 'pool1',
      tokenXInfo: mockTokenX,
      tokenYInfo: mockTokenY,
      pnlData: null,
    })

    expect(vm.inRange).toBe(true)
  })

  it('detects out-of-range position (below)', () => {
    const vm = computePositionViewData({
      positionData: createMockPositionData({ lowerBinId: 40, upperBinId: 60 }),
      activeId: 30,
      positionAddress: 'pos1',
      poolAddress: 'pool1',
      tokenXInfo: mockTokenX,
      tokenYInfo: mockTokenY,
      pnlData: null,
    })

    expect(vm.inRange).toBe(false)
  })

  it('detects out-of-range position (above)', () => {
    const vm = computePositionViewData({
      positionData: createMockPositionData({ lowerBinId: 40, upperBinId: 60 }),
      activeId: 70,
      positionAddress: 'pos1',
      poolAddress: 'pool1',
      tokenXInfo: mockTokenX,
      tokenYInfo: mockTokenY,
      pnlData: null,
    })

    expect(vm.inRange).toBe(false)
  })

  it('formats unrealized fees display with token symbols', () => {
    const vm = computePositionViewData({
      positionData: createMockPositionData(),
      activeId: 50,
      positionAddress: 'pos1',
      poolAddress: 'pool1',
      tokenXInfo: mockTokenX,
      tokenYInfo: mockTokenY,
      pnlData: null,
    })

    expect(vm.unrealizedFeesDisplay).toContain('SOL')
    expect(vm.unrealizedFeesDisplay).toContain('USDC')
  })

  it('formats claimed fees display with token symbols', () => {
    const vm = computePositionViewData({
      positionData: createMockPositionData(),
      activeId: 50,
      positionAddress: 'pos1',
      poolAddress: 'pool1',
      tokenXInfo: mockTokenX,
      tokenYInfo: mockTokenY,
      pnlData: null,
    })

    expect(vm.claimedFeesDisplay).toContain('SOL')
    expect(vm.claimedFeesDisplay).toContain('USDC')
  })

  it('computes unrealized fees value', () => {
    // 0.1 SOL ($150) + 0.1 USDC ($1) = $15.10
    const vm = computePositionViewData({
      positionData: createMockPositionData(),
      activeId: 50,
      positionAddress: 'pos1',
      poolAddress: 'pool1',
      tokenXInfo: mockTokenX,
      tokenYInfo: mockTokenY,
      pnlData: null,
    })

    expect(vm.unrealizedFeesValue).toBe('$15.10')
  })

  it('computes claimed fees value', () => {
    // 0.2 SOL ($150) + 0.2 USDC ($1) = $30.20
    const vm = computePositionViewData({
      positionData: createMockPositionData(),
      activeId: 50,
      positionAddress: 'pos1',
      poolAddress: 'pool1',
      tokenXInfo: mockTokenX,
      tokenYInfo: mockTokenY,
      pnlData: null,
    })

    expect(vm.claimedFeesValue).toBe('$30.20')
  })

  it('includes pnl data when provided', () => {
    const pnlData = {
      pnlSol: 0.5,
      pnlSolPctChange: 15.5,
    } as PositionPnLData

    const vm = computePositionViewData({
      positionData: createMockPositionData(),
      activeId: 50,
      positionAddress: 'pos1',
      poolAddress: 'pool1',
      tokenXInfo: mockTokenX,
      tokenYInfo: mockTokenY,
      pnlData,
    })

    expect(vm.pnlSol).toBe(0.5)
    expect(vm.pnlSolPctChange).toBe(15.5)
  })

  it('returns null pnl when pnlData is null', () => {
    const vm = computePositionViewData({
      positionData: createMockPositionData(),
      activeId: 50,
      positionAddress: 'pos1',
      poolAddress: 'pool1',
      tokenXInfo: mockTokenX,
      tokenYInfo: mockTokenY,
      pnlData: null,
    })

    expect(vm.pnlSol).toBeNull()
    expect(vm.pnlSolPctChange).toBeNull()
  })

  it('generates liquidity shape when all data is present', () => {
    const vm = computePositionViewData({
      positionData: createMockPositionData(),
      activeId: 50,
      positionAddress: 'pos1',
      poolAddress: 'pool1',
      tokenXInfo: mockTokenX,
      tokenYInfo: mockTokenY,
      pnlData: null,
    })

    expect(vm.liquidityShape).not.toBeNull()
    expect(vm.liquidityShape!.positionAddress).toBe('pos1')
    expect(vm.liquidityShape!.pairAddress).toBe('pool1')
    expect(vm.liquidityShape!.currentActiveId).toBe(50)
    expect(vm.liquidityShape!.binRange.minBinId).toBe(50)
    expect(vm.liquidityShape!.binRange.maxBinId).toBe(51)
  })

  it('returns null liquidity shape when tokens are missing', () => {
    const vm = computePositionViewData({
      positionData: createMockPositionData(),
      activeId: 50,
      positionAddress: 'pos1',
      poolAddress: 'pool1',
      tokenXInfo: null,
      tokenYInfo: null,
      pnlData: null,
    })

    expect(vm.liquidityShape).toBeNull()
  })

  it('computes current price from token prices', () => {
    const vm = computePositionViewData({
      positionData: createMockPositionData(),
      activeId: 50,
      positionAddress: 'pos1',
      poolAddress: 'pool1',
      tokenXInfo: mockTokenX,
      tokenYInfo: mockTokenY,
      pnlData: null,
    })

    // SOL ($150) / USDC ($1) = 150
    expect(vm.currentPrice).toBe('$150.00')
  })

  it('handles partial token data (only tokenX)', () => {
    const vm = computePositionViewData({
      positionData: createMockPositionData(),
      activeId: 50,
      positionAddress: 'pos1',
      poolAddress: 'pool1',
      tokenXInfo: mockTokenX,
      tokenYInfo: null,
      pnlData: null,
    })

    // With only one token, value calculations return $0.00
    expect(vm.totalValue).toBe('$0.00')
    expect(vm.unrealizedFeesDisplay).toBe('-')
    expect(vm.unrealizedFeesValue).toBe('$0.00')
    expect(vm.liquidityShape).toBeNull()
  })
})

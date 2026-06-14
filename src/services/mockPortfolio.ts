/**
 * Dev-only mock portfolio data.
 *
 * Renders realistic positions so the Positions UI (summary, cards, charts,
 * fees/TVL metric) can be exercised without a connected wallet or RPC.
 * Gated by `env.devMock` — never used in production builds unless the
 * EXPO_PUBLIC_DEV_MOCK flag is explicitly set.
 *
 * The UI layer (PositionCard, PortfolioSummary, LiquidityBarChart) only
 * consumes `vm`, `tokenXInfo`, `tokenYInfo` and the summary fields — never
 * the raw `PositionInfo` — so the on-chain `position` field is stubbed.
 */
import type { PositionInfo } from '@meteora-ag/dlmm'

import { env } from '../config/env'
import { WRAPPED_SOL_MINT } from '../tokens'
import type { PortfolioResult, ResolvedPosition } from './positionPipeline'
import type { ChartBinData, LiquidityShape, PositionViewModel } from '../utils/positions/computePositionViewData'
import type { TokenInfo } from '../tokens'

/** Stable fake address surfaced in the header while in dev mock mode */
export const MOCK_WALLET_ADDRESS = 'DeVMoCK1Wallet11111111111111111111111111111111'

// ─── Well-known token mint addresses ─────────────────────────────────

const MINT = {
  SOL: WRAPPED_SOL_MINT,
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbHedAuSjreC',
} as const

function token(mint: string, symbol: string, decimals: number, price: number): TokenInfo {
  return {
    mint,
    symbol,
    decimals,
    supply: 1_000_000_000,
    // Empty cdn_url → TokenIcons falls back to the symbol's first letter
    cdn_url: '',
    price_info: { price_per_token: price, currency: 'usd' },
  }
}

const TOKENS = {
  SOL: token(MINT.SOL, 'SOL', 9, 145.0),
  USDC: token(MINT.USDC, 'USDC', 6, 1.0),
  BONK: token(MINT.BONK, 'BONK', 5, 0.0000285),
  JUP: token(MINT.JUP, 'JUP', 6, 0.78),
}

// ─── Liquidity chart shape generator ─────────────────────────────────

/**
 * Build a bell-shaped liquidity distribution across `numBins` bins centered
 * on `activeBinId`. Left of active → token Y (rendered emerald), right →
 * token X (rendered zinc); the active bin itself is cyan.
 */
function buildLiquidityShape(
  pairAddress: string,
  positionAddress: string,
  activeBinId: number,
  numBins: number,
  basePrice: number,
): LiquidityShape {
  const offset = Math.floor(numBins / 2)
  const minBinId = activeBinId - offset
  const maxBinId = minBinId + numBins - 1

  const binDistribution: ChartBinData[] = []
  let tokenXTotal = 0
  let tokenYTotal = 0

  for (let i = 0; i < numBins; i++) {
    const binId = minBinId + i
    const dist = Math.abs(i - offset)
    // Bell curve — tallest at the center, tapering at the edges
    const weight = Math.exp(-(dist * dist) / (2 * 3 * 3)) * 50
    const price = basePrice * (1 + (i - offset) * 0.012)

    const x = i > offset ? weight : 0 // above active price → token X
    const y = i <= offset ? weight : 0 // at/below active price → token Y

    tokenXTotal += x
    tokenYTotal += y
    binDistribution.push({ binId, positionXAmountInSOL: x, positionYAmountInSOL: y, price })
  }

  return {
    positionAddress,
    pairAddress,
    binRange: { minBinId, maxBinId, totalBins: numBins },
    binDistribution,
    tokenTotals: { tokenX: tokenXTotal, tokenY: tokenYTotal },
    currentActiveId: activeBinId,
  }
}

// ─── Mock positions ──────────────────────────────────────────────────

interface MockPositionDef {
  id: string
  pairAddress: string
  tokenX: TokenInfo
  tokenY: TokenInfo
  vm: Omit<PositionViewModel, 'liquidityShape'> & { liquidityShape: null }
  activeBinId: number
  numBins: number
}

function vm(
  totalValue: string,
  inRange: boolean,
  currentPrice: string,
  unrealizedFeesDisplay: string,
  claimedFeesDisplay: string,
  unrealizedFeesValue: string,
  claimedFeesValue: string,
  pnlSol: number,
  pnlSolPctChange: number,
  feesTvl24h: number,
): Omit<PositionViewModel, 'liquidityShape'> & { liquidityShape: null } {
  return {
    totalValue,
    inRange,
    currentPrice,
    unrealizedFeesDisplay,
    claimedFeesDisplay,
    unrealizedFeesValue,
    claimedFeesValue,
    liquidityShape: null,
    pnlSol,
    pnlSolPctChange,
    feesTvl24h,
  }
}

const POSITION_DEFS: MockPositionDef[] = [
  {
    id: 'mock-sol-usdc-0',
    pairAddress: 'MocKSolUsdcPool11111111111111111111111111111',
    tokenX: TOKENS.SOL,
    tokenY: TOKENS.USDC,
    activeBinId: 8420,
    numBins: 17,
    vm: vm(
      '$8,420.50', // totalValue
      true, // inRange
      '$145.00', // currentPrice
      '0.42 SOL / 125.30 USDC', // unrealizedFeesDisplay
      '1.8 SOL / 980.0 USDC', // claimedFeesDisplay
      '$186.25', // unrealizedFeesValue
      '$1,241.00', // claimedFeesValue
      12.3456, // pnlSol
      18.42, // pnlSolPctChange
      0.0131, // feesTvl24h (1.31%)
    ),
  },
  {
    id: 'mock-bonk-sol-0',
    pairAddress: 'MocKBonkSolPool11111111111111111111111111111',
    tokenX: TOKENS.BONK,
    tokenY: TOKENS.SOL,
    // Active bin well above the position range → renders fully emerald / out of range
    activeBinId: 2530,
    numBins: 15,
    vm: vm(
      '$1,204.80',
      false,
      '$0.0000285',
      '1,250,000 BONK / 0.12 SOL',
      '8,400,000 BONK / 0.05 SOL',
      '$52.10',
      '$264.50',
      -3.2,
      -27.5,
      0.045, // 4.50%
    ),
  },
  {
    id: 'mock-jup-sol-0',
    pairAddress: 'MocKJupSolPool111111111111111111111111111111',
    tokenX: TOKENS.JUP,
    tokenY: TOKENS.SOL,
    activeBinId: 4110,
    numBins: 13,
    vm: vm(
      '$3,150.00',
      true,
      '$0.78',
      '420.0 JUP / 0.08 SOL',
      '2,100.0 JUP / 0.22 SOL',
      '$19.40',
      '$80.30',
      1.8,
      5.2,
      0.0082, // 0.82%
    ),
  },
]

function resolveMockPosition(def: MockPositionDef): ResolvedPosition {
  const liquidityShape = buildLiquidityShape(
    def.pairAddress,
    def.id,
    def.activeBinId,
    def.numBins,
    def.tokenX.price_info.price_per_token,
  )

  return {
    id: def.id,
    poolAddress: def.pairAddress,
    tokenXMint: def.tokenX.mint,
    tokenYMint: def.tokenY.mint,
    tokenXInfo: def.tokenX,
    tokenYInfo: def.tokenY,
    // Raw on-chain object is never read by the UI layer — stubbed for the mock.
    position: {} as PositionInfo,
    lbPositionIndex: 0,
    vm: { ...def.vm, liquidityShape },
  }
}

// ─── Portfolio assembly ──────────────────────────────────────────────

/** Build the full mock PortfolioResult. Pure & synchronous. */
export function createMockPortfolioResult(): PortfolioResult {
  if (!env.devMock) {
    // Defensive: should only be called when the dev flag is on
    return {
      positions: [],
      summary: null,
      hasPnLData: false,
      outOfRangeCount: 0,
      poolAddresses: [],
      positionCount: 0,
    }
  }

  const positions = POSITION_DEFS.map(resolveMockPosition)

  // Aggregate summary — kept internally consistent with the mock positions
  const totalPnlSol = positions.reduce((sum, p) => sum + (p.vm.pnlSol ?? 0), 0)
  const totalUsd = positions.reduce((sum, p) => sum + parseFloat(p.vm.totalValue.replace(/[$,]/g, '')), 0)
  const solPrice = TOKENS.SOL.price_info.price_per_token
  const totalValueSol = totalUsd / solPrice
  const totalInitialDepositSol = totalValueSol - totalPnlSol
  const totalUnclaimedFeesSol =
    positions.reduce((sum, p) => sum + parseFloat(p.vm.unrealizedFeesValue.replace(/[$,]/g, '')), 0) / solPrice

  // Value-weighted fees/TVL across positions
  let weightedFeeSum = 0
  let feeWeightSum = 0
  for (const p of positions) {
    const usd = parseFloat(p.vm.totalValue.replace(/[$,]/g, ''))
    const ratio = p.vm.feesTvl24h ?? 0
    weightedFeeSum += ratio * usd
    feeWeightSum += usd
  }
  const feesTvl24h = feeWeightSum > 0 ? weightedFeeSum / feeWeightSum : null

  return {
    positions,
    summary: {
      totalPnlSol,
      totalPnlPercent: 9.4,
      totalValueSol,
      totalInitialDepositSol,
      totalUnclaimedFeesSol,
      feesTvl24h,
      positionCount: positions.length,
    },
    hasPnLData: true,
    outOfRangeCount: positions.filter((p) => !p.vm.inRange).length,
    poolAddresses: positions.map((p) => p.poolAddress),
    positionCount: positions.length,
  }
}

import type { PositionInfo } from '@meteora-ag/dlmm'
import DLMM from '@meteora-ag/dlmm'
import type { PositionPnLData } from 'metcomet'
import { fetchPositionPnL } from 'metcomet'
import { PublicKey, Connection } from '@solana/web3.js'

import { getSharedConnection } from '../config/connection'
import { env } from '../config/env'
import { CACHE_TTL } from '../config/cache'
import { createDataServices, type DataServices } from './data'
import { CacheManager } from '../utils/cache/CacheManager'
import { computePositionViewData, type PositionViewModel } from '../utils/positions/computePositionViewData'
import { computePoolPnLSummary, findPositionPnL, type PoolPnLSummary } from '../utils/positions/pnlAggregation'
import type { TokenInfo } from '../tokens'

// ─── Re-exported types (for consumers) ────────────────────────────────

export type { PositionViewModel } from '../utils/positions/computePositionViewData'
export type { PoolPnLSummary } from '../utils/positions/pnlAggregation'

// ─── Public types ────────────────────────────────────────────────────

export interface ResolvedPosition {
  id: string
  poolAddress: string
  tokenXMint: string
  tokenYMint: string
  tokenXInfo: TokenInfo | null
  tokenYInfo: TokenInfo | null
  position: PositionInfo
  lbPositionIndex: number
  vm: PositionViewModel
}

export interface PortfolioSummaryData extends PoolPnLSummary {
  positionCount: number
}

export interface PortfolioResult {
  /** Fully resolved position view models (token data + PnL baked in) */
  positions: ResolvedPosition[]
  /** Aggregated portfolio summary (null if no PnL data available) */
  summary: PortfolioSummaryData | null
  /** Whether PnL data has been fetched and is available */
  hasPnLData: boolean
  /** Count of out-of-range positions */
  outOfRangeCount: number
  /** Pool addresses for PnL-aware components */
  poolAddresses: string[]
  /** Total position count */
  positionCount: number
}

/** Summary data returned by fetchPortfolioSummary — widget-friendly subset */
export interface PortfolioSummaryWidgetData {
  totalPnlSol: number
  totalPnlPercent: number
  totalValueSol: number
  totalInitialDepositSol: number
  totalUnclaimedFeesSol: number
  positionCount: number
  outOfRangeCount: number
}

// ─── Dependency injection ─────────────────────────────────────────────

export interface PipelineDeps {
  /** CacheManager instance — defaults to singleton; inject createFresh() for tests */
  cache?: CacheManager
  /** Solana Connection — defaults to getSharedConnection() */
  connection?: Connection
  /** Helius API key — defaults to env.heliusApiKey; omit to skip PnL fetching */
  heliusApiKey?: string
  /** DataServices factory override — defaults to createDataServices(cache) */
  dataServices?: DataServices
}

// ─── Cache key generators (internal) ─────────────────────────────────

function pnlCacheKey(poolAddress: string, walletAddress: string): string {
  return `pnl:${poolAddress}:${walletAddress}`
}

// ─── Pipeline implementation ─────────────────────────────────────────

export class PositionPipeline {
  private readonly cache: CacheManager
  private readonly connection: Connection
  private readonly heliusApiKey: string | undefined
  private readonly dataServices: DataServices

  constructor(deps?: PipelineDeps) {
    this.cache = deps?.cache ?? CacheManager.getInstance()
    this.connection = deps?.connection ?? getSharedConnection()
    this.heliusApiKey = deps?.heliusApiKey ?? env.heliusApiKey
    this.dataServices = deps?.dataServices ?? createDataServices(this.cache)
  }

  /**
   * Load all position data for a wallet.
   *
   * Best-effort PnL: if heliusApiKey is missing or PnL fetch fails,
   * positions still return with pnlSol/pnlSolPctChange = null and hasPnLData = false.
   */
  async loadPortfolio(walletAddress: string): Promise<PortfolioResult> {
    // Step 1: Fetch positions from DLMM
    const positionsMap = await DLMM.getAllLbPairPositionsByUser(this.connection, new PublicKey(walletAddress))
    const positionsEntries = Array.from(positionsMap.entries())
    const positionsArray = positionsEntries.map(([, pos]) => pos)
    const poolAddresses = positionsEntries.map(([addr]) => addr)

    // Early return: no positions
    if (positionsArray.length === 0) {
      return {
        positions: [],
        summary: null,
        hasPnLData: false,
        outOfRangeCount: 0,
        positionCount: 0,
        poolAddresses: [],
      }
    }

    // Step 2: Extract unique mints and fetch token prices
    const mintSet = new Set<string>()
    for (const position of positionsArray) {
      mintSet.add(position.tokenX.mint.address.toBase58())
      mintSet.add(position.tokenY.mint.address.toBase58())
    }
    const uniqueMints = Array.from(mintSet)

    // Token prices: best-effort — failures are tolerated (null TokenInfo)
    const tokenData = await this.dataServices.tokens.getPrices(uniqueMints)

    // Step 3: Fetch PnL data per pool (best-effort)
    const pnlResults = await this.fetchAllPnL(poolAddresses, walletAddress)

    // Step 4: Compute view models
    const resolvedPositions = this.resolvePositions(positionsEntries, tokenData, pnlResults, walletAddress)

    // Step 5: Aggregate summary
    const { summary, hasPnLData } = this.computeSummary(
      poolAddresses,
      pnlResults,
      walletAddress,
      resolvedPositions.length,
    )

    const outOfRangeCount = resolvedPositions.filter((p) => !p.vm.inRange).length

    return {
      positions: resolvedPositions,
      summary,
      hasPnLData,
      outOfRangeCount,
      positionCount: resolvedPositions.length,
      poolAddresses,
    }
  }

  /**
   * Convenience for the Android widget: returns only the summary fields,
   * no per-position view models. Returns null if wallet has no positions.
   */
  async fetchPortfolioSummary(walletAddress: string): Promise<PortfolioSummaryWidgetData | null> {
    const result = await this.loadPortfolio(walletAddress)

    if (result.positionCount === 0) {
      return null
    }

    return {
      totalPnlSol: result.summary?.totalPnlSol ?? 0,
      totalPnlPercent: result.summary?.totalPnlPercent ?? 0,
      totalValueSol: result.summary?.totalValueSol ?? 0,
      totalInitialDepositSol: result.summary?.totalInitialDepositSol ?? 0,
      totalUnclaimedFeesSol: result.summary?.totalUnclaimedFeesSol ?? 0,
      positionCount: result.positionCount,
      outOfRangeCount: result.outOfRangeCount,
    }
  }

  /**
   * Invalidate all cached data for a wallet.
   * Clears PnL entries from CacheManager matching the wallet suffix.
   */
  invalidateWallet(walletAddress: string): void {
    this.cache.invalidatePattern(`:${walletAddress}`)
  }

  // ─── Private helpers ───────────────────────────────────────────────

  /**
   * Fetch PnL data for all pools. Best-effort: failures are swallowed
   * per pool so one failing pool doesn't block others.
   */
  private async fetchAllPnL(
    poolAddresses: string[],
    walletAddress: string,
  ): Promise<Record<string, PositionPnLData[]>> {
    if (!this.heliusApiKey) {
      return {}
    }

    const results: Record<string, PositionPnLData[]> = {}

    await Promise.allSettled(
      poolAddresses.map(async (poolAddress) => {
        try {
          const positions = await this.cache.getOrFetch(
            pnlCacheKey(poolAddress, walletAddress),
            () =>
              fetchPositionPnL({ poolAddress, user: walletAddress, status: 'open' }).then((r) => r?.positions ?? []),
            CACHE_TTL.UPNL_PER_POSITION,
          )
          results[poolAddress] = positions
        } catch {
          // Best-effort: one pool failure doesn't block others
        }
      }),
    )

    return results
  }

  /**
   * Resolve raw position data into display-ready view models.
   */
  private resolvePositions(
    positionsEntries: [string, PositionInfo][],
    tokenData: Map<string, TokenInfo>,
    pnlResults: Record<string, PositionPnLData[]>,
    walletAddress: string,
  ): ResolvedPosition[] {
    const result: ResolvedPosition[] = []

    for (const [pairAddress, position] of positionsEntries) {
      for (let idx = 0; idx < position.lbPairPositionsData.length; idx++) {
        const lbPosition = position.lbPairPositionsData[idx]
        const positionData = lbPosition?.positionData
        const positionAddress = lbPosition?.publicKey.toBase58() || position.publicKey.toBase58()
        const activeId = Number(position.lbPair.activeId)

        const tokenXMint = position.tokenX.mint.address.toBase58()
        const tokenYMint = position.tokenY.mint.address.toBase58()
        const tokenXInfo = tokenData.get(tokenXMint) ?? null
        const tokenYInfo = tokenData.get(tokenYMint) ?? null

        // Get PnL data for this position
        const poolPositions = pnlResults[pairAddress]
        const pnlData = poolPositions ? findPositionPnL(poolPositions, positionAddress) : null

        const vm = computePositionViewData({
          positionData,
          activeId,
          positionAddress,
          poolAddress: pairAddress,
          tokenXInfo,
          tokenYInfo,
          pnlData,
        })

        result.push({
          id: `${position.publicKey.toString()}-${idx}`,
          poolAddress: pairAddress,
          tokenXMint,
          tokenYMint,
          tokenXInfo,
          tokenYInfo,
          position,
          lbPositionIndex: idx,
          vm,
        })
      }
    }

    return result
  }

  /**
   * Compute portfolio summary from PnL data.
   */
  private computeSummary(
    poolAddresses: string[],
    pnlResults: Record<string, PositionPnLData[]>,
    walletAddress: string,
    positionCount: number,
  ): { summary: PortfolioSummaryData | null; hasPnLData: boolean } {
    if (poolAddresses.length === 0) {
      return { summary: null, hasPnLData: false }
    }

    const allPositions = poolAddresses.flatMap((pool) => pnlResults[pool] ?? [])

    if (allPositions.length === 0) {
      return { summary: null, hasPnLData: false }
    }

    const aggregated = computePoolPnLSummary(allPositions)
    return {
      summary: {
        ...aggregated,
        positionCount,
      },
      hasPnLData: true,
    }
  }
}

// ─── Factory function ─────────────────────────────────────────────────

/** Create a PositionPipeline. Pass deps to inject test doubles. */
export function createPositionPipeline(deps?: PipelineDeps): PositionPipeline {
  return new PositionPipeline(deps)
}

import type { PortfolioResult } from '../services/positionPipeline'
import type { LiquidityShape } from '../utils/positions/computePositionViewData'

export interface PositionWidgetData {
  positionAddress: string
  pairAddress: string
  tokenXSymbol: string
  tokenYSymbol: string
  inRange: boolean
  value: string | null
  unrealizedFees: string | null
  pnlSol: number | null
  liquidityShape: LiquidityShape | null
}

export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address
}

/** Persist only display data; SDK objects contain BigInts and native public keys. */
export function toPositionWidgetData(portfolio: PortfolioResult): PositionWidgetData[] {
  return portfolio.positions
    .map((position) => {
      const { vm, tokenXInfo, tokenYInfo } = position
      const positionAddress =
        vm.liquidityShape?.positionAddress ??
        position.position.lbPairPositionsData[position.lbPositionIndex].publicKey.toBase58()
      const hasPrices = tokenXInfo !== null && tokenYInfo !== null
      return {
        positionAddress,
        pairAddress: position.poolAddress,
        tokenXSymbol: tokenXInfo?.symbol || shortAddress(position.tokenXMint),
        tokenYSymbol: tokenYInfo?.symbol || shortAddress(position.tokenYMint),
        inRange: vm.inRange,
        value: hasPrices ? vm.totalValue : null,
        unrealizedFees: hasPrices ? vm.unrealizedFeesValue : null,
        pnlSol: vm.pnlSol != null && Number.isFinite(vm.pnlSol) ? vm.pnlSol : null,
        liquidityShape: vm.liquidityShape,
      }
    })
    .sort((left, right) => left.positionAddress.localeCompare(right.positionAddress))
}

import type { PositionInfo } from '@meteora-ag/dlmm'
import { buildWidgetTree } from 'react-native-android-widget/src/api/build-widget-tree'
import type { WidgetTree } from 'react-native-android-widget/src/api/build-widget-tree'
import type { WidgetInfo, WidgetRepresentation } from 'react-native-android-widget'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { themeTokens } from '../../config/theme'
import type { PortfolioResult, ResolvedPosition } from '../../services/positionPipeline'
import { setStoredWalletAddress } from '../../stores/walletStore'
import type { LiquidityShape } from '../../utils/positions/computePositionViewData'
import { buildLiquidityGraph } from '../../widgets/liquidityGraph'
import { toPositionWidgetData } from '../../widgets/positionWidgetData'
import portfolioWidgetTaskHandler from '../../widgets/portfolioWidgetTaskHandler'

const native = vi.hoisted(() => ({
  storage: new Map<string, Map<string, string | number>>(),
  rendered: new Map<number, WidgetTree>(),
  history: [] as WidgetTree[],
  widgetIds: [10, 11],
  loadPortfolio: vi.fn<(...args: unknown[]) => Promise<PortfolioResult>>(),
  lookup: vi.fn(async () => {}),
}))

function info(widgetId: number): WidgetInfo {
  return {
    widgetName: 'PositionLiquidity',
    widgetId,
    width: 320,
    height: 340,
    screenInfo: { screenWidthDp: 400, screenHeightDp: 800, density: 1, densityDpi: 160 },
  }
}

vi.mock('react-native-mmkv', () => ({
  createMMKV: ({ id }: { id: string }) => {
    const store = (): Map<string, string | number> => {
      if (!native.storage.has(id)) native.storage.set(id, new Map())
      return native.storage.get(id)!
    }
    return {
      getString: (key: string) => store().get(key),
      getNumber: (key: string) => store().get(key),
      set: (key: string, value: string | number) => store().set(key, value),
      remove: (key: string) => store().delete(key),
    }
  },
}))
vi.mock('react-native-android-widget', async () => ({
  // Use the library's real primitives and tree conversion, replacing only native transport.
  ...(await vi.importActual('react-native-android-widget/src/widgets/FlexWidget')),
  ...(await vi.importActual('react-native-android-widget/src/widgets/TextWidget')),
  ...(await vi.importActual('react-native-android-widget/src/widgets/SvgWidget')),
  getWidgetInfo: async (widgetName: string) => (widgetName === 'PositionLiquidity' ? native.widgetIds.map(info) : []),
  requestWidgetUpdateById: async ({
    widgetId,
    renderWidget,
  }: {
    widgetId: number
    renderWidget: (info: WidgetInfo) => WidgetRepresentation | Promise<WidgetRepresentation>
  }) => {
    await native.lookup()
    const tree = await renderWidget(info(widgetId))
    const converted = buildWidgetTree('light' in tree ? tree.light : tree)
    native.rendered.set(widgetId, converted)
    native.history.push(converted)
  },
}))
vi.mock('../../config/env', () => ({ env: { devMock: false } }))
vi.mock('../../services/positionPipeline', () => ({
  createPositionPipeline: () => ({ loadPortfolio: native.loadPortfolio }),
}))

function shape(activeId = 2, count = 3): LiquidityShape {
  return {
    positionAddress: 'position-A',
    pairAddress: 'pool',
    binRange: { minBinId: 1, maxBinId: count, totalBins: count },
    currentActiveId: activeId,
    tokenTotals: { tokenX: 1, tokenY: 2 },
    binDistribution: Array.from({ length: count }, (_, index) => ({
      binId: index + 1,
      positionXAmountInSOL: index + 1,
      positionYAmountInSOL: index === 1 ? 2 : 0,
      price: 140 + index,
    })),
  }
}

function position(address: string): ResolvedPosition {
  const liquidityShape = { ...shape(), positionAddress: address }
  const token = {
    mint: 'mint',
    symbol: 'SOL',
    decimals: 9,
    supply: 0,
    cdn_url: '',
    price_info: { price_per_token: 145, currency: 'USD' },
  }
  return {
    id: `unstable-${address}`,
    poolAddress: 'pool',
    tokenXMint: 'SOL-mint',
    tokenYMint: 'USDC-mint',
    tokenXInfo: token,
    tokenYInfo: { ...token, symbol: 'USDC' },
    lbPositionIndex: 0,
    position: { lbPairPositionsData: [{ publicKey: { toBase58: () => address } }] } as unknown as PositionInfo,
    vm: {
      inRange: true,
      totalValue: '$1,250.00',
      currentPrice: '$145.00',
      unrealizedFeesDisplay: '',
      claimedFeesDisplay: '',
      unrealizedFeesValue: '$12.50',
      claimedFeesValue: '$0.00',
      pnlSol: 0.2,
      pnlSolPctChange: 2,
      feesTvl24h: null,
      liquidityShape,
    },
  }
}

function portfolio(addresses = ['position-A', 'position-B', 'position-C']): PortfolioResult {
  return {
    positions: addresses.map(position),
    summary: null,
    hasPnLData: true,
    outOfRangeCount: 0,
    poolAddresses: ['pool'],
    positionCount: addresses.length,
  }
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function flattened(tree: WidgetTree | undefined): WidgetTree[] {
  return tree ? [tree, ...(tree.children ?? []).flatMap(flattened)] : []
}

function visible(widgetId = 10): string {
  return flattened(native.rendered.get(widgetId))
    .map((node) => (node.props as { text?: string }).text ?? '')
    .join(' ')
}

function svg(widgetId = 10): string | undefined {
  return flattened(native.rendered.get(widgetId))
    .map((node) => (node.props as { svgString?: string }).svgString)
    .find(Boolean)
}

async function run(action?: string, widgetId = 10): Promise<void> {
  await portfolioWidgetTaskHandler({
    widgetInfo: info(widgetId),
    widgetAction: action ? 'WIDGET_CLICK' : 'WIDGET_UPDATE',
    clickAction: action,
    renderWidget: () => {},
  })
}

beforeEach(() => {
  native.storage.clear()
  native.rendered.clear()
  native.history.length = 0
  native.widgetIds = [10, 11]
  native.loadPortfolio.mockReset().mockResolvedValue(portfolio())
  native.lookup.mockReset().mockResolvedValue(undefined)
  setStoredWalletAddress('wallet-A')
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('position liquidity widget', () => {
  it('renders each position using native-compatible components and a real liquidity SVG', async () => {
    await run()
    expect(visible()).toContain('SOL / USDC')
    expect(visible()).toContain('position-A')
    expect(visible()).toContain('$1,250.00')
    expect(visible()).toContain('IN RANGE')
    expect(visible()).toContain('1 / 3')
    expect(svg()).toContain('<rect')
    expect(svg()).toContain(themeTokens.dark.primary)
    expect(visible(11)).toContain('position-A')
  })

  it('navigates independently per instance without fetching and wraps in both directions', async () => {
    await run()
    await run('NEXT_POSITION')
    expect(visible()).toContain('position-B')
    expect(visible(11)).toContain('position-A')
    await run('PREVIOUS_POSITION')
    await run('PREVIOUS_POSITION')
    expect(visible()).toContain('position-C')
    await run('NEXT_POSITION')
    expect(visible()).toContain('position-A')
    expect(native.loadPortfolio).toHaveBeenCalledTimes(1)
  })

  it('keeps the selected address across reordered data and falls back when it closes', async () => {
    await run()
    await run('NEXT_POSITION')
    native.loadPortfolio.mockResolvedValueOnce(portfolio(['position-C', 'position-B', 'position-A']))
    await run()
    expect(visible()).toContain('position-B')
    native.loadPortfolio.mockResolvedValueOnce(portfolio(['position-C', 'position-A']))
    await run()
    expect(visible()).toContain('position-A')
    expect(visible()).toContain('1 / 2')
  })

  it('keeps navigation made while a refresh is in progress', async () => {
    await run()
    const pending = deferred<PortfolioResult>()
    native.loadPortfolio.mockReturnValueOnce(pending.promise)
    const refresh = run('REFRESH')
    await vi.waitFor(() => expect(native.loadPortfolio).toHaveBeenCalledTimes(2))
    await run('NEXT_POSITION')
    expect(visible()).toContain('Updating…')
    pending.resolve(portfolio())
    await refresh
    expect(visible()).toContain('position-B')
  })

  it('does not reuse a previous wallet’s cached graph or late response', async () => {
    await run()
    const pending = deferred<PortfolioResult>()
    native.loadPortfolio.mockReturnValueOnce(pending.promise)
    const refresh = run('REFRESH')
    await vi.waitFor(() => expect(native.loadPortfolio).toHaveBeenCalledTimes(2))
    setStoredWalletAddress('wallet-B')
    native.loadPortfolio.mockResolvedValueOnce(portfolio(['position-D']))
    await run('REFRESH')
    pending.resolve(portfolio())
    await refresh
    expect(visible()).toContain('position-D')
    expect(visible()).not.toContain('position-A')
  })

  it('clears data on disconnect and does not restore it on reconnect', async () => {
    await run()
    await run('NEXT_POSITION')
    setStoredWalletAddress(undefined)
    await run()
    expect(visible()).toContain('Connect wallet')
    expect(svg()).toBeUndefined()
    setStoredWalletAddress('wallet-A')
    const pending = deferred<PortfolioResult>()
    native.loadPortfolio.mockReturnValueOnce(pending.promise)
    const refresh = run()
    await vi.waitFor(() => expect(visible()).toContain('Loading positions'))
    expect(svg()).toBeUndefined()
    pending.resolve(portfolio())
    await refresh
    expect(visible()).toContain('position-A')
  })

  it('replaces closed positions with the empty state, including on subsequent navigation', async () => {
    await run()
    native.loadPortfolio.mockResolvedValue(portfolio([]))
    await run()
    expect(visible()).toContain('No open positions')
    expect(svg()).toBeUndefined()
    await run('NEXT_POSITION')
    expect(visible()).not.toContain('position-A')
  })

  it('shows missing prices and liquidity as unavailable instead of inventing zero values', async () => {
    const data = portfolio(['position-A'])
    data.positions[0].tokenXInfo = null
    data.positions[0].vm.liquidityShape = null
    native.loadPortfolio.mockResolvedValueOnce(data)
    await run()
    expect(visible()).toContain('Liquidity data unavailable')
    expect(visible()).not.toContain('$1,250.00')
    expect(visible()).toContain('position-A')
  })

  it('retains the last graph and timestamp on a failed refresh and offers retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await run()
    native.loadPortfolio.mockRejectedValueOnce(new Error('offline'))
    await run('REFRESH')
    expect(visible()).toContain('Could not update. Tap Refresh to retry.')
    expect(visible()).toContain('position-A')
    expect(svg()).toContain('<rect')
  })

  it('returns to a retry state before a stalled fetch exhausts the headless deadline', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await run()
    vi.useFakeTimers()
    const pending = deferred<PortfolioResult>()
    native.loadPortfolio.mockReturnValueOnce(pending.promise)
    const refresh = run('REFRESH')
    await vi.advanceTimersByTimeAsync(20_000)
    await refresh
    expect(visible()).toContain('Could not update. Tap Refresh to retry.')
    expect(visible()).not.toContain('Updating…')
    pending.resolve(portfolio(['late-position']))
    await vi.advanceTimersByTimeAsync(0)
    expect(visible()).toContain('position-A')
  })

  it('does not fetch positions when this widget type is not installed', async () => {
    native.widgetIds = []
    await run()
    expect(native.loadPortfolio).not.toHaveBeenCalled()
  })

  it('forgets a deleted widget’s selection', async () => {
    await run()
    await run('NEXT_POSITION')
    await portfolioWidgetTaskHandler({ widgetInfo: info(10), widgetAction: 'WIDGET_DELETED', renderWidget: () => {} })
    await run()
    expect(visible()).toContain('position-A')
  })

  it('persists per-instance navigation across headless module reloads', async () => {
    await run()
    await run('NEXT_POSITION')
    vi.resetModules()
    const { default: handler } = await import('../../widgets/portfolioWidgetTaskHandler')
    await handler({
      widgetInfo: info(10),
      widgetAction: 'WIDGET_CLICK',
      clickAction: 'NEXT_POSITION',
      renderWidget: () => {},
    })
    expect(visible()).toContain('position-C')
    expect(native.loadPortfolio).toHaveBeenCalledTimes(1)
  })
})

describe('liquidity graph', () => {
  it('keeps a flat distribution flat when bin counts do not divide evenly into bars', () => {
    const flat = shape(250, 500)
    for (const bin of flat.binDistribution) {
      bin.positionXAmountInSOL = 10
      bin.positionYAmountInSOL = 0
    }
    const graph = buildLiquidityGraph(flat, 288, 80)!
    const heights = [...graph.svg.matchAll(/<rect [^>]*height="([^"]+)"/g)].map((match) => Number(match[1]))
    expect(heights).toHaveLength(48)
    expect(new Set(heights)).toEqual(new Set([68]))
  })

  it('groups large ranges while preserving a bounded bar count and finite coordinates', () => {
    const graph = buildLiquidityGraph(shape(123, 500), 288, 80)!
    expect(graph.svg.match(/<rect /g)).toHaveLength(48)
    expect(graph.svg).not.toMatch(/NaN|Infinity/)
    expect(graph.totalBins).toBe(500)
    expect(graph.minPrice).toBe('140.0')
    expect(graph.maxPrice).toBe('639.0')
  })

  it.each([0, 4])('places an out-of-range marker at the edge for active bin %s', (activeId) => {
    const graph = buildLiquidityGraph(shape(activeId), 288, 80)!
    expect(graph.svg).toContain(`stroke="${themeTokens.dark.secondary}" stroke-width="1.5"`)
    expect(graph.svg).not.toContain(`fill="${themeTokens.dark.primary}"`)
    expect(graph.svg).toContain(`x1="${activeId === 0 ? 6 : 282}" y1="1"`)
  })

  it('handles empty, single-bin, and zero-liquidity shapes without invalid SVG', () => {
    expect(buildLiquidityGraph(null, 288, 80)).toBeNull()
    const single = shape(1, 1)
    single.binDistribution[0].positionXAmountInSOL = 0
    const graph = buildLiquidityGraph(single, 288, 80)!
    expect(graph.svg).not.toMatch(/NaN|Infinity/)
    expect(graph.svg.match(/<rect /g)).toHaveLength(1)
    expect(graph.minPrice).toBe(graph.maxPrice)
  })

  it('maps positions to JSON-safe snapshots with stable on-chain addresses', () => {
    const data = portfolio(['position-B', 'position-A'])
    const snapshot = toPositionWidgetData(data)
    expect(snapshot.map((item) => item.positionAddress)).toEqual(['position-A', 'position-B'])
    expect(() => JSON.stringify(snapshot)).not.toThrow()
    expect(snapshot[0]).not.toHaveProperty('position')
  })
})

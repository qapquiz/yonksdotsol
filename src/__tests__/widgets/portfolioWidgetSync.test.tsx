// @vitest-environment happy-dom

import { isValidElement } from 'react'
import type { ReactNode } from 'react'

import { act, cleanup, renderHook } from '@testing-library/react'
import type { WidgetInfo, WidgetRepresentation, WidgetTaskHandlerProps } from 'react-native-android-widget'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useWidgetSync } from '../../hooks/useWidgetSync'
import { setStoredWalletAddress } from '../../stores/walletStore'
import portfolioWidgetTaskHandler from '../../widgets/portfolioWidgetTaskHandler'

const native = vi.hoisted(() => ({
  storage: new Map<string, Map<string, string | number>>(),
  listeners: new Map<string, Set<(key: string) => void>>(),
  rendered: new Map<number, WidgetRepresentation>(),
  history: [] as WidgetRepresentation[],
  tasks: new Map<string, () => Promise<unknown>>(),
  appStateListeners: new Set<(state: string) => void>(),
  widgetIds: [1, 2],
  lookup: vi.fn(async () => {}),
}))

const widgetInfo: WidgetInfo = {
  widgetName: 'PortfolioSummary',
  widgetId: 1,
  width: 320,
  height: 250,
  screenInfo: { screenWidthDp: 400, screenHeightDp: 800, density: 1, densityDpi: 160 },
}

vi.mock('react-native-mmkv', () => ({
  createMMKV: ({ id }: { id: string }) => {
    const store = (): Map<string, string | number> => {
      if (!native.storage.has(id)) native.storage.set(id, new Map())
      return native.storage.get(id)!
    }
    const notify = (key: string): void => native.listeners.get(id)?.forEach((listener) => listener(key))
    return {
      getString: (key: string) => store().get(key),
      getNumber: (key: string) => store().get(key),
      set: (key: string, value: string | number) => {
        store().set(key, value)
        notify(key)
      },
      remove: (key: string) => {
        store().delete(key)
        notify(key)
      },
      addOnValueChangedListener: (listener: (key: string) => void) => {
        if (!native.listeners.has(id)) native.listeners.set(id, new Set())
        native.listeners.get(id)!.add(listener)
        return { remove: () => native.listeners.get(id)!.delete(listener) }
      },
    }
  },
}))

function record(tree: WidgetRepresentation, id = 1): void {
  native.rendered.set(id, tree)
  native.history.push(tree)
}

vi.mock('react-native-android-widget', () => ({
  FlexWidget: 'FlexWidget',
  SvgWidget: 'SvgWidget',
  TextWidget: 'TextWidget',
  getWidgetInfo: async (widgetName: string) =>
    widgetName === 'PortfolioSummary' ? native.widgetIds.map((widgetId) => ({ ...widgetInfo, widgetId })) : [],
  requestWidgetUpdateById: async ({
    widgetId,
    renderWidget,
  }: {
    widgetId: number
    renderWidget: (info: WidgetInfo) => WidgetRepresentation | Promise<WidgetRepresentation>
  }) => {
    await native.lookup()
    const tree = await renderWidget({ ...widgetInfo, widgetId })
    record(tree, widgetId)
  },
  requestWidgetUpdate: async ({
    renderWidget,
  }: {
    renderWidget: (info: WidgetInfo) => WidgetRepresentation | Promise<WidgetRepresentation>
  }) => record(await renderWidget(widgetInfo)),
}))

vi.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: (_event: string, listener: (state: string) => void) => {
      native.appStateListeners.add(listener)
      return { remove: () => native.appStateListeners.delete(listener) }
    },
  },
}))
vi.mock('../../config/env', () => ({ env: { devMock: false } }))
vi.mock('expo-task-manager', () => ({
  defineTask: (name: string, task: () => Promise<unknown>) => native.tasks.set(name, task),
  isTaskRegisteredAsync: async () => true,
}))
vi.mock('expo-background-fetch', () => ({
  BackgroundFetchResult: { NoData: 1, NewData: 2, Failed: 3 },
  registerTaskAsync: vi.fn(),
  unregisterTaskAsync: vi.fn(),
}))
vi.mock('../../services/positionPipeline', () => ({ createPositionPipeline: vi.fn() }))
vi.mock('../../stores/settingsStore', () => ({ useSettingsStore: { getState: () => ({ alertsEnabled: false }) } }))
vi.mock('../../stores/alertStore', () => ({ getRangeState: vi.fn(), setRangeState: vi.fn() }))
vi.mock('../../utils/alerts/outOfRange', () => ({
  detectOutOfRangeAlerts: vi.fn(),
  sendOutOfRangeNotifications: vi.fn(),
}))

interface ElementProps {
  text?: string
  children?: ReactNode
}

function texts(node: ReactNode): string[] {
  if (Array.isArray(node)) return node.flatMap(texts)
  if (!isValidElement<ElementProps>(node)) return []
  if (typeof node.type === 'function') {
    return texts((node.type as (props: ElementProps) => ReactNode)(node.props))
  }
  return [node.props.text ?? '', ...texts(node.props.children)]
}

function visible(tree = native.rendered.get(1)): string {
  if (!tree) return ''
  return texts('light' in tree ? tree.light : tree).join(' ')
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (reason: unknown) => void } {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function response(positionCount: number): Response {
  return new Response(
    JSON.stringify({
      pools: [],
      total: { pnlSol: '2', pnlPctChange: '20', balancesSol: '12', unclaimedFeesSol: '0.1' },
      totalCount: positionCount,
      hasNext: false,
    }),
    { status: 200 },
  )
}

function runWidget(refresh = false): Promise<void> {
  const props: WidgetTaskHandlerProps = {
    widgetInfo,
    widgetAction: refresh ? 'WIDGET_CLICK' : 'WIDGET_UPDATE',
    clickAction: refresh ? 'REFRESH' : undefined,
    renderWidget: (tree) => record(tree),
  }
  return portfolioWidgetTaskHandler(props)
}

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  native.storage.clear()
  native.rendered.clear()
  native.history.length = 0
  native.widgetIds = [1, 2]
  native.lookup.mockReset().mockResolvedValue(undefined)
  fetchMock.mockReset().mockResolvedValue(response(3))
  vi.stubGlobal('fetch', fetchMock)
  setStoredWalletAddress('wallet-A')
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('portfolio widget wallet lifecycle', () => {
  it('keeps the current wallet numbers visible during a manual refresh', async () => {
    await runWidget()
    const pending = deferred<Response>()
    fetchMock.mockReturnValueOnce(pending.promise)
    const refresh = runWidget(true)
    await vi.waitFor(() => expect(visible()).toContain('Updating…'))
    expect(visible()).toContain('3 POSITIONS')
    pending.resolve(response(4))
    await refresh
    expect(visible()).toContain('4 POSITIONS')
  })

  it('does not restore closed positions when refreshing an empty portfolio', async () => {
    await runWidget()
    fetchMock.mockResolvedValueOnce(response(0))
    await runWidget()
    expect(visible()).toContain('0 POSITIONS')
    const pending = deferred<Response>()
    fetchMock.mockReturnValueOnce(pending.promise)
    const refresh = runWidget(true)
    await vi.waitFor(() => expect(visible()).toMatch(/Updating/))
    expect(visible()).not.toContain('3 POSITIONS')
    pending.resolve(response(0))
    await refresh
  })

  it('never uses another wallet’s summary for refresh feedback', async () => {
    await runWidget()
    setStoredWalletAddress('wallet-B')
    const pending = deferred<Response>()
    fetchMock.mockReturnValueOnce(pending.promise)
    const refresh = runWidget(true)
    await vi.waitFor(() => expect(visible()).toMatch(/Updating/))
    expect(visible()).not.toContain('3 POSITIONS')
    pending.resolve(response(5))
    await refresh
  })

  it('never flashes cached numbers on a disconnected refresh', async () => {
    await runWidget()
    setStoredWalletAddress(undefined)
    native.history.length = 0
    await runWidget(true)
    expect(native.history.some((tree) => visible(tree).includes('3 POSITIONS'))).toBe(false)
    expect(visible()).toContain('Connect wallet')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each(['success', 'failure'])('ignores a previous wallet’s late %s', async (outcome) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const old = deferred<Response>()
    fetchMock.mockReturnValueOnce(old.promise)
    const first = runWidget()
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    setStoredWalletAddress('wallet-B')
    fetchMock.mockResolvedValueOnce(response(5))
    await runWidget()
    if (outcome === 'success') old.resolve(response(3))
    else old.reject(new Error('old request failed'))
    await first
    expect(visible()).toContain('5 POSITIONS')
  })

  it('keeps the newer result when requests for the same wallet complete out of order', async () => {
    const old = deferred<Response>()
    fetchMock.mockReturnValueOnce(old.promise)
    const first = runWidget()
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    fetchMock.mockResolvedValueOnce(response(5))
    await runWidget()
    old.resolve(response(3))
    await first
    expect(visible()).toContain('5 POSITIONS')
  })

  it('rejects a request from before disconnect even when the same wallet reconnects', async () => {
    const old = deferred<Response>()
    fetchMock.mockReturnValueOnce(old.promise)
    const first = runWidget()
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    setStoredWalletAddress(undefined)
    setStoredWalletAddress('wallet-A')
    native.history.length = 0
    old.resolve(response(3))
    await first
    expect(native.history).toHaveLength(0)
  })

  it('redraws immediately on connect and disconnect while the app stays open', async () => {
    vi.useFakeTimers()
    setStoredWalletAddress(undefined)
    renderHook(() => useWidgetSync())
    await act(() => vi.advanceTimersByTimeAsync(3_000))
    await act(async () => {
      setStoredWalletAddress('wallet-A')
    })
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(visible()).toContain('3 POSITIONS')
    await act(async () => {
      setStoredWalletAddress(undefined)
    })
    expect(visible()).toContain('Connect wallet')
    expect(visible(native.rendered.get(2))).toContain('Connect wallet')

    // Reconnecting the same address must not resurrect its previous session's cache.
    const pending = deferred<Response>()
    fetchMock.mockReturnValueOnce(pending.promise)
    await act(async () => {
      setStoredWalletAddress('wallet-A')
    })
    expect(visible()).toContain('Updating portfolio')
    expect(visible()).not.toContain('3 POSITIONS')
    await act(async () => {
      pending.resolve(response(5))
    })
  })

  it('cancels a scheduled launch update when the hook unmounts', async () => {
    vi.useFakeTimers()
    const hook = renderHook(() => useWidgetSync())
    hook.unmount()
    setStoredWalletAddress('wallet-B')
    await vi.advanceTimersByTimeAsync(3_000)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('clears stale numbers when a background task runs without a wallet', async () => {
    await runWidget()
    setStoredWalletAddress(undefined)
    await native.tasks.get('widget-background-sync')!()
    expect(visible()).toContain('Connect wallet')
  })

  it('does not let a background response overwrite a newer manual refresh', async () => {
    const old = deferred<Response>()
    fetchMock.mockReturnValueOnce(old.promise)
    const background = native.tasks.get('widget-background-sync')!()
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    fetchMock.mockResolvedValueOnce(response(5))
    await runWidget(true)
    old.resolve(response(3))
    await background
    expect(visible()).toContain('5 POSITIONS')
    expect(visible(native.rendered.get(2))).toContain('5 POSITIONS')
  })

  it('checks the current wallet again after Android finishes locating the widget', async () => {
    await runWidget()
    const lookup = deferred<void>()
    native.lookup.mockClear().mockReturnValueOnce(lookup.promise)
    fetchMock.mockResolvedValueOnce(response(4))
    const first = runWidget()
    await vi.waitFor(() => expect(native.lookup).toHaveBeenCalledTimes(2))
    setStoredWalletAddress('wallet-B')
    fetchMock.mockResolvedValueOnce(response(5))
    await runWidget()
    native.history.length = 0
    lookup.resolve(undefined)
    await first
    expect(native.history).toHaveLength(0)
    expect(visible()).toContain('5 POSITIONS')
    expect(visible(native.rendered.get(2))).toContain('5 POSITIONS')
  })

  it('shares request ordering with a newly loaded headless module', async () => {
    const old = deferred<Response>()
    fetchMock.mockReturnValueOnce(old.promise)
    const first = runWidget()
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    vi.resetModules()
    const { default: headlessHandler } = await import('../../widgets/portfolioWidgetTaskHandler')
    fetchMock.mockResolvedValueOnce(response(5))
    await headlessHandler({ widgetInfo, widgetAction: 'WIDGET_UPDATE', renderWidget: (tree) => record(tree) })
    old.resolve(response(3))
    await first
    expect(visible()).toContain('5 POSITIONS')
  })

  it.each(['{bad json', '{"positionCount":99}'])(
    'discards an unowned or malformed persisted cache: %s',
    async (raw) => {
      native.storage.set('widget', new Map([['last_portfolio_summary', raw]]))
      const pending = deferred<Response>()
      fetchMock.mockReturnValueOnce(pending.promise)
      const refresh = runWidget(true)
      await vi.waitFor(() => expect(visible()).toContain('Updating portfolio'))
      expect(visible()).not.toContain('99 POSITIONS')
      pending.resolve(response(5))
      await refresh
      expect(visible()).toContain('5 POSITIONS')
    },
  )

  it('skips portfolio requests when there are no widget instances', async () => {
    native.widgetIds = []
    await runWidget()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(native.history).toHaveLength(0)
  })

  it('shows a current request failure on every widget', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockRejectedValueOnce(new Error('offline'))
    await runWidget()
    expect(visible()).toContain('Failed to load portfolio data')
    expect(visible(native.rendered.get(2))).toContain('Failed to load portfolio data')
  })
})

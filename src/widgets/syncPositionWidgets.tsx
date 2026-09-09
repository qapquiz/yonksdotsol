'use no memo'

import { getWidgetInfo } from 'react-native-android-widget'
import type { WidgetInfo, WidgetRepresentation } from 'react-native-android-widget'
import { createMMKV } from 'react-native-mmkv'

import { env } from '../config/env'
import type { PortfolioResult } from '../services/positionPipeline'
import type { StoredWalletSnapshot } from '../stores/walletStore'
import { getStoredWalletSnapshot } from '../stores/walletStore'
import PositionLiquidityWidget from './PositionLiquidityWidget'
import type { PositionWidgetData } from './positionWidgetData'
import { toPositionWidgetData } from './positionWidgetData'
import { renderWidgets } from './renderWidgets'
import type { WidgetSyncResult } from './syncPortfolioWidget'

export const POSITION_WIDGET_NAME = 'PositionLiquidity'
const SNAPSHOT_KEY = 'positions'
const REQUEST_KEY = 'request'
const LOADING_REQUEST_KEY = 'loading_request'
const FETCH_TIMEOUT_MS = 20_000 // Leave time to draw a retry state before the 30-second headless deadline.
const mmkv = createMMKV({ id: 'position-widget' })

interface PositionSnapshot {
  wallet: StoredWalletSnapshot
  positions: PositionWidgetData[]
  updatedAt: number
}

interface PositionSelection {
  wallet: StoredWalletSnapshot
  positionAddress: string
}

async function loadPortfolio(walletAddress: string): Promise<PortfolioResult> {
  let timeout: ReturnType<typeof globalThis.setTimeout> | undefined
  try {
    const deadline = new Promise<never>((_, reject) => {
      timeout = globalThis.setTimeout(() => reject(new Error('Position widget refresh timed out')), FETCH_TIMEOUT_MS)
    })
    const fetch = import('../services/positionPipeline').then(({ createPositionPipeline }) =>
      createPositionPipeline().loadPortfolio(walletAddress),
    )
    return await Promise.race([fetch, deadline])
  } finally {
    globalThis.clearTimeout(timeout)
  }
}

function isRefreshing(): boolean {
  const loadingRequest = mmkv.getNumber(LOADING_REQUEST_KEY)
  return loadingRequest != null && loadingRequest === mmkv.getNumber(REQUEST_KEY)
}

function sameWallet(left: StoredWalletSnapshot, right: StoredWalletSnapshot): boolean {
  return left.address === right.address && left.revision === right.revision
}

function readSnapshot(wallet: StoredWalletSnapshot): PositionSnapshot | null {
  try {
    const raw = mmkv.getString(SNAPSHOT_KEY)
    const snapshot = raw ? (JSON.parse(raw) as PositionSnapshot) : null
    if (
      wallet.address &&
      snapshot?.wallet &&
      sameWallet(wallet, snapshot.wallet) &&
      Array.isArray(snapshot.positions)
    ) {
      return snapshot
    }
  } catch {
    // A corrupt or obsolete snapshot must never become another wallet's data.
  }
  mmkv.remove(SNAPSHOT_KEY)
  return null
}

function selectionKey(widgetId: number): string {
  return `selection:${widgetId}`
}

function selectedIndex(widgetId: number, snapshot: PositionSnapshot): number {
  try {
    const raw = mmkv.getString(selectionKey(widgetId))
    const selection = raw ? (JSON.parse(raw) as PositionSelection) : null
    if (selection?.wallet && sameWallet(snapshot.wallet, selection.wallet)) {
      return Math.max(
        0,
        snapshot.positions.findIndex((position) => position.positionAddress === selection.positionAddress),
      )
    }
  } catch {
    // Default to the first position if the saved selection is invalid.
  }
  return 0
}

function buildPositionTree(
  info: WidgetInfo,
  wallet: StoredWalletSnapshot,
  refreshing = isRefreshing(),
  message?: string,
): WidgetRepresentation {
  // Read both snapshot and selection at draw time: a navigation tap can overlap a refresh.
  const snapshot = readSnapshot(wallet)
  const index = snapshot ? selectedIndex(info.widgetId, snapshot) : 0
  const position = snapshot?.positions[index] ?? null
  if (position) {
    mmkv.set(
      selectionKey(info.widgetId),
      JSON.stringify({ wallet, positionAddress: position.positionAddress } satisfies PositionSelection),
    )
  } else {
    mmkv.remove(selectionKey(info.widgetId))
  }
  const stateMessage = !wallet.address
    ? 'Connect wallet in Yonks to see your positions'
    : (message ?? (refreshing ? 'Loading positions…' : 'No open positions'))
  return (
    <PositionLiquidityWidget
      position={position}
      index={index}
      count={snapshot?.positions.length ?? 0}
      width={info.width}
      height={info.height}
      updatedAt={snapshot?.updatedAt ?? null}
      refreshing={refreshing}
      message={position ? message : stateMessage}
    />
  )
}

/** The SDK scan runs only when at least one position widget is installed. */
export async function syncPositionWidgets(showRefreshing = false): Promise<WidgetSyncResult> {
  if (env.devMock) return 'no-data'
  const wallet = getStoredWalletSnapshot()
  const request = (mmkv.getNumber(REQUEST_KEY) ?? 0) + 1
  mmkv.set(REQUEST_KEY, request)
  const isCurrent = (): boolean =>
    mmkv.getNumber(REQUEST_KEY) === request && sameWallet(wallet, getStoredWalletSnapshot())
  try {
    const snapshot = readSnapshot(wallet)
    const widgets = await getWidgetInfo(POSITION_WIDGET_NAME)
    if (!isCurrent() || widgets.length === 0) return 'no-data'
    if (!wallet.address) {
      await renderWidgets(widgets, (info) => buildPositionTree(info, wallet), isCurrent)
      return 'no-data'
    }
    mmkv.set(LOADING_REQUEST_KEY, request)
    if (showRefreshing || !snapshot) {
      await renderWidgets(widgets, (info) => buildPositionTree(info, wallet, true), isCurrent)
    }
    if (!isCurrent()) return 'no-data'
    try {
      const portfolio = await loadPortfolio(wallet.address)
      if (!isCurrent()) return 'no-data'
      const next: PositionSnapshot = { wallet, positions: toPositionWidgetData(portfolio), updatedAt: Date.now() }
      mmkv.set(SNAPSHOT_KEY, JSON.stringify(next))
      mmkv.remove(LOADING_REQUEST_KEY)
      await renderWidgets(widgets, (info) => buildPositionTree(info, wallet), isCurrent)
      return isCurrent() ? 'updated' : 'no-data'
    } catch (error) {
      if (!isCurrent()) return 'no-data'
      mmkv.remove(LOADING_REQUEST_KEY)
      console.error('Position widget: update failed:', error)
      await renderWidgets(
        widgets,
        (info) => buildPositionTree(info, wallet, false, 'Could not update. Tap Refresh to retry.'),
        isCurrent,
      )
      return 'failed'
    }
  } catch (error) {
    if (!isCurrent()) return 'no-data'
    mmkv.remove(LOADING_REQUEST_KEY)
    console.error('Position widget: render failed:', error)
    return 'failed'
  }
}

/** Navigation is local to one widget and does not invalidate a pending data refresh. */
export async function navigatePositionWidget(widgetId: number, direction: -1 | 1): Promise<void> {
  if (env.devMock) return
  const wallet = getStoredWalletSnapshot()
  const snapshot = readSnapshot(wallet)
  if (!snapshot?.positions.length) {
    await syncPositionWidgets(true)
    return
  }
  const index = (selectedIndex(widgetId, snapshot) + direction + snapshot.positions.length) % snapshot.positions.length
  mmkv.set(
    selectionKey(widgetId),
    JSON.stringify({ wallet, positionAddress: snapshot.positions[index].positionAddress } satisfies PositionSelection),
  )
  const widgets = (await getWidgetInfo(POSITION_WIDGET_NAME)).filter((info) => info.widgetId === widgetId)
  await renderWidgets(
    widgets,
    (info) => buildPositionTree(info, wallet),
    () => sameWallet(wallet, getStoredWalletSnapshot()),
  )
}

export function deletePositionWidget(widgetId: number): void {
  mmkv.remove(selectionKey(widgetId))
}

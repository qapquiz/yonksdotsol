import type { WidgetRepresentation } from 'react-native-android-widget'
import { getWidgetInfo } from 'react-native-android-widget'
import { createMMKV } from 'react-native-mmkv'

import { env } from '../config/env'
import type { StoredWalletSnapshot } from '../stores/walletStore'
import { getStoredWalletSnapshot } from '../stores/walletStore'
import { renderWidgets } from './renderWidgets'
import type { PortfolioSummary } from './updatePortfolioWidget'
import {
  buildErrorWidget,
  buildRefreshingWidget,
  buildWidgetTree,
  fetchPortfolioSummary,
} from './updatePortfolioWidget'

const WIDGET_NAME = 'PortfolioSummary'
const LAST_SUMMARY_KEY = 'last_portfolio_summary'
const REQUEST_ID_KEY = 'latest_request_id'
const mmkv = createMMKV({ id: 'widget' })

interface CachedSummary {
  wallet: StoredWalletSnapshot
  summary: PortfolioSummary
}

export type WidgetSyncResult = 'updated' | 'no-data' | 'failed'

function sameWallet(left: StoredWalletSnapshot, right: StoredWalletSnapshot): boolean {
  return left.address === right.address && left.revision === right.revision
}

function readSummary(wallet: StoredWalletSnapshot): PortfolioSummary | null {
  try {
    const raw = mmkv.getString(LAST_SUMMARY_KEY)
    const cached = raw ? (JSON.parse(raw) as CachedSummary) : null
    if (wallet.address && cached?.wallet && sameWallet(cached.wallet, wallet) && cached.summary?.positionCount > 0) {
      return cached.summary
    }
  } catch {
    // Discard malformed storage and legacy summaries without a wallet identity.
  }
  mmkv.remove(LAST_SUMMARY_KEY)
  return null
}

function saveSummary(wallet: StoredWalletSnapshot, summary: PortfolioSummary | null): void {
  try {
    if (!summary || summary.positionCount === 0) {
      mmkv.remove(LAST_SUMMARY_KEY)
    } else {
      mmkv.set(LAST_SUMMARY_KEY, JSON.stringify({ wallet, summary } satisfies CachedSummary))
    }
  } catch {
    // Refresh feedback can fall back to the minimal updating state.
  }
}

/**
 * Every entry point updates all instances, since they display the same wallet.
 * Persisted request ordering and wallet revisions also apply to headless runs.
 */
export async function syncPortfolioWidget(showRefreshing = false): Promise<WidgetSyncResult> {
  if (env.devMock) return 'no-data'

  const wallet = getStoredWalletSnapshot()
  const requestId = (mmkv.getNumber(REQUEST_ID_KEY) ?? 0) + 1
  mmkv.set(REQUEST_ID_KEY, requestId)
  const isCurrent = (): boolean =>
    mmkv.getNumber(REQUEST_ID_KEY) === requestId && sameWallet(getStoredWalletSnapshot(), wallet)

  try {
    const cached = readSummary(wallet)
    const widgets = await getWidgetInfo(WIDGET_NAME)
    if (!isCurrent() || widgets.length === 0) return 'no-data'

    const render = async (tree: WidgetRepresentation): Promise<void> => {
      await renderWidgets(widgets, () => tree, isCurrent)
    }

    if (!wallet.address) {
      await render(buildErrorWidget('Connect wallet in app to see portfolio data'))
      return 'no-data'
    }

    try {
      // A wallet change clears the previous numbers before starting the fetch.
      if (showRefreshing || !cached) await render(buildRefreshingWidget(cached))
      if (!isCurrent()) return 'no-data'

      const summary = await fetchPortfolioSummary(wallet.address)
      if (!isCurrent()) return 'no-data'
      saveSummary(wallet, summary)
      await render(buildWidgetTree(summary))
      return isCurrent() ? 'updated' : 'no-data'
    } catch (error) {
      if (!isCurrent()) return 'no-data'
      console.error('Widget: update failed:', error)
      await render(buildErrorWidget('Failed to load portfolio data'))
      return 'failed'
    }
  } catch (error) {
    if (!isCurrent()) return 'no-data'
    console.error('Widget: render failed:', error)
    return 'failed'
  }
}

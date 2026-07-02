'use no memo'

import type { WidgetTaskHandlerProps } from 'react-native-android-widget'
import { getStoredWalletAddress } from '../stores/walletStore'
import {
  buildErrorWidget,
  buildRefreshingWidget,
  buildWidgetTree,
  fetchPortfolioSummary,
} from './updatePortfolioWidget'

async function portfolioWidgetTaskHandler({ widgetAction, clickAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED') return

  const isRefreshClick = widgetAction === 'WIDGET_CLICK' && clickAction === 'REFRESH'

  // Optimistic feedback: the instant the refresh click reaches us, redraw
  // the last cached summary with the refresh icon turned sage and the footer
  // reading "Updating…". The fetch below then swaps in fresh data. This
  // confirms the tap registered without erasing the numbers on screen.
  if (isRefreshClick) {
    renderWidget(buildRefreshingWidget())
  }

  const walletAddress = getStoredWalletAddress()

  if (!walletAddress) {
    renderWidget(buildErrorWidget('Connect wallet in app to see portfolio data'))
    return
  }

  try {
    const summary = await fetchPortfolioSummary(walletAddress)
    renderWidget(buildWidgetTree(summary))
  } catch (e) {
    console.error('Widget: render failed:', e)
    renderWidget(buildErrorWidget('Failed to load portfolio data'))
  }
}

export default portfolioWidgetTaskHandler

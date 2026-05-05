'use no memo'

import type { WidgetTaskHandlerProps } from 'react-native-android-widget'
import { getStoredWalletAddress } from '../stores/walletStore'
import { buildErrorWidget, buildWidgetTree, fetchPortfolioSummary } from './updatePortfolioWidget'

async function portfolioWidgetTaskHandler({ widgetAction, clickAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED') return

  // Refresh click → fall through to re-fetch and render
  if (widgetAction === 'WIDGET_CLICK' && clickAction === 'REFRESH') {
    // fall through
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

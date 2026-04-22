import React from 'react'
import type { WidgetTaskHandlerProps } from 'react-native-android-widget'
import { PortfolioWidget } from './PortfolioWidget'
import { getCachedWidgetDataOrDefault } from './updatePortfolioWidget'

function getLastUpdated(): string {
  const now = new Date()
  const h = now.getHours().toString().padStart(2, '0')
  const m = now.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const data = getCachedWidgetDataOrDefault()
      const lastUpdated = getLastUpdated()

      props.renderWidget({
        light: (
          <PortfolioWidget
            mode="light"
            totalPnlSol={data.totalPnlSol}
            totalPnlPercent={data.totalPnlPercent}
            totalValueSol={data.totalValueSol}
            totalInitialDepositSol={data.totalInitialDepositSol}
            totalUnclaimedFeesSol={data.totalUnclaimedFeesSol}
            positionCount={data.positionCount}
            lastUpdated={lastUpdated}
          />
        ),
        dark: (
          <PortfolioWidget
            mode="dark"
            totalPnlSol={data.totalPnlSol}
            totalPnlPercent={data.totalPnlPercent}
            totalValueSol={data.totalValueSol}
            totalInitialDepositSol={data.totalInitialDepositSol}
            totalUnclaimedFeesSol={data.totalUnclaimedFeesSol}
            positionCount={data.positionCount}
            lastUpdated={lastUpdated}
          />
        ),
      })
      break
    }
    case 'WIDGET_DELETED':
      break
    case 'WIDGET_CLICK':
      // OPEN_APP is handled natively
      break
    default:
      break
  }
}

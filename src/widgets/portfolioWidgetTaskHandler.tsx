'use no memo'

import type { WidgetTaskHandlerProps } from 'react-native-android-widget'

import { syncPortfolioWidget } from './syncPortfolioWidget'
import {
  deletePositionWidget,
  navigatePositionWidget,
  POSITION_WIDGET_NAME,
  syncPositionWidgets,
} from './syncPositionWidgets'

async function portfolioWidgetTaskHandler({
  widgetAction,
  clickAction,
  widgetInfo,
}: WidgetTaskHandlerProps): Promise<void> {
  if (widgetInfo.widgetName === POSITION_WIDGET_NAME) {
    if (widgetAction === 'WIDGET_DELETED') {
      deletePositionWidget(widgetInfo.widgetId)
    } else if (
      widgetAction === 'WIDGET_CLICK' &&
      (clickAction === 'NEXT_POSITION' || clickAction === 'PREVIOUS_POSITION')
    ) {
      await navigatePositionWidget(widgetInfo.widgetId, clickAction === 'NEXT_POSITION' ? 1 : -1)
    } else {
      await syncPositionWidgets(widgetAction === 'WIDGET_CLICK' && clickAction === 'REFRESH')
    }
    return
  }
  if (widgetInfo.widgetName !== 'PortfolioSummary') return
  if (widgetAction === 'WIDGET_DELETED') return

  await syncPortfolioWidget(widgetAction === 'WIDGET_CLICK' && clickAction === 'REFRESH')
}

export default portfolioWidgetTaskHandler

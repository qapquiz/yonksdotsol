import type { WidgetInfo, WidgetRepresentation } from 'react-native-android-widget'
import { requestWidgetUpdateById } from 'react-native-android-widget'

const SUPERSEDED = new Error('Widget update superseded')

/** Check ownership after the native lookup, at the last synchronous draw boundary. */
export async function renderWidgets(
  widgets: WidgetInfo[],
  buildWidget: (info: WidgetInfo) => WidgetRepresentation,
  isCurrent: () => boolean,
): Promise<void> {
  if (!isCurrent()) return
  await Promise.all(
    widgets.map(({ widgetName, widgetId }) =>
      requestWidgetUpdateById({
        widgetName,
        widgetId,
        renderWidget: (info) => {
          if (!isCurrent()) throw SUPERSEDED
          return buildWidget(info)
        },
      }).catch((error: unknown) => {
        if (error !== SUPERSEDED) throw error
      }),
    ),
  )
}

/**
 * Registers the Android widget task handler.
 *
 * Consumers (index.js) import from this module so Metro can swap in the
 * web no-op (`registerWidgetTask.web.ts`) on the web platform.
 */
import { registerWidgetTaskHandler } from 'react-native-android-widget'

import portfolioWidgetTaskHandler from './portfolioWidgetTaskHandler'

export function registerWidgetTask(): void {
  registerWidgetTaskHandler(portfolioWidgetTaskHandler)
}

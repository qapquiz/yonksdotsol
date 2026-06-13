import { BackgroundFetchResult, registerTaskAsync, unregisterTaskAsync } from 'expo-background-fetch'
import { defineTask, isTaskRegisteredAsync } from 'expo-task-manager'
import { requestWidgetUpdate } from 'react-native-android-widget'
import { createPositionPipeline } from '../services/positionPipeline'
import { getRangeState, setRangeState } from '../stores/alertStore'
import { useSettingsStore } from '../stores/settingsStore'
import { getStoredWalletAddress } from '../stores/walletStore'
import {
  detectOutOfRangeAlerts,
  sendOutOfRangeNotifications,
  type PositionRangeSnapshot,
} from '../utils/alerts/outOfRange'
import { buildErrorWidget, buildWidgetTree, fetchPortfolioSummary } from '../widgets/updatePortfolioWidget'

const TASK_NAME = 'widget-background-sync'
const WIDGET_NAME = 'PortfolioSummary'

defineTask(TASK_NAME, async () => {
  const walletAddress = getStoredWalletAddress()
  if (!walletAddress) return BackgroundFetchResult.NoData

  try {
    const summary = await fetchPortfolioSummary(walletAddress)
    const widgetTree = buildWidgetTree(summary)

    await requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: async () => widgetTree,
    })

    // Best-effort out-of-range alerts — never break the task on a notification error
    try {
      if (useSettingsStore.getState().alertsEnabled) {
        const pipeline = createPositionPipeline()
        const portfolio = await pipeline.loadPortfolio(walletAddress)
        const current: PositionRangeSnapshot[] = portfolio.positions.map((p) => ({
          id: p.id,
          inRange: p.vm.inRange,
        }))
        const previous = getRangeState(walletAddress)
        const { alerts, nextState } = detectOutOfRangeAlerts(current, previous)
        setRangeState(walletAddress, nextState)
        await sendOutOfRangeNotifications(alerts)
      }
    } catch (e) {
      console.error('widgetBackgroundSync: alert check failed:', e)
    }
    return BackgroundFetchResult.NewData
  } catch (e) {
    console.error('widgetBackgroundSync: update failed:', e)
    try {
      await requestWidgetUpdate({
        widgetName: WIDGET_NAME,
        renderWidget: async () => buildErrorWidget('Failed to load portfolio data'),
      })
    } catch {
      // Widget may not be on home screen
    }
    return BackgroundFetchResult.Failed
  }
})

export async function registerWidgetBackgroundSync() {
  const isRegistered = await isTaskRegisteredAsync(TASK_NAME)
  if (isRegistered) return

  await registerTaskAsync(TASK_NAME, {
    minimumInterval: 1800, // 30 minutes in seconds
    stopOnTerminate: false,
    startOnBoot: true,
  })
}

export async function unregisterWidgetBackgroundSync() {
  const isRegistered = await isTaskRegisteredAsync(TASK_NAME)
  if (!isRegistered) return

  await unregisterTaskAsync(TASK_NAME)
}

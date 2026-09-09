import { BackgroundFetchResult, registerTaskAsync, unregisterTaskAsync } from 'expo-background-fetch'
import { defineTask, isTaskRegisteredAsync } from 'expo-task-manager'

import { env } from '../config/env'
import { createPositionPipeline } from '../services/positionPipeline'
import { getRangeState, setRangeState } from '../stores/alertStore'
import { useSettingsStore } from '../stores/settingsStore'
import { getStoredWalletSnapshot } from '../stores/walletStore'
import {
  detectOutOfRangeAlerts,
  sendOutOfRangeNotifications,
  type PositionRangeSnapshot,
} from '../utils/alerts/outOfRange'
import { syncWidgets } from '../widgets/syncWidgets'

const TASK_NAME = 'widget-background-sync'

defineTask(TASK_NAME, async () => {
  if (env.devMock) return BackgroundFetchResult.NoData
  const wallet = getStoredWalletSnapshot()
  const walletIsCurrent = (): boolean => {
    const current = getStoredWalletSnapshot()
    return wallet.address === current.address && wallet.revision === current.revision
  }

  try {
    const result = await syncWidgets()
    if (!wallet.address || !walletIsCurrent()) return BackgroundFetchResult.NoData
    if (result === 'failed') return BackgroundFetchResult.Failed

    // Best-effort out-of-range alerts — never break the task on a notification error
    try {
      if (useSettingsStore.getState().alertsEnabled) {
        const pipeline = createPositionPipeline()
        const portfolio = await pipeline.loadPortfolio(wallet.address)
        if (!walletIsCurrent()) return BackgroundFetchResult.NoData
        const current: PositionRangeSnapshot[] = portfolio.positions.map((p) => ({
          id: p.id,
          inRange: p.vm.inRange,
        }))
        const previous = getRangeState(wallet.address)
        const { alerts, nextState } = detectOutOfRangeAlerts(current, previous)
        setRangeState(wallet.address, nextState)
        await sendOutOfRangeNotifications(alerts)
      }
    } catch (e) {
      console.error('widgetBackgroundSync: alert check failed:', e)
    }
    return result === 'updated' ? BackgroundFetchResult.NewData : BackgroundFetchResult.NoData
  } catch (e) {
    console.error('widgetBackgroundSync: update failed:', e)
    return BackgroundFetchResult.Failed
  }
})

export async function registerWidgetBackgroundSync(): Promise<void> {
  const isRegistered = await isTaskRegisteredAsync(TASK_NAME)
  if (isRegistered) return

  await registerTaskAsync(TASK_NAME, {
    minimumInterval: 1800, // 30 minutes in seconds
    stopOnTerminate: false,
    startOnBoot: true,
  })
}

export async function unregisterWidgetBackgroundSync(): Promise<void> {
  const isRegistered = await isTaskRegisteredAsync(TASK_NAME)
  if (!isRegistered) return

  await unregisterTaskAsync(TASK_NAME)
}

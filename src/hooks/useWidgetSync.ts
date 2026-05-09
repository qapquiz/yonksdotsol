import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { requestWidgetUpdate } from 'react-native-android-widget'
import { getStoredWalletAddress } from '../stores/walletStore'
import { registerWidgetBackgroundSync } from '../tasks/widgetBackgroundSync'
import { buildErrorWidget, buildWidgetTree, fetchPortfolioSummary } from '../widgets/updatePortfolioWidget'

const WIDGET_NAME = 'PortfolioSummary'
const FOREGROUND_DEBOUNCE_MS = 3_000
const PERIODIC_INTERVAL_MS = 30 * 60 * 1000 // 30 minutes

/**
 * Keeps the home-screen widget in sync:
 *
 * 1. When the app returns to the foreground, re-fetches portfolio data and
 *    pushes a fresh widget update.
 * 2. While the app stays in the foreground, refreshes the widget every
 *    30 minutes (Android's updatePeriodMillis is unreliable due to Doze / OEM
 *    battery optimisations).
 */
export function useWidgetSync() {
  const appStateRef = useRef(AppState.currentState)
  const lastUpdateRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof globalThis.setInterval> | null>(null)

  async function updateWidget() {
    const walletAddress = getStoredWalletAddress()
    if (!walletAddress) return

    const now = Date.now()
    // Prevent rapid double-updates
    if (now - lastUpdateRef.current < 10_000) return
    lastUpdateRef.current = now

    try {
      const summary = await fetchPortfolioSummary(walletAddress)
      const widgetTree = buildWidgetTree(summary)

      await requestWidgetUpdate({
        widgetName: WIDGET_NAME,
        renderWidget: async () => widgetTree,
      })
    } catch (e) {
      console.error('useWidgetSync: update failed:', e)
      try {
        await requestWidgetUpdate({
          widgetName: WIDGET_NAME,
          renderWidget: async () => buildErrorWidget('Failed to load portfolio data'),
        })
      } catch {
        // Widget may not exist on home screen — ignore
      }
    }
  }

  function startPeriodicTimer() {
    stopPeriodicTimer()
    intervalRef.current = globalThis.setInterval(() => {
      if (AppState.currentState === 'active') {
        updateWidget()
      }
    }, PERIODIC_INTERVAL_MS)
  }

  function stopPeriodicTimer() {
    if (intervalRef.current !== null) {
      globalThis.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const cameToForeground = appStateRef.current.match(/background|inactive/) && nextState === 'active'
      appStateRef.current = nextState

      if (cameToForeground) {
        // Debounce to let the app's own data fetches start first
        globalThis.setTimeout(() => {
          updateWidget()
        }, FOREGROUND_DEBOUNCE_MS)

        startPeriodicTimer()
      } else if (nextState === 'background') {
        stopPeriodicTimer()
      }
    })

    // Also update immediately on mount (app launch)
    globalThis.setTimeout(() => {
      updateWidget()
    }, FOREGROUND_DEBOUNCE_MS)

    startPeriodicTimer()

    // Register background fetch so widget updates while app is closed
    registerWidgetBackgroundSync().catch((e) => console.error('useWidgetSync: failed to register background sync:', e))

    return () => {
      subscription.remove()
      stopPeriodicTimer()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on mount
  }, [])
}

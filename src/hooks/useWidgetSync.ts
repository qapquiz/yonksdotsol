import { useEffect } from 'react'

import { AppState } from 'react-native'

import { env } from '../config/env'
import { subscribeStoredWalletAddress } from '../stores/walletStore'
import { registerWidgetBackgroundSync } from '../tasks/widgetBackgroundSync'
import { syncWidgets } from '../widgets/syncWidgets'

const FOREGROUND_DEBOUNCE_MS = 3_000
const PERIODIC_INTERVAL_MS = 30 * 60 * 1000

/** Sync on wallet changes, app launch/foreground, and every 30 minutes while active. */
export function useWidgetSync(): void {
  useEffect(() => {
    if (env.devMock) return

    let appState = AppState.currentState
    let lastUpdate = 0
    let mounted = true
    let timeout: ReturnType<typeof globalThis.setTimeout> | undefined
    let interval: ReturnType<typeof globalThis.setInterval> | undefined

    function updateWidget(walletChanged = false): void {
      if (!mounted) return
      const now = Date.now()
      // Wallet transitions must clear/redraw immediately, even during the debounce window.
      if (!walletChanged && now - lastUpdate < 10_000) return
      lastUpdate = now
      void syncWidgets(walletChanged).catch((error) => {
        console.error('useWidgetSync: update failed:', error)
      })
    }

    function scheduleUpdate(): void {
      globalThis.clearTimeout(timeout)
      timeout = globalThis.setTimeout(() => updateWidget(), FOREGROUND_DEBOUNCE_MS)
    }

    function stopPeriodicTimer(): void {
      globalThis.clearInterval(interval)
      interval = undefined
    }

    function startPeriodicTimer(): void {
      stopPeriodicTimer()
      interval = globalThis.setInterval(() => {
        if (AppState.currentState === 'active') updateWidget()
      }, PERIODIC_INTERVAL_MS)
    }

    const unsubscribeWallet = subscribeStoredWalletAddress(() => {
      globalThis.clearTimeout(timeout)
      updateWidget(true)
    })
    const subscription = AppState.addEventListener('change', (nextState) => {
      const cameToForeground = appState.match(/background|inactive/) && nextState === 'active'
      appState = nextState
      if (cameToForeground) {
        scheduleUpdate()
        startPeriodicTimer()
      } else if (nextState === 'background') {
        globalThis.clearTimeout(timeout)
        stopPeriodicTimer()
      }
    })

    scheduleUpdate()
    startPeriodicTimer()
    registerWidgetBackgroundSync().catch((error) => {
      console.error('useWidgetSync: failed to register background sync:', error)
    })

    return () => {
      mounted = false
      unsubscribeWallet()
      subscription.remove()
      globalThis.clearTimeout(timeout)
      stopPeriodicTimer()
    }
  }, [])
}

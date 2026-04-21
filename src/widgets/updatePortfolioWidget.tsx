import { requestWidgetUpdate } from 'react-native-android-widget'
import type { PoolPnLSummary } from '../stores/pnlStore'
import React from 'react'
import { PortfolioWidget } from './PortfolioWidget'

const WIDGET_NAME = 'Portfolio'
const STORAGE_KEY = 'yonks_widget_portfolio'

function getLastUpdated(): string {
  const now = new Date()
  const h = now.getHours().toString().padStart(2, '0')
  const m = now.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

let _mmkv: ReturnType<typeof import('react-native-mmkv').createMMKV> | null = null

function getMMKV() {
  if (!_mmkv) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createMMKV } = require('react-native-mmkv')
      _mmkv = createMMKV({ id: 'widget-data' })
    } catch {
      // MMKV might not be available in headless context
    }
  }
  return _mmkv
}

export function getCachedWidgetData() {
  const mmkv = getMMKV()
  if (!mmkv) return null
  const raw = mmkv.getString(STORAGE_KEY)
  if (raw) return JSON.parse(raw)
  return null
}

const EMPTY_SUMMARY = {
  totalPnlSol: 0,
  totalPnlPercent: 0,
  totalValueSol: 0,
  totalInitialDepositSol: 0,
  totalUnclaimedFeesSol: 0,
  positionCount: 0,
}

export function getCachedWidgetDataOrDefault() {
  return getCachedWidgetData() ?? EMPTY_SUMMARY
}

export async function updatePortfolioWidget(summary: PoolPnLSummary, positionCount: number) {
  // Persist to MMKV so scheduled widget updates can read it
  const payload = {
    totalPnlSol: summary.totalPnlSol,
    totalPnlPercent: summary.totalPnlPercent,
    totalValueSol: summary.totalValueSol,
    totalInitialDepositSol: summary.totalInitialDepositSol,
    totalUnclaimedFeesSol: summary.totalUnclaimedFeesSol,
    positionCount,
  }

  const mmkv = getMMKV()
  if (mmkv) {
    mmkv.set(STORAGE_KEY, JSON.stringify(payload))
  }

  requestWidgetUpdate({
    widgetName: WIDGET_NAME,
    renderWidget: async () => {
      const lastUpdated = getLastUpdated()

      return {
        light: (
          <PortfolioWidget
            mode="light"
            totalPnlSol={summary.totalPnlSol}
            totalPnlPercent={summary.totalPnlPercent}
            totalValueSol={summary.totalValueSol}
            totalUnclaimedFeesSol={summary.totalUnclaimedFeesSol}
            positionCount={positionCount}
            lastUpdated={lastUpdated}
          />
        ),
        dark: (
          <PortfolioWidget
            mode="dark"
            totalPnlSol={summary.totalPnlSol}
            totalPnlPercent={summary.totalPnlPercent}
            totalValueSol={summary.totalValueSol}
            totalUnclaimedFeesSol={summary.totalUnclaimedFeesSol}
            positionCount={positionCount}
            lastUpdated={lastUpdated}
          />
        ),
      }
    },
    widgetNotFound: () => {
      // No widget on home screen — skip silently
    },
  })
}

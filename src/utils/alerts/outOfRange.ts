import * as Notifications from 'expo-notifications'

const CHANNEL_ID = 'out-of-range'
const CHANNEL_NAME = 'Out of range'

export interface PositionRangeSnapshot {
  id: string
  inRange: boolean
}

export interface OutOfRangeAlert {
  positionId: string
}

export interface DetectionResult {
  alerts: OutOfRangeAlert[]
  nextState: Record<string, boolean>
}

/**
 * Pure: compare current per-position in-range state against the previous
 * snapshot and emit one alert per position that transitioned in-range →
 * out-of-range.
 *
 * - `previous === null` (first ever check, or wallet never seen) → NO alerts;
 *   we only record state. This prevents a notification storm on install or
 *   on connecting a new wallet that already has out-of-range positions.
 * - Positions that are brand-new in `current` (absent from `previous`) do NOT
 *   alert; only the in-range → out-of-range transition does.
 */
export function detectOutOfRangeAlerts(
  current: PositionRangeSnapshot[],
  previous: Record<string, boolean> | null,
): DetectionResult {
  const nextState: Record<string, boolean> = {}
  const alerts: OutOfRangeAlert[] = []

  for (const snap of current) {
    nextState[snap.id] = snap.inRange
    if (previous !== null && previous[snap.id] === true && snap.inRange === false) {
      alerts.push({ positionId: snap.id })
    }
  }

  return { alerts, nextState }
}

async function ensureChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: CHANNEL_NAME,
    importance: Notifications.AndroidImportance.HIGH,
  })
}

/**
 * Side-effectful: schedule one local notification per alert. Best-effort —
 * failures are swallowed so a notification error never breaks the background task.
 */
export async function sendOutOfRangeNotifications(alerts: OutOfRangeAlert[]): Promise<void> {
  if (alerts.length === 0) return
  try {
    await ensureChannel()
    const count = alerts.length
    await Notifications.scheduleNotificationAsync({
      content: {
        title: count === 1 ? 'Position out of range' : `${count} positions out of range`,
        body: 'Your position is no longer earning fees. Tap to view in Yonks.',
        data: { screen: 'positions' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: CHANNEL_ID },
    })
  } catch (e) {
    console.error('outOfRange: failed to send notification:', e)
  }
}

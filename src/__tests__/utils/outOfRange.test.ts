import { describe, expect, it, vi } from 'vitest'

import { detectOutOfRangeAlerts } from '../../utils/alerts/outOfRange'

vi.mock('expo-notifications', () => ({
  setNotificationChannelAsync: vi.fn(async () => ({})),
  scheduleNotificationAsync: vi.fn(async () => ''),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
}))

describe('detectOutOfRangeAlerts', () => {
  it('emits no alerts and only records state when previous is null (first run)', () => {
    const res = detectOutOfRangeAlerts(
      [
        { id: 'a', inRange: false },
        { id: 'b', inRange: true },
      ],
      null,
    )
    expect(res.alerts).toEqual([])
    expect(res.nextState).toEqual({ a: false, b: true })
  })

  it('alerts on in-range → out-of-range transition', () => {
    const res = detectOutOfRangeAlerts([{ id: 'a', inRange: false }], { a: true })
    expect(res.alerts).toEqual([{ positionId: 'a' }])
  })

  it('does not alert for a position that was already out of range', () => {
    const res = detectOutOfRangeAlerts([{ id: 'a', inRange: false }], { a: false })
    expect(res.alerts).toEqual([])
  })

  it('does not alert for a brand-new position absent from previous', () => {
    const res = detectOutOfRangeAlerts([{ id: 'new', inRange: false }], { a: true })
    expect(res.alerts).toEqual([])
    expect(res.nextState.new).toBe(false)
  })

  it('does not alert on out-of-range → in-range recovery', () => {
    const res = detectOutOfRangeAlerts([{ id: 'a', inRange: true }], { a: false })
    expect(res.alerts).toEqual([])
  })

  it('handles multiple simultaneous transitions', () => {
    const res = detectOutOfRangeAlerts(
      [
        { id: 'a', inRange: false },
        { id: 'b', inRange: false },
        { id: 'c', inRange: true },
      ],
      { a: true, b: true, c: true },
    )
    expect(res.alerts).toHaveLength(2)
  })
})

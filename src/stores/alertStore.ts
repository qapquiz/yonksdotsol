import { createMMKV } from 'react-native-mmkv'

const mmkv = createMMKV({ id: 'alerts' })

const STATE_KEY = 'out_of_range_state'

/** Position id -> whether it was in range at the last background check. */
export type RangeStateMap = Record<string, boolean>

export function getRangeState(walletAddress: string): RangeStateMap | null {
  const raw = mmkv.getString(STATE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Record<string, RangeStateMap>
    return parsed[walletAddress] ?? null
  } catch {
    return null
  }
}

export function setRangeState(walletAddress: string, state: RangeStateMap): void {
  const raw = mmkv.getString(STATE_KEY)
  const parsed = raw ? (JSON.parse(raw) as Record<string, RangeStateMap>) : {}
  parsed[walletAddress] = state
  mmkv.set(STATE_KEY, JSON.stringify(parsed))
}

export function clearRangeState(walletAddress: string): void {
  const raw = mmkv.getString(STATE_KEY)
  if (!raw) return
  try {
    const parsed = JSON.parse(raw) as Record<string, RangeStateMap>
    delete parsed[walletAddress]
    mmkv.set(STATE_KEY, JSON.stringify(parsed))
  } catch {
    // corrupt store — wipe it
    mmkv.remove(STATE_KEY)
  }
}

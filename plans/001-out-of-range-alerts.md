# Plan 001: Notify the user when a position goes out of range

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 86a1d22..HEAD -- src/tasks/widgetBackgroundSync.ts src/stores/settingsStore.ts src/stores/walletStore.ts src/services/positionPipeline.ts src/app/index.tsx app.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: direction (feature)
- **Planned at**: commit `86a1d22`, 2026-06-13

## Why this matters

Yonks is a read-only Meteora DLMM positions tracker. The single most important
event for a liquidity provider is **a position leaving the active bin range**,
because it stops earning fees the instant that happens. The app already computes
`outOfRangeCount` on every portfolio load and already runs a headless background
task every 30 minutes that re-fetches the full portfolio — but it never *tells*
the user anything; the out-of-range state is only visible if they open the app.

This plan wires the two together: detect the **in-range → out-of-range**
transition in the existing background task and fire a local notification. Nearly
all the infrastructure (background task, per-position in-range flag, persisted
wallet address) already exists — the only new things are a pure transition
detector, a small MMKV store for the previously-seen state, a settings toggle,
and `expo-notifications`.

Alerts are **opt-in** (default off) because they require a runtime notification
permission; the toggle is where that permission is requested.

## Current state

All excerpts are from commit `86a1d22`. Confirm each before editing.

**The background task already runs every 30 min with the wallet address and
access to the full pipeline** — `src/tasks/widgetBackgroundSync.ts:11-32`:

```ts
defineTask(TASK_NAME, async () => {
  const walletAddress = getStoredWalletAddress()
  if (!walletAddress) return BackgroundFetchResult.NoData

  try {
    const summary = await fetchPortfolioSummary(walletAddress)
    const widgetTree = buildWidgetTree(summary)
    await requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: async () => widgetTree })
    return BackgroundFetchResult.NewData
  } catch (e) {
    // ...
  }
})
```

`TASK_NAME = 'widget-background-sync'`, registered at `minimumInterval: 1800`
(30 min) in `registerWidgetBackgroundSync()` (same file, ~line 35-50).

**Per-position in-range flag is already computed.** `PositionPipeline.loadPortfolio`
returns `ResolvedPosition[]`, each with `vm.inRange: boolean` and a stable `id`.
From `src/services/positionPipeline.ts:175-205` (the `resolvePositions` return):

```ts
result.push({
  id: `${position.publicKey.toString()}-${idx}`,
  poolAddress: pairAddress,
  // ...
  vm,            // vm.inRange is activeId >= lowerBinId && activeId <= upperBinId
})
```

`loadPortfolio` is a public method on `PositionPipeline` and is created via the
`createPositionPipeline()` factory (`src/services/positionPipeline.ts:240+`).

**MMKV store pattern to mirror** — `src/stores/walletStore.ts` (full file):

```ts
import { createMMKV } from 'react-native-mmkv'

const mmkv = createMMKV({ id: 'wallet' })
const WALLET_ADDRESS_KEY = 'wallet_address'

export function getStoredWalletAddress(): string | undefined {
  const val = mmkv.getString(WALLET_ADDRESS_KEY)
  return val && val.length > 0 ? val : undefined
}

export function setStoredWalletAddress(address: string | undefined) {
  if (address) {
    mmkv.set(WALLET_ADDRESS_KEY, address)
  } else {
    mmkv.remove(WALLET_ADDRESS_KEY)
  }
}
```

**Settings store pattern to extend** — `src/stores/settingsStore.ts`. It is a
zustand `persist` store over MMKV. Existing display preferences:

```ts
interface SettingsState {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  pixelFont: string
  setPixelFont: (id: string) => void
}
```

**Bottom-sheet Modal pattern to mirror** for the new settings surface —
`src/components/ui/FontPicker.tsx`. It is a `Modal visible={visible} transparent
animationType="fade"` with an outer `Pressable` (tap-to-dismiss) wrapping a
bottom `Pressable` styled `bg-app-surface rounded-t-3xl border-t border-app-border`.
It reads/writes the settings store directly. Read this file in full before
building `SettingsSheet.tsx` and copy its structure.

**The header that will host the settings button** — `src/app/index.tsx:42-72`,
which already renders three round `Pressable` buttons (font, theme, wallet) in a
`flex-row items-center gap-3`:

```tsx
<View className="flex-row items-center gap-3">
  <Pressable onPress={() => setFontPickerVisible(true)} className="h-10 w-10 items-center justify-center rounded-full bg-app-surface-highlight active:opacity-80">
    <Ionicons name="text-outline" size={20} color={tokens.textSecondary} />
  </Pressable>
  {/* theme toggle, wallet connect */}
</View>
```

**No notification library is installed.** `expo-notifications` is absent from
`package.json`. It must be added and prebuilt (see Steps 1–2).

## Conventions to honor

- **Formatting**: no semicolons, single quotes, 2-space indent, trailing commas,
  arrow parens always — enforced by `oxfmt`. Run `bun run fmt` after editing.
- **Components**: functional + `memo()`, props interface above the component,
  Uniwind utility classes for all styling (see `FontPicker.tsx`, `PortfolioSummary.tsx`).
- **Stores**: MMKV via `createMMKV({ id: '<name>' })` for raw KV (`walletStore`),
  or zustand `persist` over MMKV for richer state (`settingsStore`).
- **Pure logic** (the detector) lives under `src/utils/...`, takes all inputs as
  args, returns data, has no side effects — see `src/utils/positions/pnlAggregation.ts`.
- **Naming** (from `UBIQUITOUS_LANGUAGE.md`): the concept is "Out of range" (a
  Position whose Bin range does not include the Active bin). Use `outOfRange` /
  `inRange` in code, never "inactive"/"active". A Position is identified by its
  position address; here we use the pipeline's existing `id`.

## Commands you will need

| Purpose            | Command                                  | Expected on success |
|--------------------|------------------------------------------|---------------------|
| Add dependency     | `bun add expo-notifications`             | exit 0, updates `package.json` + `bun.lock` |
| Type check         | `tsgo --noEmit`                          | exit 0, no errors (do NOT use `tsc`) |
| Lint (check)       | `bun run lint:check`                     | exit 0 |
| Format             | `bun run fmt`                            | exit 0 |
| Tests (all)        | `bun run test`                           | all pass |
| Tests (one file)   | `bun run test -- src/__tests__/utils/outOfRange.test.ts` | all pass |
| Build / prebuild   | `bun run build`                          | exit 0 (regenerates `android/`) |

`tsgo` is run via `bunx` if not on PATH: `bunx tsgo --noEmit`.

## Scope

**In scope** (the only files you should modify or create):
- `package.json`, `bun.lock` — add `expo-notifications` (via `bun add`)
- `app.json` — add the `expo-notifications` plugin + Android notification permission
- `src/stores/settingsStore.ts` — add `alertsEnabled` preference
- `src/stores/alertStore.ts` — **create**; MMKV store of last-seen in-range state per wallet
- `src/utils/alerts/outOfRange.ts` — **create**; pure transition detector + notification sender
- `src/tasks/widgetBackgroundSync.ts` — invoke the detector, gated on the toggle
- `src/components/ui/SettingsSheet.tsx` — **create**; bottom-sheet with the alerts toggle (mirror `FontPicker.tsx`)
- `src/app/index.tsx` — add a settings button + render `SettingsSheet`
- `src/__tests__/utils/outOfRange.test.ts` — **create**; unit tests for the pure detector
- `src/__tests__/stores/settingsStore.test.ts` — add tests for `alertsEnabled`

**Out of scope** (do NOT touch, even though they look related):
- `src/widgets/updatePortfolioWidget.tsx` and `src/widgets/portfolioWidgetTaskHandler.tsx` — the widget *render* path is unchanged; alerts run in the background task only.
- Fee-milestone alerts, "back in range" notifications, an in-app notification history screen, notification sounds/icons beyond the default. These are follow-ups.
- iOS. The widget + background-fetch + signing model are Android-first; notifications on iOS are a separate effort.
- Any change to `PositionPipeline` logic or the widget's data shape.

## Git workflow

- Branch: `advisor/001-out-of-range-alerts`
- Commit per step; messages follow the repo's conventional-commit style
  (examples from `git log --oneline`: `feat: add dev mock mode for positions UI
  testing`, `fix: correct fee 24h/TVL being 100x too high`). Suggested messages:
  `feat(alerts): add out-of-range transition detector`, etc.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add expo-notifications and configure the native plugin

Run `bun add expo-notifications`. Then edit `app.json`: inside the `"expo".plugins`
array (currently ends with `"expo-status-bar"`), append a notifications plugin
entry and ensure the Android permission. The result should include:

```jsonc
[
  "expo-notifications",
  {
    "color": "#8FA893"
  }
]
```

and, inside `"expo".android`, add `"permissions": ["android.permission.POST_NOTIFICATIONS"]`.

**Verify**: `grep -n "expo-notifications" app.json package.json` → both files
contain the string. Then run `bun run build` (this runs `tsgo --noEmit` and
`expo prebuild -p android`) → exit 0. The prebuild regenerates native files
under `android/`; that is expected.

### Step 2: Add the `alertsEnabled` setting

In `src/stores/settingsStore.ts`, extend the store. Add to the interface and
initializer (match the existing `pixelFont`/`setPixelFont` pair exactly):

```ts
interface SettingsState {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  pixelFont: string
  setPixelFont: (id: string) => void
  // New:
  alertsEnabled: boolean
  setAlertsEnabled: (enabled: boolean) => void
}
```

```ts
// in the (set, get) => ({ ... }) initializer, alongside pixelFont:
alertsEnabled: false,
setAlertsEnabled: (alertsEnabled) => set({ alertsEnabled }),
```

Because the store uses zustand `persist`, the new field is picked up
automatically (new users default to `false`; existing users get the default via
merge). No migration code is needed.

**Verify**: `tsgo --noEmit` → exit 0.

### Step 3: Create the alert state store (`src/stores/alertStore.ts`)

Create `src/stores/alertStore.ts`. It persists, per wallet address, the
last-seen in-range state of each position so the detector can diff against it.
Mirror the `createMMKV` + accessor style of `src/stores/walletStore.ts` exactly,
storing a JSON map.

```ts
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
    mmkv.delete(STATE_KEY)
  }
}
```

**Verify**: `tsgo --noEmit` → exit 0.

### Step 4: Create the pure detector + sender (`src/utils/alerts/outOfRange.ts`)

Create `src/utils/alerts/outOfRange.ts`. The **detector is pure** and unit-tested;
the **sender has side effects** (calls `expo-notifications`) and is not unit-tested.

```ts
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
```

Notes for the executor:
- The exact `trigger` shape above is the current `expo-notifications` API
  (`SchedulableTriggerInputTypes.TIME_INTERVAL` + `channelId`). If `tsgo` reports
  the `trigger`/`type` field is wrong for the installed version, **STOP and
  report** — do not guess at a different API shape.
- We collapse all alerts in one tick into a single notification (count-based).
  Do not loop-schedule one per position.

**Verify**: `tsgo --noEmit` → exit 0.

### Step 5: Write unit tests for the detector

Create `src/__tests__/utils/outOfRange.test.ts`. Follow the style of
`src/__tests__/utils/formatters.test.ts` (vitest, `describe`/`it`/`expect`,
globals enabled — no need to import `describe`/`it`/`expect`, but you may).
Mock `expo-notifications` so importing the module does not pull native code:

```ts
import { vi } from 'vitest'
vi.mock('expo-notifications', () => ({
  setNotificationChannelAsync: vi.fn(async () => ({})),
  scheduleNotificationAsync: vi.fn(async () => ''),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
}))

import { detectOutOfRangeAlerts } from '../../utils/alerts/outOfRange'

describe('detectOutOfRangeAlerts', () => {
  it('emits no alerts and only records state when previous is null (first run)', () => {
    const res = detectOutOfRangeAlerts(
      [{ id: 'a', inRange: false }, { id: 'b', inRange: true }],
      null,
    )
    expect(res.alerts).toEqual([])
    expect(res.nextState).toEqual({ a: false, b: true })
  })

  it('alerts on in-range → out-of-range transition', () => {
    const res = detectOutOfRangeAlerts(
      [{ id: 'a', inRange: false }],
      { a: true },
    )
    expect(res.alerts).toEqual([{ positionId: 'a' }])
  })

  it('does not alert for a position that was already out of range', () => {
    const res = detectOutOfRangeAlerts([{ id: 'a', inRange: false }], { a: false })
    expect(res.alerts).toEqual([])
  })

  it('does not alert for a brand-new position absent from previous', () => {
    const res = detectOutOfRangeAlerts(
      [{ id: 'new', inRange: false }],
      { a: true }, // 'new' not present
    )
    expect(res.alerts).toEqual([])
    expect(res.nextState.new).toBe(false)
  })

  it('does not alert on out-of-range → in-range recovery', () => {
    const res = detectOutOfRangeAlerts([{ id: 'a', inRange: true }], { a: false })
    expect(res.alerts).toEqual([])
  })

  it('handles multiple simultaneous transitions', () => {
    const res = detectOutOfRangeAlerts(
      [{ id: 'a', inRange: false }, { id: 'b', inRange: false }, { id: 'c', inRange: true }],
      { a: true, b: true, c: true },
    )
    expect(res.alerts).toHaveLength(2)
  })
})
```

**Verify**: `bun run test -- src/__tests__/utils/outOfRange.test.ts` → all pass.

### Step 6: Wire the detector into the background task

Edit `src/tasks/widgetBackgroundSync.ts`. The task already imports
`getStoredWalletAddress`, `fetchPortfolioSummary`, `buildWidgetTree`,
`buildErrorWidget`. Add the alert pipeline **after** the widget update succeeds,
gated on the setting. Use a **separate** `loadPortfolio` call for per-position
data (the widget's `fetchPortfolioSummary` returns only a summary subset). The
PnL cache (15 min TTL) and token cache (60s) make the second call cheap, and it
only runs when alerts are enabled.

Add these imports near the top:

```ts
import { createPositionPipeline } from '../services/positionPipeline'
import { useSettingsStore } from '../stores/settingsStore'
import { getRangeState, setRangeState } from '../stores/alertStore'
import { detectOutOfRangeAlerts, sendOutOfRangeNotifications, type PositionRangeSnapshot } from '../utils/alerts/outOfRange'
```

Then, inside `defineTask(TASK_NAME, async () => { ... })`, **after** the existing
`await requestWidgetUpdate(...)` call and **before** `return
BackgroundFetchResult.NewData`, add:

```ts
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
```

`useSettingsStore.getState()` reads the current persisted value synchronously
without subscribing — this works headless because the store is MMKV-backed.

**Verify**: `tsgo --noEmit` → exit 0. `bun run lint:check` → exit 0.

### Step 7: Build the SettingsSheet UI

Create `src/components/ui/SettingsSheet.tsx`, structurally mirroring
`src/components/ui/FontPicker.tsx` (same `Modal`/outer-`Pressable`/bottom-sheet
shell, same classes, same close button). Body content: a single row with a label
and a `Switch`. Use `useSettingsStore` for `alertsEnabled`/`setAlertsEnabled`,
`useThemeTokens()` for colors.

```tsx
import { memo, useCallback, useState } from 'react'
import { Modal, Pressable, Switch, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Notifications from 'expo-notifications'
import { useSettingsStore } from '../../stores/settingsStore'
import { useThemeTokens } from '../../hooks/useThemeTokens'

interface SettingsSheetProps {
  visible: boolean
  onClose: () => void
}

function SettingsSheetComponent({ visible, onClose }: SettingsSheetProps) {
  const tokens = useThemeTokens()
  const alertsEnabled = useSettingsStore((s) => s.alertsEnabled)
  const setAlertsEnabled = useSettingsStore((s) => s.setAlertsEnabled)
  const [denied, setDenied] = useState(false)

  const handleToggle = useCallback(
    async (next: boolean) => {
      if (next) {
        const perm = await Notifications.requestPermissionsAsync()
        if (!perm.granted) {
          setDenied(true)
          setAlertsEnabled(false)
          return
        }
      }
      setDenied(false)
      setAlertsEnabled(next)
    },
    [setAlertsEnabled],
  )

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60" onPress={onClose}>
        <View className="flex-1 justify-end">
          <Pressable
            className="bg-app-surface rounded-t-3xl border-t border-app-border px-5 pt-4 pb-8"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="w-10 h-1 rounded-full bg-app-surface-highlight self-center mb-4" />
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-app-text text-lg font-sans-bold">Settings</Text>
              <Pressable onPress={onClose} className="p-1">
                <Ionicons name="close" size={22} color={tokens.textMuted} />
              </Pressable>
            </View>

            <View className="flex-row items-center justify-between rounded-2xl p-4 bg-app-surface-highlight border border-app-border">
              <View className="flex-1 pr-3">
                <Text className="text-app-text text-base font-sans-bold">Out-of-range alerts</Text>
                <Text className="text-app-text-secondary text-xs mt-0.5">
                  Notify me when a position stops earning fees
                </Text>
                {denied && (
                  <Text className="text-red-400 text-xs mt-1">
                    Notification permission denied. Enable it in system settings.
                  </Text>
                )}
              </View>
              <Switch value={alertsEnabled} onValueChange={handleToggle} />
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  )
}

export const SettingsSheet = memo(SettingsSheetComponent)
```

**Verify**: `tsgo --noEmit` → exit 0.

### Step 8: Add the settings button to the header

Edit `src/app/index.tsx`. Mirror the existing font-picker wiring:

1. Add state next to `const [fontPickerVisible, setFontPickerVisible] = useState(false)`:
   ```ts
   const [settingsVisible, setSettingsVisible] = useState(false)
   ```
2. Add the import: `import { SettingsSheet } from '../components/ui/SettingsSheet'`.
3. Render `<SettingsSheet visible={settingsVisible} onClose={() => setSettingsVisible(false)} />`
   alongside the existing `<FontPicker ... />`.
4. In the header button row, add a new `Pressable` (a settings cog) before the
   font button:
   ```tsx
   <Pressable
     onPress={() => setSettingsVisible(true)}
     className="h-10 w-10 items-center justify-center rounded-full bg-app-surface-highlight active:opacity-80"
   >
     <Ionicons name="settings-outline" size={20} color={tokens.textSecondary} />
   </Pressable>
   ```

**Verify**: `tsgo --noEmit` → exit 0. `bun run lint:check` → exit 0.

### Step 9: Extend settings store tests

In `src/__tests__/stores/settingsStore.test.ts`, add coverage for the new field
following the existing test style. Use `CacheManager`-style isolation if the
existing tests reset the store; otherwise mirror whatever reset pattern the file
already uses. At minimum: initial value is `false`, and `setAlertsEnabled(true)`
flips it.

**Verify**: `bun run test -- src/__tests__/stores/settingsStore.test.ts` → all pass.

### Step 10: Format and full verification

```bash
bun run fmt
tsgo --noEmit
bun run lint:check
bun run fmt:check
bun run test
bun run build
```

All must exit 0 / all tests pass.

## Test plan

- **`src/__tests__/utils/outOfRange.test.ts`** (new): the six cases in Step 5 —
  first-run no-alert, transition alert, already-out no-alert, new-position
  no-alert, recovery no-alert, multi-transition.
- **`src/__tests__/stores/settingsStore.test.ts`** (extend): `alertsEnabled`
  default + setter.
- **Existing tests must still pass** unchanged — the only production code that
  gains a branch is `widgetBackgroundSync.ts` (gated, best-effort) and the store.
- **Manual (not automated, record in the PR):** on a device, toggle alerts on,
  grant permission, and confirm the background task logs no errors. Confirm the
  detector logic via the unit tests (the notification delivery itself is not
  unit-tested).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "expo-notifications" app.json package.json` → present in both
- [ ] `tsgo --noEmit` exits 0
- [ ] `bun run test` exits 0; new tests in `outOfRange.test.ts` and the
      `settingsStore` extension exist and pass
- [ ] `bun run lint:check` and `bun run fmt:check` exit 0
- [ ] `bun run build` exits 0
- [ ] No files outside the in-scope list are modified (`git status` shows only
      the listed files, plus regenerated `android/` native files from prebuild)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any "Current state" excerpt does not match the live code (drift since `86a1d22`).
- `expo-notifications`' `scheduleNotificationAsync` `trigger` / `SchedulableTriggerInputTypes`
  API differs from Step 4 in the installed version and `tsgo` errors on it —
  report the exact type error instead of guessing an alternate trigger shape.
- `bun run build` fails in `expo prebuild` for a reason unrelated to your edits
  (e.g. an environment/SDK problem) — report it; do not attempt native fixes.
- `useSettingsStore.getState()` is not available or the store is not
  MMKV-persisted as the excerpt shows (it must be readable headless).
- You find that `PositionPipeline.loadPortfolio` no longer returns
  `positions[].vm.inRange` or `positions[].id`.

## Maintenance notes

For whoever owns this after it lands:

- **Background-task cost**: when `alertsEnabled` is true, the task does a second
  `loadPortfolio` per 30-min tick (cache-hot). If you later make the portfolio
  fetch expensive (e.g. uncached deep calls), consider deriving both the widget
  summary and the range snapshots from a single `loadPortfolio` call instead of
  the current two-call split. The split was chosen to avoid touching
  `updatePortfolioWidget.tsx`.
- **First-run silence is intentional** — `previous === null` records state but
  emits nothing, so installing/connecting a wallet with already-out-of-range
  positions does not spam. If product wants a "welcome" summary notification,
  that is a separate, explicit behavior.
- **Permission lifecycle**: the toggle requests permission on enable. If the
  user later revokes permission in system settings, the background task will
  call `scheduleNotificationAsync` and it will silently no-op (Android drops
  posts without permission). No crash; optionally add a periodic permission
  re-check later.
- **Reviewer scrutiny**: confirm the detector is pure and fully covered, and
  that the background-task alert block is wrapped in try/catch so a notification
  failure can never change the `BackgroundFetchResult` returned to the OS.
- **Follow-ups explicitly deferred**: fee-milestone alerts, "back in range"
  notifications, an in-app alert center, iOS support.

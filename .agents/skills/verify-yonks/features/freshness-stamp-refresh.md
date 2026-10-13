# Freshness stamp

Under the portfolio summary, a quiet caption shows when data last loaded —
`Updated H:MM AM/PM` (12-hour, `formatUpdateTime` in `src/utils/positions/formatters.ts`),
with a clock icon. While a fetch is in flight it reads `Updating…` and blocks the tap.
It renders **only** in the data branch (`lastUpdatedAt != null`) — never in skeleton
or empty states. On native, tapping it (and pull-to-refresh) triggers a throttled
refresh with a 30s cooldown; **in dev mock the refresh handler is a deliberate
no-op** (`usePositionsPage.ts`: `if (env.devMock) return`).

## Sub-features

- `stamp-render` — `Updated H:MM AM/PM` shows under the summary whenever data is loaded.
- `placement-rules` — absent in skeleton and in the mock-disconnect empty state.
- `refresh-behavior` — native only: tap → `Updating…` → new time, throttled to one refresh per 30s. Not verifiable on web.

## How to get to it (user POV)

- Launch the app with the mock wallet connected; the stamp sits right-aligned between the summary card and the position list.
- (Native only) Tap it to refresh data.

## Driving it with agent-browser

Preconditions: page loaded, connected baseline (see `wallet-mock-toggle.md`).

- **Assert stamp.** The stamp is the only element with an accessibility label of this shape — `agent-browser find label "Updated" click --dry` is not supported; instead snapshot and locate the pressable whose label starts with `Updated`, or match text: `agent-browser get text "text=/^Updated /"` style lookups vary — the reliable route is `agent-browser snapshot -i` and reading the stamp's label. Screenshot `$EV/01-stamp.png` with summary in frame.
- **Assert format.** The label matches `Updated <1-12>:<00-59> (AM|PM)` — capture the exact label text into `$EV/stamp.txt`.
- **Placement: empty state.** Disconnect the mock wallet (`wallet-mock-toggle.md` recipe); the stamp is gone with the summary. Reconnect.
- **Placement: skeleton.** On a fresh `open` with cleared storage the skeleton shows first and contains no stamp; once `DEPOSITED` lands the stamp is present.
- **Refresh attempt (web).** Clicking the stamp is allowed but changes nothing in mock — assert no error in `agent-browser console` and the label unchanged. Do **not** report this as refresh verified.
- **Proof.** `stamp.txt` + screenshot showing the stamp in the data branch and its absence in the empty-state screenshot.

## Gotchas

- **Refresh is a no-op in dev mock.** The 30s cooldown and `Updating…` flow are native-only; verifying them requires `bun run android`. On web, `Updating…` will never appear from a tap.
- The stamp's label changes with every load (`Updated 2:41 PM`), so match by prefix, never by full string.
- Two AM/PM formats exist in the codebase (stamp uses `H:MM AM/PM`); don't assert 24-hour.
- In empty state a pull-to-refresh control exists but does nothing in mock — its presence is not proof of refresh behavior.

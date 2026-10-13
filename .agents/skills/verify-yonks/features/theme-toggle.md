# Theme toggle

The header's third icon pressable toggles dark ↔ light. Theme is **store-driven**
(`settingsStore`, default dark) and persisted on web to localStorage under
`settings\settings-store`; every color renders end-to-end from the tokens in
`src/config/theme.ts`, so the toggle flips the whole app including the status bar.

## Sub-features

- `toggle` — tapping the theme icon flips dark → light → dark; the icon swaps (`sunny-outline` in dark, `moon-outline` in light).
- `persistence` — the flipped theme survives a page reload via localStorage.
- `token-integrity` — both themes pass `scripts/palette-check.py` (pixels match theme.ts tokens; uniwind CSS vars not drifted).

## How to get to it (user POV)

- Launch the app; the theme icon is the third of the four round header buttons (settings, font, **theme**, wallet — rightmost cluster).
- Tap it; the entire UI re-colors.

## Driving it with agent-browser

Preconditions: page loaded in default dark theme, mock banner visible.

- **Baseline.** `agent-browser screenshot "$EV/01-dark.png"` then
  `python3 scripts/palette-check.py "$EV/01-dark.png"` — header line must read
  `== palette (dark, ...)` and the missing-token list must be explainable (only
  `negative` missing is normal — nothing renders in loss red on this screen).
  The script always exits 0; it reports, it does not gate.
- **Toggle.** `agent-browser snapshot -i`; the root container is ref #1 and the
  unlabeled header buttons are refs #2–#5 in code order (settings, font,
  **theme**, wallet) — theme is **ref #4** of the snapshot output. Snapshot and
  click in the same invocation: `REF=$(agent-browser snapshot -i | grep -oP
  'ref=\K[^]]+' | sed -n 4p); agent-browser click "@$REF"`.
- **Assert pixels.** `agent-browser screenshot "$EV/02-light.png"` then
  `python3 scripts/palette-check.py "$EV/02-light.png"` — header line must read
  `== palette (light, ...)`.
- **Assert side effect.**
  `agent-browser eval "localStorage.getItem('settings\\\\settings-store')"`
  returns JSON with `"theme":"light"`. The key only exists after a first settings
  change — before any toggle it reads null, which is expected, not a failure.
- **Assert persistence.** `agent-browser reload`, wait for `DEPOSITED`, **wait
  ~3 s for the bundle to settle** (an immediate capture races the bundle and
  palettes as mixed/dark), then screenshot — palette-check still reports
  `(light, ...)`.
- **Toggle back.** Repeat the ref #4 click; palette-check reports `(dark, ...)`;
  localStorage shows `"theme":"dark"`.
- **Proof.** Auto-detected `palette (dark)` → `palette (light)` → `palette (light)`
  after reload → `palette (dark)` header lines, the localStorage values, and
  before/after screenshots in `$EV`.

## Gotchas

- `agent-browser set media light` does **nothing** — theme is store-driven, not media-driven.
- Boot-time light requires seeding localStorage **before** open:
  `agent-browser eval "localStorage.setItem('settings\\\\settings-store', JSON.stringify({state:{theme:'light'},version:0})); 1"` then `agent-browser open http://localhost:8081`. Seeding without reloading changes nothing.
- The header icon buttons have no accessibility labels — theme is ref #4 in the
  snapshot output (root is #1; #2–#5 are settings, font, theme, wallet).
  Re-snapshot in the same invocation as the click. If you mis-index, you open the
  FontPicker sheet (#3) or disconnect the mock wallet (#5) — undo and re-drive.
- A capture right after `reload` can race the bundle and palette as mixed or dark
  even when persistence works — wait ~3 s after the mount marker and re-capture.
- palette-check exits 0 unconditionally; the auto-detected theme in its header
  line is the assertion, not the exit code.
- Backslashes in the storage key must be escaped exactly as shown when passing
  through shell double quotes.

---
name: verify-yonks
description: Drive the Yonks app (Solana DLMM portfolio tracker) end to end and capture proof. Surface is the Expo web preview in dev-mock mode, driven headlessly with agent-browser. Reach for it when a task needs real UI verification — screenshots, console errors, token-vs-pixel theme audits — beyond unit tests.
---

# Verify Yonks

Yonks (`dev.nullphase.yonks`, v5.x) is a React Native + Expo Solana DLMM portfolio
tracker. The primary user surface is the mobile app; the **verification surface is the
Expo web preview**, which exists for exactly this purpose: on web the app auto-enables
dev-mock mode (`env.devMock` is always true when `Platform.OS === 'web'`, see
`src/config/env.ts`) — no wallet adapter, no RPC, deterministic mock portfolio and
mock OHLCV candles seeded per pool (`src/services/mockOhlcv.ts`).

The app is a single screen (`src/app/index.tsx`): a header (pixel-cat avatar + wallet
address, then four icon pressables: settings, font picker, theme toggle, wallet
connect/disconnect) above the positions list
(`src/components/positions/PositionsList.tsx`):
portfolio summary → freshness stamp → out-of-range banner → position cards.

Native-only surfaces (Android widgets, real wallet sign-in, push) are out of scope
here — drive those on a device/emulator via `bun run android`.

## Launch

One command from the repo root:

```bash
.agents/skills/verify-yonks/helpers/dev-server.sh start          # port 8081 by default
.agents/skills/verify-yonks/helpers/dev-server.sh start 8082     # second instance
```

The helper starts `bun run web --port <port>` detached (log:
`.expo/verify-dev-server.log`), polls Metro's `/status` until it answers
`packager-status:running` (usually <30 s), and records the PID tree in
`.expo/verify-dev-server.env`. It **reuses** an already-running healthy server on that
port and says so — a pre-existing server is never recorded, so `stop` will not kill it.
Do not run `CI=1`: it disables Metro's watcher, which breaks the edit-then-re-observe
loop (non-TTY expo is already non-interactive).

Metro answering is not the app being ready — the web bundle compiles on first request.
After opening the page, wait for the mount marker:

```bash
export AGENT_BROWSER_SESSION="$(agent-browser session id --scope worktree --prefix verify)"
agent-browser set viewport 412 900
agent-browser open http://localhost:8081
agent-browser wait --text "DEPOSITED" --timeout 120000   # cold bundle can take a minute
```

Ready means: `DEPOSITED` stat text is visible (portfolio summary mounted) and the
`Dev Mode — Mock Data` banner is present under the header. If the banner is missing you
are not in mock mode — stop and investigate before driving.

**Isolation:** one Metro per port; use a different port for a second instance. One
agent-browser session per run via `AGENT_BROWSER_SESSION` (the `--prefix verify`
id is stable per worktree, so parallel runs each get their own browser). Never
double-drive one browser session.

**One-time setup** (already done on this machine; re-run after tool upgrades):
`npm i -g agent-browser && agent-browser install`, and `pip install pillow` for the
palette audit.

## Doctor

Run this whenever anything looks off (blank screenshot, wait timeout, weird theme):

```bash
.agents/skills/verify-yonks/helpers/dev-server.sh status
agent-browser session info
agent-browser get url
agent-browser console
```

Healthy answers: `packager: running` and a recorded pid from this skill; session info
shows a live daemon; URL is `http://localhost:8081/`; console has no red errors.
If the page is stuck mid-boot (palette-check reports ≈ all app-bg colors, screenshot
shows skeleton), re-capture once — a cold daemon's first capture can race the bundle.

## Drive

All driving goes through agent-browser against the mock web app. Session scoping and
viewport first:

```bash
export AGENT_BROWSER_SESSION="$(agent-browser session id --scope worktree --prefix verify)"
agent-browser set viewport 412 900
agent-browser open http://localhost:8081
agent-browser wait --text "DEPOSITED" --timeout 120000
```

**Handles, in order of stability:**

1. **Visible text** — the app under-drives accessibility labels, so text is the main
   handle: `DEPOSITED`, `UNCLAIMED FEES`, `POSITIONS`, `Dev Mode — Mock Data`,
   `Updated …` (freshness stamp), `N positions out of range`, `No positions found`
   (empty state), `Liquidity` / `Price` (chart segmented control),
   `Connecting...`, the truncated wallet address (`DeVM...1111`), `Not Connected`.
   Click by text: `agent-browser find text "Price" click` (or `snapshot` + `@ref`).
2. **Snapshot refs** — `agent-browser snapshot -i` lists interactive elements.
   The root container is ref #1; the four unlabeled header icon pressables are
   refs **#2–#5 in code order: settings, font picker, theme toggle, wallet**
   (so theme = ref #4, wallet = ref #5 of the snapshot output). Refs change every
   snapshot — **re-snapshot immediately before each click** in the same shell
   invocation, never reuse a ref across actions. A misclick on these unlabeled
   buttons opens the wrong sheet or flips the wallet — verify the result by
   screenshot, undo, and re-drive.
3. **ARIA label** — only the freshness stamp has one (`Updated …` / `Updating…`).
4. Never coordinates or tab order.

```bash
agent-browser snapshot -i
agent-browser click @<ref>            # ref from the snapshot taken just above
agent-browser console                 # check for errors after each interaction
```

Simulated states are possible without clicks: theme is store-driven
(`settingsStore`, persisted on web to localStorage), so boot-time light mode is
seeded before open:

```bash
agent-browser eval "localStorage.setItem('settings\\\\settings-store', JSON.stringify({state:{theme:'light'},version:0})); 1"
agent-browser open http://localhost:8081
```

After editing source files, wait ~3–4 s for Metro's watcher to invalidate, then
reload the page before re-observing.

## Evidence

Capture into `.expo/verify-evidence/<run-name>/` (gitignored with `.expo/`, and
**excluded from cleanup** — proof survives teardown). Screenshot paths must be
**absolute** (the agent-browser daemon's cwd differs from yours):

```bash
EV="$PWD/.expo/verify-evidence/$(date +%Y%m%d-%H%M%S)-<run-name>"
mkdir -p "$EV"
agent-browser screenshot "$EV/01-loaded-dark.png"
agent-browser console > "$EV/console.log" 2>&1
python3 scripts/palette-check.py "$EV/01-loaded-dark.png" --theme dark > "$EV/palette-dark.txt" 2>&1
```

Proof standards:

- **Exercise the real user path** — click the actual header buttons and segmented
  controls through agent-browser; do not flip store state via `eval` and screenshot
  the result, except for boot-time seeding (which must be followed by a real reload).
- **Capture action AND resulting state** — screenshot before and after each
  meaningful interaction, and record what you clicked (keep the `snapshot -i` output
  or the command in a `driven.log`). A misclick is not a failure — undo it, keep the
  capture under an honest name (`00-misclick-*.png`), and re-drive.
- **Verify side effects alongside the visible** — e.g. after a theme toggle, check
  `agent-browser eval "localStorage.getItem('settings\\\\settings-store')"` shows the
  flipped theme, not just different pixels (the key only materializes after the first
  settings change — before that it reads null); after mock wallet disconnect, the
  empty state must be on screen AND the summary/cards gone.
- **Theme claims need `scripts/palette-check.py`** (needs pillow) — and know what it
  can and cannot do: it **always exits 0**; it reports token coverage, it does not
  gate. Read the header line `== palette (<theme>, ...)` — auto-detection must name
  the theme you claim — and check the missing-token list is explainable (e.g.
  `negative` legitimately never renders when nothing is in loss). `--theme` only
  skips detection; it does not reject a wrong-theme capture.
- **Console must be clean** — save `agent-browser console` after the run; red errors
  fail the proof even if pixels look fine.
- **Re-capture after reloads** — a capture right after `reload` can race the bundle
  (mixed dark/light frame, missing cards). Wait ~2–3 s after the mount marker, then
  capture.
- Mock mode is a production boundary here (web has no wallet adapter by design);
  mock candles (`mockOhlcv.ts`) are deterministic per pool, so chart renders are
  reproducible across runs.

## Cleanup

```bash
.agents/skills/verify-yonks/helpers/dev-server.sh stop
agent-browser close        # closes the browser for $AGENT_BROWSER_SESSION only
```

`stop` kills exactly the PID tree recorded at start (lineage walk, never a
name-based pkill); if it reports `nothing recorded`, the running server was
pre-existing — leave it alone. After cleanup, confirm your evidence still exists in
`.expo/verify-evidence/<run-name>/` — a cleanup that eats the proof failed.

If a run died mid-drive, still run both cleanup commands so broken attempts don't
strand Metro on the port or Chromium daemons behind.

## Helpers

- `helpers/dev-server.sh start [port]` — start (or reuse) the Expo web dev server,
  wait for Metro readiness, record the PID tree. Shown in Launch.
- `helpers/dev-server.sh status [port]` — packager liveness + which PID this skill
  recorded. Shown in Doctor.
- `helpers/dev-server.sh stop` — kill the recorded server tree, clear the record.
  Shown in Cleanup.

No other scripts are shipped; capture/audit commands are plain agent-browser and
`scripts/palette-check.py` invocations documented above.

## Feature map

`.agents/skills/verify-yonks/features/README.md` indexes the mapped features. Drive
**one** feature for a smoke proof; drive **every** feature a change touches — a proof
that uses one convenient entry point is incomplete when the map lists others.

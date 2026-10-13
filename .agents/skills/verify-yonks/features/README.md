# Yonks verification map

This directory is the maintained source for verifying the user-facing behavior of
Yonks (Solana DLMM portfolio tracker, `dev.nullphase.yonks`). Read the index before
driving, then use the matching feature file as the recipe. Harness is
**agent-browser** against the Expo web preview in dev-mock mode — see `../SKILL.md`
for launch, doctor, evidence, and cleanup.

## Baseline preconditions

- Dev server running via `.agents/skills/verify-yonks/helpers/dev-server.sh start`
  (port 8081 default) and Metro answering `packager-status:running`.
- Page loaded with the `DEPOSITED` stat visible and the `Dev Mode — Mock Data`
  banner present — no banner means you are not in mock mode; stop.
- agent-browser session scoped: `export AGENT_BROWSER_SESSION="$(agent-browser
  session id --scope worktree --prefix verify)"`, viewport `412 900`.
- Baseline mock state: wallet connected (`DeVM...1111`), 3 positions
  (SOL/USDC in range, BONK/SOL **out of range**, JUP/SOL in range), dark theme
  (settingsStore default).

## Driving conventions

- Re-snapshot (`agent-browser snapshot -i`) immediately before every ref click;
  refs change between snapshots.
- Prefer visible text as the handle; the four header icon pressables are unlabeled
  and identified by DOM order: settings, font picker, theme toggle, wallet.
- Capture action + resulting state: screenshot before/after each interaction into
  `.expo/verify-evidence/<run-name>/`, keep `agent-browser console` output, and run
  `scripts/palette-check.py` for any theme claim — its header line
  `== palette (<theme>, ...)` is the assertion (auto-detected theme must match what
  you claim); the script always exits 0 and never gates by itself.
- A capture right after `reload` can race the bundle (mixed theme, missing cards) —
  wait ~3 s after the mount marker, then capture.
- Verify side effects beyond pixels (localStorage state, list content changes).

## Proof and skip reporting

- Drive the real user path (clicks), not `eval`-flipped store state, except
  boot-time seeding followed by a real reload.
- Report an unreachable path with the attempted command and the unmet precondition;
  never report a skipped entry point as verified through a different path.
- Refresh-driven behavior (stamp/pull-to-refresh) is a **no-op in dev mock**
  (`usePositionsPage.ts` returns early when `env.devMock`) — verify its rendering on
  web and its behavior only on native (`bun run android`); do not report web refresh
  as verified.

## Feature entry contract

Each feature file starts with an H1 and one paragraph of user-visible behavior, then
exactly four H2 sections: `Sub-features`, `How to get to it (user POV)`,
`Driving it with agent-browser`, `Gotchas`.

## Features

| File                              | Feature                                                    |
| --------------------------------- | ---------------------------------------------------------- |
| `portfolio-summary-and-positions.md` | Summary stats, out-of-range banner, position cards     |
| `position-chart-toggle.md`        | Per-card Liquidity ↔ Price chart switch                    |
| `theme-toggle.md`                 | Dark ↔ light theme toggle and persistence                  |
| `wallet-mock-toggle.md`           | Mock wallet disconnect → empty state, reconnect → list     |
| `freshness-stamp-refresh.md`      | "Updated H:MM AM/PM" freshness stamp                       |
| `meteora-pool-link.md`            | Per-card external link to the pool on Meteora              |

## Not verifiable on web (native only)

- Android home-screen widgets (`src/widgets/`, `react-native-android-widget`) —
  preview markup via `node scripts/preview-position-widget.mjs` instead.
- Real wallet sign-in (`@wallet-ui/react-native-kit`) — web stubs it.
- Foreground auto-refresh and the 30s refresh cooldown — `env.devMock` disables them.

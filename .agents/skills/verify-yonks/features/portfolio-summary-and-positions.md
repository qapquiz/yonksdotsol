# Portfolio summary & positions list

The home screen's content area: a portfolio summary card (stat row `DEPOSITED`,
`UNCLAIMED FEES`, plus a `3 POSITIONS` count), a "1 position out of range" banner,
and three position cards (SOL/USDC, BONK/SOL, JUP/SOL) each showing token pair,
range status, value, and PnL. Data comes from `createMockPortfolioResult()`
(`src/services/mockPortfolio.ts`) in dev mock mode.

## Sub-features

- `summary-stats` — summary card renders `DEPOSITED` and `UNCLAIMED FEES` stats and the position count (`3 POSITIONS`).
- `out-of-range-banner` — exactly `1 position out of range` appears above the list (BONK/SOL is the out-of-range mock).
- `position-cards` — three cards render; out-of-range card is visually distinct (secondary/dim accent vs primary).
- `mock-banner` — `Dev Mode — Mock Data` strip under the header confirms mock mode.

## How to get to it (user POV)

- Launch the app — the list is the home screen (`/`); no navigation required.
- Scroll down to see the second and third cards in a 412×900 viewport.

## Driving it with agent-browser

Preconditions: server up (`helpers/dev-server.sh start`), page open, `DEPOSITED`
visible, mock banner present.

- **Wait for content.** `agent-browser wait --text "DEPOSITED" --timeout 120000` — exits 0 once the summary mounts.
- **Assert summary text.** `agent-browser wait --text "UNCLAIMED FEES"` and `agent-browser wait --text "3 POSITIONS"` both succeed.
- **Assert banner.** `agent-browser wait --text "1 position out of range"` succeeds.
- **Screenshot the summary.** `agent-browser screenshot "$EV/01-summary-dark.png"` — top of list shows summary + banner + first card.
- **Scroll to later cards.** `agent-browser scroll down 700` then screenshot again; the JUP/SOL card is reachable at the bottom.
- **Confirm mock mode.** `agent-browser wait --text "Dev Mode — Mock Data"` succeeds.
- **Proof.** `agent-browser console > "$EV/console.log" 2>&1` shows no red errors; screenshots show summary, banner, and all three cards.

## Gotchas

- The first `wait --text` after `open` compiles the web bundle — allow `--timeout 120000` on a cold start.
- Cards render in a `LegendList` with `recycleItems`; off-screen cards may not exist in the accessibility tree until scrolled into view.
- Card order follows mock def order: SOL/USDC, BONK/SOL, JUP/SOL — don't hardcode more than that; `MOCK_PORTFOLIO` additions shift scroll offsets.
- The `DEPOSITED` label also exists in the native widget code (`src/widgets/`) — on web there is exactly one instance on screen, so `wait --text` is unambiguous here.
- A skeleton (`PortfolioSummarySkeleton` + `PositionCardSkeleton`) shows briefly before data lands; a capture during it palettes as all app-bg. Re-capture once settled.

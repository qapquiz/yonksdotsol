# Meteora pool link

Each position card header has a small external-link icon (between the pair name
and the range badge) that opens the pool's page on Meteora:
`https://app.meteora.ag/dlmm/<pairAddress>` (built by `meteoraPoolUrl` in
`src/utils/links.ts`). The pair address flows from `ResolvedPosition.poolAddress`
through `PositionsList` → `PositionCard` → `PositionHeader`; in dev mock the
addresses are fake (`MocK...`), so the opened page is Meteora's route with a
nonexistent pool — the URL is the proof, not the page content.

## Sub-features

- `link-button` — icon button renders on every card with `accessibilityRole="button"` and `accessibilityLabel="View pool on Meteora"`.
- `correct-url` — pressing it navigates to `app.meteora.ag/dlmm/<pairAddress>` for that card's pool.

## How to get to it (user POV)

- Launch the app; each card shows the icon right after the pair name.
- Tap it; the browser leaves the app for Meteora.

## Driving it with agent-browser

Preconditions: page loaded, connected baseline.

- **Assert presence.** `agent-browser eval "document.querySelectorAll('[aria-label=\"View pool on Meteora\"]').length"` — ≥ 1 (one per mounted card).
- **Press it.** `agent-browser eval "document.querySelector('[aria-label=\"View pool on Meteora\"]').click(); 'clicked'"`.
- **Assert URL.** After ~4 s, `agent-browser get url` is `https://app.meteora.ag/dlmm/<pairAddress>` (mock pair address on web).
- **Proof.** Pre-click screenshot showing the icon in the card header + the captured URL.

## Gotchas

- The accessibility snapshot (`snapshot -i`) may not list the button even though
  it is in the DOM — query `[aria-label="View pool on Meteora"]` directly.
- Pressing navigates the harness browser away from the app; `agent-browser open
  http://localhost:8081` returns (app state is mock/static, nothing is lost).
- Clicking with refs is unnecessary — the aria-label is the stable handle.

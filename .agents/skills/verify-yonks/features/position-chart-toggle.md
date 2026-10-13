# Position chart toggle

Each position card has a segmented control (`SegmentedControl`, `src/components/ui/SegmentedControl.tsx`) switching its chart between **Liquidity** (default; bin distribution bar chart via `LiquidityBarChart`) and **Price** (candles via `PriceChart`). On web the candles are deterministic mock OHLCV seeded per pool (`src/services/mockOhlcv.ts`), so renders are reproducible run to run.

## Sub-features

- `liquidity-default` — every card initially shows the liquidity bin distribution with the active-bin marker.
- `price-toggle` — tapping `Price` swaps that card's chart to candles; tapping `Liquidity` swaps back.
- `per-card-state` — the selection is per-card local state; other cards are unaffected.

## How to get to it (user POV)

- Launch the app; every position card carries its own `Liquidity | Price` segmented control under the pair header.
- Tap `Price` on the card you care about; tap `Liquidity` to go back.

## Driving it with agent-browser

Preconditions: page loaded, first card (SOL/USDC) visible in the 412×900 viewport.

- **Baseline.** `agent-browser screenshot "$EV/01-liquidity-default.png"` — first card shows the bar chart.
- **Toggle to Price.** `agent-browser find text "Price" click` — clicks the first card's control (it is the topmost match).
- **Assert swap.** `agent-browser screenshot "$EV/02-price-candles.png"` — first card now renders candles; compare against baseline (pixel diff is expected and is the point).
- **Toggle back.** `agent-browser find text "Liquidity" click` then screenshot — bar chart returns.
- **Second card isolation (optional).** Scroll down ~700px, snapshot, and repeat on the BONK/SOL card; the first card keeps its state until recycled.
- **Proof.** Save before/after screenshots plus `agent-browser console` output; the chart region visibly changes and console stays clean.

## Gotchas

- `Price` / `Liquidity` text exists on **every** card — `find text "Price" click` targets the first match; scroll+snapshot if you need a specific card.
- `find text` may need an exact string match; prefer `snapshot -i` + `click @<ref>` if `find` reports no match (re-snapshot first — refs expire).
- Mock candles are deterministic per pool, not live — identical reloads must render identical charts; a difference across identical reloads is a bug, not market data.
- Chart swap is instant client state; nothing persists — a reload resets every card to Liquidity.

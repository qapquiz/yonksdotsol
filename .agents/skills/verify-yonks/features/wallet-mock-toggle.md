# Mock wallet toggle (connect / disconnect)

On web the wallet button toggles a fake wallet (`src/hooks/useWalletLifecycle.ts`):
connected shows the address `DeVM...1111` with a highlighted avatar and the three
position cards; disconnected shows `Not Connected` and the **empty state**
("No positions found"). This exists precisely to let verification drive both
content states without a wallet adapter.

## Sub-features

- `connected` — header shows `DeVM...1111`, avatar uses primary-dim background, list shows cards + summary.
- `disconnect-to-empty` — tapping the wallet button empties the list and renders `EmptyState` ("No positions found").
- `reconnect` — tapping again restores address, summary, and all three cards.
- `no-real-auth` — on web this never launches a wallet adapter or RPC call (web is mock by design).

## How to get to it (user POV)

- Launch the app — the wallet icon is the **rightmost** of the four round header buttons; connected state shows a bordered icon.
- Tap it to disconnect; tap again to reconnect.

## Driving it with agent-browser

Preconditions: page loaded, connected baseline (`DeVM...1111` visible).

- **Baseline.** `agent-browser wait --text "DeVM...1111"` succeeds; screenshot `$EV/01-connected.png`.
- **Disconnect.** `agent-browser snapshot -i`; the root container is ref #1 and the
  header buttons are refs #2–#5 in code order (settings, font, theme, **wallet**),
  so wallet is **ref #5** of the snapshot output. Snapshot and click in one
  invocation: `REF=$(agent-browser snapshot -i | grep -oP 'ref=\K[^]]+' | sed -n 5p);
  agent-browser click "@$REF"`.
- **Assert empty state.** `agent-browser wait --text "No positions found"` succeeds and `agent-browser wait --text "DEPOSITED" --timeout 3000` **fails** (summary is gone). Header reads `Not Connected`. Screenshot `$EV/02-empty.png`.
- **Reconnect.** Re-snapshot, click ref #5 again (the same wallet button).
- **Assert restore.** `agent-browser wait --text "DEPOSITED" --timeout 30000` succeeds; `DeVM...1111` is back; screenshot `$EV/03-reconnected.png`.
- **Proof.** The three screenshots plus console output; content visibly swaps both ways and console stays clean.

## Gotchas

- The wallet button is unlabeled — it is ref #5 in the snapshot output (root is #1;
  #2–#5 are settings, font, theme, wallet in code order). Don't guess; take it from
  a fresh snapshot in the same invocation as the click. Clicking #4 or #3 instead
  toggles theme or opens the FontPicker — undo and re-drive.
- In empty state the freshness stamp is intentionally absent (it only describes live data), and pull-to-refresh **is** present but is a no-op in mock — see `freshness-stamp-refresh.md`.
- `walletReady` never flips back to false in mock (the hook hardcodes it true), so disconnecting must not re-show the skeleton — a skeleton after disconnect is a bug.
- On native this button opens real wallet sign-in; this recipe is web-mock only.

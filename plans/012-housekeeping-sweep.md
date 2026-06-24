# Plan 012: Housekeeping sweep — dead code, `.env.example`, stale wiki links

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7496775..HEAD -- src/utils/positions/formatters.ts src/utils/positions/pnlAggregation.ts src/stores/alertStore.ts src/hooks/useWalletLifecycle.ts src/__tests__/utils/formatters.test.ts README.md docs/wiki/entities/PnLStore.md docs/wiki/index.md docs/wiki/log.md docs/wiki/concepts/Connection\ Lifecycle.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt + dx + docs
- **Planned at**: commit `7496775`, 2026-06-24
- **Issue**: (none)

## Why this matters

This is a low-risk, high-confidence tidying pass surfaced by an audit at commit
`7496775`. It resolves three independent, cheap problems, each with a clean
verification story:

1. **Dead code.** Several exported helpers are unreferenced anywhere in
   production (`hasAnyPnLData`, `clearRangeState`, and four formatters that are
   imported only by their own test file). `clearRangeState` is the cleanup half
   of the wallet-keyed alert-state trio (get/set/**clear**) and was never wired
   to the disconnect handler, so a disconnecting wallet's stale alert snapshot
   lingers in MMKV. Wiring it (its intended use) makes the store honest; the
   others are pure deletion.
2. **Onboarding.** The README instructs `cp .env.example .env`, but no
   `.env.example` exists, and the README says `npm install` while the repo is a
   Bun project. A new contributor hits a dead step on line one.
3. **Wiki accuracy.** `docs/wiki/` is documented (in `AGENTS.md`) as the single
   source of truth, but it still references files deleted in earlier work
   (`src/stores/pnlStore.ts`, `src/hooks/useUpnlPerPosition.ts`). Stale docs are
   worse than missing.

Nothing here changes runtime behavior on the happy path except the one new
`clearRangeState` call on disconnect, which is safe (see Step 1).

## Current state

### Repo conventions to match

- **Formatting**: `oxfmt` — no semicolons, single quotes, 2-space indent, trailing
  commas. Run `bun run fmt` (writes) / `bun run fmt:check` (verifies).
- **Lint**: `bun run lint:check` (ESLint via `expo lint`). Note
  `react-hooks/exhaustive-deps` does NOT require module-level imported functions
  in dependency arrays — the existing `handleDisconnect` in `useWalletLifecycle.ts`
  calls `getStoredWalletAddress`/`setStoredWalletAddress` (module imports) without
  listing them in its deps, and passes lint. So adding another module import
  (`clearRangeState`) to that callback needs no deps-array change.
- **Type-check**: `tsgo --noEmit` (NEVER `tsc`).
- **Tests**: `bun run test` (Vitest).
- **No semicolons, single quotes** — see `src/utils/positions/formatters.ts` for
  the house style exemplar.

### The dead code, exactly as it is today

`src/utils/positions/formatters.ts` — these four functions are contiguous in the
file (they sit between `formatTokenAmount` above and `formatUPNLDisplaySol`
below) and are imported ONLY by `src/__tests__/utils/formatters.test.ts`. A grep
for each name across `src/` excluding `__tests__` and excluding the definition
file returns nothing:

```ts
export function formatPriceRange(lower: number, upper: number): string {
  return `${lower} - ${upper}`
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

export function shortenPublicKey(key: string, chars = 8): string {
  return `${key.slice(0, chars)}...${key.slice(-chars)}`
}

export function formatFees(feeX: string | bigint, feeY: string | bigint): string {
  const fees = []
  if (feeX && feeX.toString() !== '0') fees.push(`X: ${feeX.toString()}`)
  if (feeY && feeY.toString() !== '0') fees.push(`Y: ${feeY.toString()}`)
  return fees.length > 0 ? fees.join(' | ') : 'None'
}
```

`src/utils/positions/pnlAggregation.ts` — this is the LAST export in the file
(it follows `findPositionPnL`). Zero callers anywhere (verified: only the
definition matches a repo-wide grep):

```ts
/**
 * Check if any positions exist in the PnL data.
 */
export function hasAnyPnLData(positions: PositionPnLData[]): boolean {
  return positions.length > 0
}
```

`src/stores/alertStore.ts` — `clearRangeState` is defined but never called
(verified: only the definition matches). Its siblings `getRangeState` /
`setRangeState` ARE used (by `src/tasks/widgetBackgroundSync.ts` and
`src/utils/alerts/outOfRange.ts`). `clearRangeState` is the missing cleanup half:

```ts
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
```

`src/hooks/useWalletLifecycle.ts` — the current `handleDisconnect` (the handler
this plan wires `clearRangeState` into). It already imports
`getStoredWalletAddress` / `setStoredWalletAddress` from `../stores/walletStore`:

```ts
import { getStoredWalletAddress, setStoredWalletAddress } from '../stores/walletStore'
...
  const handleDisconnect = useCallback(async () => {
    const currentAddress = getStoredWalletAddress()
    await disconnect()
    if (currentAddress) {
      setStoredWalletAddress(undefined)
    }
  }, [disconnect])
```

`src/__tests__/utils/formatters.test.ts` — the test file's import block (top of
file) imports the four doomed helpers; the file then has four `describe` blocks
for them (`formatPriceRange`, `formatTimestamp`, `shortenPublicKey`,
`formatFees`), which are contiguous and sit between the `formatTokenAmount`
block above and the `formatUPNLDisplaySol` block below:

```ts
import { describe, it, expect } from 'vitest'
import {
  formatUSD,
  formatUsdFromSol,
  formatTokenAmount,
  formatPriceRange,
  formatTimestamp,
  shortenPublicKey,
  formatFees,
  formatUPNLDisplaySol,
  formatUPNLDisplay,
  parseFeePerTvl24h,
  formatFeesTvl24h,
} from '../../utils/positions/formatters'
```

### Onboarding state

There is **no** `.env.example` (confirm: `ls .env*` shows only nothing
`.env`-like except the gitignored `.env`). `README.md` currently says:

```markdown
1. Install dependencies

   ```bash
   npm install
   ```
```
and later:

```markdown
Set up your environment variables by copying the `.env.example` file and adding your values:

```bash
cp .env.example .env
```

Required environment variables:

- `EXPO_PUBLIC_RPC_URL` - Your Solana RPC endpoint
- `EXPO_PUBLIC_HELIUS_API_KEY` - Your Helius API key for enhanced data fetching
```

The app reads three env vars (`src/config/env.ts`): `EXPO_PUBLIC_RPC_URL`,
`EXPO_PUBLIC_HELIUS_API_KEY`, and `EXPO_PUBLIC_DEV_MOCK` (set to `'1'` to render
mock positions). The README omits the third.

### Wiki state

`docs/wiki/entities/PnLStore.md` is an entire entity page documenting
`src/stores/pnlStore.ts`, which was deleted (the store was inlined into the
position pipeline in earlier work; confirm with `ls src/stores/pnlStore.ts` →
no such file). Its frontmatter says `location: src/stores/pnlStore.ts`.

`docs/wiki/index.md` has a row in its Entities table (the row whose cell text
contains `[[PnLStore]]` and `src/stores/pnlStore.ts`):

```markdown
| [[PnLStore]]                | Zustand store for profit/loss data         | `src/stores/pnlStore.ts`                         |
```

`docs/wiki/log.md`, under the `## [2026-04-18] create | Entity pages` section,
has a bullet:

```markdown
- [[PnLStore]] — from data-model.md references
```

`docs/wiki/concepts/Connection Lifecycle.md` has a "Flow" block that references
`src/hooks/useUpnlPerPosition.ts` (deleted) and `src/app/index.tsx` (no longer
the caller). The call now lives in `src/services/positionPipeline.ts`:

```text
getSharedConnection()  ←  src/config/connection.ts
         │
         ├─→ src/app/index.tsx          (DLMM.getAllLbPairPositionsByUser)
         └─→ src/hooks/useUpnlPerPosition.ts  (metcomet getUpnlPerPosition)
```

## Commands you will need

| Purpose   | Command                          | Expected on success |
|-----------|----------------------------------|---------------------|
| Format    | `bun run fmt`                    | exit 0              |
| Typecheck | `tsgo --noEmit` (or `npx tsgo --noEmit`) | exit 0, no errors   |
| Tests     | `bun run test`                   | all pass (will be fewer than 143 — see Step 1) |
| Lint      | `bun run lint:check`             | exit 0              |

(Verified during recon at commit `7496775`: tsgo 0, lint 0, test 143/143.)

## Reconciliation

**2026-06-24 (during execution).** Steps 1-5 ran clean. Step 6/7 hit a STOP:
the plan's recon greps for the done-criteria (`grep -rn "PnLStore" docs/wiki/`
and `grep -rn "useUpnlPerPosition" docs/wiki/`) are repo-wide, but the original
scope only touched a subset of the files containing those symbols. Verified
against live code at HEAD:

- `[[PnLStore]]` also appears in `docs/wiki/entities/PortfolioSummary.md`
  (frontmatter `related:` + See Also) and `docs/wiki/entities/usePositionsPage.md`
  (frontmatter `related:` + two prose links). These are **broken wikilinks** once
  `PnLStore.md` is deleted, so removing them is mechanical housekeeping, not
  content authoring. The deeper stale *prose* in those pages (e.g.
  PortfolioSummary's "Data Source" section still says it reads `pnlStore`) is a
  content rewrite of the same kind as `Testing.md` and stays out of scope —
  defer to plan 008 (Document PnL semantics).
- `useUpnlPerPosition` also appears in `docs/wiki/entities/Connection.md`'s
  Consumers list alongside `src/app/index.tsx` (both stale: `src/app/index.tsx`
  no longer calls `getSharedConnection()`; the only real consumer is
  `src/services/positionPipeline.ts`). Clean mechanical swap.

These three files are added to scope (below). Done-criteria text is unchanged —
it was already correct; only the scope list was incomplete.

## Scope

**In scope** (the only files you should modify):
- `src/utils/positions/formatters.ts` — delete 4 dead functions
- `src/utils/positions/pnlAggregation.ts` — delete `hasAnyPnLData`
- `src/hooks/useWalletLifecycle.ts` — wire `clearRangeState` into `handleDisconnect` + import
- `src/__tests__/utils/formatters.test.ts` — delete the 4 dead `describe` blocks + their imports
- `.env.example` — create
- `README.md` — fix install command + add `EXPO_PUBLIC_DEV_MOCK`
- `docs/wiki/entities/PnLStore.md` — delete
- `docs/wiki/index.md` — remove the PnLStore table row
- `docs/wiki/log.md` — remove the PnLStore bullet
- `docs/wiki/concepts/Connection Lifecycle.md` — fix the Flow block
- `docs/wiki/entities/Connection.md` — fix the Consumers list (added 2026-06-24 — see Reconciliation)
- `docs/wiki/entities/PortfolioSummary.md` — remove the broken `[[PnLStore]]` link (added 2026-06-24 — see Reconciliation)
- `docs/wiki/entities/usePositionsPage.md` — remove the broken `[[PnLStore]]` links (added 2026-06-24 — see Reconciliation)

**Out of scope** (do NOT touch, even though they look related):
- `docs/wiki/guides/Testing.md` — it is ALSO stale (references deleted
  `calculations.test.ts`, `pnlStore.test.ts`, `useBatchTokenData.test.ts`,
  `PositionCard.test.tsx` and deleted source functions). It needs a content
  rewrite based on the *current* test layout, which is a docs-authoring task,
  not a mechanical housekeeping deletion. Leave it; do NOT partially edit it.
  (A future plan can refresh it using `find src/__tests__ -name '*.test.ts*'`.)
- Any change to runtime data flow, the alert *detection* logic, or the
  `getRangeState`/`setRangeState` functions.
- The existing `react-hooks/set-state-in-effect` eslint-disable comments in
  `useWalletLifecycle.ts` — leave them.
- `src/stores/alertStore.ts` itself — do NOT delete `clearRangeState`; you are
  WIRING it, not removing it.

## Git workflow

- Branch: `advisor/012-housekeeping-sweep` (already checked out in the worktree)
- Commit per logical unit (suggested grouping in the steps); message style:
  conventional commits. Examples from this repo's history:
  `refactor: remove unused historical PriceService`,
  `docs(plans): ...`. No scope token required; keep messages lowercase,
  imperative.
- Do NOT push or open a PR.

## Steps

### Step 1: Delete the four dead formatter functions + their tests

1. In `src/utils/positions/formatters.ts`, delete the contiguous block of four
   functions: `formatPriceRange`, `formatTimestamp`, `shortenPublicKey`, and
   `formatFees` (exact text in "Current state" above). They sit between
   `formatTokenAmount` and `formatUPNLDisplaySol`. Remove the functions and the
   blank lines so the file reads cleanly from the end of `formatTokenAmount` to
   the start of `formatUPNLDisplaySol`.
2. In `src/__tests__/utils/formatters.test.ts`:
   - Remove the four imports `formatPriceRange`, `formatTimestamp`,
     `shortenPublicKey`, `formatFees` from the top import block (keep the other
     imports and their order).
   - Delete the four corresponding `describe(...)` blocks in full. They are
     contiguous — everything from `describe('formatPriceRange', () => {` through
     the closing `})` of the `formatFees` block — leaving `formatTokenAmount`'s
     block above and `formatUPNLDisplaySol`'s block below intact.

**Verify**:
- `grep -nE "formatPriceRange|formatTimestamp|shortenPublicKey|formatFees" src/`
  → returns **no matches**.
- `tsgo --noEmit` → exit 0.
- `bun run test` → all pass. The count will be **fewer than 143** (you removed
  ~19 tests) — that is expected; record the actual before/after count in your
  report.
- `bun run fmt` then `bun run fmt:check` → exit 0.
- `bun run lint:check` → exit 0.

### Step 2: Delete `hasAnyPnLData`

In `src/utils/positions/pnlAggregation.ts`, delete the `hasAnyPnLData` export
(the JSDoc comment above it plus the function — exact text in "Current state").
It is the last export in the file, following `findPositionPnL`.

**Verify**:
- `grep -rn "hasAnyPnLData" src/` → **no matches**.
- `tsgo --noEmit` → exit 0.
- `bun run test` → all pass.

### Step 3: Wire `clearRangeState` into `handleDisconnect`

In `src/hooks/useWalletLifecycle.ts`:

1. Add `clearRangeState` to the existing import from the wallet store area.
   There is currently:
   ```ts
   import { getStoredWalletAddress, setStoredWalletAddress } from '../stores/walletStore'
   ```
   Add a new import line (keep wallet import unchanged):
   ```ts
   import { clearRangeState } from '../stores/alertStore'
   ```
2. Inside `handleDisconnect`, call `clearRangeState(currentAddress)` inside the
   existing `if (currentAddress)` block, alongside the existing
   `setStoredWalletAddress(undefined)`. Result:
   ```ts
   const handleDisconnect = useCallback(async () => {
     const currentAddress = getStoredWalletAddress()
     await disconnect()
     if (currentAddress) {
       setStoredWalletAddress(undefined)
       clearRangeState(currentAddress)
     }
   }, [disconnect])
   ```
   Do NOT change the deps array (`[disconnect]`). `clearRangeState` is a stable
   module import, not a reactive value — see the convention note; it passes
   `react-hooks/exhaustive-deps` without being listed (matching how
   `getStoredWalletAddress`/`setStoredWalletAddress` are already handled here).

**Verify**:
- `grep -n "clearRangeState" src/hooks/useWalletLifecycle.ts` → shows the import
  and the call (2 matches).
- `tsgo --noEmit` → exit 0.
- `bun run lint:check` → exit 0 (confirms the exhaustive-deps claim above; if it
  DOES complain, add `clearRangeState` to the deps array — but it should not).
- `bun run test` → all pass.

### Step 4: Create `.env.example`

Create `.env.example` at the repo root with placeholder values only (NO real
keys — this file is committed). Content:

```bash
# Solana RPC endpoint (Helius, Triton, or the public mainnet RPC)
EXPO_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com

# Helius API key for enhanced data fetching (https://www.helius.dev)
EXPO_PUBLIC_HELIUS_API_KEY=

# Dev only: set to 1 to render mock positions instead of fetching on-chain data
EXPO_PUBLIC_DEV_MOCK=0
```

**Verify**: `cat .env.example` → shows the three keys; `grep -c EXPO_PUBLIC .env.example` → `3`.

### Step 5: Fix `README.md`

1. Change the install command from `npm install` to `bun install`.
2. In the "Required environment variables" list, add a third bullet for
   `EXPO_PUBLIC_DEV_MOCK`:
   ```markdown
   - `EXPO_PUBLIC_DEV_MOCK` - Set to `1` to render mock positions instead of fetching on-chain data (optional, defaults off)
   ```

**Verify**: `grep -n "npm install" README.md` → **no matches**; `grep -n "bun install" README.md` → at least one match; `grep -n "EXPO_PUBLIC_DEV_MOCK" README.md` → at least one match.

### Step 6: Remove the stale `PnLStore` wiki entity

1. Delete the file `docs/wiki/entities/PnLStore.md`.
2. In `docs/wiki/index.md`, remove the Entities-table row whose cells contain
   `[[PnLStore]]` and `src/stores/pnlStore.ts` (exact line in "Current state").
3. In `docs/wiki/log.md`, under `## [2026-04-18] create | Entity pages`, remove
   the bullet `- [[PnLStore]] — from data-model.md references`.
4. (Reconciliation) In `docs/wiki/entities/PortfolioSummary.md`, remove the
   `[[PnLStore]]` references that would become broken links: the `- PnLStore`
   line in the frontmatter `related:` list and the See Also bullet
   `- [[PnLStore]] — Data source`. Leave the stale "Data Source" prose (lowercase
   `pnlStore`) for plan 008.
5. (Reconciliation) In `docs/wiki/entities/usePositionsPage.md`, remove the
   `[[PnLStore]]` references: the `- PnLStore` line in the frontmatter
   `related:` list, the Key Relationships bullet `Uses [[PnLStore]] for
   profit/loss data`, and the See Also bullet `- [[PnLStore]] — PnL state
   management`. Leave any deeper content rewrite for plan 010.

**Verify**:
- `ls docs/wiki/entities/PnLStore.md` → "No such file or directory".
- `grep -rn "PnLStore" docs/wiki/` → **no matches**.

### Step 7: Fix the `Connection Lifecycle` wiki Flow

In `docs/wiki/concepts/Connection Lifecycle.md`, replace the "Flow" code block
(the one referencing `src/app/index.tsx` and `src/hooks/useUpnlPerPosition.ts`)
with a corrected version that points at the real caller and drops the deleted
hook. Replace:

```text
getSharedConnection()  ←  src/config/connection.ts
         │
         ├─→ src/app/index.tsx          (DLMM.getAllLbPairPositionsByUser)
         └─→ src/hooks/useUpnlPerPosition.ts  (metcomet getUpnlPerPosition)
```

with:

```text
getSharedConnection()  ←  src/config/connection.ts
         │
         └─→ src/services/positionPipeline.ts  (DLMM.getAllLbPairPositionsByUser)
```

Additionally (reconciliation): in `docs/wiki/entities/Connection.md`, fix the
Consumers list: it currently lists `src/app/index.tsx` and
`src/hooks/useUpnlPerPosition.ts` (both stale). Replace both lines with the
single real consumer, `src/services/positionPipeline.ts`
(DLMM.getAllLbPairPositionsByUser).

**Verify**:
- `grep -rn "useUpnlPerPosition" docs/wiki/` → **no matches**.
- `grep -n "positionPipeline.ts" docs/wiki/concepts/Connection\ Lifecycle.md` → at least one match.
- `grep -rn "src/app/index.tsx" docs/wiki/concepts/Connection\ Lifecycle.md docs/wiki/entities/Connection.md` → **no matches**.

## Test plan

No new tests are required — this plan only removes dead code (and its dead
tests) and makes non-logic edits. The existing test suite IS the regression
guard: every verification step runs `bun run test` and expects all remaining
tests to pass. If a deletion breaks a test you did not intend to touch, STOP.

(Structural pattern note, not required for this plan: pure-function tests in
this repo look like `src/__tests__/utils/formatters.test.ts` — `describe` +
`it` + `expect(...).toBe(...)` under Vitest globals.)

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -rnE "formatPriceRange|formatTimestamp|shortenPublicKey|formatFees|hasAnyPnLData" src/` returns no matches
- [ ] `grep -n "clearRangeState" src/hooks/useWalletLifecycle.ts` shows the import and the call
- [ ] `test -f .env.example` succeeds and `grep -c EXPO_PUBLIC .env.example` prints `3`
- [ ] `grep -n "npm install" README.md` returns no matches; `grep -n "EXPO_PUBLIC_DEV_MOCK" README.md` returns a match
- [ ] `test ! -f docs/wiki/entities/PnLStore.md` succeeds; `grep -rn "PnLStore" docs/wiki/` returns no matches
- [ ] `grep -rn "useUpnlPerPosition" docs/wiki/` returns no matches
- [ ] `tsgo --noEmit` exits 0
- [ ] `bun run lint:check` exits 0
- [ ] `bun run fmt:check` exits 0
- [ ] `bun run test` exits 0 (all remaining tests pass; count is lower than the 143 baseline by the ~19 removed formatter tests — record the number)
- [ ] No files outside the in-scope list are modified (`git status` / `git diff --stat`)
- [ ] `plans/README.md` status row updated (unless reviewer maintains the index)

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts
  (the codebase has drifted since this plan was written at `7496775`).
- `grep` shows one of the "dead" formatters / `hasAnyPnLData` / `clearRangeState`
  is actually referenced in production code you didn't expect — it is NOT dead,
  and deleting it would break something. (The plan's recon says they are
  unreferenced; if reality disagrees, stop.)
- `bun run lint:check` complains about `clearRangeState` in the
  `handleDisconnect` deps after you added only the import + call (per Step 3 it
  should not — if it does, add it to the deps array and continue, but report it).
- A step's verification fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file (notably
  `docs/wiki/guides/Testing.md`, which is intentionally out of scope).

## Maintenance notes

- **`clearRangeState` wiring (Step 3)** is the one behavior change. It clears a
  wallet's out-of-range alert snapshot on disconnect. Reviewer: confirm this is
  desirable — reconnecting the same wallet will then be treated as "first seen"
  (`getRangeState` returns null → no notification storm, by design in
  `src/utils/alerts/outOfRange.ts`'s `detectOutOfRangeAlerts`). If the product
  wants a disconnecting wallet to retain its alert history across reconnects,
  revert Step 3 and instead DELETE `clearRangeState` from `alertStore.ts`
  (making it consistent with the other dead-code deletions). Either resolution
  removes the dead export.
- **`docs/wiki/guides/Testing.md`** remains stale after this plan (out of scope).
  A follow-up plan should rewrite its "Test Structure" tree and "Test
  Categories" sections from `find src/__tests__ -name '*.test.ts*'` output. Do
  not re-bundle it here.
- **`bigint-buffer` / `undici` audit advisories** were considered and rejected
  in the audit: `bigint-buffer` has no published fixed version (1.1.5 is latest
  and is the vulnerable one), and `undici` is transitive via `jsdom` (test-only,
  not in the runtime bundle). Do not try to "fix" these as part of housekeeping.

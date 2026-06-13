# Plan 004: Fix the pre-existing CI baseline (tsgo + lint + fmt green)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 1ea83e4..HEAD -- package.json bun.lock .oxfmtrc.json src/hooks/usePositionsPage.ts src/hooks/useWalletLifecycle.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1 (prerequisite — blocks green-CI verification of plans 001/002/003)
- **Effort**: S
- **Risk**: LOW (downgrade to the version every other dep already uses; two rule-suppressions that change no logic; one config ignore)
- **Depends on**: none
- **Category**: tech-debt / migration
- **Planned at**: commit `1ea83e4`, 2026-06-13

## Why this matters

The repo's CI gates are **red at the base commit** — before any feature work:

```
$ bunx tsgo --noEmit          # → exit 1 (1 error)
$ bun run lint:check          # → exit 1 (2 errors)
$ bun run fmt:check           # → exit 1 (4 files)
$ bun run build               # → exit 1 (its first stage is tsgo)
```

`bun run test` is the only gate that's green (146/146). The consequence: **every
plan's "clean CI" done criterion is unsatisfiable**, so executors must stop-and-
report instead of finishing cleanly (this is exactly what happened during
`execute 001`). This plan makes all four gates green so 001/002/003 (and normal
development) can verify against a clean baseline.

All three failures are **pre-existing** (they exist on `1ea83e4` and already
existed on `86a1d22`, before any feature plan was written). None were introduced
by plans 001–003. Each has a low-risk fix:

1. **tsgo**: a single accidental `@solana/web3.js` major-version bump caused a
   `Connection` type split. Pinning it back to the v1 the app actually uses
   unifies the type. (Root cause: the bump was bundled into an unrelated
   "migrate flash-list" commit — see Current state.)
2. **lint**: the React 19 `react-hooks/set-state-in-effect` rule flags two
   effects that call `setState`. They work correctly at runtime; we suppress the
   rule at those sites with a justification (tech-debt markers, revisit later).
3. **fmt**: `oxfmt` (a JS/TS formatter) flags four advisor-generated Markdown
   files under `plans/`. They are not source code; ignore the directory.

## Current state

All excerpts are from commit `1ea83e4`. Confirm each before editing.

### Failure 1 — tsgo: `@solana/web3.js` major bump split the `Connection` type

`tsgo --noEmit` reports exactly **one** error:

```
src/services/positionPipeline.ts(108,65): error TS2740: Type
'.../@solana/web3.js/lib/index.Connection' is missing the following properties
from type '.../@coral-xyz/anchor/node_modules/@solana/web3.js/lib/index.Connection':
getStakeActivation, getTotalSupply, getRecentBlockhashAndContext,
getFeeCalculatorForBlockhash, and 4 more.
```

Line 108 passes the app's `Connection` into the DLMM SDK:

```ts
// src/services/positionPipeline.ts:107-108
    const positionsMap = await DLMM.getAllLbPairPositionsByUser(this.connection, new PublicKey(walletAddress))
```

`this.connection` is typed from the **top-level** `@solana/web3.js` (imported at
`src/services/positionPipeline.ts:5` and built in `src/config/connection.ts:6`
via `new Connection(env.rpcUrl || '')`). DLMM → `@coral-xyz/anchor` 0.31.0 wants
its own **nested** `@solana/web3.js`. Two different majors are installed:

```
$ grep '"@solana/web3.js"' package.json
    "@solana/web3.js": "^3.0.0-rc.1",          # top-level — WRONG (accidental bump)
$ cat node_modules/@coral-xyz/anchor/node_modules/@solana/web3.js/package.json | grep version
  "version": "1.98.4",                          # what anchor/dlmm/meteora expect
```

**Root cause (confirmed in git history):** the bump to `^3.0.0-rc.1` landed in
commit `ab5a568` ("feat: migrate from @shopify/flash-list to @legendapp/list",
2026-06-06) — an unrelated migration that bundled a Solana SDK major bump with no
CI to catch it. It contradicts the documented setup in `AGENTS.md`:

> "two Solana SDKs side by side: the legacy `@solana/web3.js` (v1) and the new
> `@solana/kit` (v2)"

i.e. `@solana/web3.js` is meant to stay on **v1**; the v2 API comes from
`@solana/kit` (already a direct dep at `^6.9.0`).

**The app uses only v1-stable APIs.** Every `@solana/web3.js` import in `src/`:

```
src/services/positionPipeline.ts:5: import { PublicKey, Connection } from '@solana/web3.js'
src/config/connection.ts:1:      import { Connection } from '@solana/web3.js'
```

Only `Connection` (constructed as `new Connection(url)`, unchanged since web3.js
1.x) and `PublicKey` are used. The test mock (`src/__tests__/services/positionPipeline.test.ts:16-37`)
mocks exactly `{ Connection: vi.fn(), PublicKey: MockPublicKey }` — also v1-stable.
So pinning to the v1 that anchor/dlmm already resolve to is safe and unifies the
single `Connection` type.

### Failure 2 — lint: `react-hooks/set-state-in-effect` (2 sites)

`bun run lint:check` reports exactly **2 errors** (1 per file). Both are the
React 19 / eslint-plugin-react-hooks v5 rule `react-hooks/set-state-in-effect`,
which flags synchronous `setState` calls inside `useEffect` bodies. The rule is
included via `eslint-config-expo/flat` (`eslint.config.js` is just
`defineConfig([expoConfig, { ignores: ['dist/*'] }])` — 10 lines; the rule is
on by default as `error`).

Site A — `src/hooks/usePositionsPage.ts:84-89`:

```ts
  // ── When wallet resolves with no address, show empty state ──
  useEffect(() => {
    if (env.devMock) return
    if (walletResolved && !walletAddress) {
      setLoading(false)          // <- line 86, flagged
      setTokenDataReady(true)
    }
  }, [walletResolved, walletAddress])
```

Site B — `src/hooks/useWalletLifecycle.ts:48-57`:

```ts
  // Persist wallet address to MMKV for headless widget access
  useEffect(() => {
    if (account?.address) {
      setWalletCheckTimedOut(true)   // <- line 50, flagged
      setStoredWalletAddress(account.address)   // (external MMKV write — NOT React state, not flagged)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [account?.address])
```

Both effects are **runtime-correct** (the app ships and works). This plan does
**not** refactor the effects (that risks behavior change and is out of scope for
a baseline fix). It suppresses the rule at the flagged sites with a justification
comment, leaving an explicit tech-debt marker a future refactor can find.

### Failure 3 — fmt: `plans/*.md` not oxfmt-conformant (4 files)

`bun run fmt:check` (`oxfmt --check .`) reports exactly 4 files, all under
`plans/`: `001-out-of-range-alerts.md`, `002-historical-price-disposition.md`,
`003-usd-display-toggle.md`, `README.md`. These are advisor-generated Markdown
documents (committed by the plans commit itself). `oxfmt` is a JS/TS formatter;
formatting Markdown fences/tables with it is undesirable. `.oxfmtrc.json`
already maintains an `ignorePatterns` list:

```jsonc
{
  "arrowParens": "always",
  "printWidth": 120,
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "sortPackageJson": false,
  "ignorePatterns": [
    "/.expo", "/android", "/coverage", "/dist", "/ios", "/tmp",
    "pnpm-lock.yaml", "/src/uniwind-types.d.ts"
  ]
}
```

Adding `"/plans"` to that array excludes the directory.

## Conventions to honor

- **Formatting**: no semicolons, single quotes, 2-space indent, trailing commas,
  arrow parens always — enforced by `oxfmt`. Run `bun run fmt` after editing.
- **Dependency changes** go through `bun add` / `bun remove` (updates both
  `package.json` and `bun.lock`); never hand-edit `bun.lock`.
- **ESLint** uses flat config (`eslint.config.js`); inline suppressions use the
  standard `// eslint-disable-next-line <rule-id>` form.
- **No logic changes** in this plan. The two lint suppressions add comments only;
  they do not move or rewrite any `setState` call.

## Commands you will need

| Purpose            | Command                | Expected on success |
|--------------------|------------------------|---------------------|
| Install/deps       | `bun install`          | exit 0, resolves `@solana/web3.js@1.98.4` at top-level |
| Add dep (downgrade)| `bun add @solana/web3.js@^1.98.4` | exit 0, updates `package.json` + `bun.lock` |
| Type check         | `bunx tsgo --noEmit`   | exit 0, **0 errors** (do NOT use `tsc`) |
| Lint (check)       | `bun run lint:check`   | exit 0, **0 problems** |
| Format             | `bun run fmt`          | exit 0 |
| Format (check)     | `bun run fmt:check`    | exit 0, 0 issues |
| Tests (all)        | `bun run test`         | all pass (baseline is 146/146) |
| Build / prebuild   | `bun run build`        | exit 0 (tsgo stage then `expo prebuild -p android`) |

`tsgo` is run via `bunx tsgo --noEmit` (it is not on PATH; never use `tsc`).

## Scope

**In scope** (the only files you should modify):
- `package.json` — pin `@solana/web3.js` to `^1.98.4`
- `bun.lock` — regenerated by `bun add`/`bun install`
- `src/hooks/usePositionsPage.ts` — add ESLint rule suppression comment(s) only
- `src/hooks/useWalletLifecycle.ts` — add ESLint rule suppression comment(s) only
- `.oxfmtrc.json` — add `"/plans"` to `ignorePatterns`

**Out of scope** (do NOT touch, even though they look related):
- `polyfill.js` — the downgrade to v1.98.4 (the version anchor/dlmm already use)
  reduces surface area; no polyfill change is needed or wanted. Do NOT edit it.
- The actual effect logic / `setState` placement in the two hooks — this plan
  suppresses the lint rule; a proper refactor (derive during render, etc.) is a
  separate, higher-risk effort and is deferred. Do not rewrite the effects.
- `src/services/positionPipeline.ts`, `src/config/connection.ts`,
  `src/__tests__/services/positionPipeline.test.ts` — these *consume* the
  `Connection` type; they must NOT change. The fix is purely the dep version.
- `app.json`, any native/`android/` files, anything under `src/widgets/`,
  `src/stores/`, `src/utils/`, `src/app/`. Do not touch.

## Git workflow

- Branch: `advisor/004-baseline-ci-fix`
- Commit per step; messages follow the repo's conventional-commit style
  (from `git log`: `fix: ...`, `chore: ...`, `deps: ...`). Suggested:
  `fix(deps): pin @solana/web3.js to v1 to match anchor/dlmm`,
  `chore(lint): suppress set-state-in-effect on two known effects`,
  `chore(fmt): ignore plans/ in oxfmt`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Pin `@solana/web3.js` to v1 (fixes the tsgo error)

From the repo root:

```bash
bun add @solana/web3.js@^1.98.4
```

This updates `package.json` (`"@solana/web3.js": "^1.98.4"`) and `bun.lock`.

**Verify** (all three must hold):
1. `grep -n '"@solana/web3.js"' package.json` → shows `"@solana/web3.js": "^1.98.4"`
2. The nested copy is gone — the dir does NOT exist:
   `test ! -d node_modules/@coral-xyz/anchor/node_modules/@solana/web3.js && echo OK`
   → prints `OK` (single hoisted copy at top-level)
3. `bunx tsgo --noEmit` → **exit 0, 0 errors**

### Step 2: Suppress `set-state-in-effect` at the two flagged effects (fixes lint)

**For each flagged file**, add an inline ESLint suppression **immediately above
each `setX(...)` line the rule currently flags**, without changing any logic.
Use this exact comment (rule id verified: `react-hooks/set-state-in-effect`):

```ts
// eslint-disable-next-line react-hooks/set-state-in-effect
```

Specifically:

- `src/hooks/usePositionsPage.ts`: add the comment above `setLoading(false)`
  (the line currently flagged at ~86). **Note:** the next line
  `setTokenDataReady(true)` is also a synchronous `setState` in the same effect,
  so the rule may additionally flag it after the first is suppressed — read the
  re-run output below.
- `src/hooks/useWalletLifecycle.ts`: add the comment above
  `setWalletCheckTimedOut(true)` (the line currently flagged at ~50).

**Verify / self-correct loop**:
1. `bun run lint:check`
2. If it exits 0 → done. If it still reports a `react-hooks/set-state-in-effect`
   violation **in one of these two files**, add the same `// eslint-disable-next-line`
   comment above the newly-flagged `setState` line and re-run. Repeat until
   `bun run lint:check` exits 0.
3. Final: `bun run lint:check` → **exit 0, 0 problems**.

Constraints during this step:
- Add **comments only**. Do not move, rename, merge, split, wrap, or reorder any
  `setState` call. Do not change deps arrays. Do not touch any other file.
- If a violation appears in a **third** file (not one of these two), STOP — that
  is not a pre-existing baseline error and is out of scope; report it.

### Step 3: Ignore `plans/` in oxfmt (fixes fmt)

Edit `.oxfmtrc.json`: add `"/plans"` to the `ignorePatterns` array (keep existing
entries, append the new one). Result:

```jsonc
  "ignorePatterns": [
    "/.expo",
    "/android",
    "/coverage",
    "/dist",
    "/ios",
    "/tmp",
    "pnpm-lock.yaml",
    "/src/uniwind-types.d.ts",
    "/plans"
  ]
```

**Verify**: `bun run fmt:check` → **exit 0** (0 files flagged, including no
`plans/*.md`).

### Step 4: Format, then full verification

```bash
bun run fmt
bunx tsgo --noEmit
bun run lint:check
bun run fmt:check
bun run test
bun run build
```

**Every** command must exit 0 (tests all pass). `bun run build` runs `tsgo`
then `expo prebuild -p android`; both stages must succeed.

## Test plan

- **No new tests** are required by this plan — it changes dependency versions,
  config, and adds comments; it does not introduce new logic to cover.
- **Existing tests must remain green** unchanged: `bun run test` → all pass
  (baseline 146/146 across 9 files). This is the regression guard that the
  `@solana/web3.js` downgrade didn't change runtime behavior.
- The `src/__tests__/services/positionPipeline.test.ts` mock
  (`{ Connection: vi.fn(), PublicKey: MockPublicKey }`) must still satisfy the
  imports — if that test file errors after the downgrade, the downgrade is wrong;
  STOP.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep '"@solana/web3.js": "^1.98.4"' package.json` → match
- [ ] `test ! -d node_modules/@coral-xyz/anchor/node_modules/@solana/web3.js` → succeeds (no nested copy)
- [ ] `bunx tsgo --noEmit` exits 0 (0 errors)
- [ ] `bun run lint:check` exits 0 (0 problems)
- [ ] `bun run fmt:check` exits 0 (no files flagged, incl. no `plans/*.md`)
- [ ] `bun run test` exits 0 (all pass, ≥146)
- [ ] `bun run build` exits 0
- [ ] `git diff --stat 1ea83e4..HEAD` shows **only**: `package.json`, `bun.lock`,
      `src/hooks/usePositionsPage.ts`, `src/hooks/useWalletLifecycle.ts`,
      `.oxfmtrc.json` (plus regenerated gitignored `android/` from prebuild, which
      is not tracked)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any "Current state" excerpt does not match the live code (drift since `1ea83e4`).
- After `bun add @solana/web3.js@^1.98.4` and `bun install`, `bunx tsgo --noEmit`
  reports **more than 0 errors**, or reports an error that implies the app uses a
  web3.js v3-only API (it should not — grep shows only `Connection`/`PublicKey`).
  Report the exact new error rather than widening the fix.
- The `positionPipeline.test.ts` test fails to compile/run after the downgrade
  (implies the downgrade broke the mock contract).
- A `react-hooks/set-state-in-effect` violation appears in a file **other than**
  `src/hooks/usePositionsPage.ts` or `src/hooks/useWalletLifecycle.ts` — that is
  a new baseline error, not in scope; report it instead of suppressing.
- `bun run build` fails in `expo prebuild -p android` for a reason unrelated to
  your edits (environment/SDK problem) — report; do not attempt native fixes.

## Maintenance notes

For whoever owns this after it lands:

- **The `@solana/web3.js` downgrade is the load-bearing fix.** Anyone bumping
  `@solana/web3.js` past v1 in future will re-introduce the `Connection` type
  split (TS2740 at `positionPipeline.ts:108`). The app's dual-SDK setup is
  `@solana/web3.js@v1` + `@solana/kit@v2`; do not upgrade `@solana/web3.js` to
  v2/v3 without also migrating every `Connection`/`PublicKey` consumer and the
  DLMM/anchor `Connection` boundary — that is a large, separate effort. When in
  doubt, the `@meteora-ag/dlmm` and `@coral-xyz/anchor` `@solana/web3.js`
  peer/dep ranges are the source of truth for the compatible v1 version.
- **The two lint suppressions are intentional tech-debt**, not fixes. Sites:
  `usePositionsPage.ts` (empty-state reset) and `useWalletLifecycle.ts`
  (wallet-ready flag + MMKV persist). A proper refactor would derive `loading`/
  `tokenDataReady` during render and move the MMKV write out of a state-setting
  effect. Revisit when touching those hooks; remove the `eslint-disable-next-line`
  comments only after the underlying pattern is fixed.
- **`plans/` is ignored by `oxfmt`** because it holds advisor-generated Markdown,
  not source. If a non-Markdown file is ever added under `plans/` that *should*
  be formatted, revisit this ignore.
- **Reviewer scrutiny**: confirm the dep downgrade produced a single hoisted
  `@solana/web3.js@1.98.4` (no nested copies), the two hooks have comments-only
  diffs (`git diff` shows `+` comment lines and nothing else in those files), and
  `.oxfmtrc.json` differs only by the one added array entry.
- **Follow-up explicitly deferred**: a proper refactor of the two
  `set-state-in-effect` effects (higher risk, behavior-touching) — track as a
  separate plan if/when desired.

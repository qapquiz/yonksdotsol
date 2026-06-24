# Plan 008: Document PnL semantics in the wiki

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 7496775..HEAD -- docs/wiki/index.md src/services/positionPipeline.ts`
> If `docs/wiki/index.md` changed since this plan was written, re-read its
> current table format before adding a row.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (docs only — no code changes)
- **Depends on**: none (can be done at any time; references Plans 005–007 as "future state" — note that in the page)
- **Category**: docs
- **Planned at**: app commit `7496775`, 2026-06-14

## Why this matters

Three non-obvious facts about the PnL numbers are not written down anywhere,
and this session re-derived them from source + the Meteora OpenAPI spec. The
next person to ask "does SOL PnL use the deposit-time SOL price?" or "why
doesn't the % change when I toggle USD?" will waste the same hour. This plan
records the findings as a wiki page so the answer is one search away.

The findings to record:
1. USD is canonical; SOL is a derived conversion (server computes USD from full deposit/withdrawal/fee history; SOL fields are nullable because they depend on a `solPrice` being available).
2. Two SOL-pricing methodologies coexist in the API: `totalDepositSol` and the aggregate `totalPnlSol` use **historical per-event** SOL pricing (each event valued at the SOL price at its timestamp); per-position live fields are described as "current/live" SOL (spec is ambiguous on the exact derivation).
3. The SOL/USD % change fields are expected to be equal (both derived from the same spot `solPrice`, so the price cancels in the ratio) — which is why the app's % does not change on toggle.

## Current state

**Wiki location**: `docs/wiki/` (Obsidian vault, single source of truth per `AGENTS.md`).
- Index: `docs/wiki/index.md` — a table of `| [[Page]] | description | path |` rows.
- Schema: `docs/wiki/WIKI_SCHEMA.md` — page conventions.
- Existing related pages (from `docs/wiki/index.md`): `[[PositionInfo]]`, `[[PnLStore]]`, `[[usePositionsPage]]`, `[[computePositionViewData]]`, `[[PortfolioSummary]]`. No page documents the PnL *semantics* (USD-canonical, SOL-derivation, historical vs spot).

**No PnL-semantics page exists.** Confirm before starting:
```
ls docs/wiki/ | grep -iE "pnl|semantics|currency"
```
Expected: no `PnL-Semantics` page (if one now exists, this plan is moot — STOP and reconcile).

**Evidence to cite** (from this session's investigation; the executor should re-verify the key claims by reading the cited lines):
- `node_modules/metcomet/dist/index.d.ts` — `PositionPnLData`: `pnlUsd: string` (non-null), `pnlSol: number | null` (nullable). The nullability asymmetry is the primary evidence that USD is canonical.
- Meteora OpenAPI (`https://dlmm.datapi.meteora.ag/api-docs/openapi.json`, fetched 2026-06-14):
  - `PoolOpenPortfolioItem.totalDepositSol`: "Total deposit in SOL (historical per-event SOL price)".
  - `PortfolioTotalResponse.totalPnlSol`: "Total PnL in SOL across all pools (historical per-event SOL price)".
  - `PoolOpenPortfolioItem.pnlSol`: "Live PnL in SOL".
- App display: `src/components/positions/PortfolioSummary.tsx:217` renders `totalPnlPercent` (sourced from `pnlSolPctChange`) with no currency branch.
- App aggregation: `src/utils/positions/pnlAggregation.ts:57` reads only `pos.pnlSolPctChange`.

**Repo conventions** for wiki: read `docs/wiki/WIKI_SCHEMA.md` first and follow its page format. Use Obsidian `[[wikilinks]]` to existing pages. Markdown. Keep the index table columns consistent with existing rows.

## Commands you will need

| Purpose        | Command                                  | Expected on success |
|----------------|------------------------------------------|---------------------|
| Check no dupe  | `ls docs/wiki/ \| grep -iE "pnl\|semantics"` | no PnL-semantics page |
| Schema         | `cat docs/wiki/WIKI_SCHEMA.md`           | file exists          |
| Link check     | (manual review in Obsidian, or `grep -r "PnL Semantics" docs/wiki/`) | backlinks resolve |

## Scope

**In scope**:
- `docs/wiki/PnL-Semantics.md` — create.
- `docs/wiki/index.md` — add one table row linking to the new page.

**Out of scope** (do NOT touch):
- Any source code.
- Other wiki pages (only link to them).
- `docs/raw/` — raw notes; not needed here since the source-of-truth page goes straight into the wiki.

## Git workflow

- Branch: `docs/pnl-semantics`
- Commit style: conventional commits. Example: `docs: add PnL semantics wiki page`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Read the wiki schema and an exemplar page

```
cat docs/wiki/WIKI_SCHEMA.md
```
Then read one existing short page to match tone/format, e.g. `docs/wiki/PortfolioSummary.md` (or whatever the index points to). Note the heading structure, frontmatter (if any), and how `[[wikilinks]]` are used.

**Verify**: you can name the required headings/frontmatter from the schema.

### Step 2: Write `docs/wiki/PnL-Semantics.md`

Follow the schema's format. Content (adapt phrasing to the schema's voice; keep the technical claims exact):

```markdown
# PnL Semantics

> How the portfolio PnL numbers are computed, what currency is canonical,
> and what "SOL PnL" actually means.

## TL;DR

- **USD is canonical.** The Meteora API computes PnL in USD from the full
  deposit/withdrawal/fee history; SOL amounts are derived.
- **SOL fields are nullable** because they depend on a `solPrice` being
  available; when it isn't, USD stays and SOL drops out.
- **Two SOL methodologies coexist**: aggregate fields
  (`totalDepositSol`, portfolio `totalPnlSol`) use **historical per-event**
  SOL pricing; per-position "live" fields use current/spot SOL (spec is
  ambiguous on exact derivation).
- **The % does not change on the SOL/USD toggle** — the app always shows
  `pnlSolPctChange`, which under the API's derivation equals `pnlPctChange`.

## Sources

- Library types: `node_modules/metcomet/dist/index.d.ts` — `PositionPnLData`
  has `pnlUsd: string` (non-null) vs `pnlSol: number | null` (nullable).
- Meteora OpenAPI spec: <https://dlmm.datapi.meteora.ag/api-docs/openapi.json>
  (fetched 2026-06-14). See field `description`s on `PoolOpenPortfolioItem`,
  `TotalMetrics`, and `PortfolioTotalResponse`.

## USD is canonical

`PositionPnLData` (`metcomet`) and the `/positions/{pool}/pnl` response:

| Field            | Type              | Meaning |
|------------------|-------------------|---------|
| `pnlUsd`         | `string`          | Real PnL, USD (server-computed) |
| `pnlPctChange`   | `string`          | % change, USD |
| `pnlSol`         | `number \| null`  | SOL amount (derived; null if no `solPrice`) |
| `pnlSolPctChange`| `number \| null`  | % change, SOL (derived) |

The USD number is the trustworthy economic PnL. SOL is a convenience
conversion — "how much SOL your USD profit buys today."

## Two SOL-pricing methodologies

The OpenAPI field descriptions distinguish them explicitly:

- **Historical per-event SOL price**: each deposit/withdrawal/fee event is
  valued at the SOL price *at the time of that event*. Used for
  `PoolOpenPortfolioItem.totalDepositSol` ("Total deposit in SOL
  (historical per-event SOL price)") and `PortfolioTotalResponse.totalPnlSol`
  ("Total PnL in SOL across all pools (historical per-event SOL price)").
  This is **true SOL-numeraire accounting** — already computed server-side,
  no Helius key required.
- **Current/live SOL**: `PoolOpenPortfolioItem.pnlSol` is described as
  "Live PnL in SOL". The exact derivation is not specified in the spec;
  treat it as spot-derived unless empirically verified otherwise.

There is a *separate* SDK path (`metcomet`'s `getUpnl` /
`getInitialDepositsHelius` using `getSolPriceByTimestamp(tx.timestamp)`) that
also computes historical-SOL PnL client-side — but it requires a Helius API
key and (for the per-position variant) a SOL-containing pool. The app does
not currently use it; the REST aggregate fields are the cheaper equivalent.

## Why the % does not change on the SOL/USD toggle

The app renders `totalPnlPercent` from `pnlSolPctChange` regardless of the
[[PortfolioSummary]] currency toggle (`src/components/positions/PortfolioSummary.tsx`,
sourced via `src/utils/positions/pnlAggregation.ts`). Since the API derives
both `pnlSol` and `totalDepositSol`-equivalents from the same `solPrice`,
the price cancels in the ratio and the USD and SOL percentages are expected
to be equal. Toggling the value to USD therefore changes the displayed
amount but not the percentage.

> Open empirical question: if a real-API sample ever shows `pnlSolPctChange`
> ≠ `pnlPctChange`, the above reasoning is wrong for that endpoint and the
> toggle should switch the % source too. Not observed as of 2026-06-14.

## See also

- [[PortfolioSummary]] — the SOL/USD toggle UI.
- [[computePositionViewData]] — where per-position `pnlSol` enters the view model.
- [[PnLStore]] — where aggregated PnL is held.
- `plans/` — Plans 005–007 switch the widget to the `/portfolio/open` server
  totals (historical-SOL deposit) and add the USD toggle to the widget.
```

**Verify**: the file exists and renders (head the file: `head docs/wiki/PnL-Semantics.md`).

### Step 3: Add the index row

In `docs/wiki/index.md`, add a row in the existing table format near the related pages (PositionInfo / PortfolioSummary cluster):

```markdown
| [[PnL Semantics]]           | How PnL is computed; USD canonical, SOL derived; historical vs spot SOL | _(this wiki)_                                           |
```

Match the exact column count and separator style of the existing rows. The path column for a top-level wiki page can be `_(this wiki)_` or whatever the schema/existing rows use — copy an existing top-level-page row's path cell exactly.

**Verify**: `grep "PnL Semantics" docs/wiki/index.md` → 1 match.

### Step 4: Verify links resolve

Check that every `[[wikilink]]` in the new page points to an existing page:

```
grep -oE "\[\[[^]]+\]\]" docs/wiki/PnL-Semantics.md | sort -u
```
For each, confirm a matching file exists under `docs/wiki/` (e.g. `[[PortfolioSummary]]` → `docs/wiki/PortfolioSummary.md` or per the schema's filename convention). `plans/` is a relative path, not a wikilink — fine.

If a linked page does not exist, either drop the link or note it as a stub to create later. Do NOT create stub pages in this plan.

**Verify**: every `[[wikilink]]` resolves to an existing file (or is intentionally removed).

## Test plan

- No automated tests (docs-only).
- Verification is the link-resolution check in Step 4 plus a human read of the page for accuracy against the cited evidence.

## Done criteria

ALL must hold:

- [ ] `docs/wiki/PnL-Semantics.md` exists
- [ ] `grep "PnL Semantics" docs/wiki/index.md` → 1 match
- [ ] Every `[[wikilink]]` in the new page resolves to an existing `docs/wiki/` file
- [ ] `tsgo --noEmit` still exits 0 (sanity — no code touched, but confirms no accidental edit)
- [ ] No files outside `docs/wiki/PnL-Semantics.md` and `docs/wiki/index.md` are modified (`git status`)

## STOP conditions

Stop and report back (do not improvise) if:

- `docs/wiki/PnL-Semantics.md` (or a same-named page) already exists — reconcile instead of duplicating.
- The wiki schema in `docs/wiki/WIKI_SCHEMA.md` mandates a structure that conflicts with the proposed content (e.g. it forbids "Sources" sections or requires specific frontmatter) — adapt to the schema and report the deviation.
- A cited evidence line no longer holds (e.g. re-reading `node_modules/metcomet/dist/index.d.ts` shows `pnlSol` is no longer nullable) — the codebase/spec has drifted; update the claim to match reality and flag it.

## Maintenance notes

- **Update this page** whenever the data path changes. In particular, when Plans 005–007 land, the "See also" note about the widget becomes "the widget uses /portfolio/open totals" (present tense) — flip the wording.
- **Re-verify the empirical question** (do the two percentages actually equal?) if anyone switches the % source or adds a new endpoint — record the result here.
- **The OpenAPI fetch date (2026-06-14)** is in the page on purpose; if the spec changes, the field descriptions cited here are the anchor for detecting drift.
- **Reviewer focus**: factual accuracy of the three claims against the cited `file:line`/spec evidence; no overclaiming where the spec is ambiguous.

# Executing plans with herdr

Operational recipe for running a plan in `plans/` (e.g. `0NN-*.md`) inside a
herdr-managed agent workspace. Distilled from executing plans 001 and 003.

## Why a workspace, not a split

herdr has two ways to place an agent relative to your conversation:

| Mechanism | Result | Problem on mobile |
| --- | --- | --- |
| `agent start --split right\|down` | a pane **inside the current window** | the agent is squeezed into a tiny sliver of an already-small screen; pi's TUI renders nothing useful → "blank window" |
| `agent start --workspace <id>` (no `--split`) | a pane in a **separate workspace = separate window** | ✅ the agent owns a full screen |

**Always use a separate workspace.** You observe the agent from the sidebar
(live status dot) and switch into its window only when you want to read output.

## The gotcha: `worktree create` opens a root shell pane

`herdr worktree create --label <x>` does two things at once:

1. creates the new workspace, and
2. eagerly opens an idle **shell** pane in it (the `root_pane` in the JSON result).

If you then run a bare `herdr agent start --workspace <id>` (no `--tab`,
no `--split`), herdr puts pi into the workspace's active tab — which already
has that shell pane — so it **splits again**, giving you two panes: the useless
shell + the agent. This is the split that confused us the first time.

## Recipe A (preferred): `worktree create` then `pane run` — no shell pane left behind

Reuse the root pane that `worktree create` already made. One pane total, no split.

```bash
cd <repo-root>   # e.g. /home/moshi/forge/yonksdotsol

# 1. Worktree + new workspace. Note both fields from the JSON result.
herdr worktree create \
  --cwd "$PWD" \
  --branch advisor/0NN-short-slug \
  --label "0NN short" \
  --no-focus \
  --json
#   → result.root_pane.pane_id        (the shell pane to reuse)
#   → result.workspace.workspace_id   (the new workspace)
#   → result.worktree.path            (the checkout path)

# 2. Run the agent IN that root pane (overwrites the shell). No split.
herdr pane run <root_pane_id> -- pi '<task prompt>'
```

## Recipe B: `worktree create` then `agent start`, then close the shell

If you prefer `agent start` (e.g. you want `--focus` behaviour), close the
spurious root shell afterward so pi owns the full window:

```bash
herdr worktree create --cwd "$PWD" --branch advisor/0NN-slug --label "0NN" --no-focus --json
#   → root_pane.pane_id, workspace.workspace_id, worktree.path

herdr agent start pi \
  --workspace <workspace_id> \
  --cwd <worktree.path> \
  --no-focus \
  -- pi '<task prompt>'

herdr pane close <root_pane_id>   # removes the idle shell; pi now full-window
```

> Closing the shell **renumbers** panes (the surviving pane becomes `-1`).
> After closing, re-resolve the agent's pane id from `herdr agent list` before
> any pane-targeted command. Prefer `terminal_id` as the stable target — it does
> not change on pane close/renumber.

## Task prompt template

The positional `<messages...>` is pi's initial task. Keep it tight and load-bearing:

```
You are executing plan 0NN in this worktree. Read plans/0NN-<slug>.md fully and
follow it step by step.

Drift note: <list anything that landed on main since the plan was written, and
whether the plan anticipates it — so the executor doesn't treat expected drift
as a STOP>.

Commit per step with conventional-commit style on branch advisor/0NN-<slug>
(already checked out here). Do not push. Honor all STOP conditions. When done,
update the 0NN status row in plans/README.md to DONE with a one-line execute log.
```

Defaults are inherited from `~/.pi/agent/settings.json` (provider `zai`,
model `glm-5.2`, thinking `high`) — no need to pass them.

## Observing the executor

| Want | Command / action |
| --- | --- |
| Glance at progress | sidebar agent panel — green=working, red=blocked, grey=idle (scope `all` shows agents across all workspaces) |
| Jump into its window | `herdr agent focus <target>` |
| Tail scrollback | `herdr agent read <target> --source recent --lines 80` |
| Block until done | `herdr agent wait <target> --status idle --timeout 1800000` |
| Poll loop (progress signal) | see "Poll loop" below |

**Target disambiguation.** Once a second agent is running, `pi` alone is
ambiguous. Use, in order of stability:

1. `terminal_id` (e.g. `term_6543247bf7c6e1b`) — survives pane close/renumber. **Preferred.**
2. `pane_id` (e.g. `w6543245795f4316-1`) — changes when the shell is closed.
3. `workspace_id` (e.g. `w6543245795f4316`).

### Poll loop

Plan 003 finished in ~6 min, before the first poll. Poll anyway — it's cheap and
the commit count is a good progress signal (commit-per-step → ~0–10 commits):

```bash
term=<terminal_id>; wt=<worktree-path>; branch=<branch>; deadline=$((SECONDS+1500))
last=""
while [ $SECONDS -lt $deadline ]; do
  case "$(herdr agent get "$term" 2>/dev/null)" in
    *'"agent_status":"working"'*) s=working;;
    *'"agent_status":"idle"'*) s=idle;;
    *'"agent_status":"blocked"'*) s=blocked;;
    *) s=gone;;
  esac
  commits=$(git -C "$wt" rev-list --count "main..$branch" 2>/dev/null || echo "?")
  cur="$s commits=$commits"
  [ "$cur" != "$last" ] && { echo "[$(date +%H:%M:%S)] $cur"; last="$cur"; }
  case "$s" in idle|blocked|gone) echo "TERMINAL=$s after ${SECONDS}s"; break;; esac
  sleep 20
done
```

## Verifying the result (do NOT trust the executor's self-report)

The executor updates `plans/README.md` itself and prints a verdict table. Re-run
every gate independently from the worktree before merging:

```bash
cd <worktree-path>
bunx tsgo --noEmit          # do NOT use tsc
bun run fmt:check
bun run lint:check
bun run test
bun run build               # tsgo + expo prebuild -p android (slow)
```

Also check:

```bash
# scope: only in-scope files modified, nothing out-of-scope
git diff --stat main...<branch>
# done-criteria greps from the plan, e.g. for 003:
grep -rn "WRAPPED_SOL_MINT" src/
```

Common executor mistakes to watch for:
- **Wrong model name in the execute log** (e.g. wrote `glm-4.6`, was `glm-5.2`). Cosmetic but worth fixing.
- **Optional steps skipped** — confirm they were marked OPTIONAL/DEFERRABLE in the plan (003 legitimately deferred Step 9 widget USD).
- **Scope creep** — diff the file list against the plan's "In scope" section.

## Merging and cleaning up

```bash
cd <repo-root>

# 1. Pre-flight: conflict-free?
git merge-tree $(git merge-base main <branch>) main <branch> | grep -c "^<<<<<<<"   # 0 = clean

# 2. Merge (no-ff keeps the plan's commit grouping visible)
git merge --no-ff <branch> -m "Merge <branch>: <one-line summary>"

# 3. Smoke check on main
bunx tsgo --noEmit

# 4. Remove the worktree + workspace, delete the merged branch
herdr worktree remove --workspace <workspace_id> --force
git branch -d <branch>
```

`git branch -d` (lowercase) refuses to delete an unmerged branch — a free safety
net. Use `-D` only if you've explicitly decided to discard.

## Gotchas (learned the hard way)

- **`agent get` JSON shape.** Status is at `result.agent_status`, not a stable
  enum — match on the string `'"agent_status":"<state>"'` in the raw JSON.
- **`git commit --amend` only amends the staged index.** If your edit shows as
  ` M` (working-tree, unstaged) in `git status --short`, the amend won't pick it
  up. `git add` first, then `--amend`.
- **`worktree create` without `--label` does NOT create a workspace** — it only
  adds a linked worktree to the current workspace. The `--label` flag is what
  triggers workspace creation.
- **`--focus` vs `--no-focus`**: `--focus` switches you into the new window on
  launch; `--no-focus` keeps you where you are (better for "fire and watch from
  sidebar").
- **The `herdr-agent-state.ts` pi extension is a reporter, not a controller.**
  It reports this agent's idle/working/blocked state up to herdr's server so the
  sidebar dot works. It registers no tools. Controlling herdr is always via the
  `herdr` CLI. It only activates when `HERDR_ENV=1` + `HERDR_SOCKET_PATH` +
  `HERDR_PANE_ID` are set (i.e. when pi is launched *by* herdr).

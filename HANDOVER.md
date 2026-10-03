# Handover: Wordfarer

**Written:** 2026-10-03 09:23 UTC.
**Next session:** launch Claude from `~/Developer/Repos/wordfarer`. The session names itself "Wordfarer" by hook; type `/color green` once.

## State

- **#92 is done** (the core import-cycle guard): PR #95 was merged at `b111651` and dev-verified (run 37112678861). The plan is `docs/superpowers/plans/2026-10-03-m1-92-import-cycles.md`. `tests/unit/core-import-graph.test.ts` now fails any value-import cycle in `packages/core/src` by name, and its floors are 20 modules, 97 declarations and 77 edges. **A story that adds a core module or import moves those figures:** a removal fails the floor (lower it in that commit, with the new measured figure in the comment); an addition passes, so raise the floor in the same commit to keep it tight.
- **#32 left for #33 (Pemandu):** state has `grammar` (owned node ids, in the order bought). `grammar.ts` is a leaf; `buyGrammarNode` is in `sim.ts`. Pemandu unlocks at region 2 like grammar: `regionsReached(course, state) >= 2`, with its own `BALANCE` constant rather than `BALANCE.grammar.opensAtRegion`. The new guard will refuse any cycle Pemandu's module introduces.
- **#84 is open (Todo):** the property-test reached-counters need a measured floor, and fast-check runs unseeded.
- **Board** (project 4, `PVT_kwDOEOcG584BlRWb`, "Wordfarer Stories", public). New issues are **not** auto-added: add them by node id and read back `project{title}`. Status field `PVTSSF_lADOEOcG584BlRWbzhj-3Hc`; Todo `f75ad846`, In Progress `47fc9ee4`, Done `98236657`.
- **Tooling** (git-ignored, in the primary checkout): `.superpowers/sdd/m1-92/` is the newest pipeline: `gate-stages.sh <worktree> [stage-list]`, `red.py <g<n>> <test files>` (stubs in `stubs/g<n>`), `mutate.py` (run as `TOTAL=<n> python3 -u mutate.py mutations.py`; `-u` makes progress readable live), `dry.py` (every anchor once, at `head_sha`), `split.py` + `tables.py` (now marks exact rows), `fill.py`, `gen.py`, `verify_blocks.py`, `check_names.py`, `build_plan.sh` (reads `stages-plan.txt`, whose `T0` is the base). Copy it to `m1-<n>` and replace the `wordfarer-92` paths, the plan path, the AC count in `check_names.py` and the pinned red totals in `fill.py`.
- **Draft the mutation anchors per branch before trusting a guard's tests:** for #92 that found a blind form shared by the reader and its cross-check, a branch no test reached, and two dead sorts, after every gate and red run had passed.
- The primary checkout's `node_modules` is stale: run tests in a worktree after `npm ci`.
- Open Dependabot PRs #23 (vitest 5.0.2) and #24 (@types/node 26) are untouched.

## Resume steps

1. `git fetch origin`; check `develop` is at `b111651` or later. Remove the `../wordfarer-92` worktree and the `m1/92-import-cycles` branch if they are still there.
2. Take **#33** (Pemandu) in design §8's order. #84 can go first if a short ticket suits better.
3. Build it as one commit per task; red-run each task on its stage against stubs; commit before gating; draft one mutation per branch, then run every mutation at the branch head with `TOTAL` set; gate every stage on a clean `npm ci`; generate the plan from the stage commits with the m1-92 pipeline; review it by executing it until a pass finds nothing.

# Handover: Wordfarer

**Written:** 2026-10-03 08:08 UTC.
**Next session:** launch Claude from `~/Developer/Repos/wordfarer`. The session names itself "Wordfarer" by hook; type `/color green` once.

## State

- **#32 is done** (grammar nodes): PR #93 was merged at `19afef0` and dev-verified (run 37108517070). The plan is `docs/superpowers/plans/2026-10-03-m1-32-grammar.md`.
- **What #32 leaves for later stories:** state has `grammar` (owned node ids, in the order bought), and a sail keeps it. `grammar.ts` is a leaf: `grammarNodeCost`, `findGrammarNode`, `ownedGrammarNodes` (course order) and `rootFactors`. `buyGrammarNode` is in `sim.ts` beside `buyUpgrade`. `pickUpPool(destination, held, nodes)` takes the owned nodes. The breakdown has a `grammar` line after `words` (the ratio that makes `words × grammar` the paid M_words), shown only when a word on the Encounter's tags is multiplied. **#33 (Pemandu)** unlocks at region 2 like grammar: `regionsReached(course, state) >= 2`; `BALANCE.grammar.opensAtRegion` is grammar's own constant, so Pemandu should add its own rather than borrow it.
- **#92 is open (Todo):** a guard that refuses value-import cycles in `packages/core/src`. #32's first build shipped four cycles through every gate step; a throwaway probe (20 modules, 97 relative imports, 0 cycles at #32's head; 4 cycles at the pre-fix head as its positive control) is the starting point. Its AC already names the guard-liveness controls.
- **#84 is open (Todo):** the property-test reached-counters need a measured floor, and fast-check runs unseeded.
- **Board** (project 4, `PVT_kwDOEOcG584BlRWb`, "Wordfarer Stories", public). New issues are **not** auto-added: add them by node id and read back `project{title}`. Status field `PVTSSF_lADOEOcG584BlRWbzhj-3Hc`; Todo `f75ad846`, In Progress `47fc9ee4`, Done `98236657`.
- **Tooling** (git-ignored, in the primary checkout): `.superpowers/sdd/m1-32/` is the newest pipeline. New since #31: `red_stages.sh` runs each task's own tests on its PARENT stage with `stubs/g<n>` (the faithful red run, so a test added after a task's first red run is still seen red); `rebuild.sh` + `move_buy.py` rebuild stages as an asserted transform of each original stage tree (use that shape when a fix must reach every stage); `gen.py` and `verify_blocks.py` read stubs from `stubs/g<n>`; `stages-plan.txt` starts with a `T0` base line (the spec commit), `stages.txt` (for `gate-stages.sh`) does not. The `stubs/t1`–`t5` directories there are #31's leftovers: ignore them. Copy the directory to `m1-<n>` and replace `wordfarer-32` paths, the plan path and the `T0` SHA.
- **Mutation output is block-buffered** into `mut-run.out`: read progress with `peek.py`, not the file. Stopping a run mid-mutation leaves that mutation applied: check `git status` and restore from the commit.
- The primary checkout's `node_modules` is stale: run tests in a worktree after `npm ci`.
- Open Dependabot PRs #23 (vitest 5.0.2) and #24 (@types/node 26) are untouched.

## Resume steps

1. `git fetch origin`; check `develop` is at `19afef0` or later. Remove the `../wordfarer-32` and `../wordfarer-32-rebuild` worktrees and the `m1/32-grammar` branch if they are still there.
2. Take **#92** next (short, and it guards the class #32 hit), then **#33** (Pemandu) in design §8's order. #84 can go first if a short ticket suits better.
3. Build it as one commit per task; red-run each task on its parent stage against stubs; commit before gating; run every mutation at the branch head with `TOTAL` set; gate every stage on a clean `npm ci`; generate the plan from the stage commits with the m1-32 pipeline; review it by executing it until a pass finds nothing.

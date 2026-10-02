# Handover: Wordfarer

**Written:** 2026-10-02 13:40 UTC.
**Next session:** launch Claude from `~/Developer/Repos/wordfarer`. The session names itself "Wordfarer" by hook; type `/color green` once.

## State

- **#29 is done** (Insight and Passport Stamp upgrades): PR #80 merged into `develop` at `73c86b5`, deploy run 37014257564. `upgrades.ts` holds both catalogues (costs per level in `BALANCE.insightUpgrades.costs` / `BALANCE.stamps.costs`, keyed by upgrade id; maxed at `costs.length`) and every effect. `buyUpgrade` (in `sim.ts`) refuses unknown → maxed → prerequisite → unaffordable. `view` now returns `breakdown`: each owned Encounter's rate as named lines (`encounters`, `milestones`, `words`, `phrasebook:<tag>`, `stamps`) whose product is its rate; `view.rate` is their sum.
- **Operator decision (2026-10-02, on #29):** the +10% global production per stamp counts **stamps ever earned**. State has `stamps` (held, spent) and `stampsEarned` (drives the bonus). **#31 (Set Sail) must add to both.**
- **Effects waiting for their consumer:** `journeySlots` and `journeyDurationFactor` (read by #30), `startingUnderstanding` (#31), `pemanduIntervalsMs` and the `pemanduEarly` level (#33). They are tested at their caps but not applied anywhere yet.
- **#28, #72, #76 are done.** Every unit test slower than 400 ms carries a named budget in its own file; the global `testTimeout` stays at 5 s. One test per case holds (`BURN_DOWN` empty). Unit suite: 3200 tests.
- **Board** (project 4, `PVT_kwDOEOcG584BlRWb`, "Wordfarer Stories", public). New issues are **not** auto-added: add them by node id and read back `project{title}`. Status field `PVTSSF_lADOEOcG584BlRWbzhj-3Hc`; Todo `f75ad846`, In Progress `47fc9ee4`, Done `98236657`.
- **Tooling** (git-ignored, in the primary checkout): **`.superpowers/sdd/m1-29/` is the current plan pipeline**: `gate.sh`, `gate-stages.sh <worktree>` (reads `stages.txt`), `red.py <task> [vitest args] <files>` (stubs in `stubs/<task>/`), `mutate.py <spec.py> [ids]`, `tables.py <out.md> <final-unit-count> <spec.py> <runs…>` (**refuses any run not made at the final stage**), `fill.py`, `gen.py`, `verify_blocks.py`, `check_names.py`, `build_plan.sh`. Copy the directory for the next story and change the paths and story numbers. The primary checkout's `node_modules` is stale (no `ts-fsrs`): run tests in a worktree after `npm ci`.

## Resume steps

1. `git fetch origin`; check `develop` is at `73c86b5` or later. Remove the `../wordfarer-29` worktree and the `m1/29-upgrades` branch if they are still there.
2. Take the next M1 story in design §8's order: **#30** (Journeys and culture cards), then #31 onward. #30 reads `journeySlots` and `journeyDurationFactor` from `upgrades.ts`.
3. Build it as one commit per task; red-run each task against stubs; **run every mutation at the branch head**; generate the plan from the stage commits with the m1-29 pipeline; review it by executing it until a pass finds nothing.

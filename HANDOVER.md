# Handover: Wordfarer

**Written:** 2026-10-03 07:18 UTC.
**Next session:** launch Claude from `~/Developer/Repos/wordfarer`. The session names itself "Wordfarer" by hook; type `/color green` once.

## State

- **#31 is done** (Set Sail, world progression, finale and unfolding): PR #90 was merged at `fe2543d` and dev-verified (run 37105740127). The plan is `docs/superpowers/plans/2026-10-03-m1-31-set-sail.md`.
- **Operator decisions (2026-10-03, on #31):** Journeys unfold with Review (when the tutorial word falls due); the goal and Set Sail preview with Culture or once the goal can be met; Encounters stay buyable from every region reached. M1 design §5 and §9 record them.
- **What #31 leaves for later stories:** state has `destination` (number on the route), `reached`, `finale`, `replays` (by destination id), `runSpent` and `playableRegions`. `route.ts` answers where the player is (`currentDestination`, `currentRegion`, `regionsReached`). `startingUnderstanding` is now consumed by `setSail`. **#32 (grammar)** adds its own state key; AC3's sail test reads every key, so a key a sail must keep needs no edit there, but one a sail resets must be added to its `CHANGED` list. **#33 (Pemandu)** unlocks at region 2: `regionsReached(course, state) >= 2`; `pemanduIntervalsMs` and the `pemanduEarly` level still wait for it. `view` returns `sail` (the preview) and `unfold` (eight flags).
- **The tutorial word** (first word ever picked up) now falls due `tutorialDueMs` (4 min) later; every later word is due at once. Tests that answer the first word must wait 4 minutes.
- **#84 is open (Todo):** the property-test reached-counters need a measured floor, and fast-check runs unseeded. #31's unfold walks are seeded (31) with measured floors, as a model.
- **Board** (project 4, `PVT_kwDOEOcG584BlRWb`, "Wordfarer Stories", public). New issues are **not** auto-added: add them by node id and read back `project{title}`. Status field `PVTSSF_lADOEOcG584BlRWbzhj-3Hc`; Todo `f75ad846`, In Progress `47fc9ee4`, Done `98236657`.
- **Tooling** (git-ignored, in the primary checkout): `.superpowers/sdd/m1-31/` is the newest pipeline. Changes since #30: `gate.sh` **refuses to run while a file under `packages/` or `tests/` is untracked** (the repo's guards read tracked files, so commit first); one `mutations.py` is the source, `split.py` writes the per-task files, a `NOTES` dict holds the reason for any corrected prediction, and `tables.py` refuses a rerun without one; `check_names.py` derives the tables and refuses an uncited mutation; `files_check.py` compares each Task's file list with its stage diff; `peek.py` judges finished mutation logs while a batch runs. `mutate.py` needs `TOTAL=<unit count>`. Copy the directory to `m1-<n>` and replace `wordfarer-31` paths and the plan path.
- **Stages:** when fixes land after a task's commit, rebuild the stage history in a scratch worktree (cherry-pick, then `git checkout <fix> -- <file>` and amend), check the final tree is byte-identical with a control diff, then reset the branch. `gate-stages.sh` needs its own worktree because it detaches the one it uses.
- The primary checkout's `node_modules` is stale: run tests in a worktree after `npm ci`.
- Open Dependabot PRs #23 (vitest 5.0.2) and #24 (@types/node 26) are untouched.

## Resume steps

1. `git fetch origin`; check `develop` is at `fe2543d` or later. Remove the `../wordfarer-31` worktree and the `m1/31-set-sail` branch if they are still there.
2. Take the next M1 story in design §8's order: **#32** (grammar nodes). #84 can go first if a short ticket suits better.
3. Build it as one commit per task; red-run each task against stubs; commit before gating; run every mutation at the branch head with `TOTAL` set; generate the plan from the stage commits with the m1-31 pipeline; review it by executing it until a pass finds nothing.

# Handover: Wordfarer

**Written:** 2026-10-03 05:54 UTC.
**Next session:** launch Claude from `~/Developer/Repos/wordfarer`. The session names itself "Wordfarer" by hook; type `/color green` once.

## State

- **#30 is done** (Journeys and culture cards): PR #88 was merged at `c3d5070` and dev-verified (run 37101143016). The plan is `docs/superpowers/plans/2026-10-03-m1-30-journeys.md`.
- **Operator decisions (2026-10-03, on #30):** a Journey's card is drawn uniformly with replacement from the state's seeded `cards` stream, so a held card can come again (_"duplicates of cards is ok throughout ... more gacha-style"_). A repeat pays Insight by duration plus Understanding at the rate now. Parent §4.2 and M1 design §5/§9 are amended.
- **What #30 leaves for later stories:** `initialState(wall, seed)` now takes a seed. State has `rng` (streams named by `RNG_STREAMS`; add a name there when a story draws for a new purpose), `journeys` (3 slots, `null` when empty), `cards` (held, in collection order) and `tutorialJourneyUsed`. `cardPool` and `currentDestination` both read the course's first region and destination: **#31 (Set Sail) moves both, adds to `stamps` and `stampsEarned`, and applies `startingUnderstanding`.** #31 must also decide what Set Sail does to the held cards and to Journeys still out.
- **Still waiting for their consumer:** `pemanduIntervalsMs` and the `pemanduEarly` level (#33), `startingUnderstanding` (#31).
- **#84 is open (Todo):** the property-test reached-counters need a measured floor, and fast-check runs unseeded.
- **Board** (project 4, `PVT_kwDOEOcG584BlRWb`, "Wordfarer Stories", public). New issues are **not** auto-added: add them by node id and read back `project{title}`. Status field `PVTSSF_lADOEOcG584BlRWbzhj-3Hc`; Todo `f75ad846`, In Progress `47fc9ee4`, Done `98236657`.
- **Tooling** (git-ignored, in the primary checkout): `.superpowers/sdd/m1-30/` is the newest plan pipeline: `gate.sh`, `gate-stages.sh`, `red.py` (stubs in `stubs/t<n>/`), `mutate.py`, `run_all.sh`, `tables.py`, `fill.py`, `gen.py`, `verify_blocks.py`, `check_names.py` and `build_plan.sh`. **`mutate.py` needs `TOTAL=<baseline unit test count>` and now bounds each suite at 900 s in its own process group:** a hung mutation reports `TIMEOUT … not a catch`. M2.11 hung the first batch for an hour, because Vitest cannot time out a synchronous loop. After any killed run, `git diff` the worktree first. Copy the directory to `m1-<n>` and replace `wordfarer-30` paths to reuse it.
- The primary checkout's `node_modules` is stale: run tests in a worktree after `npm ci`.
- Open Dependabot PRs #23 (vitest 5.0.2) and #24 (@types/node 26) are untouched.

## Resume steps

1. `git fetch origin`; check `develop` is at `c3d5070` or later. Remove the `../wordfarer-30` worktree and the `m1/30-journeys` branch if they are still there.
2. Take the next M1 story in design §8's order: **#31** (Set Sail, world progression, finale and unfolding). #84 can go first if a short ticket suits better.
3. Build it as one commit per task; red-run each task against stubs; run every mutation at the branch head with `TOTAL` set; generate the plan from the stage commits with the m1-30 pipeline; review it by executing it until a pass finds nothing.

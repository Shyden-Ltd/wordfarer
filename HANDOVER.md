# Handover: Wordfarer

**Written:** 2026-10-03 13:24 UTC.
**Next session:** launch Claude from `~/Developer/Repos/wordfarer`. The session names itself "Wordfarer" by hook; type `/color green` once.

## State

- **#33 is done** (Pemandu automation): PR #98 was merged at `7e120d7` and dev-verified (run 37125842351, `dev-verified` on the commit). The plan is `docs/superpowers/plans/2026-10-03-m1-33-pemandu.md`. `integrate` now takes the course (`integrate(course, state, elapsedMs)`) and buys on Pemandu's grid; `advance`'s `understandingEarned` counts production, adding back what Pemandu spent. The import-graph floors are 21 modules, 108 declarations and 87 edges.
- **AC5 is bounded on CPU time, not wall time.** Under the suite's parallel load the same work's wall time ran from 335 to 1,670 ms locally. The test bounds `process.cpuUsage()` and prints both. CI printed `465.9 ms of CPU (376.7 ms of wall time)`. Any future timing bound does the same (memory `feedback-time-bounds-measure-cpu`).
- **For #34 (event log and state hash, next in design §8):** `setAutomation(course, state, enabled, intervalMs)` is the action behind the `setAutomation {enabled, intervalMs}` event; its rejections are `automationLocked` then `intervalNotOwned`. State gained `automation`, so `stateHash`'s canonical form must include it. `core` keeps three module-level memos (`lexiconItem`'s index, the bucket word factors in `production.ts`, `purchaseCost` and `milestoneFactor` in `encounters.ts`); each is keyed by every input it reads and changes no bit.
- **#97 is open (Todo):** a meta-guard so no test computes core state in a `describe` body. `grammar.test.ts` (lines 309 and 422) drops out of a red run instead of failing by name. It is short, and suits a session that wants a guard story first.
- **#84 is open (Todo):** the property-test reached-counters need a measured floor, and fast-check runs unseeded. #33's new properties are seeded (`seed: 33`) with floors at the measured figure less one, which is the pattern #84 asks for.
- **Board** (project 4, `PVT_kwDOEOcG584BlRWb`, "Wordfarer Stories", public). New issues are **not** auto-added: add them by node id and read back `project{title}`. Status field `PVTSSF_lADOEOcG584BlRWbzhj-3Hc`; Todo `f75ad846`, In Progress `47fc9ee4`, Done `98236657`.
- **Tooling** (git-ignored, in the primary checkout): `.superpowers/sdd/m1-33/` is the newest pipeline. Since #92 it has gained: `gen.py`/`verify_blocks.py` accept a `BASE` line, so T0's diff can be shown (`stages-gen.txt`); `split.py` carries `NOTES` through; `tables.py` prints a note for any id that has one; `mutate.py` has a working timeout path (`RUN_TIMEOUT_S`, proved with 5 s); `measure-graph.sh` prints the import-graph figures; `red_stages.sh` runs in a scratch worktree with `--reporter=verbose`. Copy it to `m1-<n>` and replace the `wordfarer-33` paths, the plan path, the AC count in `check_names.py` and the pinned red totals in `fill.py`.
- **Inside Claude Code, vitest picks its agent reporter and hides passing tests' output**: use `--reporter=default` to see a printed measurement locally.
- Open Dependabot PRs #23 (vitest 5.0.2) and #24 (@types/node 26) are untouched.

## Resume steps

1. `git fetch origin`; check `develop` is at `7e120d7` or later. No #33 worktree or branch remains.
2. Take **#34** (event log and state hash) in design §8's order, or #97 first if a short guard story suits better.
3. Build it as one commit per task; red-run each task on its parent stage against stubs (`red_stages.sh`); commit before gating; draft one mutation per branch and predict hangs before running (a mutation that freezes prices makes Pemandu buy at every tick); run every mutation at the branch head with `TOTAL` set; gate every stage on a clean `npm ci`; generate the plan with the m1-33 pipeline; review it by executing it until a pass finds nothing.

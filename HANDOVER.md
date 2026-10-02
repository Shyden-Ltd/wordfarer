# Handover: Wordfarer

**Written:** 2026-10-02 15:40 UTC.
**Next session:** launch Claude from `~/Developer/Repos/wordfarer`. The session names itself "Wordfarer" by hook; type `/color green` once.

## State

- **#82 is done** (the guard-liveness audit the operator's 2026-10-02 rule requires, recorded and closed with evidence, so it does not run again). PR #85 was merged at `1c0a7d1` and dev-verified (run 37027288858). Every walk and absence guard now carries floors at measured − 1, with the measured figure named in a comment; raise them with the corpus and lower them only in a commit that removes things. The one-test-per-case detector is now `scanTests(source, file) → { tests, looped, unclassified }`: it counts tests read (floor 391), cross-checks raw text, and refuses by line a test with no inline body or an unknown `it.X`/`test.X` member. **Adding test files or BALANCE entries never needs a floor change; removing them does.**
- **#83 is done** (verify-dev waited on retries; a retry is not a fix): PR #86 was merged at `c6af659` and dev-verified by the new script (run 37028114925). verify-dev now waits only for both hosts to serve the expected commit (at most 36 looks, 5 s apart). Anything else fails at once.
- **#84 is open (Todo):** the property-test reached-counters (`correctSteps > 1000`, `reached > 100`, `longest > 10`, `windows.length > 0`) need a measured floor, and fast-check runs unseeded. That decision is the first AC.
- **Operator decision (2026-10-02, on #29):** the +10% global production per stamp counts **stamps ever earned**. State has `stamps` (held, spent) and `stampsEarned` (drives the bonus). **#31 (Set Sail) must add to both.**
- **Effects waiting for their consumer:** `journeySlots` and `journeyDurationFactor` (read by #30), `startingUnderstanding` (#31), `pemanduIntervalsMs` and the `pemanduEarly` level (#33). They are tested at their caps but not applied yet.
- **Board** (project 4, `PVT_kwDOEOcG584BlRWb`, "Wordfarer Stories", public). New issues are **not** auto-added: add them by node id and read back `project{title}`. Status field `PVTSSF_lADOEOcG584BlRWbzhj-3Hc`; Todo `f75ad846`, In Progress `47fc9ee4`, Done `98236657`.
- **Tooling** (git-ignored, in the primary checkout): `.superpowers/sdd/m1-29/` is the plan pipeline (see its files). **`mutate.py` now refuses to start without `TOTAL=<baseline unit test count>`**, and marks a run whose total moves as INVALID (a syntax-breaking mutation drops tests instead of failing them). An empty prediction list means "predicted to stay GREEN" (a blind-spot proof). `.superpowers/sdd/guard-liveness/` and `m1-83/` hold this session's mutation specs and logs. The primary checkout's `node_modules` is stale: run tests in a worktree after `npm ci`.
- Open Dependabot PRs #23 (vitest 5.0.2) and #24 (@types/node 26) are untouched.

## Resume steps

1. `git fetch origin`; check `develop` is at `c6af659` or later. Remove the `../wordfarer-83` worktree and the `m1/83-verify-dev-wait` branch if they are still there.
2. Take the next M1 story in design §8's order: **#30** (Journeys and culture cards), then #31 onward. #30 reads `journeySlots` and `journeyDurationFactor` from `upgrades.ts`. #84 can go first if a short ticket suits better.
3. Build it as one commit per task; red-run each task against stubs; run every mutation at the branch head with `TOTAL` set; generate the plan from the stage commits with the m1-29 pipeline; review it by executing it until a pass finds nothing.

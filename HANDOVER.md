# Handover: Wordfarer

**Written:** 2026-10-02 10:26 UTC.
**Next session:** launch Claude from `~/Developer/Repos/wordfarer`. The session names itself "Wordfarer" by hook; type `/color green` once.

## State

- **#72 is done** (slow unit tests get named budgets): PR #75 merged into `develop` at `90f5a60`, deploy run 36995330008. The set was derived from an unloaded verbose run: 19 unit tests over 400 ms, 13 already budgeted, 6 newly budgeted (`encounters` ×2, `num` Num.pow, `golden-vectors` all eight digests, `review` never-lowers). The lint's ESLint config now loads in a `beforeAll` (`CONFIG_LOAD_TIMEOUT_MS`): first case 348–520 ms before, 26–51 ms after. Ten loaded full-suite runs: 1 timeout on `develop` (golden-vector `review`, 5408 ms, not one the ticket listed), 0 on the PR head.
- **#76** (Todo, filed from #72): the `words.test.ts` reference integration (`continuous`, Simpson over 2,000 panels in decimal.js) costs 3.4–6.1 s alone per test and reached 55980 ms under heavy load, 93% of its 60 s budget. The ticket asks for a cheaper reference chosen from a stated error bound, not a bigger budget.
- **#28 is done** (words, memory and the review queue), merged at `2f38825`.
- **Chromium's `Math.exp` gives different bits from Node's**, though both are V8 (#28's engine mutation E1/E2). Nothing to fix, because det-math is already the rule.
- **One test per case** holds across the repo (`BURN_DOWN` empty). Every unit test slower than 400 ms carries a named budget in its own file with alone and loaded durations in the comment; the global `testTimeout` stays at 5 s.
- **Golden vectors** cover 8 functions; `npm run test:engines` runs 24 tests on Chromium, Firefox and WebKit, all installed locally.
- **Board** (project 4, `PVT_kwDOEOcG584BlRWb`, "Wordfarer Stories", public). New issues are **not** auto-added: add them by node id and read back `project{title}`. Status field `PVTSSF_lADOEOcG584BlRWbzhj-3Hc`; Todo `f75ad846`, In Progress `47fc9ee4`, Done `98236657`.
- **Tooling** (git-ignored, in the primary checkout): `.superpowers/sdd/m1-28/` holds the plan pipeline (`mutate.py`, `build_stages.py`, `gate-stages.sh`, `red.py`, `gen.py`, `verify_blocks.py`, `check_names.py`, `fill.py`, `build_plan.sh`, `tables.py`). `.superpowers/sdd/m1-72/` holds `load10.sh <repo-dir> <out-dir>` (ten consecutive full-suite runs, JSON + log each), `agg.py <set-json> '<glob>'` (min/max per slow test), and both runs' logs.

## Resume steps

1. `git fetch origin`; check `develop` is at `90f5a60` or later. Remove the `../wordfarer-72` worktree and the `m1/72-named-budgets` branch if they are still there.
2. Pick the next story: #76 is small and removes the thinnest timeout margin left. Otherwise take the next M1 story in design §8's order (#29 onward).
3. For a story with code, build it as one commit per task, and generate the plan from those stage commits with the m1-28 pipeline. Review it by executing it until a pass finds nothing.

# Handover: Wordfarer

**Written:** 2026-10-02 11:40 UTC.
**Next session:** launch Claude from `~/Developer/Repos/wordfarer`. The session names itself "Wordfarer" by hook; type `/color green` once.

## State

- **#76 is done** (the words reference integrates in closed form): PR #78 merged into `develop` at `ee200c9`, deploy run 37002198579. `continuous` in `words.test.ts` used Simpson's rule over 2,000 panels in decimal.js, 99.9% of each of four tests (2.8–4.6 s). The rate is linear in each word's R and R has a closed-form integral, so the reference is now exact: 6–11 ms alone, 118 ms max over ten full-suite runs, and the four tests dropped their 60 s budget. 60 vs 120 digits agree to < 1e-44; the old Simpson value agrees to 4.5e-23.
- **`packages/core/test/fsrs-reference.ts`** is the one home for the FSRS-6 curve in decimal (`exactR`, `exactIntegral`, `exactMean`, 60 digits, literal decay 0.1542). `memory.test.ts` and `words.test.ts` both import it; its 150 stored mean rows pin it.
- **Mutation note from #76:** a decay shift of 1e-8 moves the whole-hour and three-hour references by only 1.9e-13 and 8.2e-13 (FSRS fixes R(S) = 0.9 for every decay), so those tests rightly pass it. Size a constant mutation from the measured per-case delta, not intuition.
- **Ten-run loaded profile at `ebc7f7a`:** 0 timeouts; the only tests over 1667 ms all carry 60 s budgets, the slowest being the words random-sequence property at 11833 ms.
- **#28 and #72 are done.** Every unit test slower than 400 ms carries a named budget in its own file with alone and loaded durations in the comment; the global `testTimeout` stays at 5 s. **Chromium's `Math.exp` gives different bits from Node's**, though both are V8 (#28 E1/E2); nothing to fix, because det-math is already the rule. One test per case holds (`BURN_DOWN` empty). Golden vectors cover 8 functions; `npm run test:engines` runs 24 tests on Chromium, Firefox and WebKit.
- **Board** (project 4, `PVT_kwDOEOcG584BlRWb`, "Wordfarer Stories", public). New issues are **not** auto-added: add them by node id and read back `project{title}`. Status field `PVTSSF_lADOEOcG584BlRWbzhj-3Hc`; Todo `f75ad846`, In Progress `47fc9ee4`, Done `98236657`.
- **Tooling** (git-ignored, in the primary checkout): `.superpowers/sdd/m1-28/` holds the plan pipeline (`mutate.py`, `build_stages.py`, `gate-stages.sh`, `red.py`, `gen.py`, `verify_blocks.py`, `check_names.py`, `fill.py`, `build_plan.sh`, `tables.py`). `.superpowers/sdd/m1-72/load10.sh <repo-dir> <out-dir>` runs ten full-suite runs. `.superpowers/sdd/m1-76/` holds `third.py <out-dir>` (AC5 check: loaded max per test against a third of its budget), `mut76.py`, `probe_accuracy.py` (60/120-digit and Simpson comparison), and the run logs.

## Resume steps

1. `git fetch origin`; check `develop` is at `ee200c9` or later. Remove the `../wordfarer-76` worktree and the `m1/76-closed-form-reference` branch if they are still there.
2. Take the next M1 story in design §8's order: **#29** (Insight and Passport Stamp upgrades), then #30 onward.
3. For a story with code, build it as one commit per task, and generate the plan from those stage commits with the m1-28 pipeline. Review it by executing it until a pass finds nothing.

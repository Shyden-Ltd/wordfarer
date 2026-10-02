# Handover: Wordfarer

**Written:** 2026-10-02 08:51 UTC.
**Next session:** launch Claude from `~/Developer/Repos/wordfarer`. The session names itself "Wordfarer" by hook; type `/color green` once.

## State

- **#28 is done** (words, memory and the review queue): PR #73 merged into `develop` at `2f38825`, deployed and `dev-verified` (deploy run 36986050398). Its plan, `docs/superpowers/plans/2026-10-02-m1-28-words-memory.md`, was generated from five stage commits, each gated alone after a clean `npm ci`, and reviewed to zero by executing it (three passes; 51 unit mutations and 2 engine mutations).
- **What #28 found and left for others:**
  - **#72** (Todo): three tests on `develop` time out at 5 s under load (`num.test.ts:175`, `encounters.test.ts:70`, `core-determinism-lint.test.ts:121`). Error text and durations are in the ticket. Its scope is derived from an unloaded verbose run (every unit test over 400 ms), not from those three names.
  - **Chromium's `Math.exp` gives different bits from Node's**, though both are V8 (Task 4's engine mutation E1/E2). Nothing to fix, because det-math is already the rule, but V8 on two runtimes is no evidence of equal bits (Node against a Worker was not measured).
- **One test per case** holds across the repo (`BURN_DOWN` empty). Properties slower than about 1 s alone carry a named budget in their file (`PROPERTY_TIMEOUT_MS`, `REFERENCE_TIMEOUT_MS`).
- **Golden vectors** now cover 8 functions (the six det-math ones, `meanR`, `review`), and the engines spec is `tests/engines/golden-vectors.spec.ts`. `npm run test:engines` runs 24 tests on Chromium, Firefox and WebKit, all installed locally.
- **Board** (project 4, `PVT_kwDOEOcG584BlRWb`, "Wordfarer Stories", public). New issues are **not** auto-added: add them by node id and read back `project{title}`. Status field `PVTSSF_lADOEOcG584BlRWbzhj-3Hc`; Todo `f75ad846`, In Progress `47fc9ee4`, Done `98236657`.
- **Tooling** (git-ignored, `.superpowers/sdd/m1-28/`): `mutate.py` (saves `mut-<name>.log`; `exact` mode for one-case mutations), `build_stages.py`, `gate-stages.sh`, `red.py` (`W=` targets a worktree), `gen.py` + `verify_blocks.py` + `check_names.py` + `fill.py` + `build_plan.sh` (the plan pipeline, with a `T0` base), `tables.py`. Copy that directory for the next story's plan.

## Resume steps

1. `git fetch origin`; check `develop` is at `2f38825` or later. The #28 worktrees and branches are already removed.
2. Pick the next story from the board: #72 is small and removes a source of red runs under load. Otherwise take the next M1 story in design §8's order (#29 onward).
3. For a story with code, build it as one commit per task, and generate the plan from those stage commits with the m1-28 pipeline. Review it by executing it until a pass finds nothing.

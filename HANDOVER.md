# Handover: Wordfarer

**Written:** 2026-10-02 03:09 UTC.
**Next session:** launch Claude from `~/Developer/Repos/wordfarer`. The session names itself "Wordfarer" by hook; type `/color green` once.

## State

- **Org renamed:** the company is **Shyden Labs**, the GitHub org `shyden-labs` (the old limited company is dissolved). Done in #48 (PR #50, `bfbe426`, dev-verified); `tests/unit/licences.test.ts` refuses the old names in any tracked file. #49 is a duplicate of #48.
- **`develop`** is at `d1f30a9` (PR #55 merged, `dev-verified` success), plus this handover's merge. Re-read it.
- **D18, no native reviewers (operator, 2026-10-02):** content ships without native review. Every build ships evidence-backed `claude-checked` and `native-reviewed` content; players report mistakes in game. Design `docs/superpowers/specs/2026-10-02-content-reports-design.md` (approved section by section, reviewed to zero). Stories on the board as Todo: #51 gates and evidence (M2), #52 report endpoint and D1 queue (M2), #53 review-tool triage and daily count (M2), #54 in-game UI (M3). **Never add a gate that needs a native reviewer.**
- **Board** (project 4, `PVT_kwDOEOcG584BlRWb`, "Wordfarer Stories", owner `shyden-labs`) is **private**. The operator chose to make it public; the `wordfarer-agent` App gets `FORBIDDEN` changing visibility, so it is his click (⋯ → Settings → Visibility → Public). Status field `PVTSSF_lADOEOcG584BlRWbzhj-3Hc`; options Todo `f75ad846`, In Progress `47fc9ee4`, Done `98236657`. #28's item is `PVTI_lADOEOcG584BlRWbzg94pZY`.
- **New global hook** `~/.claude/hooks/search-before-filing.py`: `gh issue create` (or a REST or GraphQL create) is refused unless an earlier call in the last 30 minutes ran `gh issue list` or `gh search issues`. Search first, in its own call.
- **#28 is In Progress.** Worktree `~/Developer/Repos/wordfarer-28`, branch `m1/28-words-memory` (local only, never pushed), based on `bfbe426` (one merge behind `develop`; #55 touched only docs, so a rebase is clean). Head in `.superpowers/sdd/m1-28/head_sha`; `node_modules` installed. Commits:
  1. `cea1960` **Task 1**: `memory.ts` retrievability and the closed-form mean R, `mean-r-reference.ts` (AC3); `ts-fsrs` 5.4.2.
  2. `b5130ee` + `dc9826e` **Task 2**: ranks, `review`, `reviewQueue`, `insightFor`; 13/13 mutations.
  3. `21b65cc` **Task 3, done**: `words.ts`, bucketed `production.ts`, `pickUpWord`, `answerReview`, `answerPractice(state, itemId)`, the view's `insight` and `queue`. Gate green (556 unit). Red against `stubs/t3/`: every words test fails on the stubs. Mutations `mutations_t3.py`: 13/13 caught; M3.12 (no bucket split) first **survived** and is now caught by the new three-hour test.
- **Fixes made in Task 3 this session** (they go into the plan): `initialState` expects `insight`, `words` and `memorySince`; the pick-up test uses #27's exact-deduction idiom (`after == sub(held, cost)`), because `before − after` is not a float round-trip; the continuous reference takes each word's R once per panel; slow reference and property tests carry named 60 s timeouts (`REFERENCE_TIMEOUT_MS`, `PROPERTY_TIMEOUT_MS`, the det-math pattern; measured 6.6 s and 9.8 s under load, against 0 ms and 1.8 s for the code alone); the view test reads the queue through `view(...)` (it had passed on the stubs by calling Task 2's `reviewQueue`); `answerPractice` lost an unused `_course` parameter.
- **Design decisions so far** (into the plan and the PR): each word's hour mean starts at `max(bucketStart, memorySince)`; `memorySince` moves at a review or a clip, not at a purchase. A late-starting window uses the shift form `R(a)·mean₀(S+F·a, T)` (the difference of integrals is 0.58% off). A never-reviewed word has R = 0 and sits on the floor. ts-fsrs defaults (learning steps 1m/10m), fuzz off; `elapsed_days` not stored. Insight is paid by the rank before the answer. Every wrong answer drops one rank. Pick-up cost n counts the current destination's picked items. `currentDestination` is region 0's first destination until #31.
- **Tooling** (git-ignored, in this checkout's `.superpowers/sdd/m1-28/`): `gate.sh <worktree>`, `red.py <task> <test files>`, `mutate.py <mutations.py> [names]`, `mutations_t1.py` to `mutations_t3.py`, `stubs/t1` to `stubs/t3`, `research/`.
- **Waiting on CI:** `~/.claude/scripts/wait-run.sh <repo-dir> <run-id> [sha-file]` in a background Bash call. Never `gh pr checks --watch` or a bare `gh run watch`.

## Resume steps

1. `git fetch origin`; check `develop` and that #28 is In Progress. Remove the merged worktree: `git worktree remove ../wordfarer-51`.
2. In `../wordfarer-28`: `git rebase origin/develop`, write the new head into `.superpowers/sdd/m1-28/head_sha`, run `gate.sh`.
3. Add the three Task 3 mutations not yet written, predictions first: the pool check moved after the cost check; `answerPractice` returning a changed state; the clip not resetting `memorySince`. Run `mutate.py` on them; a survivor means a missing test.
4. Task 4: add the ts-fsrs scheduler and mean-R golden vectors to the cross-engine harness (`packages/core/test/golden-vectors.ts` pattern plus a `tests/engines` spec). Short-term steps were never measured across engines; only short-term-off was (#28 design §2.1).
5. Task 5: amend the #28 design (§5 pick-up cost; §2.2.4 the shift form; §7 AC3 replaces "quadrature to 1e-9") and the `index.ts` exports. Write the plan `docs/superpowers/plans/2026-10-0x-m1-28-words-memory.md` from the stage commits, review it to zero (run, not read), self-approve, open the PR, merge to `develop` on green CI, check the deploy, set #28 Done.
6. Then the next M1 story, or #51 if the operator wants D18's gate in before M2 content.

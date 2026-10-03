# Handover: Wordfarer

**Written:** 2026-10-03 16:25 UTC.
**Next session:** launch Claude from `~/Developer/Repos/wordfarer`. The session names itself "Wordfarer" by hook; type `/color green` once.

## Progress (global rule since 2026-10-03: every close-out states this)

- **% complete: about 13% by story count** (31 of 232 stories closed). By effort it's nearer 10–12%, because the remaining stories include UI, real-device and content work, which runs slower than M1's pure logic.
- **ETA to release-ready: about 8–10 weeks** (late November to mid-December 2026). Confidence is low to medium.
  - **Measured:** stories closed per day were 10, 14 and 6 on 2026-10-01 to 03. The six on 10-03 were full-process stories (TDD, mutations, a reviewed plan), about 2.5 hours each. 201 stories are open.
  - **Assumed:** 6 stories a day gives about 34 working days, roughly 7 weeks. On top come outside waits: Apple and Google review, Steam's store page, and operator setup (Access, store accounts, trademark search, the support mailbox). 22 stories are operator steps.
  - **To tighten it:** time the first region-1 lexicon story (#112) and the first M3 UI story (#123), since content and UI pace are the biggest unknowns.

## State

- **#97 is done.** PR #100 merged at `ebad97c`, dev-verified. `tests/unit/collection-calls.ts` refuses any call that Vitest runs at collection or in a `beforeAll` and that can reach workspace code. All 12 sites are converted. The floors are 44 files, 153 describe callbacks and 270 calls judged. The plan is `docs/superpowers/plans/2026-10-03-m1-97-collection-calls.md`.
  - **A throwing `beforeAll` skips its tests rather than failing them** (measured). Compute setup in the test, in a thunk or getter, or in `beforeEach`.
  - Tests that need one object kept across tests use a memoised getter (`builtX ??= make()`).
- **The backlog is broken down.**
  - 186 stories for M2–M8 (#101–#286) and 8 audio stories (#287–#294), each with full acceptance criteria. All are on the board as Todo, with cross-references rewritten to issue numbers.
  - Each epic body ends with a "Stories (2026-10-03 breakdown)" checklist.
  - The draft and its filing script are in the git-ignored `.superpowers/backlog/` (`map.json`, `map-audio.json`).
- **Operator decisions on 2026-10-03, now in the spec (#287, PR #295, `13b7097`):**
  - D5: music and sound effects from CC0/CC-BY 4.0 packs, with no spoken language audio.
  - The first screen's action is tapping the phrase; there is no Listen button.
  - Staff routes, the content-reports API (#52) included, sit behind a Cloudflare Access JWT, and the daily count uses an Access service token.
  - #52, #115, #120 and #130 are amended to match.
- **Settled from the spec, not asked:**
  - Web gets regions 1–2, so the finale isn't on web (§6.4).
  - The `id-en` grammar nodes are the first 4 of §4.3: plural, past, `-ing` and articles.
  - Culture-card draws involve no purchase, so the rating questionnaires' "paid random items" answer is no.
  - The local save stories (#158–#160, in M4) come before M3's save wiring.
  - Region 1 needs no grammar.
  - Epic #10's line requiring native review contradicts D18 and is corrected to match it.
- **Open, recorded in the draft's open questions** (`.superpowers/backlog/m2-m8-stories.md`, top): whether the dev e2e job may read the `dev` environment's Basic-auth secret (#39). Also listed as operator stories: the trademark search and the support mailbox/domain (§14.5).
- **New global hook:** `~/.claude/hooks/git-grep-blind-escapes.py` refuses `git grep -E` with `\s \w \b \d \< \>`, which macOS reads as matching nothing. Use POSIX classes, `-w`, or drop `-E`.
- **Board:** project 4, `PVT_kwDOEOcG584BlRWb`, "Wordfarer Stories". New issues are not auto-added; the filing script adds them by node id. Status field `PVTSSF_lADOEOcG584BlRWbzhj-3Hc`: Todo `f75ad846`, In Progress `47fc9ee4`, Done `98236657`.
- **Tooling** (git-ignored): `.superpowers/sdd/m1-97/` is the newest plan pipeline. `peek.py` checks finished mutation logs against their predictions mid-run. The runner takes `W=` from the environment. The runner's failure lines carry bare test names, without the `describe >` path that `vitest list` prints.
- Open Dependabot PRs #23 (vitest 5.0.2) and #24 (@types/node 26) are untouched.

## Resume steps

1. `git fetch origin`; check `develop` is at the handover merge or later. No #97 or spec worktree remains.
2. Take **#34** (event log and state hash), the next M1 story in design §8's order, or **#84** (seeded property tests with measured floors) as a short guard story first.
3. Build as before: one commit per task, red runs on the parent stage, commit before gating, one mutation per branch with predictions written first and `TOTAL` set, every stage gated on a clean `npm ci`, the plan generated from the stage commits and reviewed to zero.
4. At close-out, recompute progress from the board (stories closed vs total, closed per day) and state % complete and ETA.

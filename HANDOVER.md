# Handover: Wordfarer

**Written:** 2026-10-01 11:10 UTC.
**Next session:** launch Claude from `~/Developer/Repos/wordfarer`. The session names itself "Wordfarer" by hook; type `/color green` once.

## State

- **Repo:** `Shyden-Ltd/wordfarer`, public. Agent `gh`/`git` act as the `wordfarer-agent` App, which has no `secrets` permission.
- **Branches:** `main` = `1f660b3`. `develop` = `97339f8` (PR #25, the M1 design) plus this handover's PR.
- **M0 is done** (epic #5 closed). **M1 (epic #6) is In Progress.**
- **M1 design approved:** `docs/superpowers/specs/2026-10-01-m1-core-simulation-design.md`, reviewed to zero in 5 passes and self-approved. Operator decisions this session:
  - Scope: **the whole v1 economy** in M1 (all 3 regions, automation, grammar, finale), so every §12.2 pacing target is live.
  - Technical choices delegated ("I am relying on you"). Decided on measurements (design §2): deterministic `@stdlib` maths instead of `Math.pow/exp/log`, because they differ between V8 and JavaScriptCore; an anchored state on an integer-ms clock (bit-exact associativity); hourly rate buckets with exact mean R; memory on the wall clock and the economy on the capped simulated clock.
  - Numbers of my own the operator may veto: Idler finale ≤ 10 weeks; learning ≥ 20% faster than not reviewing; Clicker ≥ 95% of Casual; the §5 upgrade catalogues.
- **M1 stories filed** with full AC, sub-issues of #6, all **Todo** on the board: #26 foundations, #27 encounters/time model, #28 words/FSRS, #29 upgrades, #30 journeys, #31 Set Sail/finale/unfold, #32 grammar, #33 automation, #34 event log/hash, #35 bots + tuning, #36 Stryker. Dependency order: 26 → 27 → 28 → (29–33) → 34 → 35; 36 any time after 27.
- **Research probes** (not load-bearing; the stories re-assert their results): `.superpowers/sdd/m1/research/` (git-ignored). JavaScriptCore runs on this Mac at `/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc`.
- **Board** (project 4, `PVT_kwDOEOcG584BlRWb`, title "Wordfarer Stories"). New issues are auto-added. Status option ids: Todo `f75ad846`, In Progress `47fc9ee4`, Done `98236657`. Resolve the board by node id and assert its title before any write.
- **Dependabot:** one run on `4df699c` failed because `typescript` needs `@typescript-eslint/*` 8.71.0, which is still inside Dependabot's cooldown window. This is not a repo defect and should clear once the cooldown passes. Re-check it, don't chase it.

## Open follow-ups (unchanged from M0)

- Move the deploy credential from a user token to an account API token before production.
- Rename the Zero Trust organisation ("twilight-mouse-02cd" shows on the Access login card).
- `repo-template` follow-up; support mailbox, custom domain, trademark search (spec §14–15). Merged leftover remote branches: `ci/1-baseline-green`, `docs/2-design-spec`, `m0/dev-deploy`, `m1/design`, `handover/m0-access`.

## Resume steps

1. `git fetch origin`. Confirm `develop`'s head, that deploy-dev on `97339f8` (run 36853619574) and on this handover's merge are green (`test / build-and-test`, `deploy`, `verify` read by name), and that `dev-verified` = success on the commit. Re-read; don't trust this file.
2. Write the plan for **#26 (core foundations)** only, with superpowers:writing-plans, saved as `docs/superpowers/plans/2026-10-01-m1-26-core-foundations.md`. Review it to zero by executing it, following memory `feedback-plan-code-from-executed-stages`: stage commits in a scratch worktree, red against throwing stubs, predicted mutations, plan blocks generated from the stages. Then self-approve it and implement it on branch `m1/26-core-foundations`. Plan one story at a time; an 11-story plan executed in full would be M1 itself.
3. Set #26 In Progress on the board when work starts.

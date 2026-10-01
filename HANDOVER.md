# Handover: Wordfarer

**Written:** 2026-10-01 07:19 UTC.
**Next session:** launch Claude from `~/Developer/Repos/wordfarer`. The session names itself "Wordfarer" by hook; type `/color green` once.

## State

- **Repo:** `Shyden-Ltd/wordfarer`, public. Agent `gh`/`git` act as the `wordfarer-agent` App, which has no `secrets` permission; secret names are read back in the browser instead.
- **Branches:** `main` = `1f660b3`. `develop` = `33e6035` plus this handover's PR.
- **M0 is DONE.** Epic #5 and stories #13–#16 are closed with AC evidence and set Done on the board. deploy-dev run 36824061545 on `33e6035` is green on attempt 2 (`test / build-and-test`, `deploy`, `verify` read by name), and `dev-verified` = success on the commit. Both dev hostnames send an anonymous request to the Access login (302 to `shyden.cloudflareaccess.com`).
- **Cloudflare dev setup** (recorded in memory `project-cloudflare-access-dev-setup`): Zero Trust Free, team `shyden`; Access app `wordfarer-dev` over both hostnames with an Allow policy (operator email) and a Service Auth policy (service token `wordfarer-dev-ci`, 1-year expiry); four `dev` environment secrets. The agent never types or views a credential: Shyden pastes values into a GitHub dialog the agent opens.
- **Board** (project 4, `PVT_kwDOEOcG584BlRWb`, title "Wordfarer Stories"). Resolve by node id and assert the title before any write. The M0 status helper was deleted with the M0 ledger; M1 needs its own item map.

## Decisions taken this session (beyond the plan)

1. ESLint ignores are derived from `.gitignore` (`@eslint/compat` `includeIgnoreFile`), not a hand list. `tests/unit/lint-ignores.test.ts` checks only entries an `ignore: false` ESLint would lint (three earlier cases were vacuous). `.remember/` added to `.gitignore`.
2. The sync Worker logs the D1 error (`console.error('health: D1 query failed', cause)`) before its 503.
3. `verify-dev.ts` turns a rejected fetch (dropped connection, a new hostname not resolving yet) and a relative `Location` into reported problems, and retries failed requests. Before this it crashed.
4. The CI step keeps the name "Typecheck (tsc, svelte-check)". Stage 4's "…, wrangler types" was inaccurate.
5. Deferred minor: `gateProblems` treats only 302/303 as redirects. A 301/307/308 to Access would fail closed, with a slightly wrong message.

## Open follow-ups

- Move the deploy credential from a user token to an account API token before production.
- The Access login card reads "twilight-mouse-02cd.cloudflareaccess.com" while the URL is `shyden.cloudflareaccess.com`: probably the auto-generated organisation name. Rename it in Zero Trust settings.
- `repo-template` follow-up; support mailbox, custom domain and trademark search (spec §14–15). Remote branches `ci/1-baseline-green`, `docs/2-design-spec` and `m0/dev-deploy` are merged leftovers.

## Resume steps

1. `git fetch origin`. Confirm `develop`'s head and that the handover PR merged and deployed green. Re-read; don't trust this file.
2. Next milestone: Epic M1 #6 (core simulation and pacing bots). Brainstorm, then write its stories with full AC on the board (project 4, title asserted) before any code. Then a plan, reviewed to zero by executing it, as M0's was.

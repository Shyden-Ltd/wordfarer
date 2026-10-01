# Handover: Wordfarer

**Written:** 2026-10-01 05:09 UTC.
**Next session:** launch Claude from `~/Developer/Repos/wordfarer`.

## State

- **Repo:** `Shyden-Ltd/wordfarer` is public, with secret scanning and push protection on. Agent `gh`/`git` calls run as the `wordfarer-agent` App (id 5144082).
- **Branch protection (read back 04:22 UTC as the App):** `main` and `develop` both have PRs required, 0 approvals, `enforce_admins`, `strict`, required check `build-and-test`, and no force-push or delete.
- **Branches:** `main` = `1f660b3`, `develop` = `d547bd6`. No other branches.
- **Uncommitted on `develop` (both go into the Task 1 branch; `git switch` carries them):** this file, and `docs/superpowers/plans/2026-10-01-m0-foundations.md`, the **approved M0 plan** (reviewed to zero in 5 passes, log at its end).
- **Board** (project 4, `PVT_kwDOEOcG584BlRWb`, read back 05:07 UTC): epics M0 #5, M1 #6, M2 #17, M3 #7, M4 #8, M5 #9, M6 #10, M7 #11, M8 #12. M0 stories #13–#16 (sub-issues of #5), all Todo. #1 and #2 are Done.
- **Cloudflare (created 04:38 UTC with Shyden's local wrangler login, his approval):** D1 `wordfarer-dev`, id `7ef754ed-f21e-4524-ac11-eac9bde28cc0`. No Workers exist yet. The workers.dev subdomain is `shyden1988uk`.
- **Decisions this session (Shyden):** the dev site goes behind **Cloudflare Access**; Cloudflare resources are created with the local wrangler login; and **D9 is amended**: the web app is a Worker with static assets, not Pages, because wrangler 4.145 refuses new Pages projects without `--force`. Task 4 writes the amendment into the spec.

## Waiting on Shyden (needed before Task 4 merges; Tasks 1–3 don't depend on it)

The plan's "Operator setup" section has the exact steps:

1. A Cloudflare API token (Workers Scripts Edit, D1 Edit, Account Settings Read).
2. A Cloudflare Access app over both `*.shyden1988uk.workers.dev` dev hostnames, with an email allow policy and a Service Auth token `wordfarer-dev-ci`.
3. GitHub `dev` environment secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`.

Also still open from before: the `repo-template` follow-up, and the support mailbox, custom domain and trademark search (spec §14–15).

## Resume steps

1. `git fetch origin`. Confirm `develop` is `d547bd6` and the board is as above. Re-read; don't trust this file.
2. Execute the plan (`superpowers:executing-plans`; subagents run on Sonnet), one task per branch and PR. Task 1 → #13 (`m0/toolchain`), Task 2 → #14, Task 3 → #15, Task 4 → #16. Move each story to In Progress when it starts. Merge into `develop` on green CI without asking, then post the AC evidence and set the story to Done.
3. **Reference implementation:** `.superpowers/sdd/m0/stages/000{1..4}-stage-N.patch` are the four stage commits the plan quotes, each built and gated from `d547bd6` (26 / 40 / 43+9 / 68+9 tests). If the plan text and a patch disagree, the patch is what ran. The tools that built and verified them are in the same folder: `stage.py`, `gen.py` (regenerates the plan from the skeleton), `red.py`, `mutate.py`, `gate.sh`, and `plan.skel.md` with `reviewlog.md`.
4. Before Task 4: ask Shyden whether the operator setup is done. After its merge, follow Task 4 Step 10 (the jobs read BY NAME, `dev-verified` read off the commit, both URLs showing the Access login).

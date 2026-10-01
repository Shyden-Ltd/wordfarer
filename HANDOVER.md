# Handover: Wordfarer

**Written:** 2026-10-01 17:45 UTC.
**Next session:** launch Claude from `~/Developer/Repos/wordfarer`. The session names itself "Wordfarer" by hook; type `/color green` once.

## State

- **Repo:** `Shyden-Ltd/wordfarer`, public. Agent `gh`/`git` act as the `wordfarer-agent` App, which has no `secrets` permission (listing environment secrets is a 403; read their names in the GitHub UI).
- **`develop`** = the merge of this handover, on top of `9b83c6c` (re-read it). Merged today: #41 and #45 (#39), #43 (#27).
- **#27 Done** (closed, AC evidence on the issue): `encounters.ts`, `state.ts`, `production.ts`, `sim.ts`; plan `docs/superpowers/plans/2026-10-01-m1-27-encounters-time-model.md`, reviewed to zero in 5 passes. Hand-offs it records: the hour-bucket production loop arrives with #28's per-word rates; the offline cap becomes upgradable in #29; `initialState` gains its seed in #30; `apply`, `seq` and the golden log in #36.
- **#39** is complete: AC evidence for PR A, AC8 and AC9 is on the issue. Dev is `dev.wordfarer.shyden.co.uk` (web, Basic auth with the shared dev password, `run_worker_first`) and `dev-api.wordfarer.shyden.co.uk` (sync, noindex only); `workers.dev` answers 404 (error 1042) for both. Access is retired: the application, both reusable policies, the service token and the `CF_ACCESS_*` secrets are deleted.
- **Secrets by name**: Worker secret `DEV_PASSWORD` on `wordfarer-web-dev`; GitHub `dev` environment secrets `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (the "wordfarer dev deploy (Workers+D1)" token, now with `shyden.co.uk` Workers Routes:Edit) and `DEV_BASIC_AUTH_PASSWORD`. The password value is never written anywhere, never typed by the agent, and never entered through a `!` command.
- **#44 (Todo, do it next)**: no workflow job has `timeout-minutes`, and `playwright install --with-deps` `apt-get`s from a slow Ubuntu mirror: four slow runs in 80 minutes on 2026-10-01, the worst 35 min 30 s in the browser step (evidence and the image-or-timeout trade-off in the issue comments).
- **Waiting on CI**: wait with `~/.claude/scripts/wait-run.sh <repo-dir> <run-id> [sha-file]` in a background Bash call, never a bare `gh pr checks --watch` or `gh run watch` (both returned mid-run today). After `gh run rerun`, check the printed attempt number.
- **Method tooling** (git-ignored, on disk): `.superpowers/sdd/m1-27/` is the latest set (`build-stages.sh`, `gate-stages.sh`, `red.py`, `mutate.py`, `mutation_tables.py`, `gen.py`, `verify_blocks.py`, `commit-stages.py`). Copy it for the next ticket.
- **Board** (project 4, `PVT_kwDOEOcG584BlRWb`, "Wordfarer Stories"). Status field `PVTSSF_lADOEOcG584BlRWbzhj-3Hc`; options Todo `f75ad846`, In Progress `47fc9ee4`, Done `98236657`. #39 item `PVTI_lADOEOcG584BlRWbzg95_uA`. New issues are **not** auto-added: add by node id and assert the title.

## Resume steps

1. `git fetch origin`; re-read `develop`'s head and the board (#39 should be Done, #44 Todo). Don't trust this file.
2. Plan #44 the #27 way (stages in a scratch worktree, red against stubs, predicted mutations, review to zero, self-approve). Decide between the pinned Playwright image and `--with-deps` behind a step timeout on measured evidence; record why.
3. Then #28 (words and memory), planned the same way. It brings the hour-bucket production loop that #27 deferred.

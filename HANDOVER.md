# Handover: Wordfarer

**Written:** 2026-10-01 20:55 UTC.
**Next session:** launch Claude from `~/Developer/Repos/wordfarer`. The session names itself "Wordfarer" by hook; type `/color green` once.

## State

- **Repo:** `shyden-labs/wordfarer`, public. Agent `gh`/`git` act as the `wordfarer-agent` App, which has no `secrets` permission (listing environment secrets is a 403; read their names in the GitHub UI).
- **`develop`** = the merge of this handover, on top of `90981d4` (PR #46, #44). Re-read it.
- **#44 is merged** (PR #46). Every job has `timeout-minutes` (`build-and-test` 15, `deploy` 10, `verify` 10). `build-and-test` runs in `mcr.microsoft.com/playwright:v1.63.0-noble@sha256:eff16c30…` as `--user 1001`, so no step `apt-get`s any more. The decision rests on probe run 36923761040 (table on #44): `--with-deps` took 54–371 s, no-deps cannot launch WebKit, and the image takes 27–43 s to pull. AC2 and AC4 were revised on the issue to match. Guards: `tests/unit/workflow-timeouts.ts` (parsed YAML), `supply-chain.test.ts` (image digest-pinned, tag equal to the locked `@playwright/test`), `cross-engine-harness.test.ts` (engines run in the image, no install step). Seven mutations, all predicted, all red.
- **Dependabot consequence of #44:** a Dependabot bump of `@playwright/test` now fails `supply-chain.test.ts` until `ci.yml`'s image tag and digest move with it. The failure message names the manifest URL; read the digest with `curl -sSI -H 'Accept: application/vnd.oci.image.index.v1+json' https://mcr.microsoft.com/v2/playwright/manifests/v<ver>-noble` (header `docker-content-digest`).
- **#27 and #39 are Done** (see the issues for their AC evidence). Dev is `dev.wordfarer.shyden.co.uk` (Basic auth) and `dev-api.wordfarer.shyden.co.uk`.
- **Secrets by name**: Worker secret `DEV_PASSWORD` on `wordfarer-web-dev`; GitHub `dev` environment secrets `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` and `DEV_BASIC_AUTH_PASSWORD`. The password value is never written anywhere, never typed by the agent, and never entered through a `!` command.
- **Waiting on CI**: wait with `~/.claude/scripts/wait-run.sh <repo-dir> <run-id> [sha-file]` in a background Bash call, never a bare `gh pr checks --watch` or `gh run watch`. Fetch job logs with `gh api --allow-escape-sequences …/jobs/<id>/logs`; without the flag the "log" is a one-line refusal.
- **Method tooling** (git-ignored, on disk): `.superpowers/sdd/m1-27/` is the full staged-plan set (`build-stages.sh`, `gate-stages.sh`, `red.py`, `mutate.py`, `mutation_tables.py`, `gen.py`, `verify_blocks.py`, `commit-stages.py`); `.superpowers/sdd/m0-44/mutate.py` is a compact whole-suite mutation runner. Copy them for the next ticket.
- **Board** (project 4, `PVT_kwDOEOcG584BlRWb`, "Wordfarer Stories"). Status field `PVTSSF_lADOEOcG584BlRWbzhj-3Hc`; options Todo `f75ad846`, In Progress `47fc9ee4`, Done `98236657`. #44 item `PVTI_lADOEOcG584BlRWbzg987dg`. New issues are **not** auto-added: add by node id and assert the title.

## Resume steps

1. `git fetch origin`; re-read `develop`'s head and the board (#44 should be Done). Don't trust this file.
2. Plan #28 (words and memory) the #27 way: stages in a scratch worktree, red against stubs, predicted mutations, review to zero, self-approve. It brings the hour-bucket production loop #27 deferred.

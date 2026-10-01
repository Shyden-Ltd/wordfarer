# Handover: Wordfarer

**Written:** 2026-10-01 16:23 UTC.
**Next session:** launch Claude from `~/Developer/Repos/wordfarer`. The session names itself "Wordfarer" by hook; type `/color green` once.

## State

- **Repo:** `Shyden-Ltd/wordfarer`, public. Agent `gh`/`git` act as the `wordfarer-agent` App, which has no `secrets` permission (listing environment secrets is a 403; read their names in the GitHub UI).
- **`develop`** = `0e33a8a` (re-read it): PR #41 (#39 PR A: `packages/lockdown`, the gated dev web Worker, dev Custom Domains, the password verify) merged as a merge commit.
- **#39 is In Progress, blocked on Shyden.** Deploy-dev run 36889267341 on `0e33a8a`: `test` and `deploy` passed; `verify` failed with `web: status 401 with the password, expected 200`. Every earlier check passed (401 + challenge without and with a wrong password, robots blocked). Measured since:
  - The live web version `dea2ac71` (100% of traffic) binds `DEV_PASSWORD` (secret_text) and has a `fetch` handler, so the secret reached the Worker.
  - Neither `basicAuthOk` nor `verify-dev.ts` trims or reshapes the password, so the Worker secret and the GitHub `dev` secret `DEV_BASIC_AUTH_PASSWORD` hold **different strings** (most likely a stray trailing newline or space in one).
  - Shyden's browser got `NXDOMAIN` for `dev.wordfarer.shyden.co.uk`: his router (192.168.1.1) negatively cached the name before the Custom Domain existed. The zone's SOA negative TTL is 1800 s, so it clears within 30 min; 1.1.1.1 resolves it and the gate answers 401 + `Basic realm="Wordfarer Non-Prod"`.
- **Operator steps done 2026-10-01:** the CI token "wordfarer dev deploy (Workers+D1)" now also has `shyden.co.uk - Workers Routes:Edit` (edited in Chrome with Shyden's in-session OK, summary read before saving). Both secrets exist by name.
- **The dev password value is never written anywhere** (public repo), never typed by the agent, and never entered through a `!` command (that lands in the transcript).
- **#27 planning started.** Scratch worktree `~/Developer/Repos/wordfarer-wt-27`, branch `scratch/m1-27-proto`, commit `c6555b4`: untested prototype modules `encounters.ts`, `production.ts`, `state.ts`, `sim.ts` in `packages/core/src`. Decisions so far: production is rate x time in #27 (the hour-bucket loop arrives with #28, whose per-word rates make buckets observable); `integrate` moves only the clocks, so AC6 holds bit-exactly; the AC2 bulk-vs-singles tolerance is derived from `Num.pow`'s documented bound (measured worst 2.9e-14 vs singles, 1.07e-13 vs a 60-digit reference, n <= 1000, k <= 300). No tests written yet.
- **#39 PR B** (AC8 `workers_dev: false`, AC9 Access retirement) waits for a green verify. Its stage is in `~/Developer/Repos/wordfarer-wt-39` (`stage/m2-39`; `.superpowers/sdd/m2-39/` holds the tooling and `HANDOVER.next.md`).
- **Board** (project 4, `PVT_kwDOEOcG584BlRWb`, "Wordfarer Stories"). Status field `PVTSSF_lADOEOcG584BlRWbzhj-3Hc`; options Todo `f75ad846`, In Progress `47fc9ee4`, Done `98236657`. #39 item `PVTI_lADOEOcG584BlRWbzg95_uA`. New issues are **not** auto-added: add by node id and assert the title.

## Resume steps

1. `git fetch origin`; re-read `develop`'s head and #39's state. Don't trust this file.
2. Ask Shyden (AskUserQuestion) for the login test: open `https://dev.wordfarer.shyden.co.uk` (phone on mobile data, or the laptop once the router's cache has expired), any username, the dev password.
   - **Opens:** the GitHub `dev` secret is the wrong copy. Shyden re-pastes `DEV_BASIC_AUTH_PASSWORD` (Settings, Environments, dev, pencil) with nothing after the last character.
   - **401:** the Worker secret is the wrong copy. Shyden re-runs `npx wrangler secret put DEV_PASSWORD --name wordfarer-web-dev` in **his own terminal**, typing or pasting at the prompt.
3. Re-run the failed job: `gh run rerun 36889267341 --failed`. Wait in the background, then read every job and step by name, and confirm the `dev-verified` status on `0e33a8a`.
4. Then follow the #39 plan's "Finishing" from step 5: AC evidence on #39, PR B (cherry-pick `stage-t5` with trailers), the AC8 probe, AC9 Access retirement, this file, #39 to Done.
5. #27: write the tests in `wordfarer-wt-27` against the prototype, then plan it the #26 way (stages, red against stubs, predicted mutations, review to zero, self-approve). Tooling to copy: `.superpowers/sdd/m2-39/`.

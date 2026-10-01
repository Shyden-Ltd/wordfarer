# Handover: Wordfarer

**Written:** 2026-10-01 13:05 UTC.
**Next session:** launch Claude from `~/Developer/Repos/wordfarer`. The session names itself "Wordfarer" by hook; type `/color green` once.

## State

- **Repo:** `Shyden-Ltd/wordfarer`, public. Agent `gh`/`git` act as the `wordfarer-agent` App, which has no `secrets` permission.
- **`develop`** = `c4a1c1f` (re-read it): PR #38 (#26, core foundations) merged as a merge commit, keeping its eight gated task commits. M1 (epic #6) In Progress.
- **#26 done**: the plan `docs/superpowers/plans/2026-10-01-m1-26-core-foundations.md` was reviewed to zero in 13 passes (pass 12 found an untested `pickFile` tie-break: M1.12, two cases added, everything re-proved; pass 13 clean). CI run 36865626307 green on every step; deploy-dev run 36865931487 on `c4a1c1f` (see the AC evidence comment on #26 for its result).
- **#39 filed** (Wordfarer board, Todo): dev on `dev.wordfarer.shyden.co.uk` + `dev-api.wordfarer.shyden.co.uk` behind the shared dev password, copied from shyden.co.uk/ShyTalk. Operator decisions (2026-10-01, asked interactively): **Basic auth replaces Cloudflare Access**; **the dev sync API stays ungated, noindex only**. The full comparison and 12 ACs are in the issue.
- **The dev password value is never written anywhere** (public repo). Shyden enters it himself into the Worker secret `DEV_PASSWORD` (`wordfarer-web-dev`) and the GitHub `dev` environment secret `DEV_BASIC_AUTH_PASSWORD`.
- **Method tooling** for planning by executed stages: `.superpowers/sdd/m1-26/` (git-ignored, on disk). Memory `feedback-plan-code-from-executed-stages` describes it; copy the scripts for the next ticket rather than editing these.
- The scratch worktree `~/Developer/Repos/wordfarer-wt-26` (branch `scratch/m1-26-stages`) is no longer needed once #26 is Done: remove it with `git worktree remove`.
- **Board** (project 4, `PVT_kwDOEOcG584BlRWb`, "Wordfarer Stories"). Status field `PVTSSF_lADOEOcG584BlRWbzhj-3Hc`; options Todo `f75ad846`, In Progress `47fc9ee4`, Done `98236657`. #39 item `PVTI_lADOEOcG584BlRWbzg95_uA`. New issues are **not** auto-added: add by node id and assert the title.

## Resume steps

1. `git fetch origin`; re-read `develop`'s head, #26's state and #39's board status. Don't trust this file.
2. If #26 is not yet Done (its AC comment missing or the deploy not verified), finish it: deploy-dev run 36865931487 must show `deploy`, `verify` success and the `dev-verified` status on `c4a1c1f`.
3. Plan #39 the #26 way (stages in a scratch worktree, red against stubs, predicted mutations, review to zero, self-approve). Port the lockdown module from shyden.co.uk `functions/_lib/lockdown.js` at `26b80e2` (read-only access to that repo and ShyTalk is authorised for this purpose only; never their boards or the roadmap). The web Worker needs a script with `run_worker_first: true` in its dev config.
4. Before merging #39, Shyden must set both secrets; the plan gives him the exact commands (`! npx wrangler secret put DEV_PASSWORD --name wordfarer-web-dev`, and the GitHub environment secret in the UI). Access is retired only after the new verify is green on `develop`.
5. Then #27 (encounters and the time model), planned the same way.

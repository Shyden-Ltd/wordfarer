# Handover: Wordfarer

**Written:** 2026-10-01 04:09 UTC.
**Next session:** launch Claude from `~/Developer/Repos/wordfarer`.

## State

- **Repo:** `Shyden-Ltd/wordfarer` is **public** (read back 03:03 UTC), with secret scanning and push protection on. `repo-template` is public too.
- **Agent App:** `wordfarer-agent` (App id 5144082) is installed on wordfarer only. Every agent `gh`/`git` call in this repo runs as the App. It has `workflows:write` and `administration:read`; `environments` and `secrets` are withheld.
- **Board:** "Wordfarer Stories", project 4, `PVT_kwDOEOcG584BlRWb`. #1 Done, #2 In Progress.
- **Branches:** `main` = `1f660b3` (template). `develop` = `b7bfdf9` (#3 merged; `build-and-test` green on develop, run 36809840054).
- **Ticket #2** (spec, research, licences): branch `docs/2-design-spec`, committed at `ee1b2c6` plus this handover commit. All ACs are met locally: spec reviewed to zero in 7 passes (log in spec §17); licence set committed; `tests/unit/licences.test.ts` was RED first, and 7/7 mutations went RED (L4 re-run after its first anchor matched nothing); 16/16 green; Prettier clean. **Next:** push, open the PR into `develop` with `Refs #2`, read CI by step name, ask Shyden to merge, close #2 with evidence.

## Waiting on Shyden

1. **Run `.superpowers/sdd/m0-admin/admin-settings.sh` in his own terminal.** It sets branch protection on `main` and `develop` (PRs only, `enforce_admins`, `strict`, required check `build-and-test`) and the `dev`/`production` environments (branch-restricted; production needs his approval), then reads both back. The file is git-ignored and lives in the repo, not `$TMPDIR`. Afterwards the agent re-reads protection (the App has `administration:read`).
2. **`repo-template` follow-up** (his call, separate repo): it ships no `package-lock.json` (CI fails in `setup-node`), tracks `node_modules/.vite`, has no LICENSE (Apache-2.0 is the chosen default) and no Prettier config. It has only `main`, so the branch flow for a fix there is his decision.

## Resume steps

1. `git fetch origin`. Check `gh pr list --state all` and the board for #2's state, rather than trusting this file.
2. If #2's PR is not open: `git push -u origin docs/2-design-spec`, then `gh pr create --base develop` with `Refs #2` and the mutation table. Wait for CI with a background job and read each step by name. Before asking Shyden to merge, compare the run SHA with `gh pr view --json headRefOid`.
3. After the merge: verify `build-and-test` on develop, comment the AC evidence on #2, close it, set the board to Done.
4. **Plan M0** with `superpowers:writing-plans`. Scope: npm workspaces; lint, typecheck and Prettier in CI, with a committed Prettier config (`singleQuote`); the environment-only secrets guard (spec §12.9); Cloudflare Pages + Worker + D1 dev deploy on every `develop` merge, with secrets only in the `dev` environment. Review the plan to zero by **running** its code in a scratch worktree. Create epics M0–M8 on board 4 and fully specified M0 stories.

## Open items for Shyden (not blocking M0)

- Support mailbox address (spec §11, §14.5).
- Custom domain; an early trademark clearance search (spec §14.3, §15).
- Workers Paid plan (about $5/month) before ranked replay goes live (spec §6.7).

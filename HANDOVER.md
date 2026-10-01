# Handover: Wordfarer

**Written:** 2026-10-01 03:01 UTC.
**Next session:** launch Claude from `~/Developer/Repos/wordfarer`.

## State

- **GitHub repo:** `Shyden-Ltd/wordfarer`, still **private**, generated from `Shyden-Ltd/repo-template`. Its `main` holds only the template commit. Dependabot alerts and automated security fixes are on (re-read 2026-10-01).
- **Board:** "Wordfarer Stories", Shyden-Ltd project **4**, node `PVT_kwDOEOcG584BlRWb`. Created and read back at 00:50 UTC, linked to the repo and recorded in `CLAUDE.md`. Empty.
- **Agent App:** `wordfarer` is registered in `~/.claude/scripts/github-app/app_manifest.py` (TDD; all 8 harness suites green, all 6 mutation matrices 0 mismatches; `~/.claude` is not a git repo, backups in the session scratchpad only). Permissions: `workflows:write`, `administration:read`; `environments` and `secrets` are withheld (Shyden 00:55 UTC). **From now on every wordfarer `gh`/`git` call needs the App**: until it is created and installed, they refuse by design.
  - **Created 03:02 UTC**: `wordfarer-agent`, App id 5144082. Key in Keychain service `wordfarer-agent-github-app`, config `~/.claude/state/github-app/wordfarer-agent.json`. It authenticated with the stored key, and the granted rights match the manifest. **Not yet installed** (03:02: `found 0` installations). Shyden installs it on `Shyden-Ltd/wordfarer` ONLY: https://github.com/apps/wordfarer-agent/installations/new
- **Local folder:** `git init` done, `origin` set, **no commits, nothing fetched**. Uncommitted files (not in `$TMPDIR`): `docs/superpowers/specs/2026-10-01-wordfarer-design.md`, `docs/research/2026-10-01-idle-game-research.md`, `CLAUDE.md`, `HANDOVER.md`, `.gitignore`, and the new licence set `LICENSE` (Apache-2.0, from GitHub's licence API), `NOTICE`, `LICENSE-CONTENT.md`, `TRADEMARKS.md`, `LICENSES/CC-BY-SA-4.0.txt`, `LICENSES/CC-BY-NC-SA-4.0.txt` (both from creativecommons.org legalcode.txt).

## Decisions made this session (all in spec §2 D17 or §17)

- §17 pacing fix confirmed: 4 destinations per region (00:55 UTC).
- **Public and open-source** (01:01 UTC), and a standing rule for all new repos: global `~/.claude/CLAUDE.md` ("NEW REPOS ARE PUBLIC AND OPEN-SOURCE") plus memory.
- Licences: code **Apache-2.0**; content **per item**: CC BY-SA 4.0 if adapted from BY-SA sources, CC BY-NC-SA 4.0 for original work; name and logo reserved. Template default **Apache-2.0**. (A first answer of "all content NC-SA" was re-asked because the lexicon adapts CC BY-SA sources.)

## Waiting on Shyden (the agent is refused these)

1. Install the App (link above).
2. In **his own terminal** (not `!`: agent-session `gh` routes wordfarer to the App, which cannot change visibility). The classifier refused these for the agent ("Create Public Surface"):
   ```
   gh repo edit Shyden-Ltd/repo-template --visibility public --accept-visibility-change-consequences
   gh repo edit Shyden-Ltd/wordfarer --visibility public --accept-visibility-change-consequences
   for r in repo-template wordfarer; do gh api -X PATCH repos/Shyden-Ltd/$r -f 'security_and_analysis[secret_scanning][status]=enabled' -f 'security_and_analysis[secret_scanning_push_protection][status]=enabled'; done
   ```
3. One-off admin settings the App cannot write (`administration` is read-only): branch protection on `main` and `develop` (PRs only, `enforce_admins`, `strict: true`), plus the `dev` and `production` environments restricted to `develop`/`main`. The agent prepares exact commands once `develop` exists.

## Resume steps

1. Confirm the App key is stored and installed: `gh api repos/Shyden-Ltd/wordfarer --jq .full_name` must succeed in an agent session. Read visibility back (`.private` must be `false` once Shyden has flipped it).
2. `git fetch origin && git checkout -b main --track origin/main` (untracked files do not overlap the template's paths; `git status` before and after). Create `develop` from `main` and push it.
3. Prepare the branch-protection and environment commands for Shyden (step 3 above), then re-read both after he runs them.
4. **Spec review loop to zero**: D1–D17 reflected, no contradictions, consistent numbers and names, no placeholders, DN1–DN26 each mapped exactly once in §9. Log every pass in §17.
5. **First ticket and PR**: "Design spec, research and licences", with ACs. Branch `docs/design-spec`, authored as Shyden, PR into `develop`, `Refs #N`.
6. **repo-template follow-up** (Shyden asked for public + open-source as the default): add Apache-2.0 `LICENSE`, add a `.gitignore`, remove the committed `node_modules/.vite` cache, and assert in its supply-chain test that `LICENSE` exists. The template has only `main` (no `develop`), so ask Shyden which flow it uses before opening a PR there.
7. **Plan M0** with `superpowers:writing-plans` (npm workspaces, CI, supply-chain test, Dependabot to `develop`, SHA-pinned actions, remove `node_modules`, Cloudflare dev deploy with secrets only in the `dev` environment, a guard that every `secrets.*` reference sits in a job with an `environment`, the per-item content licence check). Review it to zero by running the code. Create epics M0–M8 on board 4.

## Open items for Shyden (not blocking M0)

- Support mailbox address (spec §11, §14.5).
- Custom domain, after trademark clearance (spec §14.3). Note: a public repo makes the name visible before clearance.
- Workers Paid plan (about $5/month) before ranked replay goes live (spec §6.7).

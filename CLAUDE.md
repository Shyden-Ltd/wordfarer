# Wordfarer: project instructions

Wordfarer is a cross-platform idle game for learning a real language: English speakers learning Indonesian (`en-id`) and Indonesian speakers learning English (`id-en`). It is built once for web and shipped to browsers (PWA), Steam (Electron) and mobile (Capacitor), owned by Shyden Labs.

The global `~/.claude/CLAUDE.md` rules all apply here. This file adds what is specific to this repo.

## Read first

- **`HANDOVER.md`**: where work stopped and the numbered resume steps.
- **Design spec:** `docs/superpowers/specs/2026-10-01-wordfarer-design.md`. This is the source of truth. Operator decisions D1–D17 in its §2 are settled, so don't re-ask them.
- **Research:** `docs/research/2026-10-01-idle-game-research.md`. The spec cites its H-numbers (player complaints) and DN-numbers (the do-not list).

## Boundaries

- **Board:** "Wordfarer Stories", a GitHub Project owned by shyden-labs. Its node id is recorded below once created. Resolve the board from that node id and assert its **title** before any write. **Never** touch project #1 (ShyTalk Stories), project #2 (Shyden Site), project #3 (ShyFerry Stories), or the ShyTalk roadmap.
  - Board node id: `PVT_kwDOEOcG584BlRWb` (shyden-labs project **4**, title "Wordfarer Stories", read back 2026-10-02 00:13 UTC after the org rename, #49)
- **Git identity:** agent git acts through a per-repo GitHub App (`wordfarer-agent`, see HANDOVER step 1). Until it exists, `git fetch`/`push` refuse by design. Never route around the credential helper. Commits are authored as Shyden.

## Flow

- `main` and `develop`. Each ticket gets its own branch, with a PR into `develop`, never directly into `main`. Every `develop` merge deploys the dev environment (web Worker + sync Worker + D1 dev) once the pipeline exists (milestone M0).
- TDD: failing test first. Zero warnings policy. Dependabot targets `develop`. Actions are SHA-pinned.
- Write `Refs #N` in commit messages and PR bodies, never close/fix/resolve next to an issue number unless you mean it.

## Stack (decided, spec §6)

npm workspaces · TypeScript · Svelte 5 · Vite · Vitest + fast-check + Stryker · Playwright · break_infinity.js · ts-fsrs · Zod · Cloudflare Workers + D1 (`wrangler`) · Electron + steamworks.js · Capacitor.

## Content rule

No lexicon item, culture card, motif, story line or UI string reaches a paid build unless it is `native-reviewed`. The public web launch has the same bar. Labels of 3 words or fewer get their own audit. Motifs are publicly shared decorative traditions only: no Aboriginal dot-painting or other restricted or sacred designs.

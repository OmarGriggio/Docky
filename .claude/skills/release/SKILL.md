---
name: release
description: Ship Docky - merge develop into main as a new version (reviewers, version bump, CHANGELOG, merge, tag, then follow the deploy). Use when Omar asks to release, ship, deliver, merge into main or "push to prod" ("on livre", "merge avec 1.x.0"...).
---

# Release Docky

A release is a merge of `develop` into `main`: CI then tests, builds and deploys it (see CLAUDE.md's Workflow and Versioning, and [zz_docs/Deployment.md](../../../zz_docs/Deployment.md)). Talk to Omar in French. **Two hard stops - never skip them, whatever was said earlier in the session:** the version (step 4) and the go-ahead to merge and push (step 7). No test run here: CI runs every test and stops the deploy on a failure (step 8 watches it).

## 1. Where things stand

- `git fetch origin`, then check: on `develop`, nothing uncommitted (`git status --short` empty - otherwise ask what to do with it), `develop` not behind `origin/develop`.
- `git log --oneline origin/main..develop` - nothing there: say so and stop.
- Push `develop` if it's ahead of `origin/develop` - only with Omar's go-ahead (CLAUDE.md: never push without one); the reviewers don't need it pushed, so this can wait for step 7.

## 2. The three reviewers

Run `business-reviewer`, `security-reviewer` and `code-reviewer` (`.claude/agents/`) **in parallel, in one message**, each on what isn't on `main` yet: give them `git log origin/main..develop` and tell them to read `git diff origin/main..develop` themselves, the files around it, and the `zz_docs/features/` docs of what it touches. Summarize their findings for Omar in three groups - **blocking** (a real bug, a security hole, a broken business rule), **to discuss**, **minor** - each with its file:line and the concrete scenario, the reviewers' false alarms said as such once checked.

## 3. Fixes

Fix what's blocking (and what Omar picks from the rest) only once he agrees, as ordinary commits on `develop` following CLAUDE.md (one per side and module, i18n apart, `<Area> : <what>`), each with a test when it's a bug. Nothing blocking left before going on.

## 4. The version - stop and ask

From `git log origin/main..develop`, propose PATCH / MINOR / MAJOR (CLAUDE.md's Versioning: PATCH a fix with nothing new, MINOR a new feature or visible improvement, MAJOR breaks the user's habits or data - rare) with a one-line reason, and **wait for Omar's answer**. He may name it himself ("avec 1.7.0") - then that's the answer.

## 5. Bump and CHANGELOG

- `node .claude/skills/release/bump-version.mjs X.Y.Z` - writes both package.json, both lockfiles and `APP_VERSION`, then runs `version.test.ts`. It refuses a version not above the current one.
- Add `## [X.Y.Z] - YYYY-MM-DD` (today) at the top of [CHANGELOG.md](../../../CHANGELOG.md), above the previous one, in its style: English, `### Added` / `### Changed` / `### Fixed` (only those that have something), what a **user** would notice - a screen, a button, a printed PDF, a rule - not refactors, docs, tests or tooling. Read the commits (`git log origin/main..develop`) and the feature docs to word it; group a feature's commits into one bullet.
- Show Omar the CHANGELOG section.
- One commit: `Docs : release X.Y.Z` (the five version files + CHANGELOG.md).

## 6. Check before merging

`git log --oneline origin/main..develop` once more and `git status --short` empty.

## 7. Go-ahead - stop and ask

Ask explicitly: "Je merge `develop` dans `main`, je pousse et je tague `vX.Y.Z` ?" - and wait for a yes **to this question**. Then:

```bash
git push origin develop
git checkout main && git pull --ff-only origin main
git merge --ff-only develop    # main only ever moves forward to develop - no merge commit
git push origin main
git tag -a vX.Y.Z -m "Docky X.Y.Z" && git push origin vX.Y.Z
git checkout develop
```

Stop at the first failure and tell Omar - never force anything.

## 8. Follow the deploy

`node .claude/skills/release/ci-status.mjs $(git rev-parse main) 30` (in the background) - follows the Deploy workflow of that commit through GitHub's API, one request a minute. Tell Omar how it ended: all green (deployed), a failed run (its link, and what failed if the log can be read), or still running after 30 minutes. A failure after the merge isn't fixed by force-pushing `main`: propose a PATCH release with the fix, or the rollback in [zz_docs/Deployment.md](../../../zz_docs/Deployment.md).

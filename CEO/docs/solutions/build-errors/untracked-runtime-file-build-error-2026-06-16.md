---
title: Untracked Runtime File Causes Build Failure on Fresh Clone
date: 2026-06-16
category: CEO/docs/solutions/build-errors/
module: SharkMissile weapon runtime
problem_type: build_error
component: development_workflow
severity: high
symptoms:
  - Fresh git clone fails with module-not-found error at build time
  - Feature works locally but breaks on any other machine or CI environment
  - "`git status` shows a file as Untracked while a committed file imports it"
root_cause: incomplete_setup
resolution_type: code_fix
tags:
  - git
  - untracked-file
  - build-error
  - vite
  - module-resolution
  - fresh-clone
  - worktree
---

# Untracked Runtime File Causes Build Failure on Fresh Clone

## Problem

`SharkMissile.jsx` imported `sharkMissileRuntime.js` at line 10, but the runtime file was created locally and never committed to git. The feature worked on the original developer's machine but would cause a hard build failure for any developer doing a fresh `git clone`.

## Symptoms

- Fresh `git clone` fails at build time: `Cannot resolve module '../../lib/sharkMissileRuntime'`
- The import succeeds locally (file exists on disk) but fails everywhere else
- `git status` shows `sharkMissileRuntime.js` as `Untracked` while `SharkMissile.jsx` (which imports it) is committed and pushed

## What Didn't Work

The bug was caught in code review before a fresh clone attempt triggered it — there was no failed build to point to. The signal was a reviewer noticing that an imported file path showed as `Untracked` in `git status`.

Without the code review catch, the failure mode would have been completely silent: the local developer sees no error because the file exists on disk, while every other environment gets a hard build break on startup.

The file was created as part of a cross-worktree port (SharkMissile weapon ported from the Codex worktree into the integration worktree). In a multi-worktree setup with direct trunk push, an untracked file in one worktree is also absent from `origin/main` — committing is the only path to making it visible everywhere. (session history)

## Solution

Stage and commit the missing file alongside its test:

```bash
git add src/lib/sharkMissileRuntime.js src/lib/sharkMissileRuntime.test.js
git commit -m "fix(weapons): commit missing sharkMissileRuntime lib and tests"
```

To detect this before it happens, scan for untracked files that are imported by committed files:

```bash
# List untracked files under src/
git ls-files --others --exclude-standard src/

# Cross-check: does any committed file import an untracked path?
git grep "from.*sharkMissileRuntime"   # substitute the untracked filename
```

## Why This Works

The build system (Vite) resolves imports at bundle time using the file system. `git` only tracks files that have been staged and committed — untracked files are invisible to any machine other than the original author's. On a fresh clone, the import resolution fails because the file simply does not exist.

In this project's multi-worktree direct-trunk setup, `git push` from any worktree sends to `origin/main`. An untracked file in one worktree is therefore also absent from `origin/main` and from any downstream clone. Committing the file makes it part of the repository and ensures all environments see it.

## Prevention

**Before committing a feature that introduces a new lib file:**

1. Run `git ls-files --others --exclude-standard src/` — if any output appears, cross-check that no committed file imports those paths.
2. Treat any new `src/lib/*.js` helper as a first-class deliverable. Stage it in the **same commit** as the file that imports it.
3. New lib files are the most common candidate for accidental omission — they are often written last as supporting infrastructure, after the main feature component is drafted.

**Optional CI guard:** A pre-push hook that runs `git ls-files --others --exclude-standard src/` and fails on non-empty output will catch this automatically.

## Related Issues

- The companion test file `sharkMissileRuntime.test.js` was also untracked and was committed in the same fix.
- This pattern applies any time a feature is split into a runtime helper lib (e.g., separating fire-condition logic from fire-payload logic), which creates a new file that the main component immediately depends on.

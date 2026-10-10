# Hosting X card predeploy Windows fix — 2026-10-11

Project: Escape! zombie school
Kanban task: t_5bad8a95
Commit under verification: 80df5088df80290624f0b59ef8ca53dae839db87
Scope: Windows Firebase Hosting predeploy command execution only. No game UI code, no commit, no push, no live deploy.

## Mandatory gate

- Checker command used from the task workdir:
  `powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:/Users/admin/AppData/Local/Temp/quest-accept-ui-20261011/Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile launchmini -Domain auto -TaskSummary hosting-predeploy-Windows-path`
- `combined_receipt_sha256`: `aafec11e781ab5052b19f42685d8b19be0f5beab140136d26b71b1d122dc9458`
- `resolved_domains`: `common`, `aab`
- `matched_domains`: none
- `match_evidence`: none
- Required launchmini generic preflight was present in `read_required`: `Developer/agent_room/launchmini_aab_physical_android_google_login_mandatory_preflight.md`
- Latest `SESSION_MEMORY.md` entry read only: `Session 9 - Entry 1 - 2026-10-10 2323 KST`

## Root cause

Firebase Tools 15.22.4 on Windows ran Hosting `predeploy` entries through cross-spawn in a way that treated direct command strings containing spaces as executable names. The failing X-card entry was:

```text
node ../../marketing/x_daily_zombie_school_posting/Build-XWebsiteCards.mjs --output dist
```

A non-live dry-run also showed the same Windows predeploy risk on the direct safe-promotion guard entry:

```text
node scripts/require-safe-hosting-promotion.mjs
```

Both are Node commands that include an executable plus arguments in one firebase.json string. Existing `npm.cmd run ...` predeploy entries already execute correctly in this Windows Firebase Tools path.

## Minimal fix

Changed only Hosting predeploy wiring and its focused regression test:

- Added package scripts in `Developer/r3f_prototype/package.json`:
  - `require:safe-hosting-promotion`: `node scripts/require-safe-hosting-promotion.mjs`
  - `build:x-website-cards`: `node ../../marketing/x_daily_zombie_school_posting/Build-XWebsiteCards.mjs --output dist`
- Updated `Developer/r3f_prototype/firebase.json` predeploy entries to invoke those through `npm.cmd run ...`:
  - `npm.cmd run require:safe-hosting-promotion`
  - `npm.cmd run build:x-website-cards`
- Updated `marketing/x_daily_zombie_school_posting/Build-XWebsiteCards.test.mjs` to assert Windows-compatible npm predeploy wiring and forbid direct `node ...` predeploy entries.

The X website-card generation gate remains in the Firebase Hosting predeploy sequence.

## Verification

### RED test

Command:

```text
node --test marketing/x_daily_zombie_school_posting/Build-XWebsiteCards.test.mjs
```

Result before the package-script fix:

```text
2 pass, 1 fail
AssertionError: packageJson.scripts['build:x-website-cards'] was undefined
```

After the first dry-run exposed the safe-promotion guard command as the same Windows predeploy class, the focused test was widened and failed on:

```text
AssertionError: packageJson.scripts['require:safe-hosting-promotion'] was undefined
```

### GREEN tests

Command:

```text
node --test marketing/x_daily_zombie_school_posting/Build-XWebsiteCards.test.mjs
```

Result:

```text
3 tests passed, 0 failed
```

### Manual package script generation

Command from `Developer/r3f_prototype`:

```text
npm.cmd run build:x-website-cards
```

Result:

```text
Generated 76 X website cards and images.
C:\Users\admin\AppData\Local\Temp\quest-accept-ui-20261011\Developer\r3f_prototype\dist\x-website-cards-manifest.json
```

Manifest readback:

```text
cards=76
httpChecks=76
```

### Narrow non-live Firebase Hosting predeploy verification

Command from `Developer/r3f_prototype`:

```text
cmd //c "set ESCAPE_HOSTING_PROMOTION_NONCE=abcdefabcdefabcd&& npm.cmd exec -- firebase deploy --only hosting --dry-run"
```

Result:

```text
Running command: npm.cmd run require:safe-hosting-promotion
Safe Firebase Hosting preview promotion authorized.
Running command: npm.cmd run build
Studio-game sync source contract passed.
Test Files 4 passed (4)
Tests 45 passed (45)
vite build completed; Hosting JavaScript asset verification passed (56 assets checked).
Running command: npm.cmd run build:legal
wrote hosting/delete-account.html
wrote hosting/privacy.html
wrote hosting/terms.html
wrote dist/delete-account.html
wrote dist/privacy.html
wrote dist/terms.html
Running command: npm.cmd run build:x-website-cards
Generated 76 X website cards and images.
+ hosting: Finished running predeploy script.
+ Dry run complete!
```

This was a Firebase dry run only. No live Hosting deploy, preview promotion, Play Console action, Firebase data mutation, commit, or push was performed.

## Current limitations

- This task verified local Windows predeploy execution and card generation only.
- No production/global rollout was requested or performed.
- The dry-run build rewrote `Developer/r3f_prototype/dist/` outputs as part of normal predeploy verification; the source code change remains limited to `firebase.json`, `package.json`, this test, and this record.

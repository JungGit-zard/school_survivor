# QA — Inucon heal/push VFX + dog-bark SFX focused acceptance (2026-08-30)

- Kanban: `t_59120120`
- Profile: `balanceqa`
- Time: `2026-08-30 0959 KST`
- Scope: read-only review of parent diffs for heal VFX, Inucon successful-push VFX/SFX, and `inuconBite` dog-bark asset replacement. No code changes, no commit, no push.
- Workspace: `D:\JungSil\2.Minigame_project\school_survivor-integration`

## Mandatory pre-command gate

Command run from project root:

```text
powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1' -Profile balanceqa -Domain auto -TaskSummary 'inucon heal push vfx sfx focused qa acceptance'
```

Result:

- exit_code: `0`
- resolved_domains: `common`, `qa`, `audio`
- matched_domains: `qa`, `audio`
- match_evidence: `qa`, `sfx`
- combined_receipt_sha256: `2efbabfe5b8aebdc2e84b7fa248494b996bda5381be24c4063e2b264d21f969a`

All emitted `read_required` files were read. `SESSION_MEMORY.md` was read according to the central rule as only the latest single session entry: `Session 8 · Entry 0 (Bootstrap) · 2026-08-30 0524 KST`.

## Parent diff files reviewed

Focused parent files with diffs:

```text
Developer/r3f_prototype/public/sfx/enemies/inuconBite.mp3
Developer/r3f_prototype/public/sfx/enemies/inuconBite.ogg
Developer/r3f_prototype/src/components/Player.jsx
Developer/r3f_prototype/src/components/Player.test.js
Developer/r3f_prototype/src/components/Weapons/Inucon.jsx
Developer/r3f_prototype/src/components/Weapons/Inucon.test.jsx
```

Repository also had many unrelated dirty/deleted/untracked files before this QA pass. They were not edited by this QA task.

## Acceptance checks

| Check | Result | Evidence |
| --- | --- | --- |
| Heal VFX enlarged/bright/sharp | PASS (static diff/code evidence) | `HEAL_EFFECT_RING_RADIUS=0.6` vs old `0.32`, tube `0.038` vs old `0.018`, spark `0.08` vs old `0.045`, core scale `1.24` plus stronger pulse, higher segment counts `10/48`, brighter `#bdffcf` and white `#ffffff`, `toneMapped={false}`. |
| Heal VFX only on successful healing | PASS | `useGameStore.healPlayer` increments `healFlashToken` only when `hp > previous hp`; `PlayerVisual` renders `<PlayerHealEffect token={healFlashToken} />`. Inucon heal path checks `healAmount > 0` and records/sounds only when pre-heal HP is below max. |
| Push VFX only on hits | PASS | `Inucon.jsx` calls `applyRadialDamage(...)`; `triggerInuconPushVfx(biteDrag.radius)` is inside `if (hits > 0)`, and no `else` trigger exists. |
| Push VFX centered and radius-matched | PASS | `InuconPushEffect` positions group at `playerPos.x/z`; ring scale uses `radius * INUCON_PUSH_VFX_RING_RADIUS_MULTIPLIER`, and multiplier is exactly `1`. The trigger passes `biteDrag.radius`, the same radius used for `applyRadialDamage`. |
| Dog bark asset decodes | PASS | OGG and MP3 both decoded through Python `soundfile`; durations, peaks, bytes, and SHA-256 recorded below. |
| Existing successful-push SFX path points to dog bark asset | PASS | Successful push still emits `emitSfx({ id: 'inuconBite', ... })`; `SOUND_MAP.inuconBite` remains `/sfx/enemies/inuconBite.ogg`; replaced files are `public/sfx/enemies/inuconBite.ogg` and `.mp3`. |
| No gameplay numeric/timing/title/Firebase changes in focused parent diff | PASS | Focused code diff is limited to VFX constants/rendering/tests and binary `inuconBite` asset replacement. No title/Firebase files changed in the focused parent diff. The added `studioNonFocusable/studioNonTunable` flags are on the new transient VFX group only, not a Studio system or tuning-path change. |
| Unrelated dirty work preserved | PASS | QA performed read-only diff/test/decode checks plus this QA record write only. No checkout/stash/reset/commit/push. |

## Commands and results

```text
kanban_show(task_id='t_59120120')
→ task loaded; parents t_145d79a7 and t_51e4acdf done; current task running.
```

```text
powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1' -Profile balanceqa -Domain auto -TaskSummary 'inucon heal push vfx sfx focused qa acceptance'
→ exit_code 0; resolved_domains common/qa/audio; matched_domains qa/audio; combined_receipt_sha256 2efbabfe5b8aebdc2e84b7fa248494b996bda5381be24c4063e2b264d21f969a
```

```text
test -d /c/Users/admin/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING
→ GSTACK_OK
```

```text
git status --short --branch
→ branch zombie_only...origin/zombie_only; many pre-existing unrelated dirty/deleted/untracked files; focused parent files listed above include Player/Inucon code tests and inuconBite assets.
```

```text
git diff -- Developer/r3f_prototype/src/components/Player.jsx Developer/r3f_prototype/src/components/Player.test.js Developer/r3f_prototype/src/components/Weapons/Inucon.jsx Developer/r3f_prototype/src/components/Weapons/Inucon.test.jsx Developer/r3f_prototype/public/sfx/enemies/inuconBite.ogg Developer/r3f_prototype/public/sfx/enemies/inuconBite.mp3 --stat
→ reviewed focused code diff and binary asset diffs.
```

```text
git diff --name-only -- Developer/r3f_prototype/src/components/Player.jsx Developer/r3f_prototype/src/components/Player.test.js Developer/r3f_prototype/src/components/Weapons/Inucon.jsx Developer/r3f_prototype/src/components/Weapons/Inucon.test.jsx Developer/r3f_prototype/public/sfx/enemies/inuconBite.ogg Developer/r3f_prototype/public/sfx/enemies/inuconBite.mp3
→ exactly the six focused parent paths listed in this report.
```

```text
git diff -- <focused code paths> | grep -Ei 'firebase|studio|title|cooldown|interval|damage|hp|maxHp|speed|duration|timing|SOUND_MAP|localStorage|versionCode|BGM|title_bgm' || true
→ only VFX duration constants/test text, existing biteDrag/applyRadialDamage context, and new transient VFX userData flags appeared; no title/Firebase/SOUND_MAP/gameplay-stat edit was found in the focused diff.
```

```text
npx vitest run src/components/Player.test.js src/components/Weapons/Inucon.test.jsx --maxWorkers=1 --no-file-parallelism
→ Test Files 2 passed (2), Tests 13 passed (13), Duration 3.15s
```

```text
node scripts/verify-voice-sfx-assets.mjs
→ verified 29 voice-like SFX ids (58 files)
```

```text
python decode/hash verification for public/sfx/enemies/inuconBite.ogg and .mp3
→ public/sfx/enemies/inuconBite.ogg: decode=OK duration=0.430000s sr=44100 samples=18963 channels=1 peak=0.5340 rms=0.0666 bytes=6656 sha256=91a515d574ea36ce148a09ba7d3ff2dcae2d71695d1be7e5c856bdd3e63126c4
→ public/sfx/enemies/inuconBite.mp3: decode=OK duration=0.470204s sr=44100 samples=20736 channels=1 peak=0.5224 rms=0.0614 bytes=3761 sha256=0cc80254c7fa8348379e9749b445348cd226d5d82a8758a1688176b7c673bb99
```

```text
TZ=Asia/Seoul date '+%Y-%m-%d %H%M KST'
→ 2026-08-30 0959 KST
```

## Observations

- The VFX acceptance is grounded in code/diff/tests, not a live screenshot or human perceptual playtest.
- Push SFX remains tied to the same `hits > 0` branch as the new push VFX, so a missed pulse intentionally does not bark or flash.
- The dog-bark cue is objectively decodable and mobile-short, but subjective “sounds like a dog bark” remains partly perceptual. Prior Sound_Mini record identifies it as a procedural two-bark cue.

## Blockers

- None for focused code/static acceptance.
- Not performed: browser/gameplay visual capture, mobile device audio listening, full suite. These were intentionally outside the requested smallest focused tests.

## Verdict

PASS for focused acceptance of parent diffs: heal VFX is materially enlarged/brighter/sharper by static geometry/material evidence and remains tokened only by actual healing; Inucon push VFX/SFX fire only on successful hit pulses and use the same player-centered radius; dog-bark assets decode and the existing `inuconBite` path remains wired. No commit or push performed.

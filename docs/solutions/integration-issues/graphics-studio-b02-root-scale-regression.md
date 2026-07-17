---
title: Graphics Studio B02 root scale made Stage 2 boss oversized
date: 2026-07-17
category: docs/solutions/integration-issues
module: Graphics Studio B02 runtime/title/lobby synchronization
problem_type: integration_issue
component: graphics-studio
symptoms:
  - "Stage 2 boss B02 appeared much larger than Stage 1 boss in the lobby stage card."
  - "B02 also appeared roughly twice as large in the title scene."
  - "Reducing only the StageBossPreview camera zoom did not fully fix the title or shared runtime path."
root_cause: stale_runtime_tuning
resolution_type: source_revision_migration
severity: high
related_components: [graphics-studio, title-scene, lobby, stage-boss-preview, zombie-mesh]
tags: [graphics-studio, b02, zombie-b02-teacher, root-scale, title-scene, lobby, stage-boss-preview, studio-tuned-group, source-revision]
---

# Graphics Studio B02 root scale made Stage 2 boss oversized

## Problem

Stage 2 boss `B02` appeared much larger than the Stage 1 boss in the lobby stage card. After the first lobby-only fix attempt, the user confirmed the same B02 was also about twice as large on the title screen. That proved the bug was not limited to `StageBossPreview` camera framing.

The real issue was that the shared B02 runtime visual path consumes Graphics Studio tuning state through `StudioTunedGroup`. If `zombie-b02-teacher` has an oversized root scale saved in local Studio state, every surface that renders `ZombieMesh type="B02"` can inherit the same inflated scale.

## Symptoms

- Stage 2 lobby card cropped or overfilled the boss preview.
- Title scene showed B02 much larger than nearby title bosses.
- The title placement itself did not explain the size:
  - `TitleBossZombie type="B02"` used `scale={0.98}`.
  - `TitleBossZombie type="B01"` used `scale={1.02}`.
- Existing tests and Studio sync paths showed that `zombie-b02-teacher` could be saved or posted with root scale values around `1.6`, `1.62`, or `1.7`.

## Mistake Point

The first mistake was treating the lobby screenshot as a local preview-camera problem.

The initial reasoning was:

1. `StageBossPreview` renders each stage card.
2. `B02` has a taller crown/hair silhouette than `B01`.
3. Therefore B02 probably needed a smaller preview zoom factor.

That was only a partial explanation. It could explain minor cropping from hair/crown height, but it could not explain the title screen also showing B02 around twice as large.

The decisive clue was the user's follow-up: “타이틀에서도 두배는 크게나오니까.” Since the title scene does not use the same lobby card camera, the shared source had to be below both surfaces.

The shared path is:

```text
Lobby StageBossPreview
TitleScene3D TitleBossZombie
Runtime EnemyVisual
        ↓
ZombieMesh type="B02"
        ↓
StudioTunedGroup itemId="zombie-b02-teacher"
        ↓
Graphics Studio saved root tuning
```

So the actual mistake point was allowing an oversized `zombie-b02-teacher` root scale to remain a preserved runtime tuning without a recovery migration.

## Root Cause

`ZombieMesh` renders `B02` through:

```jsx
<StudioTunedGroup itemId={getStudioZombieItemId('B02')}>
  <B02TeacherBossMesh hitFlash={hitFlash} reg={reg} />
</StudioTunedGroup>
```

`getStudioZombieItemId('B02')` resolves to `zombie-b02-teacher`.

That means B02 is not just the JSX model's raw block geometry. It is the model plus any saved Graphics Studio root/part/group tuning for `zombie-b02-teacher`.

Earlier Graphics Studio workflows and tests allowed root scale values such as:

```js
'zombie-b02-teacher': { scale: 1.7 }
'zombie-b02-teacher': { scale: 1.6 }
'zombie-b02-teacher': expect.objectContaining({ scale: 1.62 })
```

Those values were treated as valid user edits and preserved. When they reached runtime surfaces, B02 grew everywhere.

## What Didn't Work

### Reducing only the lobby preview zoom

Changing `BOSS_PREVIEW_ZOOM_FACTOR.B02` could make the lobby card look less cropped, but it did not fix:

- title screen B02 size;
- actual runtime B02 size;
- the polluted root scale state.

This is why the temporary idea of heavily lowering the preview factor was wrong. It was compensating for the symptom at one camera, not restoring the visual source.

### Editing title scene placement scale

The title placement was not the source of the bug. B02 used `scale={0.98}`, while B01 used `scale={1.02}`. Lowering the title placement would have hidden the title symptom while leaving the lobby and runtime paths incorrect.

### Blindly clearing all B02 tuning

That would have violated the Graphics Studio policy. Valid color, position, rotation, part, and group edits should not be destroyed just because the root scale was polluted. The repair needed to be a scoped migration.

## Solution

### 1. Add a B02 source revision migration

`Developer/r3f_prototype/src/lib/graphicsStudioB02Source.js` raised:

```js
sourceRevision: 3
```

This revision specifically means:

> Recover Stage 2 teacher boss from oversized root scale values preserved from Graphics Studio/live-sync experiments.

Revision 3 exists because some browsers had already recorded revision 2 while still keeping an oversized B02 root scale. If the user reports that the lobby card did not visually change after the r2 fix, treat revision 2 as stale and run the r3 recovery path.

### 2. Recover only root size axes for old B02 states

`Developer/r3f_prototype/src/lib/graphicsStudioConfig.js` now checks:

```js
if (storedRevision < sourceRevision) {
  completedRoot = {
    ...completedRoot,
    scale: DEFAULT_STUDIO_TUNING.scale,
    scaleX: DEFAULT_STUDIO_TUNING.scaleX,
    scaleY: DEFAULT_STUDIO_TUNING.scaleY,
    scaleZ: DEFAULT_STUDIO_TUNING.scaleZ,
  }
}
```

This restores B02's root size to `1` for states older than the bundled B02 source revision.

It preserves:

- root color/material tuning;
- root position and rotation tuning;
- B02 part edits;
- B02 group edits;
- future B02 revisions higher than the bundled source revision.

### 3. Apply a lobby-card B02 model scale guard

After root scale recovery, `StageBossPreview` still protects the lobby card from oversized local state by applying a B02-only model scale factor:

```js
const BOSS_PREVIEW_MODEL_SCALE_FACTOR = Object.freeze({ B01: 1, B02: 0.82, B03: 1 })
```

It also keeps a small render zoom correction:

```js
const BOSS_PREVIEW_ZOOM_FACTOR = Object.freeze({ B01: 1, B02: 0.95, B03: 1 })
```

The model scale is the lobby-card visual guard. The zoom factor only compensates for B02's taller hair/crown silhouette.

### 4. Add regression expectations

Regression tests were updated so old B02 root scale examples such as `1.7`, `1.6`, revision-2 stale browser states, and legacy promoted roots are recovered to `1`, while future revision `4` remains protected from downgrade.

## How to Restore If This Happens Again

1. Do not start by changing camera zoom or title placement.
2. Inspect whether the oversized visual uses `StudioTunedGroup`.
3. Find the item ID, e.g. `zombie-b02-teacher`.
4. Check `loadStudioTunings()` / local storage / Firebase Studio payload for root `scale`, `scaleX`, `scaleY`, `scaleZ`.
5. If the saved root size is polluted and the current source revision is lower than the required recovery revision, add a source-revision migration.
6. Reset only the invalid root size axes unless the user explicitly asks to reset all visual edits.
7. Preserve valid part/group edits and future higher revisions.
8. Verify all shared surfaces:
   - lobby `StageBossPreview`;
   - title `TitleBossZombie`;
   - runtime `EnemyVisual` / `ZombieMesh`;
   - Graphics Studio preview.

## Prevention

- Before editing B02, Stage 2 boss scale, title boss scale, lobby boss preview, `StageBossPreview`, `ZombieMesh`, `StudioTunedGroup`, `graphicsStudioB02Source`, or `graphicsStudioConfig`, read this document first.
- Treat “same model is wrong in both lobby and title” as a shared runtime-state problem until proven otherwise.
- Do not solve shared-state scale bugs by camera-only compensation.
- Do not overwrite Graphics Studio state without a tested migration and source revision.
- If a model is rendered through `StudioTunedGroup`, distinguish:
  - JSX/model base geometry;
  - runtime `ENEMY_STATS` scale;
  - title/lobby wrapper scale;
  - Graphics Studio root tuning scale.
- Add regression tests for both downgrade recovery and future-revision preservation.

## Related Issues

- `docs/solutions/integration-issues/graphics-studio-title-state-release-regression.md`
- `docs/solutions/ui-bugs/graphics-studio-b02-part-focus-outline.md`
- `Developer/stage2_boss_lobby_preview_scale_implementation_2026-07-17.md`
- `Graphic_designer/stage2_boss_lobby_preview_scale_review_2026-07-17.md`
- `Quaility_Assurance/stage2_boss_lobby_preview_scale_validation_2026-07-17.md`

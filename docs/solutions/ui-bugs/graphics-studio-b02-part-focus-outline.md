---
title: Graphics Studio B02 part focus outline drift
date: 2026-07-07
category: docs/solutions/ui-bugs
module: Graphics Studio enemy part focusing
problem_type: ui_bug
component: tooling
symptoms:
  - "B02 focused part outlines appeared doubled in Graphics Studio"
  - "Double-clicking a visible hair block could focus the whole head or a broad parent group"
  - "Face texture tuning and part focus behaved differently from other monsters"
root_cause: logic_error
resolution_type: code_fix
severity: high
tags: [graphics-studio, b02, part-focus, studio-part-id, toon-outline]
---

# Graphics Studio B02 part focus outline drift

## Problem

Stage 2 boss B02 behaved differently from the rest of the monster models in Graphics Studio. Individual part focus showed doubled neon outlines and sometimes selected a broad head or hair group instead of the visible block the user double-clicked.

## Symptoms

- Focus outlines appeared as two overlapping wireframes.
- A visible front hair click selected the whole head or a grouped hair region.
- B02 had legacy face-texture controls that normal monsters and Matilda did not use.

## What Didn't Work

- Adding more B02-specific stabilizers made the model harder to reason about. The old path introduced `b02-face-texture`, `studioTextureFit`, `Boss02FaceTexture`, and `B02BossZombieMesh` instead of matching the shared block-part pattern.
- Drawing one local bounding box for a grouped part still selected too much when the group contained several visible boxes.
- Treating toon outline meshes as ordinary focusable meshes caused the neon focus line to be generated for both the render outline and the actual colored mesh.
- Leaving neon focus outline helpers raycastable caused an already selected part's outline to intercept later double-clicks, so the user could not reliably select another part.

## Solution

Keep Graphics Studio focus tags on visible, controllable 3D parts only.

For B02:

- The face texture is display-only, not a separate transform target.
- Parent animation rigs do not carry broad `studioPartId` values.
- Each visible block that should be editable gets its own stable part ID.
- Toon render-outline helper meshes are marked and skipped by focus outline generation.

```jsx
<mesh
  renderOrder={1}
  geometry={geo}
  material={outMat}
  scale={[os, os, os]}
  userData={{ studioRenderOutline: true }}
/>
```

```jsx
<mesh
  name="b02TeacherFaceTexture"
  position={B02_TEACHER_BOSS_FACE.position}
  renderOrder={4}
  userData={{ studioNonFocusable: true }}
>
```

```jsx
<ZBlock
  name="b02FrontHairCap"
  studioPartId="b02-front-hair-cap"
  size={[0.70, 0.16, 0.38]}
  position={[0, 0.34, 0.08]}
/>
```

In `GraphicsStudioPreview.jsx`, skip render helpers and decals when creating focus outlines:

```js
if (object.userData.studioPartGroupOutline || object.userData.studioTextureDecal || object.userData.studioRenderOutline) return
```

Also make the focus outline helper itself non-interactive:

```js
outline.raycast = () => {}
```

## Why This Works

The double line was not a rendering bug; the focus system was outlining duplicate geometry. `ZBlock` renders both a black toon outline mesh and a colored mesh. If both are focusable, the studio draws two neon outlines.

The broad selection was a modeling contract bug. A `studioPartId` on a parent group means "edit everything under this group." That is correct for a deliberately grouped part, but wrong for individual editing when the group contains several visible boxes.

The stuck-after-first-focus bug was a raycast contract bug. Focus outlines are visual feedback, not editable content; if they participate in raycasting, they can sit in front of the model and consume the next double-click.

## Prevention

- Do not create one-off boss-only studio transform paths for texture planes unless the same contract is wanted for every comparable model.
- Texture planes used as facial art should be `studioNonFocusable` unless the user explicitly asks to edit the texture plane itself.
- `studioPartId` belongs on the smallest visible 3D block that should move, scale, rotate, and color as one unit.
- Parent groups used only for animation pivots should normally be untagged.
- Render helper meshes, decals, shadows, and focus outlines must be excluded from focus target collection.
- Focus outline helpers must have raycasting disabled.
- Regression checks should assert absence of old B02-only paths:

```js
expect(source).not.toContain('studioTextureFit')
expect(source).not.toContain('Boss02FaceTexture')
expect(source).not.toContain('B02BossZombieMesh')
```

## Related Issues

- `Developer/stage2_teacher_zombie_boss_implementation_2026-07-06.md`
- `Quaility_Assurance/stage2_teacher_zombie_boss_validation_2026-07-06.md`

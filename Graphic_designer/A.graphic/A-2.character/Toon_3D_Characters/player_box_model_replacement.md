# Player Box Model Replacement

Date: 2026-04-24

## Request

Replace the protagonist player character with one square box modeled in Three.js.

## Changed File

- `Developer/school_survivor_prototype/src/three-characters.js`

## Result

- Replaced the `StudentSurvivor` visual branch with `buildPlayerBox()`.
- `buildPlayerBox()` creates one Three.js `BoxGeometry` mesh.
- Added a white `EdgesGeometry` outline so the box reads as a 3D cube.
- Added smoothed facing interpolation so player direction changes ease into the new angle instead of snapping.
- Added subtle continuous cube rotation on the local X/Y/Z axes so the box reads more clearly as a live 3D model.
- Kept the Phaser player logic, movement, collision radius, and weapon behavior unchanged.

## Validation

- `node --check Developer/school_survivor_prototype/src/three-characters.js`
- Local server responded with HTTP 200 at `http://127.0.0.1:4173/`.
- Screenshot generated before final centering adjustment:
  - `Graphic_designer/qa_screenshots/player_box_3d_720x1280.png`

## Note

The prior student-uniform model code was replaced for the active player visual. Enemy visuals still use their existing Three.js procedural models.

## 2026-04-24 Revision

The temporary player box is no longer the target player visual.

New direction:

- Player and monster characters must remain Three.js 3D visuals.
- The player must read as a character, not a cube marker.
- Persistent circular helper rings around the player should not be shown in the normal view.
- The player visual now uses a procedural toon student model with head, body, limbs, shoes, and backpack meshes.
- The previous box request is superseded by the latest user request to remove the box and make it a character.

## 2026-04-24 Readability Fix

- Removed the normal-view circular player helper ring.
- Removed the normal-view school bag range circle and orbiting marker.
- Enlarged the Three.js player visual scale.
- Rebuilt the student as a clearer chibi-style toon character using rounded 3D mesh parts.
- Fixed outline alignment so the character reads as one coherent model.
- Added cache busting to force the browser to load the current visual code.

## 2026-04-24 Block Character Direction

- The latest direction uses the earlier full 3D box style as the base.
- The player is no longer a single cube; it is a block-style 3D character assembled from multiple `BoxGeometry` parts.
- Each major part uses toon material, dark outline shell, and visible edge lines so the model reads as clearly 3D.
- Character parts include head, hair, front hair block, body, shirt panel, arms, legs, shoes, and backpack.

## 2026-04-25 Student Uniform And Bag Revision

- Modeled the protagonist closer to the supplied block-character reference.
- The character now prioritizes immediate recognition of student uniform and school bag.
- Added a navy school jacket, white shirt front, yellow tie/buttons, black hair, dark pants, black shoes, blue backpack, backpack pocket, and visible front straps.
- Kept all player character parts as Three.js `BoxGeometry` meshes with toon material, outlines, and edge lines.
- Kept the animation as Three.js 3D part transforms.

## 2026-04-25 Player Anchor Lock

- The protagonist model must appear as the controlled player itself, not offset from the player position.
- The Three.js player visual is now synced directly to the Phaser player screen position.
- Persistent player circles, collision rings, and debug position markers remain forbidden in normal gameplay view.

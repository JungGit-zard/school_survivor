# Matilda Graphics Studio Direction - 2026-06-28

## Direction

- Matilda uses the project character rule: three.js 3D toon rendering with outline.
- The model is a simple readable blockout for Graphics Studio preview, not final boss art.
- Visual anchors: long red hair, horns, pointed ears, bat wings, dark dress, magenta ribbon, boots, and tail.
- Reference refinement: emphasize chibi proportions, front bangs, puffy sleeves, short skirt, large bat wings, and a chest ribbon.
- Face texture rule: the front of the head has a flat `faceTextureUrl` slot so a supplied face image can replace the block face later.
- Face texture update: use the supplied 512x512 PNG as the head-block front face; do not layer extra modeled eyes or mouth over it.
- Ribbon rule: keep the bright magenta ribbon/trim around the waist, not directly under the face.
- Back view rule: the long hair must cover the back of the head and upper back, so the rear silhouette reads as long-haired.
- Arm rule: upper arms attach near the shoulders, then flare outward as they descend toward the hands.
- Height target is twice the player world height for clear special-enemy readability.

## Constraint

- No gameplay stat coupling was added. This is a model-only preview entry.

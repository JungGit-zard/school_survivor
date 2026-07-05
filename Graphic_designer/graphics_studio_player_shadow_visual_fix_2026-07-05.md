# Graphics Studio Player Shadow Visual Fix - 2026-07-05

## Visual Issue

The character was standing above the floor shadow, but the shadow appeared on top of the character's legs and body in the studio preview.

## Visual Direction

The floor shadow should remain a soft grounding ellipse under the character. It must not read as a dark overlay on the body.

## Result

The shadow now respects 3D depth, so the visible silhouette stays under and behind the character parts from the camera view.


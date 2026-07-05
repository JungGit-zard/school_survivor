# Graphics Studio Player Shadow Depth Fix - 2026-07-05

## Problem

Graphics Studio preview showed the player floor shadow drawing over the player body and legs.

## Root Cause

`PlayerMesh.jsx` used a transparent floor-shadow material with `depthTest: false`. That made the shadow ignore the scene depth buffer, so it could render on top of nearer player meshes.

## Change

- Kept the shadow transparent and non-depth-writing.
- Enabled `depthTest: true` so the player body occludes the shadow normally.
- Added a regression test in `PlayerMesh.test.js`.


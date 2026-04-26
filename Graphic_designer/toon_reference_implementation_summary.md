# Toon Reference Implementation Summary

Date: 2026-04-25

## Purpose

This document summarizes the actual development requirements extracted from the graphic references in `Graphic_designer/Bang_survivor_Graphic_concept.md`.

Use this document before implementing or reviewing BangBang Survivor graphics.

## Mandatory Direction

- Player characters and monsters must be real Three.js 3D objects.
- Player and monster animation must be Three.js 3D animation.
- Player and monster rendering must use toon/cel rendering.
- Player and monster visuals must include outline rendering.
- 2D sprites, 2D pixel characters, placeholder circles, and simple marker shapes are not acceptable for player or monster final visuals.
- Classroom floors, props, and background objects may use 2D pixel/top-down references, but characters and monsters must remain 3D.

## Reference To Development Mapping

| Reference | What To Extract | How To Apply In This Project |
| --- | --- | --- |
| Three.js `MeshToonMaterial` docs | Toon material is the required baseline. `gradientMap` controls toon shade bands and must use nearest filtering. | Build a shared `createToonMaterial()` helper. Use `MeshToonMaterial` for player and monster surfaces. Use a 3-5 step `CanvasTexture` gradient map with `NearestFilter`. |
| SBCode `MeshToonMaterial` example | Toon/cel shading should look cartoon-like by reducing smooth gradients into fewer shade colors. | Avoid realistic smooth PBR. Tune material colors and lights until the character has clear bright/mid/dark regions. |
| Three.js forum outline discussion | `OutlineEffect` with `MeshToonMaterial` is a practical toon outline combination. | Current prototype can keep mesh-shell or edge outlines, but the target path should test `OutlineEffect` or `ToonOutlinePassNode`. |
| Sketchfab Roy Fishes Mermaid | High-quality model reference: strong silhouette, expressive shape language, polished 3D presentation. | Do not copy the asset. Use it as a quality bar for readable form, clean proportions, and character identity. |
| Awwwards YAMÊ | Production pipeline reference: Blender modeling, texturing, GLB export, WebGL integration, optimization. Toon look uses thresholded shadows, contours, texture depth, and post-processing outlines. | Long-term pipeline should move from procedural placeholders to Blender-authored GLB models. Use GLB export, DRACO geometry compression, KTX texture compression, and instance reuse where possible. |
| Three.js `OutlineEffect` docs | WebGLRenderer outline effect for toon shaders. Render through `effect.render(scene, camera)` instead of direct renderer render. | For the current WebGL prototype, evaluate replacing manual outline shells with `OutlineEffect` once canvas layering and performance are stable. |
| Three.js `ToonOutlinePassNode` docs | Node-based toon outline pass for compatible toon materials. | Future WebGPU/node renderer path should use `ToonOutlinePassNode`, but current CDN WebGL prototype can stay with mesh-shell or `OutlineEffect`. |
| Styloo classroom asset | Classroom props: many desks, chairs, classroom objects, top-down/isometric structure, shadows under objects. | Use this for background/prop composition only. Build dense school readability: desks, chairs, lockers, boards, doors, papers, warning signs, shadows. Do not use it for 2D characters. |
| Pixelmia wood tiles | 16x16 wood tile structure, many parquet patterns, wall/floor tile variations, color variants. | Use for floor and wall tile logic: repeatable plank/parquet patterns, color variation, seam lines, broken tile variants. Do not use it for characters. |

## Character And Monster Rendering Requirements

### Screen Placement

The protagonist must look like the controlled character itself, not a decoration near the control point.

Requirements:

- The player Three.js group position must match the Phaser player screen position.
- The player model, shadow, and collision center must visually belong to the same character.
- Do not show debug circles, helper rings, or target markers around the player in the normal game view.
- Do not use a hidden offset that makes the model appear detached from the player position.
- Test while moving in all directions because rotation and camera follow can reveal offsets.

### Material

Use:

```js
const gradientMap = createToonGradient([shadow, mid, light, highlight]);
gradientMap.minFilter = THREE.NearestFilter;
gradientMap.magFilter = THREE.NearestFilter;

const material = new THREE.MeshToonMaterial({
  color,
  gradientMap,
  emissive: color,
  emissiveIntensity: 0.08,
});
```

Requirements:

- Use `MeshToonMaterial` or an equivalent toon shader.
- Use 3-5 visible light bands.
- Avoid `MeshStandardMaterial` or PBR as the main character look.
- Avoid flat `MeshBasicMaterial` as the only visible character material.

### Outline

Prototype options:

- `EdgesGeometry` for blocky box-based models.
- Inverted back-side outline shells for rounded models.
- `OutlineEffect` for WebGL toon outline rendering.

Target options:

- `OutlineEffect` for WebGL.
- `ToonOutlinePassNode` for future node/WebGPU rendering.
- Post-process outline using depth/normal/entity-color buffers when the renderer becomes more advanced.

Rules:

- Outline must help the silhouette read on a busy classroom floor.
- Use dark blue-gray or controlled black, not a thick outline that swallows small parts.
- Test at the game resolution, not only in a zoomed model preview.

### Lighting

Use:

- `AmbientLight` for base readability.
- `DirectionalLight` for visible toon bands.
- Optional rim light for edge separation.

Avoid:

- Realistic lighting that hides gameplay readability.
- Too many soft lights that erase toon bands.

### Animation

Use real 3D transforms:

- Rotate arms, legs, head, backpack, body parts.
- Use `AnimationMixer` later for GLB character animation.
- Keep movement facing smooth with angle interpolation.

Do not:

- Swap 2D frames.
- Use sprite sheets for player/monster movement.
- Represent attack or hit animation with only 2D flashes.

## Modeling Requirements

### Prototype Stage

Allowed:

- Procedural Three.js geometry.
- Block-style character made from `BoxGeometry` parts.
- Rounded toon character made from `CapsuleGeometry`, `SphereGeometry`, and `BoxGeometry`.

Required:

- Character must clearly read as a person or monster, not a single cube.
- Each role must have a distinct silhouette.
- Player must be visually separate from monsters.
- Boss must be larger and more complex than normal monsters.

### Production Stage

Target pipeline:

1. Model character in Blender.
2. Use simple shapes and exaggerated silhouette.
3. Texture with clean color blocks and light detail.
4. Export as GLB.
5. Import with Three.js `GLTFLoader`.
6. Animate with `AnimationMixer`.
7. Optimize with DRACO and KTX when assets become heavy.

## Background And Prop Requirements

The 2D references are for environment only.

Use them for:

- Wood floor tile repetition.
- Classroom object density.
- Desk/chair/locker/board silhouette.
- Top-down classroom readability.
- Shadow placement under props.

Do not use them for:

- Player character.
- Monster character.
- Character animation.
- Character final rendering.

## Implementation Checklist

- Did the implementer read `Graphic_designer/Bang_survivor_Graphic_concept.md` first?
- Is the player a Three.js 3D object?
- Are all monsters Three.js 3D objects?
- Does every player/monster material use toon shading?
- Is a toon gradient map present and using nearest filtering?
- Is outline rendering present?
- Is animation done with 3D transforms or `AnimationMixer`?
- Are 2D sprites avoided for player and monsters?
- Is the silhouette readable at 720x1280?
- Does the model remain readable over the wood floor and classroom props?
- Are background 2D assets limited to floor/props only?

## Source Notes

- Three.js `MeshToonMaterial`: https://threejs.org/docs/pages/MeshToonMaterial.html
- Three.js manual materials page: https://threejs.org/manual/en/materials.html
- SBCode `MeshToonMaterial`: https://sbcode.net/threejs/meshtoonmaterial/
- Three.js forum outline discussion: https://discourse.threejs.org/t/how-to-create-this-smooth-cartoon-style-with-outlines-in-three-js/60862
- Three.js `OutlineEffect`: https://threejs.org/docs/pages/OutlineEffect.html
- Three.js `ToonOutlinePassNode`: https://threejs.org/docs/pages/ToonOutlinePassNode.html
- YAMÊ production reference: https://www.awwwards.com/yame.html
- Sketchfab Roy Fishes Mermaid reference: https://sketchfab.com/3d-models/roy-fishes-mermaid-7b2ce68e765f4b53b569ff3da4b1d3a4
- Styloo classroom asset reference: https://styloo.itch.io/2dclassroom
- Pixelmia wood tile reference: https://pixelmia.itch.io/16x16-wood-tiles

## Notes About Unusable Or Limited References

- The ChatGPT conversation URL in the concept document cannot be treated as a stable implementation source. If a shader technique from that link is important, it should be copied into a project-owned document with the user's approval.
- Sketchfab is a visual quality reference here. Do not assume the model can be reused as an asset unless its license and download terms are separately confirmed.
- Pixelmia's wood tile pack is paid and has redistribution restrictions. Use it as a design reference unless the project purchases and tracks the asset license.

# Three.js Toon Modeling Method

Date: 2026-04-24

## Purpose

This note records the Three.js toon modeling method requested for Escape! zombie school.

Use this document when implementing or reviewing player, enemy, boss, or important object models in Three.js.

For the current mandatory reference summary, also read:

- `Graphic_designer/A.그래픽/A-2.캐릭터그래픽/Toon_3D_Characters/toon_reference_implementation_summary.md`

## Source References

- Three.js `MeshToonMaterial`
  - `https://threejs.org/docs/#api/en/materials/MeshToonMaterial`
- MeshToonMaterial example
  - `https://sbcode.net/threejs/meshtoonmaterial/`
- Smooth cartoon outline discussion
  - `https://discourse.threejs.org/t/how-to-create-this-smooth-cartoon-style-with-outlines-in-three-js/60862`
- High-quality style reference
  - `https://www.awwwards.com/yame.html`
- Three.js `OutlineEffect`
  - `https://threejs.org/docs/#examples/en/effects/OutlineEffect`
- Three.js `ToonOutlinePassNode`
  - `https://threejs.org/docs/#api/en/nodes/display/ToonOutlinePassNode`

## Core Method

### 1. Use Real Three.js Meshes

Do not fake important characters with 2D sprites when the task asks for Three.js modeling.

Use actual geometry:

- `BoxGeometry`
- `SphereGeometry`
- `CapsuleGeometry`
- `CylinderGeometry`
- `ConeGeometry`
- `TorusGeometry`
- `EdgesGeometry`

### 2. Use Toon Materials

Use `MeshToonMaterial` as the main surface material.

Recommended baseline:

```js
const material = new THREE.MeshToonMaterial({
  color,
  gradientMap,
  emissive: color,
  emissiveIntensity: 0.12,
});
```

The `gradientMap` should use a small nearest-filter texture so light becomes simple bands instead of smooth realistic shading.

### 3. Use Simple Lighting

The target is readable toon shading, not realistic lighting.

Recommended lighting:

- strong `AmbientLight` for visibility
- one `DirectionalLight` for main form
- optional rim `DirectionalLight` for edge readability

Avoid heavy realistic lighting that hides gameplay information.

### 4. Keep Outlines Controlled

For prototype work, use one of these methods:

- `EdgesGeometry` for simple hard-surface objects like boxes
- inverted back-side mesh outline for rounded characters
- `OutlineEffect` or `ToonOutlinePassNode` later when the render pipeline is ready

Do not let black outlines swallow the character body.

For small mobile characters, prefer:

- thin outline
- dark blue-gray instead of pure black
- or white/light rim if the model is dark

### 5. Align Three.js Origin With Phaser Logic

For a player or enemy, the Three.js group origin must match the Phaser logical position.

Rule:

- Phaser collision circle center = Three.js group origin
- visual mesh parts should be centered around that origin unless intentionally offset
- if the mesh is offset, rotation can make it orbit away from the hit circle

This is mandatory for player readability.

### 6. Smooth Rotation

Never snap the visual angle directly for the player.

Use angle interpolation:

```js
const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
current += delta * 0.18;
```

This makes direction changes feel smooth instead of low-frame or sprite-like.

### 7. Model Shape Before Detail

For Escape! zombie school, the order of importance is:

1. readable silhouette
2. clear color role
3. simple toon shading
4. clean outline
5. small details

If a model is small on screen, details should be exaggerated or removed.

## Application To Current Prototype

The player must not remain a single cube marker.

The current prototype direction is a block-style Three.js character based on the earlier full 3D box approach:

- use multiple `BoxGeometry` parts for head, hair, body, arms, legs, shoes, and backpack
- use `MeshToonMaterial` on visible character surfaces
- use `EdgesGeometry` and/or outline shells for clear 3D edges
- keep the character group centered on the Phaser player collision position
- animate limbs and body parts through real Three.js 3D transforms

The same principles apply to monsters: they must be readable 3D toon characters, not 2D sprites or marker shapes.

## Review Checklist

- Is the object made from actual Three.js geometry?
- Is toon shading visible?
- Is the outline helpful rather than hiding the body?
- Does the Three.js model center match the Phaser collision center?
- Does rotation move smoothly?
- Is the model readable within one second on a 720x1280 mobile screen?


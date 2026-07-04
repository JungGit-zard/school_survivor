# Three_Mini visual guard enhancement — 2026-07-04

## Role record

- Role folder: `Graphic_designer/`
- Agent/profile: `threemini` / 쓰리미니
- Focus: R3F/Three.js toon graphics, mobile WebGL performance, asset pipeline, visual regression guards
- Constraint: No game code modification in this card.

## Visual policy reaffirmed

Project policy requires player and monster characters to remain 3D, toon-rendered, and outlined. They must not be replaced by 2D sprites, HTML overlays, pixel sprites, or visible debug proxy shapes in normal gameplay.

## Current implementation alignment

- `Developer/r3f_prototype/src/lib/toon.js` currently supports `MeshToonMaterial` with a stepped gradient map.
- Inverted hull outline uses `BackSide` material and stencil comparison, matching the project need for character/monster silhouette clarity.
- `Developer/r3f_prototype/src/App.jsx` keeps `dpr={[1, 1.5]}`, which is a mobile-friendly guard against excessive pixel cost.
- `Developer/r3f_prototype/src/components/EnemyVisual.test.js` explicitly guards against reintroducing `Html`/sprite-style charge warnings.
- `Developer/r3f_prototype/src/components/GraphicsStudio.test.jsx` protects the Graphics Studio tuning flow for scale, outline thickness, color, export, and localStorage.

## Visual regression guard checklist for next graphics slice

1. Preserve `MeshToonMaterial` or equivalent toon shader for player/monsters.
2. Preserve outline treatment for player/monsters and charge warning visuals.
3. Do not introduce `Html`, 2D sprite sheets, pixel sprites, or debug proxy circles as final character/monster visuals.
4. Preserve DPR cap unless a separate mobile performance review approves a change.
5. For B01/E05 and death-collapse visual changes, pair code edits with a focused test and a browser screenshot when possible.
6. For Graphics Studio tuning changes, keep export/localStorage tests as the minimum regression guard.

## Blockers

- None.

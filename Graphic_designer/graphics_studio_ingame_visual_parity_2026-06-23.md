# Graphics Studio In-Game Visual Parity

Date: 2026-06-23
Role: Graphic Designer

## Visual Direction

Graphics Studio must be a faithful inspection surface for the game graphics. It should not display approximate stand-ins when the game already has real toon-rendered 3D components.

## Applied Direction

- Player, zombies, weapon models, floor visuals, VFX, enemy projectile, and pickups now render from the same visual components used by gameplay where those components exist.
- The studio no longer scales pickup models just to make them visible. It keeps the model scale and moves the camera closer.
- The studio no longer overlays a reference grid over the preview, because that grid is not part of the game view.
- The studio uses the main game lighting values for non-title previews.

## Art Review Notes

- Stage floor preview now shows the actual classroom floor plus stage object visual placement, which makes layout and object density review more useful.
- Shark Missile preview now shows the in-game 3D model instead of the icon asset.
- Hit Spark preview now uses the real VFX renderer from `VFXLayer.jsx`.
- Tiny effects and projectiles are still small in world scale, but the studio camera frames them closely so the scale relationship remains honest.

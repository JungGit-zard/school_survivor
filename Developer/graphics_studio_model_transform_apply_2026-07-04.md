# Graphics Studio Model Transform Apply - 2026-07-04

## Change

- Added model transform tuning fields to Graphics Studio storage:
  - `scale`
  - `scaleX`
  - `scaleY`
  - `scaleZ`
  - `rotationX`
  - `rotationY`
  - `rotationZ`
- Changed the studio commit button text from `Confirm` to `Apply`.
- Added `StudioTunedGroup` so saved studio tuning is read by the game runtime after Apply.
- Kept movement, physics, and collision roots unchanged. The tuning wrapper applies only to visual model roots.

## Runtime Coverage

- Player
- React zombie meshes and Matilda
- Instanced standard zombies through `ZombieInstanceLayer`
- Stage objects: desk, chair, unconscious student
- Pickups: gold coin, XP textbook, XP orb, lunch meal, lunch milk
- Weapon models: pencil, ruler, tumbler, science flask, bell, stun gun, onigiri, Starlink strike, compass, umbrella, eraser, box cutter, Chibiko, shark missile, Starlink satellite, Starlink crash falling satellite, Zomlonbisk

## Verification

- `npm test -- src/lib/graphicsStudioConfig.test.js src/components/GraphicsStudio.test.jsx src/components/GraphicsStudioPreview.test.js src/components/StudioTunedGroup.test.jsx`
- `npm run build`
- `npm test`

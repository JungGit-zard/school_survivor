# Bag Arm Motion and Size Check - 2026-04-26

## Check Scope

- Request: When swinging the bag, the protagonist's arm should move.
- Request: Reduce the bag size to half of the current size.
- Checked files:
  - `Developer/r3f_prototype/src/lib/refs.js`
  - `Developer/r3f_prototype/src/components/Weapons.jsx`
  - `Developer/r3f_prototype/src/components/PlayerMesh.jsx`

## Implementation Result

- Added shared `bagSwingState` for cross-component swing animation state.
- `SchoolBagSwing` now updates `bagSwingState.active` and `bagSwingState.progress` during each swing.
- `PlayerMesh` reads `bagSwingState` and animates the player's right sleeve/arm during the swing.
- The left arm adds a smaller counter motion.
- The visible swinging bag model scale changed from `[0.7, 0.7, 0.7]` to `[0.35, 0.35, 0.35]`.

## Verification Status

- `npm run build` completed successfully in `Developer/r3f_prototype`.
- Manual browser review is recommended to tune the exact arm pose readability during dense enemy contact.

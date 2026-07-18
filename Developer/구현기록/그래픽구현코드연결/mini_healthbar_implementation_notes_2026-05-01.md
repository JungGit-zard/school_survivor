# Mini Health Bar Implementation Notes - 2026-05-01

## Scope

- Target prototype: `Developer/r3f_prototype`
- Request: show tiny health bars above the player character and every zombie.

## Implementation

- Added `MiniHealthBar.jsx` as a shared Three.js/R3F component.
- The green health fill updates immediately when HP changes.
- A white trailing fill remains at the previous HP point, briefly flashes, then slowly follows the new HP value.
- The bar copies the camera quaternion every frame so it stays readable over characters.
- Tuned the bar closer to the character head.
- Changed the empty HP background to a clear red tone.
- Removed the red border around the mini health bar.
- Shortened the mini health bar width for both player and zombies.
- Changed the remaining HP fill color from green to yellow.
- Changed the white trailing fill to blink rapidly while it follows the green HP value down.

## Applied To

- Player:
  - Reads `player.hp` and `player.maxHp` from `useGameStore`.
  - Renders above the player model as a sibling of `PlayerMesh`, so the bar stays visible during invulnerability blinking.

- Zombies:
  - Replaced the old simple enemy HP bar with `MiniHealthBar`.
  - Width and height scale by enemy size, including boss-sized enemies.

## Files

- `Developer/r3f_prototype/src/components/MiniHealthBar.jsx`
- `Developer/r3f_prototype/src/components/Player.jsx`
- `Developer/r3f_prototype/src/components/Enemy.jsx`

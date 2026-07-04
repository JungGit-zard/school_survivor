# Starlink crash cheat button - 2026-07-04

## Request

- Add an `S` cheat button next to the in-game `W` weapon cheat button.
- Pressing `S` immediately plays the Starlink crash sequence.

## Implementation

- Added `dispatchStarlinkCheatCrash()` in `components/Weapons/Starlink.jsx`.
- `StarlinkWeapon` listens for `STARLINK_CHEAT_CRASH_EVENT` and appends a crash at a random landing point near the player.
- The crash sequence can render even if the Starlink weapon is not currently active.
- Added the `S` button in `components/HUD.jsx` beside the `W` weapon cheat button.

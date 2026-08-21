# HUD Restart and Ruler Cooldown UI Update - 2026-05-26

## Request

- Remove the 30 cm ruler cooldown UI from the gameplay screen.
- Add one restart button to the gameplay HUD.

## Implementation

- Updated `Developer/r3f_prototype/src/components/HUD.jsx`.
- Hid the ruler cooldown ring so it no longer appears on screen during play.
- Added a compact `R` restart button beside the existing pause button.
- The restart button calls the existing `resetGame` store action.

## Notes

- Existing gameover and clear modal restart buttons were left unchanged.
- The new gameplay restart button is visible only while the game is in `playing` or `paused` phase.


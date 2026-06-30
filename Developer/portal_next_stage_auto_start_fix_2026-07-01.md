# Portal Next Stage Auto Start Fix - 2026-07-01

## Problem

After the player entered the portal, `EscapePortal` waited for the suction duration and then called `clearStage()`. That action entered the cleared result screen, so Stage 2 did not start until the player pressed the HUD button.

## Fix

- Added `getNextStageId()` in `stageConfig.js` so stage progression is shared by gameplay and HUD.
- Added `clearStageAndStartNext()` in `useGameStore.js`.
- Changed `EscapePortal.jsx` to call `clearStageAndStartNext()` after the suction presentation finishes.
- Kept `clearStage()` unchanged for result-screen flows and final-stage clears.

## Behavior

Stage 1 portal clear records the Stage 1 run, saves clear/survival totals, resets runtime state, and starts Stage 2 in `playing` phase.

# Title unlock-all-weapons cheat implementation - 2026-06-12

## Request

- Add an all-weapons-unlock cheat key on the title screen.

## Implementation

- Added a hidden `unlockall` key sequence listener in `TitleScreen.jsx`.
- Reused the existing `unlockAllNonStarterWeapons()` path used by the settings cheat toggle.
- The cheat marks `unlockAllWeaponsCheat` as enabled in title settings so the saved state reflects that it was triggered.

## Verification

- Added a TitleScreen test that dispatches the `unlockall` key sequence and verifies every non-starter weapon is unlocked.


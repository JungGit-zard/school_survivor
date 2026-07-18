# Title unlock-all-weapons cheat validation - 2026-06-12

## Scope

- Verify that the title-screen cheat key sequence unlocks all non-starter weapons.

## Automated check

- `TitleScreen.settings.test.jsx` dispatches `u n l o c k a l l` keydown events while the title screen is mounted.
- It then verifies that every non-starter weapon ID in `WEAPON_CATALOG` has value `1` in `school_survivor:weaponUnlocks`.
- It also verifies that title settings persist `unlockAllWeaponsCheat: true`.


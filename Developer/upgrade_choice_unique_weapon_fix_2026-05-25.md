# Upgrade Choice Unique Weapon Fix - 2026-05-25

## Problem

Level-up choices could show two cards for the same owned weapon, for example `umbrellaDamage` and `umbrellaRadius` together.

## Root Cause

`HUD.pickThree` filtered available upgrades, limited only pencil-specific duplicates, shuffled the result, and sliced three cards. Other weapons with multiple valid upgrade paths were not grouped, so duplicate weapon cards could appear together.

## Fix

- Added `limitDuplicateWeaponUpgradeOptions`.
- The helper groups choices by `UPGRADE_EFFECTS[key].weapon`.
- Each weapon group contributes at most one randomly selected card.
- Non-weapon choices such as max HP and move speed keep separate groups.
- `pickThree` now uses this general weapon-group limiter before shuffling.

## Files

- `Developer/r3f_prototype/src/components/HUD.jsx`
- `Developer/r3f_prototype/src/components/HUD.test.jsx`


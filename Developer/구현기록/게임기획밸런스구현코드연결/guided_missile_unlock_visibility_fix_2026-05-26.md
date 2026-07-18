# Guided Missile Unlock Visibility Fix - 2026-05-26

## Root Cause

- `_onRunEnd` evaluated cumulative unlocks before adding the just-ended run to `totalRuns`, `totalKills`, `totalGold`, `totalLevelUps`, and `totalSurvivalSeconds`.
- `guidedMissile` required `totalRuns >= 5`, so the 5th completed run did not unlock it until the next run ended.
- `unlockMissile` also required level 6. With the 4-owned-weapon cap, players could fill weapon slots before level 6 and never see the card.

## Implementation

- Added current-run cumulative values into `evalInput` before calling `evaluateUnlocks`.
- Added reset/start synchronization from existing `playerRecords` into `weaponUnlocks`, so old saves with `totalRuns >= 5` do not need one extra death/clear.
- Changed `guidedMissile.minLevelToAppear` and `unlockMissile.minLevel` from 6 to 4.
- Added regression tests for 5th-run immediate unlock, old-save synchronization, and level 4 card-pool availability.

## Files

- `src/store/useGameStore.js`
- `src/lib/weaponCatalog.js`
- `src/lib/upgrades.js`
- `src/store/useGameStore.guidedMissileUnlock.test.js`
- `src/store/useGameStore.unlocks.test.js`
- `src/lib/weaponCatalog.test.js`

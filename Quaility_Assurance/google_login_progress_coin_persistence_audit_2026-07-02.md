# Google Login Progress and Coin Persistence Audit

## Scope

- Google signed-in user progress snapshot path and profile.
- Firebase Realtime Database personal progress snapshot fields.
- Coin gain paths: picked-up gold coin, survival milestone gold, run-end earned gold.
- Coin spend paths: direct spend, passive purchase, passive reset cloud-save trigger.
- Run records saved into `progress.records`.

## Evidence

- `users/{uid}` path is built from the trimmed Google uid.
- Cloud snapshot includes `schemaVersion`, `updatedAt`, `progress.goldTotal`, `progress.records`, `progress.weaponUnlocks`, `progress.passiveUpgrades`, and `progress.titleSettings`.
- Google auth restore and Google sign-in both register the cloud user and request an immediate local-progress save.
- `gainGold`, `checkSurvivalMilestone`, `spendGold`, `purchasePassive`, `resetPassiveUpgrades`, and `_onRunEnd` all request cloud progress save.
- Picked-up/milestone coins update `goldTotal` immediately; earned-run `records.totalGold` is committed at run end through `goldSession`.
- Stage-specific records are included in the cloud snapshot after run end.

## Added Regression Checks

- `src/store/useGameStore.cloudProgress.test.js`
  - Added cloud-save trigger checks for milestone gold, spending, passive purchase, passive reset.
- `src/store/useGameStore.progressPersistence.test.js`
  - Added snapshot checks for Google uid path/profile, every player record key, immediate cloud `goldTotal`, run-end `records.totalGold`, and Stage 2 clear records.

## Verification

- `npm test -- src/lib/firebaseProgress.test.js src/store/useAuthStore.cloudProgress.test.js src/store/useGameStore.cloudProgress.test.js src/store/useGameStore.progressPersistence.test.js src/lib/playerRecords.test.js`: passed, 5 files / 26 tests.
- `npm test -- src/lib/firebaseProgress.test.js src/store/useAuthStore.cloudProgress.test.js src/store/useGameStore.cloudProgress.test.js src/store/useGameStore.progressPersistence.test.js src/lib/playerRecords.test.js src/lib/enemyHitVfx.test.js`: passed, 6 files / 31 tests.
- `npm test`: passed, 66 files / 368 tests.
- `npm run build`: passed, with the existing large chunk warning.

## Limits

- Live Google popup login and live Firebase Console writes were not performed in this local automated audit.
- Firebase Realtime Database live security rules were not verified from this workspace.
- `totalPickups` exists as a player record key, but current coin amount tracking uses `goldTotal` and `records.totalGold`; pickup-count increment wiring is separate from coin amount persistence.

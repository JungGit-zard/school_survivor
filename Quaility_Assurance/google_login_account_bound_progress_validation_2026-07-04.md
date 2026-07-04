# Google Login Account-Bound Progress Validation

Date: 2026-07-04

## Checks

- Added TitleScreen coverage that blocks game start while Google is signed out.
- Added Firebase progress coverage that applies cloud progress to local account storage.
- Updated auth-store coverage so sign-in/auth restore loads cloud progress before saving.
- Kept existing checks for nickname setup/change, cloud save requests, and account-best ranking.

## Results

- `npm test -- src/components/TitleScreen.settings.test.jsx`: passed, 16 tests.
- `npm test -- src/lib/firebaseProgress.test.js src/store/useAuthStore.cloudProgress.test.js`: passed, 7 tests.
- `npm test -- src/components/TitleScreen.settings.test.jsx src/lib/firebaseProgress.test.js src/store/useAuthStore.cloudProgress.test.js src/store/useGameStore.cloudProgress.test.js src/store/useGameStore.progressPersistence.test.js src/lib/firebaseRanking.test.js src/lib/userRanking.test.js`: passed, 40 tests.
- `npm run build`: passed.

## Notes

- Build still has the existing large chunk warning.
- Build now also warns that `useGameStore.js` is dynamically imported by `useAuthStore.js` while already statically imported elsewhere; this is a chunking warning, not a runtime failure.
- Actual Firebase Console Rules still need to allow authenticated `users/$uid` private read/write and shared authenticated ranking reads.

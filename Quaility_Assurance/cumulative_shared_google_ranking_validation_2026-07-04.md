# Shared Google Account Best Ranking Validation

Date: 2026-07-04

## Checks

- Updated `src/lib/firebaseRanking.test.js` to lock the Firebase path contract to `rankings/{seasonId}/entries/{uid}`.
- Updated `userRanking` coverage so duplicate cloud entries with the same Google uid collapse to the best score.

## Results

- `npm test -- src/lib/firebaseRanking.test.js src/lib/userRanking.test.js`: passed, 7 tests.
- `npm test -- src/lib/firebaseRanking.test.js src/lib/userRanking.test.js src/components/UserRanking.test.jsx src/lib/firebaseAuth.test.js`: passed, 13 tests.
- `npm run build`: passed.

## Manual Firebase Console Checks

1. Publish the Realtime Database Rules in `Developer/firebase_realtime_database_rules_todo_2026-07-04.md`.
2. Submit one Google account score and confirm `rankings/{seasonId}/entries/{uid}` exists.
3. Submit a lower or equal score from the same account and confirm the saved record does not change.
4. Submit a higher score from the same account and confirm the same `uid` record updates.
5. Submit from another Google account and confirm a second `uid` record appears.

## Notes

- Actual Firebase Console Rules are not stored in this repo; apply the `rankings` rule before expecting authenticated players to read and write the shared cloud ranking.
- Build still has the existing Vite large chunk warning.

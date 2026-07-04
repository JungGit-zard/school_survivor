# Cumulative Shared Google Ranking Validation

Date: 2026-07-04

## Checks

- Added `src/lib/firebaseRanking.test.js` to lock the cumulative Firebase path contract.
- Added `userRanking` coverage that preserves multiple cloud entries from the same Google uid.

## Results

- `npm test -- src/lib/firebaseRanking.test.js src/lib/userRanking.test.js`: passed, 7 tests.
- `npm test -- src/lib/firebaseRanking.test.js src/lib/userRanking.test.js src/components/UserRanking.test.jsx src/lib/firebaseAuth.test.js`: passed, 13 tests.
- `npm run build`: passed.

## Notes

- Build still has the existing Vite large chunk warning.
- Actual Firebase Console Rules are not stored in this repo; apply the `rankings` rule before expecting authenticated players to read and write the shared cloud ranking.


# Ranking Screen Cleanup Validation

Date: 2026-07-05

## Checks

- Confirm integrated ranking renders daily and weekly tabs.
- Confirm weekly tab switches to weekly rows.
- Confirm stage ranking fetches only the daily board.
- Confirm ranking submission code accumulates submitted scores.
- `npm test -- src/components/UserRanking.test.jsx src/components/StageRanking.test.jsx src/lib/firebaseRanking.test.js src/lib/userRanking.test.js src/lib/databaseRules.test.js`
  - Passed: 5 files, 24 tests.
- `npm run build`
  - Passed.

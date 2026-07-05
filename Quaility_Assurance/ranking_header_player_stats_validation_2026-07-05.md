# Ranking Header Player Stats Validation

Date: 2026-07-05

## Checks

- `npm test -- src/components/Lobby.test.jsx src/components/UserRanking.test.jsx`
  - Passed: 2 files, 7 tests.
- `npm run build`
  - Passed.

## Coverage

- Confirms lobby no longer shows player cumulative play or season-best score.
- Confirms ranking screen top area shows both values.

# Ranking Safe Area Bottom Implementation

Date: 2026-07-08

## Changed

- Updated `UserRanking.jsx` root padding bottom to `calc(14px + env(safe-area-inset-bottom, 0px))`.
- Added a `UserRanking` regression test so the safe-area padding stays in the rendered markup.

## Notes

- `index.html` already has `viewport-fit=cover`, so no viewport meta change was needed.

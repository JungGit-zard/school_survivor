# Late Zombie Spawn Relief Implementation - 2026-06-30

## Changes

- Split the 72-96 second wave phases at 90 seconds.
- Reduced wave targets from 90 seconds onward to about two thirds.
- Reduced burst zombie event counts after 90 seconds.
- Kept `B01` boss events at count 1.
- Added tests covering late wave target relief and burst count relief.

## Verification

- `npm test -- Enemies.test.jsx` passed.
- `npm run build` passed.


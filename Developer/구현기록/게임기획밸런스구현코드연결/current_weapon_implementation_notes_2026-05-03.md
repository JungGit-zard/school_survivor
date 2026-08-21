# Current Weapon Implementation Notes - 2026-05-03

## Changes

- B01 boss burst spawn was moved from 300 seconds to 240 seconds.
- Initial active weapons were reduced to one: `pencilThrow`.
- `schoolBag` and `tumbler` now start inactive.
- Added level-up unlock handling for:
  - `unlockBag`
  - `unlockTumbler`
- Floor grid contrast was increased by darkening the grout line color and setting line opacity to 1.

## Current Implementation Alignment

- Science Flask implementation remains unchanged by request.
- Starlink implementation remains unchanged by request.
- Documentation now treats Starlink's random strike center range as 5 units (1.25 blocks).

## Verification Target

- Run `npm run build` in `Developer/r3f_prototype`.
- Manually confirm that a fresh run starts with Pencil only.
- Manually confirm that 30 cm Ruler and Tumbler can appear as level-up unlock choices.
- Manually confirm that B01 appears at 4:00.
- Visually confirm the floor grid reads more clearly on the phone frame.


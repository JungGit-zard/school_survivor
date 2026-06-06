# Guided Missile Unlock Accessibility - 2026-05-26

## Decision

- `guidedMissile` / 보조배터리 미사일 remains an account-unlocked weapon at `totalRuns >= 5`.
- The just-ended run counts toward cumulative unlock checks immediately.
- After account unlock, the card can appear from player level 4 instead of level 6.

## Reason

- The previous level 6 card gate interacted badly with the 4-owned-weapon cap.
- A player could fill the weapon slots before level 6, making the 보조배터리 card effectively invisible even after account unlock.
- Level 4 keeps it later than early starter weapons, but gives it a realistic chance to enter the card pool before slots are normally full.

## Scope

- This adjusts the first-stage card appearance gate only.
- Starlink remains level 8 after its account unlock.
- The 4-owned-weapon cap remains unchanged.

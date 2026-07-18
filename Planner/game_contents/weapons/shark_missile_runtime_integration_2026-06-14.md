# Shark Missile Runtime Integration - 2026-06-14

## Decision

`sharkMissile` is treated as its own high-tier weapon, separate from `guidedMissile`.

## Runtime Rule

- Display name: 상어미사일
- Unlock:
  - Clear Stage 1 once, or
  - Complete 8 total runs.
- Run card gate:
  - Appears from Lv.8 after account unlock.
- Combat role:
  - Slow smart homing missile.
  - Prioritizes dense zombie groups.
  - Retargets during flight.

## Balance Anchor

- Damage: 30, exactly 2x `scienceFlask` base damage.
- Cooldown: 14000ms, exactly 5x `scienceFlask` base cooldown.

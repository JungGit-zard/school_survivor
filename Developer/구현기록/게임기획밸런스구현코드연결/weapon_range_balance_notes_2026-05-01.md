# Weapon Range Balance Notes - 2026-05-01

## Scope

- Target prototype: `Developer/r3f_prototype`
- Request:
  - Reduce bell range by half.
  - Reduce 30 cm ruler slash effect and range to two-thirds.

## Changes

- Bell shockwave range:
  - Before: `3.4`
  - After: `1.7`
  - The bell now reads its range from `weapons.bell.radius`.

- 30 cm ruler slash:
  - Base range: `0.95` -> `0.633`
  - Trigger range: `0.58` -> `0.387`
  - Range upgrade step: `0.12` -> `0.08`
  - Range upgrade max: `1.6` -> `1.067`
  - Slash trail scale, ring effect size, and hit collider size were also reduced to roughly two-thirds.

## Files

- `Developer/r3f_prototype/src/store/useGameStore.js`
- `Developer/r3f_prototype/src/components/Weapons.jsx`

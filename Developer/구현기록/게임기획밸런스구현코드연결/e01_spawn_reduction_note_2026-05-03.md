# E01 Spawn Reduction Note - 2026-05-03

## Scope

- Target prototype: `Developer/github_school_survivor_latest/Developer/r3f_prototype`
- Request: reduce the green basic zombie (`E01`) spawn count by half from 1 minute onward.

## Changes

- Reduced `E01` maintain-spawn weights from `60s` onward by half.
- Rebalanced the remaining weights in each wave phase so the total phase weight remains about `1.0`.
- Reduced one-time `E01` burst spawns after `60s`:
  - `60s`: `10` -> `5`
  - `100s`: `12` -> `6`
  - `220s`: `15` -> `8`

## Files

- `Developer/github_school_survivor_latest/Developer/r3f_prototype/src/components/Enemies.jsx`

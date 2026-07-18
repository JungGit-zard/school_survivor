# Pencil Homing And Tumbler Radius Notes - 2026-04-26

## Change

- Reduced tumbler orbit radius from `2.0` to `1.0`.
- Added a shared `enemyBodies` registry so weapon logic can find live enemy rigid bodies.
- Changed pencil behavior from straight projectile to homing projectile.
- Pencil now selects the nearest live zombie inside its range at fire time.
- Pencil expires immediately after hitting one enemy, so it no longer damages multiple entities.
- Removed pencil pierce upgrade from level-up choices because pencil is now single-target.

## Verification

- `npm run build` passed in `Developer/r3f_prototype`.

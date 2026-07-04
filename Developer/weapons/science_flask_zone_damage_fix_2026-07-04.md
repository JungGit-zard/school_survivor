# Science Flask Zone Damage Fix - 2026-07-04

Scope:
- Fixed Science Flask chemical zone stats being dropped before explosion handling.
- Increased Science Flask base cooldown from `2800ms` to `8400ms`.
- `FlaskProjectile` now forwards `zoneRadius`, `zoneDurationMs`, and `zoneTickDamage` into the explosion payload.
- `applyRadialDamage` now returns `0` for invalid radius, position, or damage values instead of accidentally hitting every enemy through `NaN` comparisons.

Root cause:
- The thrown flask object had zone stats, but the projectile explosion callback only passed `{ x, z, radius, damage }`.
- `ChemicalZone` then received `radius: undefined`; shared radial damage treated `dx * dx + dz * dz > NaN` as false, so enemies could all be hit.

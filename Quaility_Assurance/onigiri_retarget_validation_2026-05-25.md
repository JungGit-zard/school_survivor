# Onigiri Retarget Validation - 2026-05-25

## Test Plan

- Verify that an onigiri projectile retargets to the nearest living enemy when its current target dies or becomes invalid.
- Verify that the impact effect data creates multiple scattered rice grains instead of a single flat circle.
- Verify that rice burst display is gated to the final consumed bounce only.
- Verify that the black outline mesh used by the rice burst was removed from `Onigiri.jsx`.
- Run related weapon upgrade/catalog tests to catch nearby regressions.
- Run full test suite and production build before final handoff.

## Automated Checks

- `npm.cmd test -- onigiri.test.js`
- `npm.cmd test -- weaponCatalog.test.js upgrades.test.js`
- `npm.cmd test`
- `npm.cmd run build`

## Risks

- Browser screenshot verification was not available in this tool context. The visual change is implemented with deterministic three.js mesh data and build validation.
- If future balance wants infinite retargeting only within a fixed range, `pickNextOnigiriTarget` already accepts a `range` parameter.

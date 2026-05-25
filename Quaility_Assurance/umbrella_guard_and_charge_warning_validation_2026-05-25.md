# Umbrella Guard and Charge Warning Validation - 2026-05-25

## Checks

- `npm.cmd test -- vfxGeometry.test.js weaponCatalog.test.js`
- `npm.cmd test`
- `npm.cmd run build`

## Coverage

- `vfxGeometry.test.js` verifies the charge warning default width is `0.35`, half of the previous `0.7`.
- `vfxGeometry.test.js` verifies the warning shape has a forward triangular arrow tip.
- Production build verifies the updated umbrella model and VFX shape compile.

## Manual Visual Risk

Browser screenshot capture was not available in this tool context. The visual implementation was checked through source inspection and build validation.

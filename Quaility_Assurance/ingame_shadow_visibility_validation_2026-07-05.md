# In-game Shadow Visibility Validation

Date: 2026-07-05

## Checks

- `npm test -- src/components/ZombieInstanceLayer.test.js src/components/PlayerMesh.test.js`
  - Passed: 2 files, 6 tests.
- `npm run build`
  - Passed.

## Coverage

- Confirms standard zombie shadows use `CircleGeometry`, depth testing, and `depthWrite: false`.
- Confirms the player floor shadow keeps depth testing enabled and depth writing disabled.

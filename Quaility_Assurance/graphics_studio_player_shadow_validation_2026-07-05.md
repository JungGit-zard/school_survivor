# Graphics Studio Player Shadow Validation - 2026-07-05

## Scope

Validate the player floor shadow no longer renders over the player body in Graphics Studio and title/game previews that reuse `PlayerMesh`.

## Automated Check

- Added regression coverage in `src/components/PlayerMesh.test.js`.
- The test requires the player shadow material to keep `depthTest: true` and `depthWrite: false`.

## Risk Notes

- `depthWrite` remains disabled, so the transparent shadow should not block later floor or effect rendering.
- The change is scoped to the player mesh shadow material only.


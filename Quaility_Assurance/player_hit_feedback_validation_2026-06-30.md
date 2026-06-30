# Player Hit Feedback Validation - 2026-06-30

## Scope

- Player damage flash token.
- One-frame white body flash on the 3D player mesh.
- `playerHit` short "앗!" SFX asset replacement.

## Checks

- `npm test -- useGameStore.hitFeedback.test.js PlayerMesh.test.js useGameStore.test.js`: passed.
- `npm run build`: passed.
- `playerHit.ogg`: `0.116599s`, `4646` bytes.
- `playerHit.mp3`: `1895` bytes.

## Notes

- The hit flash swaps only `MeshToonMaterial` body parts to white, leaving shadow and outline materials alone.
- Existing Vite large chunk warning remains.

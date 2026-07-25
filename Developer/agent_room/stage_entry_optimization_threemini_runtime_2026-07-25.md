# Stage entry runtime optimization — threemini trail

Date: 2026-07-25  
Profile: `threemini`  
Scope: Three.js/R3F stage-entry resource pressure only. No Firebase, gameplay values, collision, model geometry, or audio behavior changed.

## Implemented

- Lobby idle prefetches the exact lazy `GameCanvas` chunk; stage-card pointer/focus and showtime preload the selected floor texture, spawn smoke, and matching boss-face texture.
- The lobby does not create a second Canvas. GPU upload and shader compilation occur in the one gameplay WebGL context only.
- `ClassroomFloor` now uses the R3F `useLoader` cache. The Stage 2 end-wall texture is requested only by the Stage 2 component; stage 4 warms its current Stage 1 floor fallback.
- `Canvas` remains unkeyed. `Physics key={gameKey}` remains the reset boundary. `DamageNumbersLayer`, `ZombieInstanceLayer`, and `PooledEnemyProjectileLayer` are Canvas siblings because they have no Rapier hooks; each clears matrices/events in place on `resetKey` before paint.
- Every build starts `compileAsync(scene, camera)` immediately in the real Canvas (with `compile` fallback). DEV-only one-shot diagnostics emit `performance.mark` entries and a `escape-zombie-school:stage-entry-metric` event containing renderer draw-call, geometry, and texture snapshots. No browser storage is used.

## Safety gates

- No `useFrame` state update, allocation, or new array/object was added.
- Rapier components stay inside `Physics`; only visual consumers of existing fixed pools moved out.
- Texture cache ownership stays with R3F; only locally-created materials and the Stage 3 procedural CanvasTexture are explicitly disposed.
- First-wave timing and spawn counts are unchanged in this slice. Spawn batching remains a separate gameplay-runtime task.

## Verification

- Contract tests cover Stage 2-only end-wall preload, no per-mount `TextureLoader`, unkeyed Canvas/keyed Physics, persistent pool placement, reset-key clearing contract, and metrics payload shape.
- Production build and broader QA remain required by the coordinating reviewer before release.

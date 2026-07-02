# R3F Zombie Instance Layer Optimization - 2026-07-02

## Context

- Handoff checked: `C:\Users\admin\Downloads\R3F_LowPoly_Zombie_Optimization_Handoff.md`
- Target: reduce per-frame CPU and GC cost in the R3F low-poly zombie renderer.

## Change

- Reused one `THREE.Matrix4` through `useRef` instead of allocating it every frame.
- Replaced per-part pivot arrays with direct writes into the shared Euler scratch object.
- Removed the per-frame `Uint8Array` allocation.
- Hid only slots that were used in the previous frame but not the current frame, instead of sweeping all unused capacity every frame.
- Disabled the gameplay directional light shadow map because the handoff forbids real-time shadows for the optimized WebGL path.

## Scope

- Files changed:
  - `Developer/r3f_prototype/src/components/ZombieInstanceLayer.jsx`
  - `Developer/r3f_prototype/src/components/Game.jsx`
- No enemy stats, spawn timing, hitbox, damage, or gameplay rules changed.

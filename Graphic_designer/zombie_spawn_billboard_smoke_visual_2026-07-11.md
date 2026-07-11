# Zombie Spawn Billboard Smoke Visual

Date: 2026-07-11

## Direction

- Zombie visibility must start with a 2D smoke puff billboard on the stage.
- The zombie body appears only after the smoke poof has begun, so the previous instant pop-in is masked.
- The effect stays short and smaller than the zombie body to preserve the 3D toon zombie style.

## Asset

- Runtime asset: `Developer/r3f_prototype/src/assets/effects/spawn_smoke_puff.png`
- Source asset: user-provided `Group 18.png` (120×120 transparent RGBA).
- Rendering method: Three.js `Sprite`, which automatically faces the active camera like a billboard without manual rotation.
- Runtime scale: `0.62 → 1.12` times the enemy visual scale, keeping the smoke compact while it pops and fades.

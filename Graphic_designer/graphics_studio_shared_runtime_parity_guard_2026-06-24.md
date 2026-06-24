# Graphics Studio runtime-parity visual guard note

Date: 2026-06-24 23:57 local
Task: `t_d91d87a4`
Role: Three_Mini / graphics implementation note

## Visual intent protected

Graphics Studio must remain a tuning surface for the same runtime 3D/toon visuals used by normal gameplay, not a separate studio gallery of icon substitutes, placeholder shapes, or approximation-only previews.

The strengthened guard now protects these preview groups:

- Player: shared `components/PlayerMesh.jsx` source plus runtime `PlayerVisual` component path.
- Zombies: shared `components/ZombieMesh.jsx` source plus runtime `EnemyVisual` component path.
- Floors: shared `components/Floor.jsx` / `FloorVisual` path, with tile assets still listed as apply targets.
- VFX: shared `components/VFXLayer.jsx` components (`HitSpark`, `ChargeWarningLine`, `PickupPop`).
- Enemy projectile: shared `components/EnemyProjectileVisual.jsx` / `EnemyProjectileVisual` path.
- Weapon models: shared runtime weapon model component paths such as `PencilModel`, `ThirtyCmRulerModel`, `SharkMissileModel`, and the other runtime model exports.

## Allowed exception

`weapon-extra-battery` remains the only documented `previewKind: 'image'` exception. It is still an upgrade/catalog icon because no runtime 3D model exists. If a runtime model is added later, it should move to `previewKind: 'weaponModel'` and receive shared source/component metadata like the other weapon models.

## Policy check

This task changed catalog metadata and regression tests only. It did not introduce character/monster 2D sprite substitutes, visible debug proxies, or studio-only player/monster stand-ins. The test now explicitly rejects catalog drift toward studio-only approximations for the protected runtime preview kinds.

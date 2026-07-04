# Gameplay Visual Audio Tuning - 2026-07-04

Scope:
- Stage 1 boss `B01` scale reduced from `3.00` to `2.00`.
- Matilda spawn SFX asset was replaced with a short bright high-pitched arrival chime.
- Onigiri Lv.1 damage changed from `14` to `21`.
- Onigiri damage upgrade amount changed from `5` to `6.5`.
- Eraser Bomb 3D eraser model visual scale source changed from `0.8` to `1.2`.
- Guided Missile, Eraser Bomb, and Shark Missile pass `deathStyleOverride: 'shatter5'` through radial damage so kills use the shatter collapse style.

Files changed:
- `Developer/r3f_prototype/src/components/Enemy.jsx`
- `Developer/r3f_prototype/src/components/Enemies.jsx`
- `Developer/r3f_prototype/src/components/SfxLayer.jsx`
- `Developer/r3f_prototype/src/lib/sfxRegistry.js`
- `Developer/r3f_prototype/public/sfx/enemies/matildaSpawn.ogg`
- `Developer/r3f_prototype/public/sfx/enemies/matildaSpawn.mp3`
- `Developer/r3f_prototype/src/components/Weapons/Missile.jsx`
- `Developer/r3f_prototype/src/components/Weapons/EraserBomb.jsx`
- `Developer/r3f_prototype/src/components/Weapons/SharkMissile.jsx`
- `Developer/r3f_prototype/src/lib/weaponTargeting.js`
- `Developer/r3f_prototype/src/lib/weaponCatalog.js`
- `Developer/r3f_prototype/src/lib/upgrades.js`
- focused tests for the above behavior

Implementation note:
- The old Matilda spawn audio files were overwritten. No WebAudio bypass or runtime pitch/rate transform remains.

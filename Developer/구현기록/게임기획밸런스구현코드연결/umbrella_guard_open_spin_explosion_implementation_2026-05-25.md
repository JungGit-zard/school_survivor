# Umbrella Guard Open Spin Explosion Implementation - 2026-05-25

## Changed

- Replaced the old instant pulse damage behavior with a staged weapon cycle:
  - open,
  - slow spin,
  - final area explosion.
- The umbrella now stays at the fired position instead of visually following the player during the attack.
- Damage is applied once at the final explosion timing.
- The 3D model now uses colored canopy segments, silver shaft, purple handle, ribs, outline, and small rim accents based on the supplied reference.
- Explosion feedback uses colored fragments and a pale ring.

## Balance Wiring

- Base damage: 12
- Base cooldown: 3600 ms
- Base radius: 1.25
- Spin duration: 1200 ms
- Damage upgrade: +6
- Radius upgrade: +0.15, capped at 1.85

## Files

- `Developer/r3f_prototype/src/components/Weapons/UmbrellaGuard.jsx`
- `Developer/r3f_prototype/src/lib/weaponCatalog.js`
- `Developer/r3f_prototype/src/lib/upgrades.js`
- `Developer/r3f_prototype/src/lib/weaponCatalog.test.js`


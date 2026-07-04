# Student Lantern Cone Attack - 2026-07-04

Scope:
- Changed Student Lantern from a forward box attack to a widening flashlight cone.
- Added `isInForwardCone` and `applyForwardConeDamage` for cone-shaped targeting.
- Updated Student Lantern defaults to `lightLength: 5.2`, `lightWidth: 3.6`, `lightBaseWidth: 0.35`.
- Replaced reused `stunGunFire` with dedicated `lanternFire` SFX.
- Follow-up: replaced flat beam materials with shader materials so the cone fades to full transparency at the outer sides and far tip.
- Follow-up: moved the visual beam origin about 20px forward in the firing direction from the player center.

Files:
- `Developer/r3f_prototype/src/components/Weapons/StudentLantern.jsx`
- `Developer/r3f_prototype/src/lib/weaponTargeting.js`
- `Developer/r3f_prototype/src/lib/weaponCatalog.js`
- `Developer/r3f_prototype/src/lib/sfxRegistry.js`
- `Developer/r3f_prototype/public/sfx/weapons/lanternFire.ogg`
- `Developer/r3f_prototype/public/sfx/weapons/lanternFire.mp3`

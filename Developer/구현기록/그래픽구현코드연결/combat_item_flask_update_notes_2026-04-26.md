# Combat Item Flask Update Notes - 2026-04-26

## Changes

- Updated `schoolBag.cooldown` to `1500` ms and `swingMs` to `260` ms.
- Strengthened the player arm and bag swing pose during school bag attacks.
- Reworked school bag swing using separated visible model, slash trail effect, and hitbox logic.
- The visible bag now rotates around the player with eased swing motion while a translucent arc fades in and out.
- Replaced the visible school bag swing weapon with a 30 cm ruler swing weapon while keeping the existing internal key for compatibility.
- Replaced the blue milk box pickup with a glass milk bottle pickup at the same approximate item size.
- Added tumbler upgrade options for extra orbiting tumblers up to 3 total.
- Reworked flask travel to rise upward, rotate, follow a slower arc, and explode when it lands.
- Reduced every monster movement speed by 50%, including charger dash speed.
- Confirmed ruler hits use the existing full-body one-frame white hit flash.
- Added a visible floating bell after bell unlock.
- Bell now emits a golden 8-direction shockwave pulse on cooldown and damages nearby zombies.
- Reduced pencil base damage from 18 to 9 and pencil damage upgrade gain from +6 to +3.
- Reduced bell base damage from 28 to 14 and bell damage upgrade gain from +10 to +5.
- Bell shockwave now applies a stronger sustained knockback to every zombie hit inside its radius.
- Enemy knockback now preserves each weapon's knockback speed instead of falling back to one fixed value after the first frame.
- Reverted the experimental outline cleanup and restored the previous per-part outline behavior.
- Added `LunchItems.jsx` for random floor meal and milk pickups.
- Added `scienceFlask` weapon data and upgrade handling.
- Added `ScienceFlaskSplash` to throw a flask toward clustered enemies and apply splash damage.
- Added upgrade card icons for pencil, bag, flask, bell, stun, speed, and health choices.

## Verification

- `npm run build` passed in `Developer/r3f_prototype`.

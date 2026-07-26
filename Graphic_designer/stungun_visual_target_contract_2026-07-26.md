# Stun Gun visual target contract — 2026-07-26

The flying lightning bolt's forward axis is its local `+Y`, because its shape is drawn in XY. Its runtime direction must therefore map `+Y` to the normalized XZ vector from the bolt's current position to the live target:

`D = normalize((targetX - boltX), 0, (targetZ - boltZ))`

Apply a quaternion from `UP=(0,1,0)` to `D` on the projectile outer group. A yaw-only pose is invalid: yaw leaves +Y vertical. The Studio-tuned inner `LightningBoltModel` remains unchanged so the existing `weapon-stun-gun` transform, materials, outline, and Firebase canonical tuning continue to apply.

Chain arc boxes use local `+Z`; their existing `yaw = atan2(dx, dz)` is the correct forward convention. The first-hop source follows live player position; chain endpoints use live generation-valid enemy positions through the 0.22-second effect, or follow a deliberately documented freeze/terminate policy. Capturing firing coordinates while actors move is not acceptable.

Visual acceptance: cardinal and diagonal bolts point toward targets; player/enemy movement does not detach arc endpoints; recycled pooled targets never redirect a bolt or leave a ghost arc.

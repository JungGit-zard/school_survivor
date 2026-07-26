# Pencil pierce motion contract — 2026-07-26

An upgraded pencil may home only until its first valid target hit. At that hit, release the matching homing target and preserve its current velocity vector. The pencil then continues straight through the first zombie; it does not turn back, stop, teleport, orbit, or vibrate inside that zombie.

The next frame advances from the prior position by the unchanged velocity. Swept collision uses the bounded candidate budget `min(scratch capacity, remaining hits + prior hit count)`: enough to pass over an already-hit duplicate and reach the next unique enemy without scanning an entire dense cluster. A duplicate consumes no visual hit or pierce; a successful unique hit does.

The projectile's visual forward is outer local `+Z`, with `yaw = atan2(velocity.x, velocity.z)`. Keep the existing inner pencil rotation, model scale, outline, and `StudioTunedGroup itemId="weapon-pencil"`; this is a motion-only correction and must not alter Graphics Studio or Firebase values.

Acceptance: place A and B on the same flight line with pierce >=2. The pencil visibly crosses A, continues smoothly in the same direction, and registers B without a first-target shake or backward motion.

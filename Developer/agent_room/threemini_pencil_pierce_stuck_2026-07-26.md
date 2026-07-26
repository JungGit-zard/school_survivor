# threemini Pencil pierce motion routing trail — 2026-07-26

## Scope

- Profile: `threemini` visual/motion contract review.
- Read-only. No code, Firebase, or Graphics Studio data changed.

## Confirmed causes

1. After the first successful `applyEnemyHit`, the original `targetRef` must be cleared. If retained, the per-frame homing block recomputes velocity toward the already-hit enemy and pulls the pencil into/around it.
2. The swept-capsule query must use a bounded candidate budget, not only `hitsLeft`: `min(scratch capacity, remaining hits + prior hit count)`. This includes enough candidates to skip duplicate A and reach valid B without sorting an entire dense cluster; duplicate filtering then consumes no hit and the pencil does not appear to stop.

## Motion contract

- Before its first valid hit, the pencil homes on its assigned generation-valid target.
- Immediately after a successful hit of that same assigned target, clear only the matching `targetRef` (`index=-1`, `generation=null`, `special=null`). Keep `velocityRef` unchanged: the next frame uses the same position plus `velocity * delta`, with no repositioning or new yaw derived from A.
- Continue every frame's swept capsule from previous to next position. Query the bounded budget `min(scratch capacity, remaining hits + prior hit count)`; `tryHit` alone rejects duplicate `{index,generation}`/special A and preserves remaining pierce, allowing B later in the ordered sweep to receive the hit.
- The outer projectile visual faces travel from `yaw=atan2(velocity.x, velocity.z)`. `PencilModel` already rotates its long local +Y axis to outer local +Z; retain that model transform and `StudioTunedGroup itemId="weapon-pencil"`.

## Visual observations

1. With pierce >=2 and A then B inline, pencil passes through A and reaches B in one continuous forward trajectory.
2. No teleport, reverse turn, zero-speed pause, or vibrating/orbiting inside A after first hit.
3. An A duplicate in the sweep does not prevent B hit; the remaining-pierce count decreases only for successful unique hits.
4. If A despawns/recycles, no stale homing or visual snap occurs; material, scale, outline, and Studio transform stay unchanged.

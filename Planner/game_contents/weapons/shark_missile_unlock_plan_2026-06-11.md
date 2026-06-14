# Shark Missile Unlock And Balance Plan - 2026-06-11

## Weapon Identity

- Weapon key: `sharkMissile`
- Display name: `상어미사일`
- Role: very slow, high-impact smart homing missile for dense zombie groups.
- Reference weapon: `scienceFlask`.

## Runtime Balance

| Field | Value | Reason |
| --- | ---: | --- |
| Damage | 30 | Exactly 2x `scienceFlask` base damage 15. |
| Cooldown | 14000ms | Exactly 5x `scienceFlask` base cooldown 2800ms. |
| Radius | 1.8 | Slightly wider than flask to reward long cooldown. |
| Range | 28 | Longer than `guidedMissile` so it can seek far dense groups. |
| Retarget interval | 300ms | Rechecks dense zombie clusters during flight without scanning every frame. |
| Card level | Lv.8 | High-tier weapon; appears after the player has built a run. |

## Unlock Condition

`sharkMissile` is account-unlocked by either path:

- Clear Stage 1 once: `{ type: 'stage1Clears', value: 1 }`
- Fallback for repeated attempts: `{ type: 'totalRuns', value: 8 }`

This keeps the weapon tied to real progress, while still giving struggling players a long-run fallback.

## Upgrade Cards

- `acquireSharkMissile`: acquire the weapon in the current run.
- `sharkMissileDamage`: +10 explosion damage.
- `sharkMissileRadius`: +0.2 explosion radius, capped at 2.6.

## Implementation Notes

- Targeting uses the existing splash-target scoring model: pick the living enemy whose surrounding radius contains the most enemies.
- Unlike `scienceFlask`, the missile retargets while flying, so it can adjust toward the current densest zombie cluster.
- The missile remains limited to one active projectile because its cooldown and damage are intentionally high.

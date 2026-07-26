# threemini Stun Gun visual-target routing trail — 2026-07-26

## Routing and boundary

- Profile: `threemini` graphics/runtime visual diagnosis.
- Read-only diagnosis. Firebase/Graphics Studio data was not read or changed.

## Cause ranking

1. **Confirmed primary:** `LightningBoltModel` is an `ExtrudeGeometry(Shape)` whose long axis is local `+Y` (`StunGun.jsx:25-35`). `StunBoltProjectile` only sets `rotation.y = atan2(dx, dz)` (`:137`), and yaw cannot rotate local `+Y`; the bolt therefore remains vertical instead of facing the moving target.
2. **Secondary visual drift:** `ChainArcVisual` receives firing-time `fromX/fromZ` at impact (`:130`, `:169-174`). A moving player or previous chain target can have already moved, leaving the 0.22s arc detached from its source.
3. **Not the primary cause:** pool targeting returns a live `{ rb, generation }`; the proxy translation reads current pool coordinates and `isEnemyHitLive` guards the generation before pursuit/hit. A recycled/dead target expires the bolt rather than redirecting it.

## Minimal visual contract

- At each bolt frame, use `P=(px,0.55,pz)`, `T=(tx,0.55,tz)`, `D=normalize(T-P)` in XZ. Rotate the bolt's local `+Y` to `D` with `quaternion.setFromUnitVectors(UP, D)` on the projectile outer group. This is the canonical pose; do not substitute a default-order yaw/pitch Euler shortcut without proving its axis order.
- Keep `ChainArcVisual` segment geometry on local `+Z`: its existing `yaw=atan2(segmentDx, segmentDz)` is correct. A first-hop source follows live `playerPos`; chain sources and targets follow current valid `{rb,generation}` positions for the short lifetime. Terminate/freeze only with an explicit endpoint policy, never a stale firing coordinate by accident.
- Preserve `StudioTunedGroup itemId="weapon-stun-gun"` around `LightningBoltModel`; apply travel pose only to its outer projectile group. Do not change Studio/Firebase tuning.

## Manual visual checks

1. Fire to enemies in +X, -X, +Z, -Z and both diagonals: bolt long axis must point along travel, never upright.
2. Move the player and let a source enemy move during a chain: every arc endpoint must remain attached for its visible lifetime.
3. Despawn/reuse a pooled target during pursuit: bolt expires with no jump to another entity; no stale arc remains.
4. Confirm scale, material, outline, and Studio-applied transform match the pre-fix weapon appearance.

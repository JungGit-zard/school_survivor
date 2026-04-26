# Bag Swing Blackout Fix - 2026-04-26

## Check Scope

- Request: After one bag swing, the game freezes and blacks out.
- Checked file:
  - `Developer/r3f_prototype/src/components/Weapons.jsx`

## Root Cause

- The bag swing damage `RigidBody` and `CuboidCollider` were mounted only while a swing was active.
- When the swing ended, React unmounted that Rapier collider.
- The browser dev log showed Rapier crashing during collider removal with `expected instance of EA`.
- A second risk was applying enemy damage directly inside a collision callback, which can delete enemy rigid bodies during Rapier contact event handling.

## Implementation Result

- The bag swing damage rigid body now stays mounted for the lifetime of `SchoolBagSwing`.
- While inactive, that rigid body is moved to `[9999, -9999, 9999]` instead of being unmounted.
- Collision callbacks now only record pending hits.
- The actual enemy damage is applied in `useFrame`, outside the collision callback.

## Verification Status

- `npm run build` completed successfully in `Developer/r3f_prototype`.
- Manual browser recheck is recommended because the reported issue is runtime interaction-specific.

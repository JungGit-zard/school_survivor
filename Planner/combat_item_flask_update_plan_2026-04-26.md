# Combat Item Flask Update Plan - 2026-04-26

## Gameplay Decisions

- School bag swing uses a 1.5 second cooldown after activation.
- If a close zombie is still near the player after cooldown ends, the school bag can trigger again.
- Student meal floor items can spawn randomly around the player and heal HP on pickup.
- Science triangular flask is a splash weapon that targets dense zombie groups and damages enemies inside the blast radius.
- Weapon upgrade choices should show a simple visual representation of the related weapon or stat.

## Scope Limit

- This pass keeps all systems prototype-friendly and playable.
- The flask is implemented as a simple auto-targeted area burst, not a full physics liquid simulation.

## 2026-05-03 Current Flask Documentation Update

- The current Science Flask implementation is accepted as-is.
- Current values to document and preserve unless intentionally rebalanced:
  - Damage: 32
  - Cooldown: 2600 ms
  - Target search range: 2 units (0.5 blocks)
  - Splash radius: 1.6 units (0.4 blocks)
- This means the flask is a short-range dense-cluster splash tool in the current prototype, not a long-range artillery tool.

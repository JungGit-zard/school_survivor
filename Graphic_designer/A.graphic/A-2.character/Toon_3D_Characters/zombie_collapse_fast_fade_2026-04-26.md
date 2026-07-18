# Zombie Collapse Fast Fade - 2026-04-26

## Visual Direction

- Zombie debris should collapse quickly and disappear before it clutters the playfield.
- The debris burst speed is doubled for a sharper death effect.
- The collapse remains visible for only `0.8s`.
- The last `0.25s` uses a fast fade-out so removal feels intentional rather than popping.

## Implementation Notes

- `EnemyDeathCollapse` now uses a fixed `800ms` lifetime.
- Debris linear speed, lift, and spin are multiplied by `2`.
- Debris opacity starts fading at `550ms` and reaches zero at `800ms`.

# Enemy Spawn Straight-Line Block Rule - 2026-07-01

## Rule

Enemy spawn placement must reject a new point when it would become the third point on an obvious straight spawn line in the same placement set.

## Scope

- Keep current wave timing and spawn counts.
- Apply to normal, burst, and ranged spawn placement because they share the same spawn gap check.
- If ring sampling fails, fallback placement must still try to break the straight line before accepting the point.

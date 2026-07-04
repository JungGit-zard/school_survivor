# Starlink SFX and Lantern Tick Tuning - 2026-07-04

- Added `starlinkFall` and `starlinkExplosion` SFX IDs.
- Added generated `starlinkFall` and `starlinkExplosion` ogg/mp3 assets.
- Starlink crash sequence now plays fall SFX once when falling starts and explosion SFX once on landing.
- Student lantern now hits every `300ms`.
- Student lantern damage is `pencilThrow.base.damage * 0.1`.
- Lantern hit ticks play `pencilHit` when at least one zombie is hit.
- Lantern gameplay range remains `lightLength: 2.08`, `lightWidth: 3.6`.


# Stage 2 E04 Spawn Halved - 2026-07-07

## Change

- Reduced Stage 2 E04 ranged/projectile zombie pressure by about half.
- Halved E04 weights in `STAGE2_WAVE_PHASES` and redistributed the removed weight into existing non-E04 enemies so total wave targets stay stable.
- Removed three E04 burst events from Stage 2, leaving E04 bursts at 72s and 216s.
- Reduced the Stage 2 E04 simultaneous enemy cap from `2 / 3 / 4` to `1 / 2`.

## Files

- `Developer/r3f_prototype/src/lib/waveTimelines.js`
- `Developer/r3f_prototype/src/components/Enemies.jsx`
- `Developer/r3f_prototype/src/lib/stage2ProjectileRules.js`
- `Planner/current_zombie_wave_composition_2026-06-30.md`
- `Planner/B. GAME_DESIGN/Stage_balance_summary.md`

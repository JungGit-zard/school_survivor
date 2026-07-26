# Matilda runtime scale visual contract — 2026-07-26

Matilda must render at the B01 visual/collider scale, `ENEMY_STATS.B01.scale = 2.0`. Commit `b475334` accidentally delivered the independent runtime override `3.0` to the visual path, enlarging the model by 1.5x.

The restored runtime contract keeps visual scale and collider scale at 2.0. Difficulty values remain separate: HP and attack damage x3, movement speed x1.4. `MatildaMesh`, Firebase canonical data, and Graphics Studio tuning are unchanged.

Focused 99 tests and build passed. Live Firebase Graphics Studio visual verification was not performed.

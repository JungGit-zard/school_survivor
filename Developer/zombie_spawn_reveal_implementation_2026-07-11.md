# Zombie Spawn Reveal Implementation

Date: 2026-07-11

## Summary

- Changed enemy spawn flow so the smoke poof starts first.
- Delayed the actual enemy rigid body, collider, and instanced zombie registry registration until after the reveal delay.
- Replaced the temporary SVG with the user-provided transparent PNG smoke puff.
- Kept the resource on a Three.js `Sprite`, so it remains camera-facing as a billboard, and reduced its runtime scale so the smoke stays smaller than the zombie.
- Reused existing spawn SFX ids instead of adding a new audio file.

## Files

- `Developer/r3f_prototype/src/components/Enemy.jsx`
- `Developer/r3f_prototype/src/components/EnemyVisual.test.js`

## Notes

- Normal zombies use a low-volume `bossSpawn` poof sound with a short local cooldown to avoid stacked spawn bursts becoming too loud.
- Boss and Matilda spawns keep stronger spawn SFX.

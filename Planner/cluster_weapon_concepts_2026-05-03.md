# Cluster Weapon Concepts - 2026-05-03

## Purpose

The current science flask is the main answer to dense zombie groups. If the player does not pick the flask, clustered zombies can become hard to damage reliably. This plan adds two candidate weapons that can hit groups without replacing the flask's exact role.

Design goals:

- Give the player at least one non-flask answer to clustered zombies before the 2:00 pressure spike.
- Keep each weapon simple enough for a solo beginner project.
- Use both block and unit values. Project standard: 1 block = 4 units.
- Avoid making the flask pointless. Flask remains the strongest delayed dense-cluster burst.

## Weapon 1: Gym Whistle

### Concept

The player blows a loud gym whistle when too many zombies are close. It creates a short circular shockwave around the player.

Beginner explanation:

- This is a "panic space" weapon.
- It does not chase enemies.
- It helps when zombies are already surrounding the player.

### Role

- Main role: close-range crowd control.
- Best against: small zombies packed around the player.
- Weak against: far clusters, bosses, single high-HP targets.
- Difference from flask: centered on the player, instant, defensive, smaller damage.

### Level Table

| Level | Cooldown | Damage | Radius | Knockback | Special |
| --- | ---: | ---: | ---: | ---: | --- |
| 1 | 3000 ms | 12 | 6 units (1.5 blocks) | 0.8 units (0.2 blocks) | Triggers only when 4+ zombies are within radius |
| 2 | 2800 ms | 15 | 6 units (1.5 blocks) | 0.8 units (0.2 blocks) | Lower cooldown |
| 3 | 2800 ms | 15 | 8 units (2 blocks) | 1.0 units (0.25 blocks) | Larger radius |
| 4 | 2500 ms | 19 | 8 units (2 blocks) | 1.0 units (0.25 blocks) | Higher damage |
| 5 | 2300 ms | 22 | 10 units (2.5 blocks) | 1.2 units (0.3 blocks) | Adds 0.5 sec slow after knockback |

### Implementation Notes

- Check nearby enemies every cooldown.
- If fewer than the trigger count are nearby, delay the attack briefly instead of wasting it.
- Apply damage once per pulse, not every frame.
- Knockback means pushing enemies away from the player for readability and safety.

### Balance Notes

- This should save the player from being swallowed by a group, but should not clear the whole screen.
- Boss damage should be reduced by 50 percent so it does not become a boss killer.
- Recommended first appearance in level-up choices: after 0:50.

## Weapon 2: Rolling Lunch Tray

### Concept

The player throws a metal lunch tray that rolls forward through a dense line of zombies, then curves back slightly. It hits multiple enemies along a wide path.

Beginner explanation:

- This is a "path opener" weapon.
- It is good when the player wants to run through a crowd.
- It attacks in a lane, not in a full circle.

### Role

- Main role: cut a path through a clustered wave.
- Best against: enemies packed in the player's movement direction.
- Weak against: enemies surrounding the player from every side.
- Difference from flask: moving line attack, easier to aim by player movement, less burst radius.

### Targeting Rule

Use the player's latest movement direction. If the player is not moving, aim toward the densest cluster within 18 units (4.5 blocks).

### Level Table

| Level | Cooldown | Damage | Tray Width | Travel Distance | Pierce | Special |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | 2400 ms | 16 | 2.4 units (0.6 blocks) | 14 units (3.5 blocks) | 5 | Rolls forward |
| 2 | 2300 ms | 20 | 2.4 units (0.6 blocks) | 14 units (3.5 blocks) | 6 | Higher damage |
| 3 | 2300 ms | 20 | 3.2 units (0.8 blocks) | 16 units (4 blocks) | 7 | Wider hit path |
| 4 | 2100 ms | 24 | 3.2 units (0.8 blocks) | 16 units (4 blocks) | 8 | Lower cooldown |
| 5 | 2000 ms | 28 | 4 units (1 block) | 18 units (4.5 blocks) | 10 | Tray returns once for 60 percent damage |

### Implementation Notes

- Treat the tray as a moving capsule hit area. A capsule is a rectangle with rounded ends, useful for wide line attacks.
- Track enemies already hit during one throw so the same enemy is not damaged every frame.
- On level 5, the return hit can reuse the same path in reverse with reduced damage.
- Cap active trays to avoid performance spikes.

### Balance Notes

- It should feel stronger when the player intentionally runs along an escape path.
- It should be less reliable than flask against a stationary dense ball far away.
- Recommended first appearance in level-up choices: after 1:20.

## Comparison With Science Flask

| Weapon | Main Feeling | Best Moment | Risk |
| --- | --- | --- | --- |
| Science Flask | Dense-group burst | A ball of zombies forms away from the player | Too strong if cooldown is too short |
| Gym Whistle | Emergency breathing room | Zombies are already close | Too safe if knockback is too large |
| Rolling Lunch Tray | Opens a route | Player wants to move through a wave | Weak if aiming feels unclear |

## Recommendation

Implement Gym Whistle first if the current pain is "I get surrounded and cannot recover."

Implement Rolling Lunch Tray first if the current pain is "I see the crowd, but cannot cut through it while moving."

For the next prototype pass, the safest combination is:

- Add Gym Whistle as the defensive non-flask cluster option.
- Keep Rolling Lunch Tray as the next offensive cluster option after whistle balance is confirmed.


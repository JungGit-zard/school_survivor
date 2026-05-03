# Current Weapon And Boss Rules - 2026-05-03

## Purpose

This document reconciles the current implementation with the gameplay documents after the latest balance decisions.

## Confirmed Decisions

- Boss B01 appears at 240 seconds, which is 4:00.
- Stage clear still happens at 300 seconds, which is 5:00.
- Starting weapon count follows the planner rule: the player starts with one weapon.
- Starting weapon is Pencil Throw.
- School Bag / 30 cm Ruler and Tumbler are now unlocked through level-up choices.
- Science Flask current implementation is accepted as-is.
- Starlink current implementation is accepted as-is.

## Current Weapon Reference

Project unit rule: 1 block = 4 units.

| Weapon key | Display concept | Start active | Main role | Current implementation values |
| --- | --- | --- | --- | --- |
| `pencilThrow` | Pencil Throw | Yes | Basic single-target projectile | Damage 9, cooldown 900 ms, range 22 units (5.5 blocks), projectile count 1 |
| `schoolBag` | 30 cm Ruler Swing | No | Close defensive sweep | Damage 22, cooldown 1000 ms, range 0.633 units, trigger range 1.0 unit |
| `tumbler` | Orbiting Tumbler | No | Orbiting close defense | Damage 10, radius 1.0 unit (0.25 blocks), 3.5 hits/sec, count 1 |
| `scienceFlask` | Science Flask | No | Dense group splash | Damage 32, cooldown 2600 ms, target search range 2 units (0.5 blocks), radius 1.6 units (0.4 blocks) |
| `bell` | Emergency Bell Shockwave | No | 8-direction crowd pressure | Damage 14, cooldown 4200 ms, radius 1.7 units, 8 directions |
| `stunGun` | Stun Gun | No | Chain attack | Damage 22, cooldown 2800 ms, chain count 2 |
| `guidedMissile` | Power Bank Missile | No | Dense point explosion | Damage 16, cooldown 4000 ms, range 22 units (5.5 blocks), radius 1.6 units, count 1 |
| `starlink` | Broken Starlink | No | Random nearby lightning | Damage 28, cooldown 3800 ms, strike radius 1.2 units, strike center within 5 units (1.25 blocks) |
| `onigiri` | Onigiri Bounce | No | Bouncing multi-target hit | Damage 18, cooldown 1800 ms, range 18 units (4.5 blocks), 4 bounces, bounce range 4.5 units |

## Notes

- Science Flask is intentionally documented with the current short targeting range because the user confirmed the current implementation feels acceptable.
- Starlink HUD and documentation should describe its current behavior as 5 units, not 5 blocks.
- Any future weapon value changes should update this document and `Bang_Rules.md` before code changes.


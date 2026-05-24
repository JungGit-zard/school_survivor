# Floor Grid And New Weapon Visual Notes - 2026-05-03

## Floor Grid

- The floor grid should read more clearly than the previous low-contrast line treatment.
- Current implementation:
  - Floor color: `0xc8c4bc`
  - Grid line color: `0x7f7a70`
  - Grid opacity: `1`
- The goal is to make the tile/block structure easier to read while keeping the school-floor tone.

## New Weapon Visual Coverage

The following implemented weapons now need visual QA coverage:

| Weapon | Visual concept | Readability check |
| --- | --- | --- |
| Power Bank Missile | Pink battery-like missile with smoke and flame | Confirm it is visible without looking like an enemy projectile |
| Broken Starlink | Cyan warning mark and lightning bolt | Confirm the warning mark is readable before damage lands |
| Onigiri Bounce | Small triangular rice-ball projectile | Confirm it remains visible while bouncing through enemy groups |

## Manual Visual QA Needed

- Capture phone-frame screenshots after unlocking each new weapon.
- Check that VFX does not cover the player or mini health bars.
- Check that the stronger floor grid does not visually compete with XP coins or lunch pickups.


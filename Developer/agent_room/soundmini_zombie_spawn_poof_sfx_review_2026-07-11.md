# soundmini Review Trail: Zombie Spawn Poof SFX

Date: 2026-07-11
Profile: soundmini

## Decision

- Do not add a new SFX file for this first implementation pass.
- Reuse existing spawn-like SFX ids:
  - Normal zombies: `bossSpawn` at low volume.
  - Boss zombies: `bossSpawn` at stronger volume.
  - Matilda: `matildaSpawn`.

## Guardrails

- Normal zombie spawn SFX is locally cooldown-gated to reduce burst stacking.
- No `SOUND_MAP` entry, file path, codec, or license change is introduced.
- If a dedicated "poof" sound is produced later, it should go through Sound_Mini review before changing `public/sfx` or `SOUND_MAP`.

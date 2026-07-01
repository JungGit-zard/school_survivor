# Purple Zombie Hit Knockback Fix

## Problem

- E02 purple zombies looked like they were bugging backward after ordinary hits.
- Root cause: common hit VFX added default knockback even when a weapon did not request knockback.

## Change

- Ordinary enemy hits now keep hit flash and spark only.
- E02 purple zombies ignore hit knockback, including weapon-provided knockback.
- Other enemies still use weapon-specific knockback when `impact.knockback` / `impact.knockbackMs` is provided.

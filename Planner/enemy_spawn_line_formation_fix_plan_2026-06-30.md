# Enemy Spawn Line Formation Fix Plan - 2026-06-30

## Goal

Remove visible straight-line crowd spawns in narrow hallway maps.

## Decision

- Keep current spawn counts and wave timing.
- Change placement only: choose valid in-bounds ring points before using boundary clamp.
- Add small spacing inside same burst/maintenance batch so enemies do not appear as one packed row.


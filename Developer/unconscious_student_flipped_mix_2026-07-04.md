# Unconscious Student Flipped Mix Implementation - 2026-07-04

## Request

Stage unconscious student props should mix the current floor-facing side with flipped versions.

## Implementation

- Added flipped unconscious student variants for `faceUp`, `sideLeft`, and `sideRight`.
- Kept the original variants unchanged.
- Mixed flipped variants in `getStageObjectPlacements()` using each placement ID as a stable pseudo-random seed.

## Reasoning

Using placement IDs keeps the classroom visually mixed without changing props every render or every frame.

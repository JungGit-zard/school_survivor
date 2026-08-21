# Ruler Swing Cooldown Note - 2026-05-01

## Scope

- Target: `Developer/r3f_prototype`
- Change: set 30 cm ruler swing cooldown to 1 second.

## Change

- `schoolBag.cooldown`: `1500ms` -> `1000ms`
- `Bang_Rules.md` weapon reference table updated to match the code.

## Verification

- `npm run build`: Pass
- Existing Vite chunk-size warning remains unrelated to this change.

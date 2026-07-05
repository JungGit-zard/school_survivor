# Graphics Studio Apply-Required Draft Flow Validation - 2026-07-05

## Scope

Validate that graphics and sound edits remain temporary until `Apply`.

## Automated Checks

- Graphics slider edits update preview but do not write `loadStudioTunings` until `Apply`.
- Typed numeric graphics values remain draft until `Apply`.
- Part focus and part group edits remain draft until `Apply`.
- Ctrl+Z restores draft state without writing game storage.
- Audio volume/pitch edits do not write `loadSfxTunings` until audio `Apply`.


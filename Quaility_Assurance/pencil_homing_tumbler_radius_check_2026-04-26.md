# Pencil Homing Tumbler Radius Check - 2026-04-26

## Scope

- Tumbler orbit radius reduced by half.
- Pencil targets the nearest live zombie.
- Pencil damages only one enemy and expires on hit.

## Verification

- `npm run build` passed in `Developer/r3f_prototype`.

## Manual Check Needed

- Confirm the tumbler orbit visually sits at half the previous radius.
- Confirm pencil curves toward the nearest zombie instead of firing only forward.
- Confirm each pencil hit damages only one zombie.

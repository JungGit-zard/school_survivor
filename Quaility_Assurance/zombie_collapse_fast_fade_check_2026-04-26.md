# Zombie Collapse Fast Fade Check - 2026-04-26

## Scope

- Increased zombie collapse debris motion speed by 2x.
- Limited collapse debris lifetime to `0.8s` from death.
- Added a fast fade-out before immediate removal.

## Verification

- `npm run build` passed in `Developer/r3f_prototype`.

## Manual Check Needed

- Confirm debris moves fast enough to read as a collapse burst.
- Confirm debris fades quickly and disappears at about `0.8s`.
- Confirm repeated kills do not leave visible debris clutter.

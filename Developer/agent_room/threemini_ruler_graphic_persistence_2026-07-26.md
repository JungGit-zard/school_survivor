# threemini 30cm ruler persistence routing trail — 2026-07-26

## Scope

- Profile: `threemini` graphics visibility/motion review.
- Read-only. No code, Firebase, Graphics Studio, or browser state changed.

## Finding

- `SchoolBagSwing` returns ruler JSX whenever `weapons.schoolBag.active` is true (`SchoolBag.jsx:153-166`).
- In waiting and swing-end branches, it resets `bagSwingState` only (`:76-88`); it does not hide `visualRef`/`bagArcRef`. The trail starts at opacity zero and is updated only during swing (`:115-120`), so trail invisibility does not hide the ruler model.
- Result: the last ruler pose remains mounted and visible after a swing or while the active weapon is waiting.

## Visual contract

- Ruler model visibility is exactly `weaponActive && swing.active`; inactive weapon, cooldown/waiting, and elapsed swing-end state are hidden with no model or trail residue.
- At swing start, set the outer root to current player position/facing and the arc to the defined `t=0` swing pose before setting it visible. Do not expose the prior swing's position or rotation for one frame.
- During the active interval, retain existing pose math. At end/cancel, hide the outer visual group and set trail opacity to zero; model geometry/materials need not be recreated.
- Preserve `ThirtyCmRulerModel` scale, toon/outline materials, and inner `StudioTunedGroup itemId="weapon-ruler"`. Visibility belongs on the runtime outer visual group, not on Studio transforms.

## Manual observation points

1. With weapon active but no nearby enemy, no ruler appears anywhere.
2. At swing end, ruler and cyan trail disappear in the same frame; no frozen ruler remains.
3. Re-trigger after cooldown: first displayed frame is at the player's current position and the initial swing pose, without a stale world pose flash.
4. Deactivate during a swing: no remaining model/trail; reactivation preserves existing Studio scale, color, outline, and placement tuning.

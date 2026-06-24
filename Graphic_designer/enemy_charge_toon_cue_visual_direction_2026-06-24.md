# Enemy charge 3D/toon cue visual direction

Date: 2026-06-24
Tasks: `t_0c51a730`, `t_2ac3d69d`
Role: Three_Mini / graphics direction

## Visual decision

The enemy charge warning no longer uses the previous flat HTML `go!` speech bubble. It is now an in-world 3D/toon warning symbol that sits above E05/B01 while the enemy is preparing to charge.

The visual language is intentionally simple and readable:

- yellow toon exclamation mark = immediate danger/readiness,
- red dot = urgency accent,
- orange side chevrons = forward charge/action cue,
- dark outline = consistent cartoon silhouette readability.

## Readability target

The cue is meant to supplement, not replace, the floor `ChargeWarningLine` VFX. The floor line still communicates direction and lane danger; the overhead cue communicates that the charger has entered the warning state.

Checked readability targets:

- E05 warn state: cue is visible above the smaller red charger without covering the monster body.
- B01 warn state: cue is visible above the boss and remains inside the Graphics Studio preview after height adjustment.

## Policy alignment

- This cue is not a player or monster substitute.
- It does not use a 2D sprite, image plane, or HTML overlay.
- It uses Three.js mesh geometry with toon/outline materials, matching the required cartoon 3D direction.
- It is not a normal-play debug proxy marker because it appears only during the charger warning state.

## Follow-up watch item

If future gameplay capture shows the overhead symbol is too busy together with the floor charge line, the first polish step should be scale/height/opacity tuning, not a return to HTML or sprite text.

## Recheck for `t_2ac3d69d`

Graphics Studio was reopened at `http://127.0.0.1:5197/graphics-studio`, `Zombie E05` was set to Motion `warn`, and the result still matched this direction: no HTML speech bubble or `go!` text, with a small outlined yellow/orange 3D toon marker above the enemy head. Browser console reported `total_errors=0`.

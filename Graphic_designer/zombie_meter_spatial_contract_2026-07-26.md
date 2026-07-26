# Zombie meter spatial contract for Pencil — 2026-07-26

`1zm` is a fixed gameplay space unit: `0.75 world units`. It is calibrated to the current E01 green zombie's approximately `0.7467` world-unit spawn/obstacle footprint diameter, not to a mutable mesh edge, texture, outline, or Studio transform.

Pencil fire eligibility is an invisible circle centered on the player: diameter `6zm = 4.5 world units`, radius `3zm = 2.25 world units`. It uses enemy center distance and includes the exact boundary. This adds no circle, decal, HUD, or other visual asset.

If an E01 model or collider changes later, `1zm` and Pencil's 2.25 radius remain fixed. Recalibrating the meter requires a separate explicit gameplay decision; visual edits must not alter it indirectly. Firebase and Graphics Studio values are outside this contract.

Visual acceptance: an E01 center just inside the invisible boundary enables fire, just outside does not, and no new range graphic is visible in gameplay or Studio.

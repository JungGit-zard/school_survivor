# Box Cutter Stab-Slash Effect Implementation

## Direction

- Followed `boxcutter_all_angle_stab_slash_effect_proposal_2026-05-27.md`.
- Avoided the removed large triangular trail.
- Used a facing-local effect so the attack reads correctly in every player direction.

## Visual Components

- Center thrust line
  - A thin bright forward line that extends along the current attack direction.
  - Communicates the stabbing motion first.
- Symmetric side cut lines
  - Two short angled lines near the blade tip.
  - Communicate the follow-up slicing motion without implying a one-sided direction.
- Tip flash
  - A small bright octahedron pulse at the end of the thrust.
  - Makes the contact point easier to read.

## Style Notes

- The effect uses short additive light marks rather than a large solid trail.
- The marks are intentionally narrow so the weapon still reads as a cutter knife, not a wide sword slash.

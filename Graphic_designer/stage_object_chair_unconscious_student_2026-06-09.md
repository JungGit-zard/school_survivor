# Stage Object Graphic Asset Record - Chair and Unconscious Student

## Request

- Add classroom chair and unconscious student objects using the supplied reference images.
- Store them in the same reusable graphic asset area as the existing classroom desk object.

## Asset Location

- `Developer/r3f_prototype/src/components/StageObjects/ClassroomChair.jsx`
- `Developer/r3f_prototype/src/components/StageObjects/UnconsciousStudent.jsx`

## Visual Direction

- Classroom chair:
  - Low-poly 3D object.
  - Wood seat/back, gray metal frame, black rubber feet.
  - Toon material plus outline, matching the existing classroom desk object.
  - Variants: `upright`, `abandoned`, `tilted`, `overturned`.

- Unconscious student:
  - Blocky low-poly student in school uniform.
  - Lying pose with X eyes and simple facial detail.
  - Navy uniform, gray pants, black shoes, red tie, small badge.
  - Toon material plus outline.
  - Variants: `faceUp`, `sideLeft`, `sideRight`.

## Placement Note

- Stage 1 placement was later added in `stageObjectPlacements.js`.
- Chairs are used as tilted, abandoned, and overturned clutter around the outer classroom zones.
- Unconscious students are placed in southwest and southeast outer zones with different lying variants.
- Stage 2 placement is unchanged.

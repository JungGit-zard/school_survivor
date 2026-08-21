# Classroom Prop Black Blob Visual Audit

Date: 2026-06-09

## Visual Problem

The chair and desk shapes were acceptable, but large black slabs appeared around them in the classroom scene. The user-visible symptom was not a clean toon outline. It looked like dark floor blobs around the props.

## Confirmed Sources

Two rendering paths could create the black blob:

- Real-time prop shadows: StageObject body meshes cast shadows onto `ClassroomFloor`, which receives shadows from the main directional light.
- Oversized/flipped outline geometry: the global `inflateScale()` helper turns thin prop dimensions into negative outline scales, for example `0.03 -> -0.94`.

## Visual Decision

Classroom props are background readability objects. They should keep a small toon outline, but they should not cast heavy floor shadows. The correct visual direction is:

- Disable shadow casting/receiving on classroom prop mesh pieces.
- Use a StageObject-specific outline scale helper that adds a small fixed padding instead of using the global inverted-hull scale formula.
- Keep toon materials and dark outlines, but prevent the outline from becoming a large black surface.

## Remaining Visual Checks

- Refresh the running game on port `5178`.
- In Stage 1, check desk/chair clusters near the starting view and side clusters.
- Confirm the player local shadow is not mistaken for a static prop blob.
- Confirm Stage 2 desks still read as placed props, even without prop shadows.

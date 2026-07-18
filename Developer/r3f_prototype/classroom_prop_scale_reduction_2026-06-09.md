# Classroom Prop Scale Reduction

Date: 2026-06-09

## Implementation

Updated `src/components/StageObjects/stageObjectPlacements.js` so classroom desks and chairs render at 80 percent of their previous placement scale.

Unconscious student scales were intentionally left unchanged.

## Test Coverage

Updated `src/components/StageObjects/stageObjectPlacements.test.js` with a compact prop scale regression check:

- Desk/chair max scale is capped at `0.832`.
- Desk/chair min scale remains at least `0.672`.
- Stage 1 unconscious student scales remain `[0.88, 0.82]`.

## Verification

- `npm test -- src/components/StageObjects/stageObjectAssets.test.jsx src/components/StageObjects/stageObjectPlacements.test.js --pool=threads`
- `npm run build`

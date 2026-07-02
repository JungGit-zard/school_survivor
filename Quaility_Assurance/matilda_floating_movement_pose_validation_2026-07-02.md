# Matilda Floating Movement Pose Validation - 2026-07-02

## Verified

- Added a failing-first test for the movement pose contract.
  - RED: `npm test -- src/components/MatildaMesh.test.js` failed because `MATILDA_MOVEMENT_POSE` did not exist.
- Implemented the pose.
- Added a failing-first correction for idle vs movement separation.
  - RED: `npm test -- src/components/MatildaMesh.test.js` failed because idle/default pose constants were missing.
- Added a failing-first runtime path check.
  - RED: `npm test -- src/components/ZombieMesh.test.js` failed because `ZombieMesh` still rendered Matilda without `movementPose`.
- GREEN: `npm test -- src/components/MatildaMesh.test.js src/components/ZombieMesh.test.js`
  - Result: 2 files passed, 13 tests passed.
- `npm run build`
  - Result: build passed.
  - Existing large chunk warning remains.
- Graphics Studio browser check with Playwright:
  - URL: `http://127.0.0.1:5173/graphics-studio`
  - Selected item: `Matilda`
  - Console/page errors: 0
  - Checked front and side canvas screenshots during the run; temporary image files were removed after inspection.

## Not Verified

- Live in-game chase capture was not run in this pass.

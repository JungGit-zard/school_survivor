---
module: r3f_prototype
tags: [qa, collision, stage-objects, classroom-props]
problem_type: validation
---

# Stage Object Blocking Colliders Validation

## Scope

Validate that classroom desks and chairs now provide blocking physics for the player and zombies while preserving existing stage object placement rules.

## Automated Checks

- `npm test -- src/components/StageObjects/stageObjectColliders.test.js --pool=threads`
  - Result: passed, 3 tests.
- `npm test -- src/components/StageObjects/stageObjectColliders.test.js src/components/StageObjects/stageObjectPlacements.test.js src/components/StageObjects/stageObjectAssets.test.jsx --pool=threads`
  - Result: passed, 3 files and 18 tests.

## Acceptance Notes

- Every `classroomDesk` and `classroomChair` placement in Stage 1 and Stage 2 gets at least one blocking collider part.
- Collider height overlaps the player and minimum zombie collider height so both are stopped by the fixed prop colliders.
- `unconsciousStudent` remains non-blocking.

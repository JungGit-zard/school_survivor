# Matilda Floating Movement Pose Implementation - 2026-07-02

## Scope

- Adjusted `MatildaMesh` so its default idle pose reads as a small hover above the ground.
- Idle keeps the body bobbing up and down without the forward chase lean.
- Movement pose remains separate: the upper body and head lean forward, and the boots trail backward.
- `ZombieMesh` enables the movement pose for runtime Matilda except while stunned.

## Files

- `Developer/r3f_prototype/src/components/MatildaMesh.jsx`
- `Developer/r3f_prototype/src/components/MatildaMesh.test.js`
- `Developer/r3f_prototype/src/components/ZombieMesh.jsx`
- `Developer/r3f_prototype/src/components/ZombieMesh.test.js`

## Notes

- No enemy stats, collider, damage, spawn timing, or Matilda chase logic changed.
- The pose remains 3D toon/outline based and keeps the existing face texture slot.

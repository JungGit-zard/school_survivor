# Box Cutter Trail and Umbrella Scale Tuning - 2026-05-26

## Request

- Make the box cutter afterimage end in a sharp triangular point.
- Enlarge the box cutter afterimage so it reads more clearly, similar to the 30 cm ruler effect.
- Reduce the umbrella guard visual size to two thirds.

## Implementation

- Updated `Developer/r3f_prototype/src/components/Weapons/BoxCutter.jsx`.
  - Replaced the rectangular trail plane with a triangular `ShapeGeometry`.
  - Increased visual trail width and length.
  - Increased trail opacity and used additive blending for stronger readability.
- Updated `Developer/r3f_prototype/src/components/Weapons/UmbrellaGuard.jsx`.
  - Reduced `UmbrellaModel` group scale from `0.78` to `0.52`, which is two thirds of the previous visual size.

## Balance Note

- Box cutter hit detection values were not changed.
- Umbrella damage radius was not changed.
- This update changes visual readability and scale only.


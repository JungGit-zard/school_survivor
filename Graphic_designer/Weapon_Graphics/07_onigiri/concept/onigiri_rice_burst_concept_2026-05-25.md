# Onigiri Rice Burst Concept - 2026-05-25

## Direction

The onigiri impact should read as food-themed feedback, not a generic white debug circle. The replacement effect uses small white rice grains that scatter outward and upward, similar in rhythm to the zombie death collapse effect but lighter and shorter.

## Visual Rules

- Use warm white rice grains with subtle toon shading.
- Do not use dark grain outlines or black smoke-like supporting shapes.
- Spread grains radially with varied speed, lift, size, delay, and spin.
- Keep the effect short and reserve it for the final onigiri disappearance after all bounces are spent.

## Implementation Reference

- `src/components/Weapons/Onigiri.jsx`
- `src/lib/onigiri.js`

The effect uses three.js meshes rather than a flat image or 2D sprite, matching the project direction for toon 3D gameplay visuals.

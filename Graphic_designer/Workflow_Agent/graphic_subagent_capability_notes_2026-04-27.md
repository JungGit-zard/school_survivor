# Graphic Subagent Capability Notes - 2026-04-27

## Updated Capability Scope

- The graphic designer subagent must handle cartoon/toon rendering direction and implementation.
- The subagent must be able to design and implement prototype-friendly 3D models with Three.js or React Three Fiber geometry.
- The subagent must be able to design and implement 3D animations for readable gameplay states such as idle, walk, attack, hit reaction, death, pickup float, projectile arc, and effect timing.
- Toon rendering should prioritize MeshToonMaterial or equivalent toon shader methods, controlled lighting, readable silhouettes, and clean outline meshes.
- 3D visuals must stay separate from gameplay hitboxes and must not become the source of collision truth.

## Files Updated

- `Graphic_designer/subagents/graphic-designer.toml`
- `.codex/agents/graphic-designer.toml`

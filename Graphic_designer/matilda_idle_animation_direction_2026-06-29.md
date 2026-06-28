# Matilda Idle Animation Direction - 2026-06-29

## Scope

- Matilda's default idle pose should read as floating, not standing.
- The whole 3D toon model keeps a slight forward lean so the upper body feels watchful and predatory.

## Implementation Note

- `MatildaMesh` owns the idle motion because the same mesh is used by Graphics Studio preview and runtime enemy rendering.
- Motion is intentionally minimal: vertical bob, fixed forward X lean, and tiny side sway.

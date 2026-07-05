# In-game Shadow Visibility

Date: 2026-07-05

## Change

- Added a batched ground-shadow `InstancedMesh` to `ZombieInstanceLayer`.
- Standard in-game zombies now render a small depth-tested oval shadow under their feet.
- Kept the existing player ground shadow path unchanged.

## Reason

The main gameplay zombie path uses instanced meshes for performance, so standard zombies did not have their own visible floor shadow even though the floor could receive shadows.

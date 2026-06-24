# Graphics Studio In-Game Parity Verification

Date: 2026-06-23
Scope: Graphics Studio preview parity against actual in-game graphics implementation

Status update: This was the pre-fix verification record. The parity gaps listed here were addressed later on 2026-06-23 by sharing the in-game visual components with Graphics Studio. See `graphics_studio_ingame_parity_postfix_validation_2026-06-23.md` for the post-fix result.

## Conclusion

Graphics Studio is not a complete 1:1 mirror of the final in-game rendered state.

Core character and prop models reuse real in-game visual components, but several entries are studio wrappers or representative previews. Therefore, the studio is reliable for editing many shared visual assets, but not yet reliable as proof that every item appears exactly the same as it does during gameplay.

## Confirmed Shared Components

- Player preview uses `PlayerMesh.jsx`, the same mesh used by `Player.jsx`.
- Zombie previews use `ZombieMesh.jsx`, the same mesh used by `Enemy.jsx`.
- Stage object previews use the real classroom desk, chair, and unconscious student components.
- Pickup previews use real `GoldCoin.jsx`, `XpTextbook.jsx`, `XpOrb.jsx`, and `LunchItems.jsx` visual components.
- Title scene preview uses `TitleScene3D.jsx`, the same component used by the title screen.
- Enemy death collapse and mini health bar previews use their real components.

## Confirmed Differences

- Player preview excludes the real `Player.jsx` runtime wrapper, physics body, movement rotation, control state, and normal health bar placement.
- Zombie preview excludes the full `Enemy.jsx` runtime wrapper, enemy stat scale, physics body, health bar, speech bubble, and projectile spawning state.
- Pickup previews use studio-only scale/rotation wrappers so small pickup models are easier to inspect.
- Floor preview renders `ClassroomFloor.jsx` only. The in-game floor also includes stage object placement, colliders, and boundaries through `Floor.jsx`.
- Weapon entries are icon previews. They show actual weapon icon assets, not full in-game weapon runtime visuals.
- VFX previews are representative recreations in `GraphicsStudioPreview.jsx`, not direct renders of private `VFXLayer.jsx` effect components.
- Enemy projectile preview is a representative studio model, not the private `EnemyProjectile` component inside `Enemy.jsx`.
- Studio tuning can override material color, opacity, outline, saturation, and emissive intensity inside the studio preview before those values are applied to game code.

## Verification Evidence

- Static source comparison:
  - `GraphicsStudioPreview.jsx`
  - `graphicsStudioConfig.js`
  - `Player.jsx`
  - `Enemy.jsx`
  - `Floor.jsx`
  - `Game.jsx`
  - `TitleScreen.jsx`
  - `VFXLayer.jsx`
- Fresh targeted test run:
  - Command: `npx.cmd vitest run src/lib/graphicsStudioConfig.test.js src/components/GraphicsStudio.test.jsx src/components/TitleScene3D.test.jsx --maxWorkers=1 --no-file-parallelism`
  - Result: 3 test files passed, 9 tests passed

## Recommendation

If exact 1:1 parity is required, refactor private visual pieces such as VFX and enemy projectile visuals into exported shared visual-only components, then make both the game runtime and Graphics Studio render those same components. For runtime actors, add a studio harness that can mount the same visual wrapper scale and placement used by `Player.jsx`, `Enemy.jsx`, and `Floor.jsx`.

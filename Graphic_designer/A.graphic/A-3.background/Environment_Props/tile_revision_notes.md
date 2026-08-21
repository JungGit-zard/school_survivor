# Tile Revision Notes

## Reason

The previous green rectangles and green circular puddles were visually ambiguous. They looked like placeholder UI shapes rather than school or infection graphics.

## Decision

Remove the unclear green shapes and mixed floor styles from the prototype background pass. The floor system is now one unified school interior tile.

## Active Tile

- `tile_school_interior_floor`: bright wood classroom floor tile based on the user's reference image, with no road-like markings and no repeated wall strip

## Implementation Notes

- Tile texture is generated in `Developer/school_survivor_prototype/src/game.js`.
- Source reference SVG file is stored in `Graphic_designer/tile_assets/`.
- Player and monsters remain Three.js toon-rendered.
- Background, props, and floor tiles remain Phaser 2D pixel graphics.

# Design Implementation Document

## Purpose

This document defines how Escape! zombie school should implement readable mobile 2D pixel-art floor graphics.

The goal is not to make the floor visually loud. The goal is to make the school setting readable while keeping the player, monsters, projectiles, drops, and hazards easy to see.

## Research Summary

Common mobile 2D and top-down pixel games usually build floors with a tilemap system:

- A small base tile is repeated across the map.
- A few subtle variation tiles are mixed in to avoid visible repetition.
- Props, walls, doors, signs, and furniture carry most of the place identity.
- The floor stays quieter than characters, enemies, bullets, UI, and pickups.
- Tile edges must repeat cleanly so the player does not see obvious seams.

Useful reference concepts:

- 16 px or 32 px tile logic is common for top-down pixel games.
- A stage should not mix several unrelated floor styles unless the map has clearly separated rooms.
- Large repeated stripes or markings can accidentally look like roads, tracks, or lanes.
- Indoor school floors should avoid road-like white/yellow guide lines.

## Current Decision

Use one unified bright wood classroom floor for the current prototype.

Active texture key:

- `tile_school_interior_floor`

Active source asset:

- `Graphic_designer/graphic_asset/tile_assets/tile_school_interior_floor.svg`

Implementation file:

- `Developer/school_survivor_prototype/src/game.js`

Current implementation:

- The repeated floor tile contains only wood planks, plank seams, and subtle highlight pixels.
- Green wall strips, borders, doors, blackboards, and other school identity elements must be placed as props or edge objects.
- This prevents the floor from looking like a repeated wall/road pattern.

## Floor Rules

- Use one primary floor style per stage area.
- The current school interior floor must look like bright classroom wood.
- Do not mix wood, checker, road, track, and concrete tiles in the same visible area.
- Do not use road-like lane markings on school interior floors.
- Do not use unclear green rectangles or circles as background details.
- Floor texture must be readable but lower priority than gameplay objects.
- Furniture and landmark props should communicate "school" more strongly than the floor itself.

## Recommended Tile Structure

For the prototype:

- 80-90% base bright wood tile.
- 10-20% subtle wood variation only if needed later.
- No hard borders inside the repeat tile unless they tile seamlessly.
- Wall strips, classroom boundaries, doors, and blackboards should be separate props or edge objects, not repeated inside every floor tile.

## Visual Priority

Highest priority:

- Player
- Monsters
- Projectiles
- XP/heal drops
- Danger warnings
- Level-up choices

Middle priority:

- Desks
- Lockers
- Blackboard
- Doors
- Notice board
- Barricades

Lowest priority:

- Floor grain
- Small dust pixels
- Tile seams
- Minor paper clutter

## Practical Implementation Notes

- Keep the floor generated or loaded as a repeated tile.
- Keep furniture and school identity objects on a separate prop layer.
- Use dark outlines on props so they remain readable over bright wood.
- Use small, low-contrast floor highlights to prevent the floor from becoming noisy.
- If a new room type is added later, create a visually separated area before changing floor style.

## References Used

- MDN Tilemaps overview: https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps
- Top Down Tile Set Design Guide: https://www.flooringclarity.com/tile-set-design-2d-games/
- Sandro Maglione pixel art tileset guide: https://www.sandromaglione.com/articles/how-to-create-a-pixel-art-tileset-complete-guide
- Cainos tile palette documentation: https://docs.cainos.net/pixel-art-top-down-village/tile-palette

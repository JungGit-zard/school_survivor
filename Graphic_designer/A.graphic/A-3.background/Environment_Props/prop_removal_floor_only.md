# Prop Removal - Floor Only Pass

Date: 2026-04-24

## Request

Keep the floor tile graphics and remove all non-floor prop graphics from the current game view.

## Changed File

- `Developer/school_survivor_prototype/src/game.js`

## Result

- Kept `tile_school_interior_floor` background tiling.
- Kept floor guide overlays from `drawSchoolFloorGuides()`.
- Removed runtime placement of detail props:
  - exam papers
  - window shadows
  - warning signs
- Removed runtime placement of obstacle and landmark props:
  - blackboard
  - notice board
  - desk clusters
  - lockers
  - school door
  - barricades
  - fallen desks
  - chair piles
- Cleared runtime obstacle population by leaving `this.obstacles = []`.

## Validation

- `node --check Developer/school_survivor_prototype/src/game.js`
- Runtime image placement search now finds only `tile_school_interior_floor`.
- Local server responded with HTTP 200 at `http://127.0.0.1:4173/`.

## Note

Generated prop texture definitions still exist in `createGeneratedTextures()` for future reuse, but they are no longer placed in the active game scene.

import { describe, expect, it } from 'vitest'
import { FLOOR_TILE, STAGE_FLOOR_TILES, STAGE2_CORRIDOR_END } from './ClassroomFloor.jsx'

describe('ClassroomFloor tiling', () => {
  it('uses the stage01 tile asset as the repeating floor pattern', () => {
    expect(typeof FLOOR_TILE.src).toBe('string')
    expect(FLOOR_TILE.src.length).toBeGreaterThan(0)
    expect(FLOOR_TILE.src).toMatch(/tile_stage01/)
  })

  it('uses a dedicated corridor tile and end-wall asset for Stage 2', () => {
    expect(STAGE_FLOOR_TILES.stage1.src).toMatch(/tile_stage01/)
    expect(STAGE_FLOOR_TILES.stage2.src).toMatch(/tile_stage02_corridor/)
    expect(STAGE_FLOOR_TILES.stage2.repeat).toBe(70)
    expect(STAGE2_CORRIDOR_END.src).toMatch(/stage02_corridor_end_wall/)
    expect(STAGE2_CORRIDOR_END.displayWidth).toBeCloseTo(STAGE2_CORRIDOR_END.width * 2 / 5)
    expect(STAGE2_CORRIDOR_END.displayHeight).toBeCloseTo(STAGE2_CORRIDOR_END.height * 2 / 5)
    expect(STAGE2_CORRIDOR_END.repeatX).toBe(5)
    expect(STAGE2_CORRIDOR_END.positionZ + STAGE2_CORRIDOR_END.displayHeight / 2)
      .toBeCloseTo(STAGE2_CORRIDOR_END.bottomZ)
    expect(STAGE2_CORRIDOR_END.positionZ).toBeLessThan(-40)
  })

  it('keeps a consistent plank size regardless of floor size (tile world size ~4-10)', () => {
    const tileWorldSize = FLOOR_TILE.floorSize / FLOOR_TILE.repeat
    expect(tileWorldSize).toBeGreaterThan(4)
    expect(tileWorldSize).toBeLessThan(10)
  })

  it('extends well beyond the playable map (±48) so the floor never runs out under the follow camera', () => {
    // floor must cover the play area plus the camera view margin on every side
    expect(FLOOR_TILE.floorSize).toBeGreaterThanOrEqual(160)
  })
})

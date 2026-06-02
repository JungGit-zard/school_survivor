import { describe, expect, it } from 'vitest'
import { FLOOR_TILE } from './ClassroomFloor.jsx'

describe('ClassroomFloor tiling', () => {
  it('uses the stage01 tile asset as the repeating floor pattern', () => {
    expect(typeof FLOOR_TILE.src).toBe('string')
    expect(FLOOR_TILE.src.length).toBeGreaterThan(0)
    expect(FLOOR_TILE.src).toMatch(/tile_stage01/)
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

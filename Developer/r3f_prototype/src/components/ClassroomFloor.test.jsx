import { describe, expect, it } from 'vitest'
import { FLOOR_TILE } from './ClassroomFloor.jsx'

describe('ClassroomFloor tiling', () => {
  it('uses the stage01 tile asset as the repeating floor pattern', () => {
    expect(typeof FLOOR_TILE.src).toBe('string')
    expect(FLOOR_TILE.src.length).toBeGreaterThan(0)
    expect(FLOOR_TILE.src).toMatch(/tile_stage01/)
  })

  it('repeats the tile enough times to read as a plank floor in the game camera', () => {
    expect(FLOOR_TILE.repeat).toBeGreaterThanOrEqual(4)
    expect(FLOOR_TILE.repeat).toBeLessThanOrEqual(16)
  })

  it('covers the full playable map area (±48 units)', () => {
    expect(FLOOR_TILE.floorSize).toBeGreaterThanOrEqual(96)
  })
})

import { describe, expect, it } from 'vitest'
import { getPlayerMovementBounds, clampPlayerPosition } from './playerMovementBounds.js'
import { STAGE2_CORRIDOR_WALL } from './stage2CorridorWall.js'

describe('player movement bounds', () => {
  it('keeps Stage 1 movement symmetric inside the map inset', () => {
    expect(getPlayerMovementBounds('stage1')).toMatchObject({
      minX: -12,
      maxX: 12,
      minZ: -50,
      maxZ: 50,
    })
  })

  it('keeps the visible player body below the Stage 2 corridor wall bottom edge', () => {
    const bounds = getPlayerMovementBounds('stage2')

    expect(bounds.minZ).toBeCloseTo(
      STAGE2_CORRIDOR_WALL.bottomZ + STAGE2_CORRIDOR_WALL.playerVisualStopInsetZ,
    )
    expect(bounds.minZ).toBeGreaterThan(STAGE2_CORRIDOR_WALL.bottomZ)
    expect(bounds.minZ).toBeGreaterThan(-44)
  })

  it('prevents the player from entering the Stage 2 end-wall image', () => {
    expect(clampPlayerPosition('stage2', { x: 0, z: -99 })).toMatchObject({
      x: 0,
      z: STAGE2_CORRIDOR_WALL.bottomZ + STAGE2_CORRIDOR_WALL.playerVisualStopInsetZ,
    })
  })
})

import { describe, expect, it } from 'vitest'
import {
  PLAYER_INSET_X,
  PLAYER_INSET_Z,
  getPlayerMovementBounds,
  clampPlayerPosition,
} from './playerMovementBounds.js'
import { getStageBounds } from './stageConfig.js'
import { STAGE2_CORRIDOR_WALL } from './stage2CorridorWall.js'

describe('player movement bounds', () => {
  it('keeps Stage 1 movement symmetric inside the map inset', () => {
    const { halfX, halfZ } = getStageBounds('stage1')

    expect(getPlayerMovementBounds('stage1')).toMatchObject({
      minX: -halfX + PLAYER_INSET_X,
      maxX: halfX - PLAYER_INSET_X,
      minZ: -halfZ + PLAYER_INSET_Z,
      maxZ: halfZ - PLAYER_INSET_Z,
    })
  })

  it('keeps Stage 2 movement inside the corridor map and before the end wall', () => {
    const bounds = getPlayerMovementBounds('stage2')
    const { halfZ } = getStageBounds('stage2')

    expect(bounds.minZ).toBeCloseTo(-halfZ + PLAYER_INSET_Z)
    expect(bounds.minZ).toBeGreaterThan(STAGE2_CORRIDOR_WALL.bottomZ)
  })

  it('prevents the player from entering the Stage 2 end-wall image', () => {
    const { halfZ } = getStageBounds('stage2')

    expect(clampPlayerPosition('stage2', { x: 0, z: -99 })).toMatchObject({
      x: 0,
      z: -halfZ + PLAYER_INSET_Z,
    })
  })
})

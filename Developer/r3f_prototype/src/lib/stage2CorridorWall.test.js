import { describe, expect, it } from 'vitest'
import { getStage2CorridorWallDisplay, STAGE2_CORRIDOR_WALL } from './stage2CorridorWall.js'

describe('Stage 2 corridor wall display', () => {
  it('renders the end-wall image at twice the previous one-fifth display size', () => {
    const display = getStage2CorridorWallDisplay()

    expect(display.scale).toBe(2 / 5)
    expect(display.displayWidth).toBeCloseTo(STAGE2_CORRIDOR_WALL.width * 2 / 5)
    expect(display.displayHeight).toBeCloseTo(STAGE2_CORRIDOR_WALL.height * 2 / 5)
  })

  it('keeps the bottom edge fixed as the gameplay wall line', () => {
    const display = getStage2CorridorWallDisplay()

    expect(display.positionZ + display.displayHeight / 2).toBeCloseTo(STAGE2_CORRIDOR_WALL.bottomZ)
    expect(display.playerStopZ).toBeGreaterThan(display.bottomZ)
  })
})

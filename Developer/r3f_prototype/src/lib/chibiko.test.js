import { describe, expect, it } from 'vitest'
import {
  CHIBIKO_LEVEL1_PENCIL,
  createChibikoAttackConfig,
  createChibikoTrail,
  getChibikoTrailTarget,
  recordChibikoTrailPoint,
} from './chibiko.js'

describe('chibiko companion helpers', () => {
  it('follows a delayed point from the exact player movement trail, not an offset around the player', () => {
    const trail = createChibikoTrail()
    recordChibikoTrailPoint(trail, { x: 0, y: 0, z: 0 }, 0)
    recordChibikoTrailPoint(trail, { x: 2, y: 0, z: 0 }, 100)
    recordChibikoTrailPoint(trail, { x: 4, y: 0, z: 0 }, 200)
    recordChibikoTrailPoint(trail, { x: 4, y: 0, z: 2 }, 300)

    const target = getChibikoTrailTarget(trail, 300, { followDelayMs: 100 })

    expect(target.x).toBeCloseTo(4)
    expect(target.y).toBe(0)
    expect(target.z).toBeCloseTo(0)
  })

  it('uses followDistance as distance along the recorded trail instead of a center-axis offset', () => {
    const trail = createChibikoTrail()
    recordChibikoTrailPoint(trail, { x: 0, y: 0, z: 0 }, 0)
    recordChibikoTrailPoint(trail, { x: 2, y: 0, z: 0 }, 100)
    recordChibikoTrailPoint(trail, { x: 4, y: 0, z: 0 }, 200)
    recordChibikoTrailPoint(trail, { x: 4, y: 0, z: 2 }, 300)

    const target = getChibikoTrailTarget(trail, 300, { followDistance: 2 })

    expect(target.x).toBeCloseTo(4)
    expect(target.y).toBe(0)
    expect(target.z).toBeCloseTo(0)
  })

  it('uses the level 1 pencil throw as Chibiko attack config', () => {
    const attack = createChibikoAttackConfig({
      damage: 7,
      cooldown: 900,
      range: 18,
      speed: 10,
    })

    expect(attack).toEqual({
      ...CHIBIKO_LEVEL1_PENCIL,
      damage: 7,
      cooldown: 900,
      range: 18,
      speed: 10,
    })
  })
})

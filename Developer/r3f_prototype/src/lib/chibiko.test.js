import { describe, expect, it } from 'vitest'
import {
  CHIBIKO_LEVEL1_PENCIL,
  createChibikoAttackConfig,
  getChibikoFollowTarget,
} from './chibiko.js'

describe('chibiko companion helpers', () => {
  it('places Chibiko behind and slightly beside the player', () => {
    const target = getChibikoFollowTarget(
      { x: 4, y: 0, z: 3 },
      { x: 0, z: 1 },
      { followDistance: 0.72, sideOffset: -0.28 },
    )

    expect(target.x).toBeCloseTo(3.72)
    expect(target.y).toBe(0)
    expect(target.z).toBeCloseTo(2.28)
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

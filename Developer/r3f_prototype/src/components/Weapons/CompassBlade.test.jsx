import { describe, expect, it } from 'vitest'
import {
  COMPASS_BLADE_EXPLOSION_DAMAGE_MULTIPLIER,
  COMPASS_BLADE_ONE_TILE_RADIUS,
  COMPASS_BLADE_STACKS_TO_EXPLODE,
  getCompassBladeOrbitPose,
  resolveCompassBladeHitStack,
} from '../../lib/compassBlade.js'

describe('CompassBladeWeapon orbit pose', () => {
  it('computes one shared world pose for the collider and visual blade', () => {
    const pose = getCompassBladeOrbitPose({
      elapsedSec: 0,
      index: 0,
      count: 1,
      radius: 1.15,
      orbitSpeed: 3.4,
      player: { x: 10, y: 0.2, z: -4 },
    })

    expect(pose.position).toEqual({ x: 10, y: 0.36, z: -2.85 })
    expect(pose.rotation).toEqual({ x: 0, y: Math.PI / 2, z: 0 })
  })

  it('spreads multiple blades evenly around the player', () => {
    const pose = getCompassBladeOrbitPose({
      elapsedSec: 0,
      index: 1,
      count: 3,
      radius: 1.2,
      orbitSpeed: 3.4,
      player: { x: 0, y: 0, z: 0 },
    })

    expect(pose.position.x).toBeCloseTo(Math.sin((Math.PI * 2) / 3) * 1.2, 5)
    expect(pose.position.y).toBe(0.16)
    expect(pose.position.z).toBeCloseTo(Math.cos((Math.PI * 2) / 3) * 1.2, 5)
  })

  it('builds one stack on each rotating contact hit before the explosion threshold', () => {
    const result = resolveCompassBladeHitStack({
      currentStack: 3,
      hitDamage: 8,
    })

    expect(result).toEqual({
      stack: 4,
      exploded: false,
      explosionDamage: 0,
      explosionRadius: COMPASS_BLADE_ONE_TILE_RADIUS,
    })
  })

  it('explodes on the tenth contact hit for five times the rotating hit damage in a one-tile radius', () => {
    const hitDamage = 8
    const result = resolveCompassBladeHitStack({
      currentStack: COMPASS_BLADE_STACKS_TO_EXPLODE - 1,
      hitDamage,
    })

    expect(result).toEqual({
      stack: 0,
      exploded: true,
      explosionDamage: hitDamage * COMPASS_BLADE_EXPLOSION_DAMAGE_MULTIPLIER,
      explosionRadius: COMPASS_BLADE_ONE_TILE_RADIUS,
    })
  })
})

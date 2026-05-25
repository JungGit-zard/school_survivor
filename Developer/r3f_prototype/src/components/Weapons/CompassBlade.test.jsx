import { describe, expect, it } from 'vitest'
import { getCompassBladeOrbitPose } from '../../lib/compassBlade.js'

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
})

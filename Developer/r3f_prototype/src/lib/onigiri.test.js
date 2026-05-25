import { describe, expect, it } from 'vitest'
import { createRiceBurstGrains, pickNextOnigiriTarget, shouldShowRiceBurst } from './onigiri.js'

function rb(x, z, alive = true) {
  return {
    _enemyHit: alive ? () => {} : null,
    _enemyDead: !alive,
    translation: () => ({ x, y: 0, z }),
  }
}

describe('onigiri targeting', () => {
  it('retargets to the nearest living enemy when the current target is gone', () => {
    const enemies = new Map([
      ['dead-original', rb(0, 0, false)],
      ['far', rb(7, 0)],
      ['near', rb(2, 0)],
    ])

    const next = pickNextOnigiriTarget({
      enemyBodies: enemies,
      from: { x: 0, z: 0 },
      hitSet: new Set(['dead-original']),
      range: 8,
    })

    expect(next.enemyId).toBe('near')
  })

  it('creates deterministic scattered rice grains instead of a flat circle flash', () => {
    const grains = createRiceBurstGrains({ id: 3, x: 1, z: -2, count: 14, radius: 1.1 })

    expect(grains).toHaveLength(14)
    expect(grains[0]).toMatchObject({ key: '3-0', x: 1, z: -2 })
    expect(grains.every((grain) => grain.speed > 0 && grain.lift > 0)).toBe(true)
    expect(new Set(grains.map((grain) => grain.angle.toFixed(3))).size).toBeGreaterThan(8)
  })

  it('uses bounces as cushions, then bursts on the next enemy contact', () => {
    expect(shouldShowRiceBurst(1)).toBe(false)
    expect(shouldShowRiceBurst(0)).toBe(false)
    expect(shouldShowRiceBurst(-1)).toBe(true)
  })
})

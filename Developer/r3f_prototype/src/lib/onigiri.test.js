import { describe, expect, it } from 'vitest'
import { createOnigiriBurstGrains, pickNextOnigiriTarget } from './onigiri.js'

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

  it('returns null when no unhit living enemy remains so the projectile can expire immediately', () => {
    const enemies = new Map([
      ['already-hit', rb(1, 0)],
      ['dead', rb(2, 0, false)],
    ])

    const next = pickNextOnigiriTarget({
      enemyBodies: enemies,
      from: { x: 0, z: 0 },
      hitSet: new Set(['already-hit']),
      range: 8,
    })

    expect(next).toBeNull()
  })

  it('creates short scattered rice grains for the instant disappearance burst', () => {
    const grains = createOnigiriBurstGrains({ id: 5, x: 1, z: -2, count: 12 })

    expect(grains).toHaveLength(12)
    expect(grains[0]).toMatchObject({ key: '5-0', x: 1, z: -2 })
    expect(grains.every((grain) => grain.speed > 0 && grain.lift > 0 && grain.size > 0)).toBe(true)
    expect(Math.max(...grains.map((grain) => grain.delayMs))).toBeLessThan(24)
    expect(new Set(grains.map((grain) => grain.angle.toFixed(3))).size).toBeGreaterThan(8)
  })
})

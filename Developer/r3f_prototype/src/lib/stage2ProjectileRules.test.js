import { describe, expect, it } from 'vitest'
import { canE04FireProjectile, getStage2E04Cap } from './stage2ProjectileRules.js'

describe('stage 2 E04 projectile rules', () => {
  it('blocks E04 before the 90 second introduction window', () => {
    expect(canE04FireProjectile({
      elapsedSec: 89.9,
      ageMs: 2000,
      activeProjectileCount: 0,
      distanceToPlayer: 5,
      lastFireElapsedMs: 0,
      nowMs: 3000,
    })).toBe(false)
  })

  it('requires spawn age and cooldown before the first shot', () => {
    expect(canE04FireProjectile({
      elapsedSec: 91,
      ageMs: 899,
      activeProjectileCount: 0,
      distanceToPlayer: 5,
      lastFireElapsedMs: 0,
      nowMs: 3000,
    })).toBe(false)

    expect(canE04FireProjectile({
      elapsedSec: 91,
      ageMs: 901,
      activeProjectileCount: 0,
      distanceToPlayer: 5,
      lastFireElapsedMs: 0,
      nowMs: 3000,
    })).toBe(true)
  })

  it('honors global projectile, close-range, and boss pressure gates', () => {
    const base = {
      elapsedSec: 190,
      ageMs: 2000,
      activeProjectileCount: 0,
      distanceToPlayer: 5,
      lastFireElapsedMs: 0,
      nowMs: 3000,
    }

    expect(canE04FireProjectile({ ...base, activeProjectileCount: 6 })).toBe(false)
    expect(canE04FireProjectile({ ...base, distanceToPlayer: 2.9 })).toBe(false)
    expect(canE04FireProjectile({ ...base, bossPressure: true })).toBe(false)
  })

  it('raises E04 cap over the stage timeline', () => {
    expect(getStage2E04Cap(100)).toBe(2)
    expect(getStage2E04Cap(150)).toBe(3)
    expect(getStage2E04Cap(240)).toBe(3)
    expect(getStage2E04Cap(280)).toBe(4)
  })
})

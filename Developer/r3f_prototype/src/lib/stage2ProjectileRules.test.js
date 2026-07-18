import { describe, expect, it } from 'vitest'
import { canE04FireProjectile, getStage2E04Cap, getE04Cap } from './stage2ProjectileRules.js'

describe('stage 2 E04 projectile rules', () => {
  it('blocks E04 before the 72 second introduction window', () => {
    expect(canE04FireProjectile({
      elapsedSec: 71.9,
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
    expect(getStage2E04Cap(80)).toBe(1)
    expect(getStage2E04Cap(120)).toBe(2)
    expect(getStage2E04Cap(200)).toBe(2)
    expect(getStage2E04Cap(220)).toBe(2)
  })

  it('getE04Cap: stage2는 기존 상한을 위임(불변), stage3는 조기·다구간용으로 상향', () => {
    // stage2 위임 — getStage2E04Cap와 동일.
    expect(getE04Cap(80, 'stage2')).toBe(1)
    expect(getE04Cap(120, 'stage2')).toBe(2)
    expect(getE04Cap(80)).toBe(1)  // 기본 stageId=stage2
    // stage3 — 132s 전 2기, 이후 3기.
    expect(getE04Cap(50, 'stage3')).toBe(2)
    expect(getE04Cap(131, 'stage3')).toBe(2)
    expect(getE04Cap(132, 'stage3')).toBe(3)
    expect(getE04Cap(220, 'stage3')).toBe(3)
  })
})

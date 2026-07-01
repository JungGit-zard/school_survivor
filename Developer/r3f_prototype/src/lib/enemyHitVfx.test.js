import { describe, expect, it } from 'vitest'
import {
  COMMON_ENEMY_HIT_KNOCKBACK,
  COMMON_ENEMY_HIT_SPARK,
  createEnemyHitSparkEvent,
  resolveEnemyHitKnockback,
} from './enemyHitVfx.js'

describe('common enemy hit VFX', () => {
  it('uses a very small short-lived hit spark for every enemy hit', () => {
    expect(COMMON_ENEMY_HIT_SPARK).toMatchObject({
      type: 'hitSpark',
      life: 180,
      baseScale: 0.16,
      growScale: 0.22,
    })
  })

  it('creates a positioned hit spark event without changing gameplay data', () => {
    expect(createEnemyHitSparkEvent({ x: 1.5, y: 0.6, z: -2 })).toMatchObject({
      type: 'hitSpark',
      x: 1.5,
      y: 0.6,
      z: -2,
      baseScale: 0.16,
      growScale: 0.22,
    })
  })

  it('applies a slight pushback on ordinary hits with no explicit knockback', () => {
    expect(COMMON_ENEMY_HIT_KNOCKBACK.speed).toBeGreaterThan(0)
    expect(COMMON_ENEMY_HIT_KNOCKBACK.durationMs).toBeGreaterThan(0)
    expect(resolveEnemyHitKnockback()).toMatchObject({
      speed: COMMON_ENEMY_HIT_KNOCKBACK.speed,
      durationMs: COMMON_ENEMY_HIT_KNOCKBACK.durationMs,
      source: undefined,
    })
  })

  it('preserves stronger weapon-specific knockback values', () => {
    const source = { x: 2, z: -1 }

    expect(resolveEnemyHitKnockback({ knockback: 4.8, knockbackMs: 180, source })).toMatchObject({
      speed: 4.8,
      durationMs: 180,
      source,
    })
  })

  it('keeps E02 purple zombies from sliding backward even when a weapon requests knockback', () => {
    expect(resolveEnemyHitKnockback({ knockback: 4.8, knockbackMs: 180 }, { type: 'E02' })).toMatchObject({
      speed: 0,
      durationMs: 0,
    })
  })
})

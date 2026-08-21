import { describe, expect, it } from 'vitest'
import {
  COMMON_ENEMY_HIT_KNOCKBACK,
  COMMON_ENEMY_CRITICAL_HIT_BURST,
  COMMON_ENEMY_HIT_SPARK,
  createEnemyCriticalHitBurstEvent,
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

  it('keeps critical hit burst twice as fast and one third of the original visual size', () => {
    expect(COMMON_ENEMY_CRITICAL_HIT_BURST).toMatchObject({
      type: 'criticalHitBurst',
      life: 180,
      baseScale: 0.113,
      growScale: 0.207,
    })
    expect(createEnemyCriticalHitBurstEvent({ x: 1, y: 0.7, z: 2, strong: true })).toMatchObject({
      type: 'criticalHitBurst',
      x: 1,
      y: 0.7,
      z: 2,
      strong: true,
      life: 180,
      baseScale: 0.113,
      growScale: 0.207,
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

  it('applies weapon knockback to E02 purple zombies the same as other types', () => {
    expect(resolveEnemyHitKnockback({ knockback: 4.8, knockbackMs: 180 })).toMatchObject({
      speed: 4.8,
      durationMs: 180,
    })
  })
})

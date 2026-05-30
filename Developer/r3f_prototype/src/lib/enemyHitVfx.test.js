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

  it('adds a small default knockback to enemy hits that do not provide one', () => {
    expect(COMMON_ENEMY_HIT_KNOCKBACK).toMatchObject({ speed: 0.85, durationMs: 70 })
    expect(resolveEnemyHitKnockback()).toMatchObject({
      speed: 0.85,
      durationMs: 70,
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
})

import { describe, expect, it } from 'vitest'
import {
  TRIANGLE_RULER_DAMAGE_RATIO,
  TRIANGLE_RULER_KNOCKBACK_IMPULSE,
  TRIANGLE_RULER_RANGE,
  TRIANGLE_RULER_SWING_RADIANS,
  canUseTriangleRulerUltimate,
  getTriangleRulerDamage,
  getTriangleRulerKnockbackImpulse,
  isInTriangleRulerRange,
} from './bossTriangleRuler.js'

describe('Stage 1 B01 triangle ruler ultimate', () => {
  it('belongs only to the Stage 1 B01 boss', () => {
    expect(canUseTriangleRulerUltimate('B01', 'stage1')).toBe(true)
    expect(canUseTriangleRulerUltimate('B01', 'stage3')).toBe(false)
    expect(canUseTriangleRulerUltimate('B02', 'stage1')).toBe(false)
    expect(canUseTriangleRulerUltimate('E05', 'stage1')).toBe(false)
  })

  it('always removes 30% of the player current HP', () => {
    expect(TRIANGLE_RULER_DAMAGE_RATIO).toBe(0.3)
    expect(getTriangleRulerDamage(100)).toBe(30)
    expect(getTriangleRulerDamage(70)).toBe(21)
    expect(getTriangleRulerDamage(0)).toBe(0)
  })

  it('uses a readable close-range sweep around the boss', () => {
    const boss = { x: 2, z: 3 }

    expect(TRIANGLE_RULER_RANGE).toBeGreaterThan(2)
    expect(TRIANGLE_RULER_SWING_RADIANS).toBe(Math.PI * 2)
    expect(isInTriangleRulerRange(boss, { x: 2 + TRIANGLE_RULER_RANGE, z: 3 })).toBe(true)
    expect(isInTriangleRulerRange(boss, { x: 2 + TRIANGLE_RULER_RANGE + 0.01, z: 3 })).toBe(false)
  })

  it('pushes nearby zombies directly away from the boss', () => {
    const impulse = getTriangleRulerKnockbackImpulse(
      { x: 1, z: 1 },
      { x: 4, z: 5 },
    )

    expect(Math.hypot(impulse.x, impulse.z)).toBeCloseTo(TRIANGLE_RULER_KNOCKBACK_IMPULSE)
    expect(impulse.x).toBeGreaterThan(0)
    expect(impulse.z).toBeGreaterThan(0)
  })

  it('never sends non-finite values into Rapier', () => {
    expect(getTriangleRulerKnockbackImpulse(
      { x: Number.NaN, z: 1 },
      { x: 4, z: 5 },
    )).toEqual({ x: 0, y: 0, z: 0 })
  })
})

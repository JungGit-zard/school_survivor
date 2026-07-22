import { describe, expect, it, vi } from 'vitest'
import {
  MATH_TEACHER_PLAYER_DAMAGE_RATIO,
  MATH_TEACHER_SWING_KNOCKBACK_MS,
  MATH_TEACHER_SWING_KNOCKBACK_SPEED,
  MATH_TEACHER_SWING_RADIUS,
  applyMathTeacherSwing,
  getMathTeacherPlayerDamage,
} from './mathTeacherSpecial.js'

describe('stage 1 math teacher special', () => {
  it('limits the set-square impact to the visual reach plus a minimal contact tolerance', () => {
    expect(MATH_TEACHER_SWING_RADIUS).toBe(1.05)
  })

  it('deals exactly 30 percent of the player current HP', () => {
    expect(MATH_TEACHER_PLAYER_DAMAGE_RATIO).toBe(0.3)
    expect(getMathTeacherPlayerDamage(100)).toBe(30)
    expect(getMathTeacherPlayerDamage(40)).toBe(12)
    expect(getMathTeacherPlayerDamage(0)).toBe(0)
  })

  it('physically pushes living nearby zombies away from the boss once', () => {
    const nearHit = vi.fn()
    const outsideHit = vi.fn()
    const deadHit = vi.fn()
    const bossHit = vi.fn()
    const bodies = new Map([
      ['boss', fakeBody(0, 0, bossHit)],
      ['near', fakeBody(0.9, 0.4, nearHit)],
      ['outside', fakeBody(MATH_TEACHER_SWING_RADIUS + 0.1, 0, outsideHit)],
      ['dead', fakeBody(0.5, 0, deadHit, true)],
    ])

    const pushed = applyMathTeacherSwing({
      bodies,
      bossId: 'boss',
      origin: { x: 0, z: 0 },
    })

    expect(pushed).toBe(1)
    expect(nearHit).toHaveBeenCalledOnce()
    expect(nearHit).toHaveBeenCalledWith(0, {
      knockback: MATH_TEACHER_SWING_KNOCKBACK_SPEED,
      knockbackMs: MATH_TEACHER_SWING_KNOCKBACK_MS,
      source: { x: 0, z: 0 },
      ignoreSightBlock: true,
    })
    expect(bossHit).not.toHaveBeenCalled()
    expect(outsideHit).not.toHaveBeenCalled()
    expect(deadHit).not.toHaveBeenCalled()
  })
})

function fakeBody(x, z, hit, dead = false) {
  return {
    _enemyDead: dead,
    translation: () => ({ x, y: 0, z }),
    _enemyHit: hit,
  }
}

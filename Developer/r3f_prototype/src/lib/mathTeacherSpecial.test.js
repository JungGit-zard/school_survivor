import { describe, expect, it, vi } from 'vitest'
import {
  MATH_TEACHER_PLAYER_DAMAGE_RATIO,
  MATH_TEACHER_SWING_ARC_DEG,
  MATH_TEACHER_SWING_ARC_HALF_RAD,
  MATH_TEACHER_SWING_KNOCKBACK_MS,
  MATH_TEACHER_SWING_KNOCKBACK_SPEED,
  MATH_TEACHER_SWING_RADIUS,
  MATH_TEACHER_SWING_RECOVERY_MS,
  MATH_TEACHER_SWING_WINDUP_MS,
  applyMathTeacherSwing,
  getMathTeacherPlayerDamage,
  isInMathTeacherSwingArc,
} from './mathTeacherSpecial.js'

// yaw = 0 → 정면은 +Z. 거리 r, 정면에서 시계/반시계 deg만큼 벌어진 지점.
function atAngle(deg, r = 1) {
  const rad = deg * (Math.PI / 180)
  return { targetX: Math.sin(rad) * r, targetZ: Math.cos(rad) * r }
}

function arcHit(deg, r = 1) {
  return isInMathTeacherSwingArc({ yaw: 0, originX: 0, originZ: 0, ...atAngle(deg, r) })
}

describe('stage 1 math teacher special', () => {
  it('extends the set-square impact exactly 1.5 times to 1.575 world units', () => {
    expect(MATH_TEACHER_SWING_RADIUS).toBe(1.575)
  })

  it('deals exactly 30 percent of the player current HP', () => {
    expect(MATH_TEACHER_PLAYER_DAMAGE_RATIO).toBe(0.3)
    expect(getMathTeacherPlayerDamage(100)).toBe(30)
    expect(getMathTeacherPlayerDamage(40)).toBe(12)
    expect(getMathTeacherPlayerDamage(0)).toBe(0)
  })

  it('keeps the existing windup and recovery timings unchanged', () => {
    expect(MATH_TEACHER_SWING_WINDUP_MS).toBe(320)
    expect(MATH_TEACHER_SWING_RECOVERY_MS).toBe(430)
  })

  it('swings only across the 140 degree forward arc, leaving the back safe', () => {
    expect(MATH_TEACHER_SWING_ARC_DEG).toBe(140)
    expect(MATH_TEACHER_SWING_ARC_HALF_RAD).toBeCloseTo(70 * (Math.PI / 180), 12)

    expect(arcHit(0)).toBe(true)
    expect(arcHit(69)).toBe(true)
    expect(arcHit(-69)).toBe(true)
    expect(arcHit(71)).toBe(false)
    expect(arcHit(-71)).toBe(false)
    // 등 뒤 정반대는 무조건 안전.
    expect(arcHit(180)).toBe(false)
  })

  it('still requires the radius even inside the arc', () => {
    expect(arcHit(0, MATH_TEACHER_SWING_RADIUS)).toBe(true)
    expect(arcHit(0, MATH_TEACHER_SWING_RADIUS + 0.0001)).toBe(false)
    // 보스와 사실상 겹친 대상은 방향이 정의되지 않으므로 부채꼴 안으로 본다.
    expect(isInMathTeacherSwingArc({ yaw: 0, originX: 3, originZ: -2, targetX: 3, targetZ: -2 })).toBe(true)
  })

  it('rotates the arc with the boss yaw instead of the world axes', () => {
    // yaw = PI/2 → 정면이 +X로 돌아간다.
    const args = { yaw: Math.PI / 2, originX: 0, originZ: 0, targetZ: 0 }
    expect(isInMathTeacherSwingArc({ ...args, targetX: 1 })).toBe(true)
    expect(isInMathTeacherSwingArc({ ...args, targetX: -1 })).toBe(false)
  })

  it('physically pushes living nearby zombies away from the boss once', () => {
    const nearHit = vi.fn()
    const outsideHit = vi.fn()
    const deadHit = vi.fn()
    const bossHit = vi.fn()
    const behindHit = vi.fn()
    const bodies = new Map([
      ['boss', fakeBody(0, 0, bossHit)],
      ['near', fakeBody(1.575, 0, nearHit)],
      ['outside', fakeBody(1.5751, 0, outsideHit)],
      ['dead', fakeBody(0.5, 0, deadHit, true)],
      // 반경 안이지만 보스 등 뒤 — 밀치기도 플레이어 피해와 같은 부채꼴을 공유한다.
      ['behind', fakeBody(-1.0, 0, behindHit)],
    ])

    const pushed = applyMathTeacherSwing({
      bodies,
      bossId: 'boss',
      origin: { x: 0, z: 0 },
      yaw: Math.PI / 2,
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
    expect(behindHit).not.toHaveBeenCalled()
  })
})

function fakeBody(x, z, hit, dead = false) {
  return {
    _enemyDead: dead,
    translation: () => ({ x, y: 0, z }),
    _enemyHit: hit,
  }
}

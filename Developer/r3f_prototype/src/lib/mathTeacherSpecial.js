export const MATH_TEACHER_PLAYER_DAMAGE_RATIO = 0.3
// B01 렌더 배율에서 삼각자 최외곽은 중심 약 0.9 units까지다.
// 플레이어 충돌 반경(0.192u)을 감안한 1.05u만 허용해, 그래픽에 거의 닿아야 판정한다.
export const MATH_TEACHER_SWING_RADIUS = 1.05
export const MATH_TEACHER_SWING_WINDUP_MS = 320
export const MATH_TEACHER_SWING_RECOVERY_MS = 430
export const MATH_TEACHER_SWING_KNOCKBACK_SPEED = 4.8
export const MATH_TEACHER_SWING_KNOCKBACK_MS = 420

export function getMathTeacherPlayerDamage(currentHp) {
  return Math.max(0, currentHp) * MATH_TEACHER_PLAYER_DAMAGE_RATIO
}

export function applyMathTeacherSwing({
  bodies,
  bossId,
  origin,
  radius = MATH_TEACHER_SWING_RADIUS,
}) {
  let pushed = 0

  bodies.forEach((body, enemyId) => {
    if (enemyId === bossId || body?._enemyDead) return
    if (typeof body?.translation !== 'function' || typeof body?._enemyHit !== 'function') return

    const position = body.translation()
    const dx = position.x - origin.x
    const dz = position.z - origin.z
    if (Math.hypot(dx, dz) > radius) return

    const source = Math.hypot(dx, dz) > 0.001
      ? { x: origin.x, z: origin.z }
      : { x: origin.x - 1, z: origin.z }

    body._enemyHit(0, {
      knockback: MATH_TEACHER_SWING_KNOCKBACK_SPEED,
      knockbackMs: MATH_TEACHER_SWING_KNOCKBACK_MS,
      source,
      ignoreSightBlock: true,
    })
    pushed += 1
  })

  return pushed
}

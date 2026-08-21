import { isEnemyHitLive } from './weaponCollision.js'

export const MATH_TEACHER_PLAYER_DAMAGE_RATIO = 0.3
// B01 삼각자 공격 판정 반경: 기존 1.05 world units의 정확히 1.5배.
// 플레이어 피해와 주변 좀비 밀치기가 이 단일 반경을 공유한다.
export const MATH_TEACHER_SWING_RADIUS = 1.575
export const MATH_TEACHER_SWING_WINDUP_MS = 320
export const MATH_TEACHER_SWING_RECOVERY_MS = 430
export const MATH_TEACHER_SWING_KNOCKBACK_SPEED = 4.8
export const MATH_TEACHER_SWING_KNOCKBACK_MS = 420
// B01 삼각자 스윙은 돌진했던 전방 부채꼴 140도만 때린다(정면 기준 좌우 ±70도).
// 등 뒤 220도는 안전지대 — 플레이어가 뒤로 돌아 들어가면 맞지 않고 공략할 수 있다.
export const MATH_TEACHER_SWING_ARC_DEG = 140
export const MATH_TEACHER_SWING_ARC_HALF_RAD = (MATH_TEACHER_SWING_ARC_DEG / 2) * (Math.PI / 180)

export function getMathTeacherPlayerDamage(currentHp) {
  return Math.max(0, currentHp) * MATH_TEACHER_PLAYER_DAMAGE_RATIO
}

// 반경 + 전방 부채꼴을 한 자리에서 판정하는 단일 정본.
// 플레이어 피해 판정과 주변 좀비 밀치기가 반드시 이 함수를 공유한다 — 판정식을 두 벌 만들지 않는다.
// yaw는 _applyRotation(Enemy.jsx)의 atan2(x, z) 규약을 따르므로 정면 벡터는 (sin yaw, cos yaw)다.
export function isInMathTeacherSwingArc({
  yaw = 0,
  originX,
  originZ,
  targetX,
  targetZ,
  radius = MATH_TEACHER_SWING_RADIUS,
  halfAngleRad = MATH_TEACHER_SWING_ARC_HALF_RAD,
}) {
  const dx = targetX - originX
  const dz = targetZ - originZ
  const distSq = dx * dx + dz * dz
  if (distSq > radius * radius) return false
  // 원점과 대상이 사실상 같은 지점이면 방향이 정의되지 않는다. 밀치기 코드가 이미 쓰던
  // 같은 임계(0.001)를 재사용해 "보스에 파묻힌 대상"은 부채꼴 안으로 본다 —
  // 수치 노이즈로 등 뒤 판정이 나서 몸이 겹쳤는데 빠져나가는 일을 막는다.
  if (distSq <= 0.001 * 0.001) return true
  // acos 없이 코사인 비교: dot >= cos(halfAngle) * |d|.
  // halfAngle이 90도를 넘어 cos가 음수여도 부등식 그대로 성립한다.
  const dot = dx * Math.sin(yaw) + dz * Math.cos(yaw)
  return dot >= Math.cos(halfAngleRad) * Math.sqrt(distSq)
}

export function applyMathTeacherSwing({
  bodies,
  bossId,
  origin,
  yaw = 0,
  radius = MATH_TEACHER_SWING_RADIUS,
  halfAngleRad = MATH_TEACHER_SWING_ARC_HALF_RAD,
}) {
  let pushed = 0

  bodies.forEach((body, enemyId) => {
    if (enemyId === bossId || !isEnemyHitLive(body)) return
    if (typeof body?.translation !== 'function' || typeof body?._enemyHit !== 'function') return

    const position = body.translation()
    const dx = position.x - origin.x
    const dz = position.z - origin.z
    if (!isInMathTeacherSwingArc({
      yaw,
      originX: origin.x,
      originZ: origin.z,
      targetX: position.x,
      targetZ: position.z,
      radius,
      halfAngleRad,
    })) return

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

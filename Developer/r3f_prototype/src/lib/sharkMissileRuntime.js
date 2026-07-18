export const SHARK_MISSILE_START_HEIGHT = 0.46
const TWO_PI = Math.PI * 2

// ── dart 비행 기획 정본 ────────────────────────────────────────────────
// 발사 직후 "어디로 갈지 모르는" 느낌으로 화면 안을 랜덤 지그재그 방랑하다
// 마지막 구간에 밀집지역 근방으로 귀소해 폭발한다. 총 비행 시간 1.5초 고정.
// 비행 속도는 절반(18→9). 귀소는 잔여 0.45s × 속도 9 = 4.05유닛만 커버하므로
// 밀집점이 멀면 다 못 닿고, 1.5s 만료 시 그 위치(밀집지역 근방)에서 폭발한다.
// 이는 헛폭발이 아니라 "밀집지역이 아닐 수도 있다"는 의도된 사양(사용자 요구).
export const SHARK_DART = {
  DURATION_SEC: 1.5,        // 총 비행 시간 → 폭발 (기획 고정값)
  HOMING_START_SEC: 1.05,   // 이 시점부터 밀집점 귀소 (잔여 0.45s × 속도 9 = 4.05유닛 커버)
  SPEED: 9,
  WANDER_RETARGET_MS: 350,  // 방랑 웨이포인트 갱신 주기
  WANDER_ARRIVE_DIST: 0.6,  // 웨이포인트 도착 → 즉시 새 지점 (제자리 선회 방지)
  HOMING_HIT_DIST: 0.4,     // 밀집점 도착 → 즉시 폭발 (궤도 비행 방지)
  TURN_RATE_WANDER: 10,
  TURN_RATE_HOMING: 22,
}

export function isSharkHomingPhase(ageSec, homingStartMultiplier = 1) {
  const safeMultiplier = Number.isFinite(homingStartMultiplier) && homingStartMultiplier > 0
    ? homingStartMultiplier
    : 1
  return ageSec >= SHARK_DART.HOMING_START_SEC * safeMultiplier
}

// 화면 경계 안 랜덤 방랑 지점 (여백 1유닛)
export function pickSharkWanderPoint(bounds, random = Math.random) {
  const m = 1
  return {
    x: bounds.minX + m + random() * Math.max(0, bounds.maxX - bounds.minX - 2 * m),
    z: bounds.minZ + m + random() * Math.max(0, bounds.maxZ - bounds.minZ - 2 * m),
  }
}

export function shortestAngleDelta(fromAngle, toAngle) {
  let diff = toAngle - fromAngle
  while (diff > Math.PI) diff -= TWO_PI
  while (diff < -Math.PI) diff += TWO_PI
  return diff
}

export function canFireSharkMissile({ phase, weapon, nowMs, lastFireMs, activeMissileCount }) {
  if (phase !== 'playing') return false
  if (!weapon?.active) return false
  if ((activeMissileCount ?? 0) > 0) return false

  if (lastFireMs == null || !Number.isFinite(lastFireMs)) return true

  const cooldown = Number(weapon.cooldown ?? 0)
  return nowMs - lastFireMs >= cooldown
}

export function createSharkMissileLaunch({ id, playerPosition, target, weapon }) {
  const radius = weapon.radius ?? 1.8
  const range = weapon.range ?? 28

  return {
    id,
    start: [
      playerPosition.x,
      playerPosition.y + SHARK_MISSILE_START_HEIGHT,
      playerPosition.z,
    ],
    initialTarget: { x: target.x, z: target.z },
    damage: weapon.damage ?? 20.8,
    radius,
    range,
    speed: weapon.speed ?? 8.5,
    retargetIntervalMs: weapon.retargetIntervalMs ?? 300,
    homingStartMultiplier: weapon.permanentHomingStartMultiplier ?? 1,
  }
}

// 2026-08-23 사용자 지시로 필살기를 전면 개정했다.
//   (1) 왕복 달리기 속도 = 평소 이동속도의 정확히 10배,
//   (2) 접촉 피해 = 플레이어가 "그 순간 가진" 체력의 30%(고정 수치 아님).
// 속도는 상수 duration으로 못박지 않는다 — 레인 길이 ÷ (기본속도 × 10)로 역산해야
// 맵 halfX가 바뀌어도 화면상 달리는 속도가 사양 그대로 유지된다.
// 배수 10은 같은 날 추가 지시("왕복이 너무 길다")로 확정된 최종 사양이다.
export const B03_SHUTTLE_SPEED_MULTIPLIER = 10
// ENEMY_STATS를 여기서 import하면 Enemy.jsx ↔ 이 모듈이 순환 참조가 된다.
// 호출부(Enemy.jsx)가 stats.speed를 넘기는 것이 정본이고, 이 값은 그때의 폴백일 뿐이다.
export const B03_SHUTTLE_BASE_SPEED = 0.5225
// B01 삼각자(mathTeacherSpecial.js)와 같은 형태의 비율 피해.
export const B03_SHUTTLE_PLAYER_DAMAGE_RATIO = 0.3
export const B03_SHUTTLE_TELEGRAPH_MS = 1_250
export const B03_SHUTTLE_STUN_MS = 1_200
export const B03_SHUTTLE_LANE_WIDTH = 1.2

export function getB03ShuttleRunPlayerDamage(currentHp) {
  return Math.max(0, currentHp) * B03_SHUTTLE_PLAYER_DAMAGE_RATIO
}

// 편도 1회 소요시간(ms) = 레인 길이 / (기본 이동속도 × 10).
// 길이 0(미시전 idle 상태의 기본값)일 때 advance의 나눗셈이 터지지 않도록 하한 1ms를 둔다.
export function getB03ShuttleRunPassDurationMs(startX, endX, baseSpeed = B03_SHUTTLE_BASE_SPEED) {
  const distance = Math.abs(endX - startX)
  const speed = Math.max(0.0001, baseSpeed * B03_SHUTTLE_SPEED_MULTIPLIER)
  return Math.max(1, (distance / speed) * 1000)
}

export function createB03ShuttleRunState({
  phase = 'idle', laneZ = 0, startX = 0, endX = 0,
  baseSpeed = B03_SHUTTLE_BASE_SPEED,
  triggeredSixtyFive = false, triggeredThirty = false,
} = {}) {
  return {
    phase, elapsedMs: 0, passIndex: -1, laneZ, startX, endX,
    passDurationMs: getB03ShuttleRunPassDurationMs(startX, endX, baseSpeed),
    hitPasses: [false, false], triggeredSixtyFive, triggeredThirty,
  }
}

// HP 임계에 닿으면 경과 시간과 무관하게 반드시 발현한다(2026-08-23 사용자 지시).
export function getB03ShuttleRunTrigger({ hpRatio = 1, chargeState = 'idle', state } = {}) {
  if (!state || state.phase !== 'idle' || chargeState !== 'chase') return null
  if (hpRatio <= 0.65 && !state.triggeredSixtyFive) return 'sixtyFive'
  if (hpRatio <= 0.30 && !state.triggeredThirty) return 'thirty'
  return null
}

export function startB03ShuttleRun(state, trigger, { laneZ, startX, endX, baseSpeed = B03_SHUTTLE_BASE_SPEED }) {
  if (!state || (trigger !== 'sixtyFive' && trigger !== 'thirty')) return state
  return {
    ...state, phase: 'telegraph', elapsedMs: 0, passIndex: -1, laneZ, startX, endX,
    passDurationMs: getB03ShuttleRunPassDurationMs(startX, endX, baseSpeed),
    hitPasses: [false, false],
    triggeredSixtyFive: state.triggeredSixtyFive || trigger === 'sixtyFive',
    triggeredThirty: state.triggeredThirty || trigger === 'thirty',
  }
}

export function advanceB03ShuttleRun(state, deltaMs = 0) {
  if (!state || state.phase === 'idle') return state
  const elapsedMs = state.elapsedMs + Math.max(0, deltaMs)
  if (state.phase === 'telegraph') {
    if (elapsedMs < B03_SHUTTLE_TELEGRAPH_MS) return { ...state, elapsedMs }
    return { ...state, phase: 'active', elapsedMs: elapsedMs - B03_SHUTTLE_TELEGRAPH_MS, passIndex: 0 }
  }
  if (state.phase === 'active') {
    const passIndex = Math.floor(elapsedMs / state.passDurationMs)
    if (passIndex < 2) return { ...state, elapsedMs, passIndex }
    return { ...state, phase: 'stun', elapsedMs: elapsedMs - state.passDurationMs * 2, passIndex: -1 }
  }
  if (state.phase === 'stun') {
    if (elapsedMs < B03_SHUTTLE_STUN_MS) return { ...state, elapsedMs }
    return { ...state, phase: 'idle', elapsedMs: 0, passIndex: -1, hitPasses: [false, false] }
  }
  return state
}

export function getB03ShuttleRunX(state) {
  if (state?.phase !== 'active') return state?.startX ?? 0
  const localProgress = Math.min(1, (state.elapsedMs % state.passDurationMs) / state.passDurationMs)
  return state.passIndex === 0
    ? state.startX + (state.endX - state.startX) * localProgress
    : state.endX + (state.startX - state.endX) * localProgress
}

export function getB03ShuttleRunLaneZ(playerZ, halfZ) {
  const inset = B03_SHUTTLE_LANE_WIDTH / 2 + 0.4
  return Math.max(-halfZ + inset, Math.min(halfZ - inset, playerZ))
}

export function consumeB03ShuttleRunPassHit(state, playerZ, playerX, bossX) {
  const passIndex = state?.passIndex
  if (state?.phase !== 'active' || passIndex < 0 || passIndex > 1 || state.hitPasses[passIndex]
    || Math.abs(playerZ - state.laneZ) >= B03_SHUTTLE_LANE_WIDTH / 2
    || !Number.isFinite(playerX) || !Number.isFinite(bossX) || Math.abs(playerX - bossX) >= 0.7) return { state, hit: false }
  const hitPasses = [...state.hitPasses]
  hitPasses[passIndex] = true
  // 수치가 아니라 "맞았는가"만 낸다 — 실제 피해는 비율이라 호출부가 그 순간 플레이어 HP로 계산한다.
  return { state: { ...state, hitPasses }, hit: true }
}

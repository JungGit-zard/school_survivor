// 2026-08-23 사용자 지시로 필살기를 전면 개정했다.
//   (1) 왕복 달리기 속도 = 평소 이동속도의 정확히 3배,
//   (2) 접촉 피해 = 플레이어가 "그 순간 가진" 체력의 30%(고정 수치 아님).
// 속도는 상수 duration으로 못박지 않는다 — 레인 길이 ÷ (기본속도 × 3)으로 역산해야
// 맵 halfX가 바뀌어도 화면상 달리는 속도가 사양 그대로 유지된다.
// 배수 3은 2026-08-29 사용자 재지시로 확정된 최종 사양이다. 그 전의 10배는 출발점이
// 아레나 가장자리로 고정이던 시절, 왕복이 너무 길다는 이유로 올린 값이었다. 지금은
// 출발점이 보스의 현재 위치라 평균 편도가 짧아졌고, 사양도 "달리기"가 아니라
// "평소 걷는 애니메이션 그대로 3배 속도로 그 직선 위를 걷는다"로 바뀌었다.
export const B03_SHUTTLE_SPEED_MULTIPLIER = 3
// ENEMY_STATS를 여기서 import하면 Enemy.jsx ↔ 이 모듈이 순환 참조가 된다.
// 호출부(Enemy.jsx)가 stats.speed를 넘기는 것이 정본이고, 이 값은 그때의 폴백일 뿐이다.
export const B03_SHUTTLE_BASE_SPEED = 0.5225
// B01 삼각자(mathTeacherSpecial.js)와 같은 형태의 비율 피해.
export const B03_SHUTTLE_PLAYER_DAMAGE_RATIO = 0.3
export const B03_SHUTTLE_TELEGRAPH_MS = 1_250
export const B03_SHUTTLE_STUN_MS = 1_200
export const B03_SHUTTLE_LANE_WIDTH = 1.2
// 반환 지점을 벽에 딱 붙이지 않기 위한 여유. 레인 끝을 halfX에서 이만큼 안쪽으로 당긴다.
export const B03_SHUTTLE_LANE_EDGE_INSET = 0.9
// 예고선 깜빡임: 텔레그래프 1.25초 동안 밝기가 3번 오르내린다("바닥에 예상루트가 깜빡인후").
export const B03_SHUTTLE_TELEGRAPH_BLINKS = 3
export const B03_SHUTTLE_TELEGRAPH_BLINK_MIN = 0.25

export function getB03ShuttleRunPlayerDamage(currentHp) {
  return Math.max(0, currentHp) * B03_SHUTTLE_PLAYER_DAMAGE_RATIO
}

// 편도 1회 소요시간(ms) = 레인 길이 / (기본 이동속도 × 3).
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

export function getB03ShuttleRunLaneZ(laneZ, halfZ) {
  const inset = B03_SHUTTLE_LANE_WIDTH / 2 + 0.4
  return Math.max(-halfZ + inset, Math.min(halfZ - inset, laneZ))
}

// 출발점은 반드시 보스가 "지금 서 있는" X다. 예전에는 가까운 쪽 벽 좌표를 출발점으로 잡아서,
// 텔레그래프가 끝나는 첫 액티브 프레임에 보스가 최대 6.6유닛을 한 프레임에 순간이동했다
// (2026-08-29 사용자 보고: "완전히 엉뚱한 곳으로 보스가 날아가서"). 도착점만 반대편 끝이다.
// 편도 거리가 짧아지면 소요시간도 같이 줄지만 그게 정상이다 — 사양은 duration이 아니라 속도(×3)다.
export function getB03ShuttleRunLaneX(bossX, halfX, edgeInset = B03_SHUTTLE_LANE_EDGE_INSET) {
  const limit = Math.max(0, halfX - edgeInset)
  const safeBossX = Number.isFinite(bossX) ? bossX : 0
  const startX = Math.max(-limit, Math.min(limit, safeBossX))
  return { startX, endX: startX <= 0 ? limit : -limit }
}

// 필살기 발동 시 레인 전체를 보스 좌표 하나로 확정한다. 레인 Z를 플레이어 Z로 잡던
// 옛 호출부는 바닥 경고선과 실제 주행선이 어긋났다 — 보스는 _vel.z = 0으로 자기 Z를
// 달리는데 선만 플레이어 쪽에 그려졌고, 피격 판정은 레인 Z와 보스 X를 섞어 썼다.
export function getB03ShuttleRunLaneFromBoss(bossX, bossZ, halfX, halfZ) {
  const { startX, endX } = getB03ShuttleRunLaneX(bossX, halfX)
  return { laneZ: getB03ShuttleRunLaneZ(bossZ, halfZ), startX, endX }
}

// 예고선은 "자기가 왕복해서 달릴 코스"만 덮어야 한다. 예전에는 x=0 중심에 폭 halfX*2로
// 아레나 전폭을 칠해서, 보스가 중앙에서 발동하면(코스 0 → +6.6 → 0) 왼쪽 절반이 통째로
// 거짓 경고였다. 폭·중심은 실제 [startX, endX] 구간에서만 나온다.
// startX === endX(레인 길이 0)면 boxGeometry 폭이 0이 되므로 하한을 둔다.
export const B03_SHUTTLE_LANE_MIN_LENGTH = 0.1

export function getB03ShuttleRunLaneGeometry(startX, endX) {
  const safeStartX = Number.isFinite(startX) ? startX : 0
  const safeEndX = Number.isFinite(endX) ? endX : 0
  return {
    centerX: (safeStartX + safeEndX) / 2,
    length: Math.max(B03_SHUTTLE_LANE_MIN_LENGTH, Math.abs(safeEndX - safeStartX)),
  }
}

// 보스가 바라봐야 할 X 방향(+/-). 이걸 회전에 반영하지 않으면 걷기 애니메이션이 돌아도
// 몸은 정면을 유지한 채 옆으로 미끄러져 "달리는 느낌이 전혀 나지 않는" 이동이 된다.
export function getB03ShuttleRunFacingX(state) {
  if (!state || state.phase === 'idle' || state.phase === 'stun') return 0
  const outbound = state.endX - state.startX
  return state.phase === 'active' && state.passIndex === 1 ? -outbound : outbound
}

// 텔레그래프 경과 시간 → 예고선 불투명도 배수(1 = 원래 밝기, 0.25 = 가장 어두울 때).
// 리액트 state를 매 프레임 갱신하면 리렌더가 폭주하므로, 호출부(useFrame)가 이 값을
// 머티리얼 opacity에 직접 곱해 쓴다.
export function getB03ShuttleTelegraphBlinkFactor(elapsedMs) {
  const cycles = B03_SHUTTLE_TELEGRAPH_BLINKS * (Math.max(0, elapsedMs) / B03_SHUTTLE_TELEGRAPH_MS)
  const pulse = 0.5 + 0.5 * Math.cos(cycles * Math.PI * 2)
  return B03_SHUTTLE_TELEGRAPH_BLINK_MIN + (1 - B03_SHUTTLE_TELEGRAPH_BLINK_MIN) * pulse
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

// 2차 신규 좀비 wave 3 치프(E98 대식가 · E101 복사기 · E104 공굴리기 대장)의 그리기 값 정본. 2026-11-16, threemini.
//
// 행동·피해는 lib/novelZombie2Behavior.js(Level_Mini 소유)가 정하고, 이 모듈은 그 런타임 값을 읽기만 한다(쓰지 않는다).
// 렌더 레이어가 매 프레임 부르므로 객체를 새로 만들지 않는다(out 인자에 채운다). three·React 의존 없음.
//
//  - E104 공: 손에 든 공(단계 0 듦 · 1 겨눔)과 굴러가는/바닥의 공(2 구름 · 3 바닥)을 한 레이어(RollingBallLayer)가 같은 모양으로 그린다.
//    굴러가는 공의 중심 = behavior ballStateInto의 x·z(= 피해 판정 원의 중심), 반지름 = 판정 반지름 0.9u 그대로.
//  - E98 먹히는 잡몹: 흡입(대식가 상태 9, 0.4초) 동안 작아지며(→ 25%) 입 높이로 떠올라 빙글 돈다. 수평 위치는 시뮬레이션 그대로
//    (stepEaten이 입 자리 mouthX·Z로 끌고 간다).
//  - E101 복사본: 흰 종이색(원본 팔레트 대신). 복사기 스캔(모드 1)은 별도 포즈, 용지 걸림(상태 4)은 빨간 오류 깜박임.
import { E104_BALL, E104_CODE, E101_CODE, E98_CODE, E98_EATER, N2_STATE_ATTACK, N2_STATE_STUN } from './novelZombie2Behavior.js'
import { MINI_ZOMBIE_VISUALS } from './miniZombieRoster.js'

// ── E104 공 ──────────────────────────────────────────────────────────────────
const CAPTAIN_BALL_SPEC = MINI_ZOMBIE_VISUALS['n2-ball-roll-captain'].variants[0].loose.find((item) => item.prop === 'giantBall')
export const E104_BALL_VISUAL = Object.freeze({
  type: E104_CODE,
  radius: E104_BALL.ballRadius,             // 판정 반지름 그대로(지름 1.8u = 소품 worldSize)
  heldAhead: CAPTAIN_BALL_SPEC.offset[2],   // 든 공: 대장 앞 1.2u(표의 loose offset — 몸 레이어가 그리던 자리와 같다)
  aimShake: 0.05,                           // 겨눔(예고) 동안 좌우 떨림(u)
  aimShakeHz: 9,
  heldFollowRate: 18,                       // 든 공이 대장 자리로 따라붙는 속도(1/s) — 주운 순간 순간이동 대신 짧게 미끄러진다
  outlineWidth: 0.03,                       // 외곽선(월드 u)
  capacity: 4,
})

/**
 * 대장 index의 공 그리기 값. 공이 없거나(대장 아님·세대 다름) 값이 이상하면 false.
 * out: { phase, x, z, held } — x·z = 공 중심(바닥 위 높이는 radius). held = 손에 든 상태(0·1).
 * 구름(2)·바닥(3)은 behavior 공 중심 그대로 — 그려진 공 = 피해 원.
 */
export function rollingBallInto(out, pool, index, runtime, clockSec = 0) {
  const novel2 = runtime?.novel2
  if (!novel2 || pool.active[index] !== 1 || pool.type[index] !== E104_CODE) return false
  const state = novel2.ballStateInto(pool, index, out)
  if (!state) return false
  const V = E104_BALL_VISUAL
  if (out.phase >= 2) {
    out.held = false
  } else {
    const yaw = pool.yaw[index]
    const fx = Math.sin(yaw); const fz = Math.cos(yaw)
    let side = 0
    if (out.phase === 1) side = Math.sin(clockSec * Math.PI * 2 * V.aimShakeHz) * V.aimShake
    out.x = pool.posX[index] + fx * V.heldAhead + fz * side
    out.z = pool.posZ[index] + fz * V.heldAhead - fx * side
    out.held = true
  }
  return Number.isFinite(out.x + out.z)
}

// ── E98 먹히는 잡몹 ──────────────────────────────────────────────────────────
export const E98_EATEN_VISUAL = Object.freeze({
  minScale: 0.25,   // 흡입이 끝나는 순간 크기(원래의 25%)
  lift: 0.42,       // 대식가 몸 배율(visualScale) 1당 떠오르는 높이(u) — 입 높이 근처
  spins: 1.5,       // 흡입 동안 도는 바퀴 수
})

/** 먹히는 개체의 흡입 진행 0..1(대식가 상태 9 타이머). 먹히는 중이 아니면 -1. */
export function eatenProgress(pool, index, runtime) {
  const novel2 = runtime?.novel2
  if (!novel2 || !novel2.isBeingEaten(pool, index)) return -1
  const eater = novel2.eatenBy[index]
  if (!(eater >= 0) || pool.active[eater] !== 1 || pool.type[eater] !== E98_CODE || pool.state[eater] !== N2_STATE_ATTACK) return -1
  const t = 1 - pool.stateTimer[eater] / E98_EATER.suckMs
  return t < 0 ? 0 : t > 1 ? 1 : t
}

/** out: { scale(배율), lift(u), spin(rad) }. 먹히는 중이 아니면 1·0·0. */
export function eatenVisualInto(out, pool, index, runtime) {
  const t = eatenProgress(pool, index, runtime)
  if (t < 0) { out.scale = 1; out.lift = 0; out.spin = 0; return out }
  const V = E98_EATEN_VISUAL
  const eased = t * t * (3 - 2 * t)
  const eater = runtime.novel2.eatenBy[index]
  out.scale = 1 - (1 - V.minScale) * eased
  out.lift = eased * V.lift * (pool.visualScale[eater] || 1)
  out.spin = eased * V.spins * Math.PI * 2
  return out
}

// ── E101 복사본 · 복사기 ────────────────────────────────────────────────────
// 흰 종이색(복사 용지). 몸통 > 피부 > 발 순으로 조금씩 어둡게(툰 단이 형태를 읽히게), 눈은 토너 회색.
export const COPY_PAPER_COLORS = Object.freeze({ body: 0xf4f1e6, skin: 0xe4dfcf, foot: 0xb8b3a6, eye: 0x4a4a52 })
export function isNovel2Copy(pool, index, runtime) {
  return Boolean(runtime?.novel2?.isCopy?.(pool, index))
}
/** 풀 좀비 파트 역할 → 종이색 hex(eye·foot·skin, 나머지는 몸통 종이). */
export function copyPaperHex(role) {
  const C = COPY_PAPER_COLORS
  return role === 'eye' ? C.eye : role === 'foot' ? C.foot : role === 'skin' ? C.skin : C.body
}

/** Mini 몸 포즈 문법 덮어쓰기: 복사기가 복사 대상을 스캔하는 예고(모드 1)는 부채꼴 예고(모드 2)와 다른 'copierScan'. */
export function miniPoseStyleFor(style, pool, index, runtime) {
  if (style === 'copier' && pool.type[index] === E101_CODE && runtime?.novel2?.copierMode?.[index] === 1) return 'copierScan'
  return style
}

// 용지 걸림(상태 4) 오류 깜박임: 초당 4번 빨강 ↔ 원래 색. 피격 플래시보다 약하다(1.0 배율 기준 빨강 쪽으로 기울이기만).
export const COPIER_JAM_BLINK = Object.freeze({ hz: 4, rgb: Object.freeze([1.35, 0.42, 0.38]) })
/** Mini 몸 인스턴스 색 배율(rgb 0..)을 out[0..2]에 채운다. 바꿨으면 true. */
export function miniInstanceTintInto(out, pool, index, clockSec) {
  if (pool.type[index] === E101_CODE && pool.state[index] === N2_STATE_STUN) {
    const on = Math.floor(clockSec * COPIER_JAM_BLINK.hz * 2) % 2 === 0
    if (on) { out[0] = COPIER_JAM_BLINK.rgb[0]; out[1] = COPIER_JAM_BLINK.rgb[1]; out[2] = COPIER_JAM_BLINK.rgb[2]; return true }
  }
  return false
}

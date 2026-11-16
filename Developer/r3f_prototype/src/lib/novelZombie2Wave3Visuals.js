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
//
// wave 3 둘째 묶음(2026-11-17, threemini — 아래 "E100 · E102 · E106" 절):
//  - E100 찹쌀떡: 몸 변형(위치·방향·높이·비균일 배율)을 MiniZombieLayer에 넘긴다(miniBodyTransformInto). 웅크림 = 납작하게 퍼짐,
//    도약 = 원점(chargeOrigin)→착지점 포물선, 매달림 = 로사리 옆/뒤에 붙어(카메라 쪽 앞으로는 절대 안 간다) 떨쳐내기 진행만큼 늘어나며
//    가늘어지고 흔들린다, 빗나감·떨어짐 = 바닥에 납작.
//  - E102 회전의자: 포즈 문법만(회전은 behavior pool.yaw 두 바퀴 그대로) + 속도선·회전선(Wave3bMotionLayer).
//  - E106 기마전: 네 몸이 한 변형(드로콜 공유) — 역할별 포즈 문법(miniPoseStyleFor), 기수 모자(머리 loose, hook riderCap),
//    말 손 → 기수 엉덩이 "엮은 팔"(Wave3bMotionLayer).
import {
  E100_CODE, E100_MOCHI, E102_CHAIR, E102_CODE, E104_BALL, E104_CODE, E106_CODE, E101_CODE, E98_CODE, E98_EATER,
  N2_STATE_ATTACK, N2_STATE_STUN,
} from './novelZombie2Behavior.js'
import { MINI_MODEL_HEIGHT, MINI_ZOMBIE_VISUALS } from './miniZombieRoster.js'
import { MINI_RIDER_LIFT } from './miniZombiePose.js'

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
  // wave 3 둘째 묶음: 찹쌀떡 매달림·퍼짐, 기마전 역할(기수/앞 말/뒤 말/흩어진 말/낙마한 기수).
  if (style === 'cling' && pool.type[index] === E100_CODE) {
    const phase = mochiPhaseOf(pool, index, runtime)
    return phase === 3 ? 'clingHold' : phase === 4 || phase === 5 ? 'clingSplat' : style
  }
  if (pool.type[index] === E106_CODE && runtime?.novel2?.cavalryStateInto) {
    const cav = runtime.novel2.cavalryStateInto(pool, index, _cav)
    if (cav.role === 1) return cav.mounted ? 'rider' : 'riderDown'
    if (cav.role === 2) return cav.scattered ? 'horseLoose' : cav.slot === 0 ? 'horseFront' : 'horse'
    return 'horse'
  }
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

// ══ wave 3 둘째 묶음: E100 찹쌀떡 · E102 회전의자 · E106 기마전 (2026-11-17, threemini) ═════════════════════════════
// behavior 비주얼 계약(읽기 전용): mochiStateInto · chairStateInto · cavalryStateInto + 떡 도약 원점 chargeOriginX·Z
// (웅크림은 제자리 고정이라 원점 = 도약 시작 자리). 피해·타이머·예고 기하는 여기 없다 — 예고 채움은 스냅샷 그대로
// (components/expansion/expansionTelegraphs.js: contactAttack·damage > 0 = 빨강).
const _mochi = { phase: 0, clinging: false, progress: 0, offsetX: 0, offsetZ: 0, leapX: 0, leapZ: 0 }
const _cav = { role: 0, slot: -1, rider: -1, mounted: false, scattered: false, heading: 0 }
const _cavRider = { role: 0, slot: -1, rider: -1, mounted: false, scattered: false, heading: 0 }
const _chair = { phase: 0, dirX: 0, dirZ: 0, speed: 0, spin: 0 }
const TAU = Math.PI * 2
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v }
function smooth(t) { return t * t * (3 - 2 * t) }
// Kenney Mini → 몸 로컬(MiniZombieLayer MINI_MODEL_FIT과 같은 식 — 컴포넌트를 import하지 않으려고 여기서 만든다).
const MINI_FIT = 1.69 / MINI_MODEL_HEIGHT
// 몸 월드 배율 = visualScale × 0.333(components/PooledEnemyVisuals ENEMY_VISUAL_WORLD_SCALE과 같다).
const WORLD_SCALE = 0.333

// 접근성: 효과 줄이기(설정 data-reduced-effects) 또는 OS prefers-reduced-motion이면 흔들림·떨림·회전선을 끈다(상태 표시는 그대로).
let _reducedQuery
export function novel2ReducedMotion() {
  if (typeof document !== 'undefined' && document.documentElement?.hasAttribute?.('data-reduced-effects')) return true
  if (_reducedQuery === undefined) {
    try { _reducedQuery = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null : null } catch { _reducedQuery = null }
  }
  return _reducedQuery?.matches === true
}

// ── E100 찹쌀떡 ───────────────────────────────────────────────────────────────
export function mochiPhaseOf(pool, index, runtime) {
  const novel2 = runtime?.novel2
  if (!novel2?.mochiStateInto || pool.type[index] !== E100_CODE) return 0
  return novel2.mochiStateInto(pool, index, _mochi).phase
}

export const E100_MOCHI_VISUAL = Object.freeze({
  walkSquash: 0.07, walkHz: 3.2,              // 추격: 말랑말랑 눌렸다 늘었다(키 ±7%)
  crouchSquash: 0.42, crouchWiden: 0.3,       // 웅크림(0.9초) 끝: 키 58% · 가로 130% — 바닥에 납작하게 퍼진다
  crouchQuiverHz: 16, crouchQuiver: 0.03,
  leapHeightPerUnit: 0.3, leapHeightMax: 0.5, // 도약 포물선 꼭대기(u) = 원점→착지점 거리 × 0.3(최대 0.5)
  leapStretch: 0.25,                          // 날아가는 동안 진행 방향으로 25% 늘어난다
  clingScale: 0.8,                            // 매달린 떡은 80% — 로사리를 가리지 않게
  clingLift: 0.14,                            // 바닥에서 0.14u 띄워 로사리 허리·등 높이에 붙는다
  clingFrontZ: 0.12,                          // 늘어남 기준점(Kenney z) = 로사리에 붙은 몸 앞(손·배)
  clingStretch: 1.0, clingThin: 0.5, clingSquat: 0.3, // 떨쳐내기 진행 1: 뒤로 2배 늘어나고 가로 50% · 키 70%(곧 끊어진다)
  wobbleHz: 7, wobbleBase: 0.05, wobbleGain: 0.12,    // 매달린 동안 출렁임(진행할수록 커진다)
  splatSquash: 0.3, missSquash: 0.38, splatWiden: 1.4, splatBounceMs: 160, // 떨어짐·빗나감: 바닥에 철퍽
  dropBlendMs: 180,                           // 떨어지는 순간 매달려 그리던 자리 → 바닥 자리로 미끄러진다(순간이동 없음)
})

export function createMiniBodyTransform() {
  return { active: false, x: 0, z: 0, yaw: 0, lift: 0, uniform: 1, sx: 1, sy: 1, sz: 1, pivotZ: 0 }
}
/** 떡 매달림 마지막 그린 자리(떨어지는 순간 미끄러지기용). 슬롯·세대. */
export function createMochiDrawMemory(capacity = 200) {
  return { x: new Float32Array(capacity), z: new Float32Array(capacity), generation: new Int32Array(capacity).fill(-1) }
}

/** 도약 포물선 높이(u). 도약 중(단계 2)이 아니면 0. 원점 = behavior chargeOriginX·Z(웅크림 자리). */
export function mochiLeapLift(pool, index, runtime) {
  const novel2 = runtime?.novel2
  if (!novel2?.mochiStateInto || pool.type[index] !== E100_CODE) return 0
  const m = novel2.mochiStateInto(pool, index, _mochi)
  if (m.phase !== 2) return 0
  return leapArc(pool, index, novel2, m).lift
}
const _arc = { lift: 0, t: 0 }
function leapArc(pool, index, novel2, m) {
  const V = E100_MOCHI_VISUAL
  const ox = novel2.chargeOriginX?.[index] ?? pool.posX[index]
  const oz = novel2.chargeOriginZ?.[index] ?? pool.posZ[index]
  const total = Math.hypot(m.leapX - ox, m.leapZ - oz)
  const rest = Math.hypot(m.leapX - pool.posX[index], m.leapZ - pool.posZ[index])
  const t = total > 1e-3 ? clamp01(1 - rest / total) : 1
  const height = Math.min(V.leapHeightMax, V.leapHeightPerUnit * total)
  _arc.t = t
  _arc.lift = 4 * height * t * (1 - t)
  return _arc
}

/**
 * Mini 몸 변형(지금은 E100만). out.active = false면 MiniZombieLayer는 평소대로 그린다.
 * out: x·z(그릴 자리), yaw, lift(월드 u, 위로), uniform(발 기준 균일 배율), sx·sy·sz(몸 로컬 Kenney 축 배율 — 발·pivotZ 기준).
 * ctx: { playerX, playerZ(로사리 그린 자리), clockSec, reduced, memory(createMochiDrawMemory) }
 */
export function miniBodyTransformInto(out, pool, index, runtime, ctx = null) {
  out.active = false
  if (pool.type[index] !== E100_CODE) return out
  const novel2 = runtime?.novel2
  if (!novel2?.mochiStateInto) return out
  const m = novel2.mochiStateInto(pool, index, _mochi)
  const V = E100_MOCHI_VISUAL
  const reduced = Boolean(ctx?.reduced)
  const clock = Number.isFinite(ctx?.clockSec) ? ctx.clockSec : 0
  const seed = (index * 0.6180339887) % 1
  out.active = true
  out.x = pool.posX[index]; out.z = pool.posZ[index]; out.yaw = pool.yaw[index]; out.lift = 0
  out.uniform = 1; out.sx = 1; out.sy = 1; out.sz = 1; out.pivotZ = 0
  if (m.phase === 0) {
    if (!reduced) { const w = Math.sin((clock + seed) * TAU * V.walkHz) * V.walkSquash; out.sy = 1 + w; out.sx = 1 - w * 0.5; out.sz = out.sx }
  } else if (m.phase === 1) {
    // 웅크림(빨간 선 예고 0.9초): 점점 납작하게 퍼지며 바들바들(곧 튀어 오른다).
    const e = smooth(clamp01(1 - pool.stateTimer[index] / E100_MOCHI.telegraphMs))
    const quiver = reduced ? 0 : Math.sin(clock * TAU * V.crouchQuiverHz) * V.crouchQuiver * e
    out.sy = 1 - V.crouchSquash * e + quiver
    out.sx = 1 + V.crouchWiden * e; out.sz = out.sx
  } else if (m.phase === 2) {
    // 도약: 원점 → 착지점 포물선, 진행 방향으로 늘어난다(그림자는 바닥 자리 그대로 — 높이가 읽힌다).
    const arc = leapArc(pool, index, novel2, m)
    const s = Math.sin(Math.PI * arc.t)
    out.lift = arc.lift
    out.sz = 1 + V.leapStretch * s; out.sx = 1 - V.leapStretch * 0.4 * s; out.sy = 1 - 0.1 * s
  } else if (m.phase === 3) {
    // 매달림(2026-11-17 behavior c09b80d1): 붙는 자리는 behavior가 정한다 — offset = 로사리 등 뒤 0.3u(side +1 왼등 · −1 오른등,
    // 로사리 방향을 초당 720°까지 따라간다, 앞에는 절대 오지 않는다). 그린 몸 = 맞는 몸: 로사리 + offset 그대로 그린다.
    const px = Number.isFinite(ctx?.playerX) ? ctx.playerX : out.x - m.offsetX
    const pz = Number.isFinite(ctx?.playerZ) ? ctx.playerZ : out.z - m.offsetZ
    const len = Math.hypot(m.offsetX, m.offsetZ)
    const dx = len > 1e-5 ? m.offsetX / len : 0; const dz = len > 1e-5 ? m.offsetZ / len : -1
    out.x = px + m.offsetX; out.z = pz + m.offsetZ
    out.yaw = Math.atan2(-dx, -dz) // 로사리를 본다(손·배가 로사리에 붙는다)
    out.lift = V.clingLift
    out.uniform = V.clingScale
    out.pivotZ = V.clingFrontZ
    const p = clamp01(m.progress)
    const w = reduced ? 0 : Math.sin(clock * TAU * V.wobbleHz + seed * TAU) * (V.wobbleBase + V.wobbleGain * p)
    out.sz = 1 + V.clingStretch * p
    out.sx = (1 - V.clingThin * p) * (1 + w)
    out.sy = (1 - V.clingSquat * p) * (1 - w)
    const mem = ctx?.memory
    if (mem && index < mem.generation.length) { mem.x[index] = out.x; mem.z[index] = out.z; mem.generation[index] = pool.generation ? pool.generation[index] : 0 }
  } else if (m.phase === 4 || m.phase === 5) {
    // 빗나감(0.8초) · 떨어짐(1초): 바닥에 철퍽 퍼진다(접촉 0 — 잡을 기회).
    const total = m.phase === 5 ? E100_MOCHI.dropStunMs : E100_MOCHI.missRecoverMs
    const since = total - Math.max(0, pool.stateTimer[index])
    const b = clamp01(since / V.splatBounceMs)
    const e = smooth(b)
    const flat = m.phase === 5 ? V.splatSquash : V.missSquash
    out.sy = 1 + (flat - 1) * e
    out.sx = 1 + (V.splatWiden - 1) * e * (1 + (reduced ? 0 : 0.15 * Math.sin(Math.PI * b))); out.sz = out.sx
    const mem = ctx?.memory
    const generation = pool.generation ? pool.generation[index] : 0
    if (m.phase === 5 && mem && index < mem.generation.length && mem.generation[index] === generation && since < V.dropBlendMs) {
      const k = smooth(clamp01(since / V.dropBlendMs))
      out.x = mem.x[index] + (out.x - mem.x[index]) * k
      out.z = mem.z[index] + (out.z - mem.z[index]) * k
      out.lift = V.clingLift * (1 - k)
    }
  }
  return out
}

// ── E102 회전의자 ─────────────────────────────────────────────────────────────
// 속도선(활주·표류 동안 의자 뒤로 3줄, 길이 ∝ 속도)과 회전선(회전 예고 동안 의자 둘레 4줄, 회전 진행만큼 길어진다).
// 흰 반투명 평면(외곽선 없음 — VFX). 바닥 0.08~0.3u 높이, 로사리 투사체를 가리지 않게 가늘다.
export const E102_CHAIR_VISUAL = Object.freeze({
  streakMinSpeed: 0.25,                // 이보다 느리면 속도선 없음(u/s)
  streakLength: 0.8,                   // 최고 속도(maxSpeed)에서 길이(u)
  streakWidth: 0.045,
  streakBehind: 0.26,                  // 의자 중심 → 첫 줄 시작(뒤로 u)
  streakLateral: Object.freeze([-0.17, 0, 0.17]),
  streakHeight: Object.freeze([0.1, 0.28, 0.18]),
  streakStagger: Object.freeze([0.12, 0, 0.18]),
  whirlCount: 4, whirlRadius: 0.42, whirlLength: 0.34, whirlHeight: 0.16, whirlWidth: 0.04,
  color: 0xf4f7ff, opacity: 0.62,
  capacity: 64,
})

/** 의자 상태(그리기용). out: { phase(0~3), speedFrac(0~1), dirX, dirZ, spin }. E102가 아니면 false. */
export function chairMotionInto(out, pool, index, runtime) {
  const novel2 = runtime?.novel2
  if (!novel2?.chairStateInto || pool.active[index] !== 1 || pool.type[index] !== E102_CODE) return false
  const c = novel2.chairStateInto(pool, index, _chair)
  out.phase = c.phase
  out.speedFrac = clamp01(c.speed / E102_CHAIR.maxSpeed)
  const l = Math.hypot(c.dirX, c.dirZ)
  out.dirX = l > 1e-6 ? c.dirX / l : Math.sin(pool.yaw[index])
  out.dirZ = l > 1e-6 ? c.dirZ / l : Math.cos(pool.yaw[index])
  out.spin = c.spin
  out.speed = c.speed
  return true
}

// ── E106 기마전 ───────────────────────────────────────────────────────────────
// 네 몸 = 한 변형(male-e, 파란 머리띠) — 드로콜을 나눠 쓴다. 기수는 MINI_RIDER_LIFT만큼 들려 말들의 엮은 팔 위에 앉고 빨간 모자를 쓴다
// (머리 loose 'cap', hook riderCap: 말이면 0). 엮은 팔 = 말 셋의 손(기수 쪽 몸 앞) → 기수 엉덩이(Wave3bMotionLayer, 드로콜 1).
export const E106_CAVALRY_VISUAL = Object.freeze({
  hipY: 0.176,          // Kenney 엉덩이(몸통 피벗) 높이 — 들린 기수의 앉은 높이 = (hipY + MINI_RIDER_LIFT) × 몸 배율
  handY: 0.25,          // 말 손 높이(Kenney) — 엮은 팔이 시작하는 높이
  carrierInset: 0.11,   // 말 몸 가운데 → 팔이 나오는 자리(기수 쪽으로 u)
  riderInset: 0.04,     // 기수 가운데 → 팔이 닿는 자리(u)
  armWidth: 0.075, armHeight: 0.055,
  capacity: 48,
})

/** 말 index의 엮은 팔이 그려지는가: 편대에 묶인 말(흩어지지 않음) + 살아 있는 기수가 말 위에 있다. 기수 index, 없으면 −1. */
export function cavalryLinkedRider(pool, index, runtime) {
  const novel2 = runtime?.novel2
  if (!novel2?.cavalryStateInto || pool.active[index] !== 1 || pool.type[index] !== E106_CODE) return -1
  const horse = novel2.cavalryStateInto(pool, index, _cav)
  if (horse.role !== 2 || horse.scattered || horse.rider < 0) return -1
  const rider = horse.rider
  if (pool.active[rider] !== 1 || pool.type[rider] !== E106_CODE) return -1
  const r = novel2.cavalryStateInto(pool, rider, _cavRider)
  return r.role === 1 && r.mounted ? rider : -1
}

/** hook 'riderCap': 기수(말 위·낙마 모두)와 아직 편대가 없는 몸은 모자 1, 말은 0. */
export function cavalryRiderCapScale(pool, index, runtime) {
  const novel2 = runtime?.novel2
  if (!novel2?.cavalryStateInto || pool.type[index] !== E106_CODE) return 1
  return novel2.cavalryStateInto(pool, index, _cav).role === 2 ? 0 : 1
}

/** 미니 체력바를 몸과 함께 띄울 높이(월드 u): 말 위의 기수(MINI_RIDER_LIFT), 도약 중인 떡(포물선). poolScale = visualScale × 0.333. */
export function novel2BarLiftWorld(pool, index, runtime, poolScale = (pool.visualScale[index] || 1) * WORLD_SCALE) {
  const type = pool.type[index]
  if (type === E100_CODE) return mochiLeapLift(pool, index, runtime)
  if (type === E106_CODE && runtime?.novel2?.cavalryStateInto) {
    const cav = runtime.novel2.cavalryStateInto(pool, index, _cav)
    if (cav.role === 1 && cav.mounted) return MINI_RIDER_LIFT * MINI_FIT * poolScale
  }
  return 0
}

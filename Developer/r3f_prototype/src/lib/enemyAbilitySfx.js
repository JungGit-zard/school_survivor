// 풀 좀비(일반·신규 E34~E70·Stage 6 확장)의 행동 신호음 정본. 2026-11-14 soundmini.
//
// Terry "각종 재미있는 효과음 모두 적용해" — 웨이브에 섞여 나오는 신규 좀비가 무음이면 안 된다.
// 풀 경로(enemySimulation.js / projectileZombieShotPool.js / expansionAttackRuntime.js)는 렌더·저장소와
// 분리된 시뮬레이션이라, 그쪽은 "무슨 일이 일어났다"만 이 모듈에 알리고 소리 선택·간격·거리 감쇠는
// 여기 한 곳이 소유한다. emitSfx는 throw하지 않으므로 시뮬레이션 판정을 막지 않는다.
//
// 소음 예산(좀비가 한꺼번에 수십 마리 나오는 웨이브 기준):
//  1. 같은 소리는 entry.gapMs(기본 120ms)보다 자주 내지 않는다 — sfxRegistry 쿨다운보다 앞단에서 거른다
//     (거른 신호는 이벤트 객체도 만들지 않는다).
//  2. 종류별 400ms 창 예산: 행동 4 / 사망 개그 2 / 등장 2 / 앰비언트 1.
//  3. 플레이어에게서 HEAR_FAR_U(10u)보다 먼 좀비는 내지 않고, 가까울수록 크다.
//  4. 재생 단계에서는 sfxRegistry 전투 보이스 상한(6, 사망 발성 예약 2)이 한 번 더 막는다.
// 사망 개그는 사망 발성 랜덤 풀(enemyDeathSfx.js, Terry 2026-08-22 규칙)을 대체하지 않는다 — 그 위에
// 얹는 소품/몸개그 한 겹이다. 발성은 여전히 5종 랜덤이다.
//
// 시뮬레이션 결정성: Math.random을 쓰지 않는다(시뮬레이션 테스트가 Math.random을 고정·감시한다).
// 피치 흔들림은 자체 LCG로 만든다.

import { emitSfx } from './sfxEvents.js'
import { ENEMY_TYPE_CODES } from './enemyEntityPool.js'

export const HEAR_NEAR_U = 3
export const HEAR_FAR_U = 10
export const CUE_WINDOW_MS = 400
export const CUE_BUDGET = Object.freeze({ ability: 4, death: 2, spawn: 2, ambient: 1 })
export const DEFAULT_CUE_GAP_MS = 120
export const AMBIENT_GROAN_MIN_MS = 5500
export const AMBIENT_GROAN_SPAN_MS = 3500
export const AMBIENT_GROAN_HEAR_U = 7

const cue = (id, rate = 1, volume = 0.45, gapMs = DEFAULT_CUE_GAP_MS) => Object.freeze({ id, rate, volume, gapMs })

// ── 타입별 신호 ──────────────────────────────────────────────────────────────
// spawn: 등장(풀 스폰 직후 첫 프레임), telegraph: 예고 시작, attack: 공격/발사 시작, death: 사망 개그(발성 위에 한 겹).
// fire는 salvo면 탄마다 온다 — rates가 있으면 탄 순번(1부터)으로 음정을 고른다(E51 합창 도-미-솔).
export const ENEMY_ABILITY_SFX = Object.freeze({
  // ── 기존 일반 좀비: 만들어 놓고 풀 경로에서 한 번도 안 울리던 음원을 제자리에 건다 ──────
  E02: Object.freeze({ spawn: cue('zombieTankGroan', 1, 0.5, 1800) }),
  E03: Object.freeze({ spawn: cue('zombieRunnerScreech', 1, 0.4, 1200) }),
  E04: Object.freeze({ attack: cue('zombieRangedShoot', 1, 0.45, 300) }),
  E05: Object.freeze({ telegraph: cue('zombieChargeRoar', 1, 0.5, 600) }),
  E06: Object.freeze({ spawn: cue('zombieGiantThud', 0.9, 0.6, 1500) }),

  // ── Track B 근접 12종(E34~E45): 춤 동작 같은 몸개그 ─────────────────────────
  // 예고 = 용수철 '뾰잉'(피치로 종 구분), 공격 = 휙/끽, 사망 = 슬픈 트롬본(피치 사다리 0.68~1.30).
  E34: Object.freeze({ telegraph: cue('gagWindup', 1.3, 0.32), attack: cue('gagSwoosh', 1.35, 0.42), death: cue('gagWahWah', 1.3, 0.36) }),
  E35: Object.freeze({ telegraph: cue('gagWindup', 1.15, 0.32), attack: cue('gagSneakerSqueak', 1.1, 0.34), death: cue('gagWahWah', 1.22, 0.36) }),
  E36: Object.freeze({ telegraph: cue('gagWindup', 0.85, 0.32), attack: cue('gagSwoosh', 1.15, 0.42), death: cue('gagWahWah', 1.15, 0.36) }),
  E37: Object.freeze({ telegraph: cue('gagWindup', 1.0, 0.32), attack: cue('gagSwoosh', 0.9, 0.42), death: cue('gagWahWah', 1.08, 0.36) }),
  E38: Object.freeze({ telegraph: cue('gagWindup', 1.45, 0.32), attack: cue('gagSneakerSqueak', 1.35, 0.34), death: cue('gagWahWah', 1.0, 0.36) }),
  E39: Object.freeze({ telegraph: cue('gagWindup', 0.8, 0.32), attack: cue('gagSwoosh', 0.75, 0.42), death: cue('gagWahWah', 0.94, 0.36) }),
  E40: Object.freeze({ telegraph: cue('gagWindup', 0.9, 0.32), attack: cue('gagSwoosh', 0.65, 0.45), death: cue('gagWahWah', 0.88, 0.36) }),
  E41: Object.freeze({ telegraph: cue('gagWindup', 1.2, 0.32), attack: cue('gagSneakerSqueak', 0.85, 0.34), death: cue('gagWahWah', 0.84, 0.36) }),
  E42: Object.freeze({ telegraph: cue('gagWindup', 1.05, 0.32), attack: cue('gagSwoosh', 1.05, 0.42), death: cue('gagWahWah', 0.8, 0.36) }),
  E43: Object.freeze({ telegraph: cue('gagWindup', 0.95, 0.32), attack: cue('gagSwoosh', 0.55, 0.45), death: cue('gagWahWah', 0.76, 0.36) }),
  E44: Object.freeze({ telegraph: cue('gagWindup', 1.1, 0.32), attack: cue('gagSneakerSqueak', 0.75, 0.34), death: cue('gagWahWah', 0.72, 0.36) }),
  E45: Object.freeze({ telegraph: cue('gagWindup', 0.75, 0.32), attack: cue('gagSneakerSqueak', 0.6, 0.42), death: cue('gagWahWah', 0.68, 0.36) }),

  // ── 투사체 25종(E46~E70): 들고 있는 학용품/소품 소리 ─────────────────────────
  E46: Object.freeze({ attack: cue('gagToss', 1.3), death: cue('gagPropClatter', 1.2) }),
  E47: Object.freeze({ attack: cue('gagToss', 0.75), death: cue('gagCardFlick', 0.6) }),
  E48: Object.freeze({ attack: cue('gagRopeWhirr', 1.4), death: cue('gagPropClatter', 0.9) }),
  E49: Object.freeze({ attack: cue('gagSplash', 1.2), death: cue('gagSplash', 0.75) }),
  E50: Object.freeze({ attack: cue('gagBallThwack', 1.1), death: cue('gagBallThwack', 0.7) }),
  E51: Object.freeze({ attack: Object.freeze({ ...cue('gagChoirLa', 1, 0.42), rates: Object.freeze([1, 1.26, 1.5]) }), death: cue('gagChoirLa', 0.6) }),
  E52: Object.freeze({ attack: cue('gagPotionBlorp', 1.1), death: cue('gagPotionBlorp', 0.7) }),
  E53: Object.freeze({ attack: cue('gagPaintSplat', 1.2), death: cue('gagPaintSplat', 0.8) }),
  E54: Object.freeze({ attack: cue('gagMegaphone', 1.0, 0.4), death: cue('gagMegaphone', 0.6) }),
  E55: Object.freeze({ telegraph: cue('gagWindup', 0.7, 0.4), attack: cue('gagBallThwack', 1.45, 0.5), death: cue('gagBallThwack', 0.55) }),
  E56: Object.freeze({ attack: cue('gagBuffSparkle', 1.0, 0.4), death: cue('gagBuffSparkle', 0.6) }),
  E57: Object.freeze({ attack: cue('gagCardFlick', 1.0, 0.42, 90), death: cue('gagCardFlick', 0.75) }),
  E58: Object.freeze({ telegraph: cue('gagWindup', 1.6, 0.4), attack: cue('gagRopeWhirr', 1.0), death: cue('gagRopeWhirr', 0.7) }),
  E59: Object.freeze({ attack: cue('gagToss', 1.0), death: cue('gagCartonPop', 0.75) }),
  E60: Object.freeze({ telegraph: cue('gagSplash', 0.65, 0.4), attack: cue('gagSplash', 1.35), death: cue('gagSplitSquelch', 0.8) }),
  E61: Object.freeze({ attack: cue('gagTrayClatter', 1.0, 0.5), death: cue('gagTrayClatter', 0.75) }),
  E62: Object.freeze({ attack: cue('gagSneakerSqueak', 1.25, 0.45), death: cue('gagSneakerSqueak', 0.6) }),
  E63: Object.freeze({ attack: cue('gagMegaphone', 1.5, 0.4), death: cue('gagMegaphone', 1.25) }),
  E64: Object.freeze({ attack: cue('gagToss', 0.9), death: cue('gagChalkPuff', 0.7) }),
  E65: Object.freeze({ attack: cue('gagCardFlick', 0.7, 0.45), death: cue('gagCardFlick', 0.55) }),
  E66: Object.freeze({ attack: cue('gagSplitSquelch', 1.0, 0.42), death: cue('gagSplitSquelch', 1.3) }),
  E67: Object.freeze({ attack: cue('gagBuffSparkle', 0.7, 0.4), death: cue('gagTrayClatter', 1.35) }),
  E68: Object.freeze({ attack: cue('gagRopeWhirr', 0.75), death: cue('gagPropClatter', 0.6) }),
  E69: Object.freeze({ attack: cue('gagDominoClack', 1.3), death: cue('gagDominoClack', 0.7) }),
  E70: Object.freeze({ telegraph: cue('gagChoirLa', 0.75, 0.4), attack: cue('gagBlinkPop', 1.0), death: cue('gagBlinkPop', 0.6) }),

  // ── 블록 좀비 18종(E71~E88, 2026-11-14): 새 음원 없이 기존 개그 21종을 종마다 다른 (id, 피치)로 건다 ──
  // 근접형은 예고 '뾰잉'(gagWindup)을 함께 낸다. 사망 개그는 발성 랜덤 풀 위에 얹는 한 겹(2026-08-22 규칙 그대로).
  E71: Object.freeze({ telegraph: cue('gagSwoosh', 1.6, 0.36), attack: cue('gagBlinkPop', 1.25), death: cue('gagBlinkPop', 0.8) }),
  E72: Object.freeze({ attack: cue('gagMegaphone', 1.2, 0.4), death: cue('gagMegaphone', 0.8) }),
  E73: Object.freeze({ attack: cue('gagToss', 1.15), death: cue('gagPropClatter', 0.75) }),
  E74: Object.freeze({ attack: Object.freeze({ ...cue('gagBlinkPop', 1.5, 0.4, 90), rates: Object.freeze([1.4, 1.5, 1.6]) }), death: cue('gagPropClatter', 1.4) }),
  E75: Object.freeze({ attack: cue('gagTrayClatter', 1.3, 0.45), death: cue('gagTrayClatter', 1.1) }),
  E76: Object.freeze({ telegraph: cue('gagWindup', 0.6, 0.4), attack: cue('gagSwoosh', 0.5, 0.48), death: cue('gagWahWah', 0.6, 0.38) }),
  E77: Object.freeze({ telegraph: cue('gagWindup', 1.5, 0.32), attack: cue('gagSneakerSqueak', 1.5, 0.4), death: cue('gagPropClatter', 1.05) }),
  E78: Object.freeze({ attack: cue('gagBuffSparkle', 0.85, 0.4), death: cue('gagBuffSparkle', 0.5) }),
  E79: Object.freeze({ attack: cue('gagCardFlick', 1.2, 0.42, 90), death: cue('gagCardFlick', 0.9) }),
  E80: Object.freeze({ attack: cue('gagSwoosh', 1.45, 0.42), death: cue('gagChoirLa', 0.8) }),
  E81: Object.freeze({ attack: Object.freeze({ ...cue('gagBlinkPop', 1.35, 0.4, 90), rates: Object.freeze([1.2, 1.35, 1.5]) }), death: cue('gagDominoClack', 1.0) }),
  E82: Object.freeze({ telegraph: cue('gagWindup', 0.65, 0.34), attack: cue('gagBallThwack', 0.9, 0.48), death: cue('gagWahWah', 0.52, 0.38) }),
  E83: Object.freeze({ telegraph: cue('gagWindup', 1.35, 0.32), attack: cue('gagSneakerSqueak', 1.05, 0.4), death: cue('gagWahWah', 1.4, 0.36) }),
  E84: Object.freeze({ attack: cue('gagBuffSparkle', 1.3, 0.4), death: cue('gagPotionBlorp', 0.9) }),
  E85: Object.freeze({ telegraph: cue('gagWindup', 1.15, 0.32), attack: cue('gagBallThwack', 1.25, 0.45), death: cue('gagTrayClatter', 0.9) }),
  E86: Object.freeze({ attack: cue('gagDominoClack', 0.85, 0.42), death: cue('gagCardFlick', 1.15) }),
  E87: Object.freeze({ telegraph: cue('gagWindup', 1.25, 0.32), attack: cue('gagSneakerSqueak', 0.95, 0.4), death: cue('gagSneakerSqueak', 0.8) }),
  E88: Object.freeze({ telegraph: cue('gagWindup', 1.45, 0.32), attack: cue('gagSwoosh', 1.25, 0.42), death: cue('gagSneakerSqueak', 1.15) }),
})

// 투사체 좀비 탄의 착지·폭발 순간(projectileZombieShotPool._blast). 도미노는 0.16초 간격 연쇄라 간격을 짧게.
// 키는 projectileZombieShotPool.SHOT_KIND 값이다. 그 모듈이 이 모듈을 import하므로(순환) 여기서는 숫자로
// 적고, enemyAbilitySfx.test.js가 SHOT_KIND와 같은지 못박는다.
export const SHOT_IMPACT_KIND = Object.freeze({
  WATER_BLOB: 19, VOLLEYBALL: 20, MILK_CARTON: 29, CHALK_BOMB: 37, DOMINO: 40, TAG_MARK: 41,
})
export const SHOT_IMPACT_SFX = Object.freeze({
  [SHOT_IMPACT_KIND.WATER_BLOB]: cue('gagSplash', 0.9, 0.45),
  [SHOT_IMPACT_KIND.VOLLEYBALL]: cue('gagBallThwack', 0.85, 0.45),
  [SHOT_IMPACT_KIND.MILK_CARTON]: cue('gagCartonPop', 1.0, 0.5),
  [SHOT_IMPACT_KIND.CHALK_BOMB]: cue('gagChalkPuff', 1.0, 0.45),
  [SHOT_IMPACT_KIND.DOMINO]: cue('gagDominoClack', 1.0, 0.45, 100),
  [SHOT_IMPACT_KIND.TAG_MARK]: cue('gagBallThwack', 1.6, 0.5),
})

// Stage 6(+초안 7~10) 확장 일반 적: 행동 id 기준. windup = 스냅샷 생성(예고 시작), active = 피해 구간 진입.
export const EXPANSION_BEHAVIOR_SFX = Object.freeze({
  ring: Object.freeze({ windup: cue('gagWindup', 0.9, 0.4), active: cue('gagSwoosh', 0.7, 0.42) }),
  dash: Object.freeze({ windup: cue('gagSneakerSqueak', 1.1, 0.34), active: cue('gagSwoosh', 1.2, 0.42) }),
  lob: Object.freeze({ windup: cue('gagWindup', 1.0, 0.32), active: cue('gagSplash', 1.0, 0.42) }),
  trail: Object.freeze({ active: cue('gagSplitSquelch', 1.1, 0.4) }),
  pulse: Object.freeze({ windup: cue('gagWindup', 0.8, 0.32), active: cue('gagMegaphone', 0.7, 0.4) }),
  fan: Object.freeze({ active: cue('gagSplash', 1.3, 0.42) }),
  rootline: Object.freeze({ active: cue('gagRopeWhirr', 0.9, 0.42) }),
  hop: Object.freeze({ windup: cue('gagWindup', 1.3, 0.32), active: cue('gagBallThwack', 0.8, 0.42) }),
  beam: Object.freeze({ windup: cue('gagMegaphone', 1.7, 0.36), active: cue('gagSwoosh', 1.4, 0.42) }),
  orbit: Object.freeze({ active: cue('gagRopeWhirr', 1.2, 0.42) }),
  cross: Object.freeze({ active: cue('gagMegaphone', 1.9, 0.38) }),
  sidestep: Object.freeze({ active: cue('gagSneakerSqueak', 0.9, 0.34) }),
})

export const DEFAULT_SPAWN_SFX = cue('zombieSpawn', 1, 0.3, 180)
export const AMBIENT_GROAN_SFX = cue('zombieGroan', 1, 0.36, AMBIENT_GROAN_MIN_MS)

// 타입코드 → 표 항목. 프레임 경로에서 문자열 조회를 하지 않도록 한 번만 만든다.
const _byCode = []
for (const [type, entry] of Object.entries(ENEMY_ABILITY_SFX)) {
  const code = ENEMY_TYPE_CODES[type]
  if (Number.isInteger(code)) _byCode[code] = entry
}

export function enemyAbilitySfxForCode(typeCode) {
  return _byCode[typeCode] ?? null
}

// ── 게이트 상태 ──────────────────────────────────────────────────────────────
const _lastAt = new Map()
const _windowStart = { ability: -Infinity, death: -Infinity, spawn: -Infinity, ambient: -Infinity }
const _windowCount = { ability: 0, death: 0, spawn: 0, ambient: 0 }
let _seed = 0x2545f491
let _groanLeftMs = AMBIENT_GROAN_MIN_MS
let _now = defaultNow

function defaultNow() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now()
}

function nextUnit() {
  _seed = (Math.imul(_seed, 1664525) + 1013904223) >>> 0
  return _seed / 4294967296
}

export function resetEnemyAbilitySfx({ now } = {}) {
  _lastAt.clear()
  for (const key of Object.keys(_windowStart)) { _windowStart[key] = -Infinity; _windowCount[key] = 0 }
  _seed = 0x2545f491
  _groanLeftMs = AMBIENT_GROAN_MIN_MS
  _now = typeof now === 'function' ? now : defaultNow
}

function hearingGain(x, z, playerX, playerZ, farU = HEAR_FAR_U) {
  // 위치를 모르면(테스트·초기 프레임) 거리 감쇠 없이 낸다.
  if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(playerX) || !Number.isFinite(playerZ)) return 1
  const d = Math.hypot(x - playerX, z - playerZ)
  if (d > farU) return 0
  if (d <= HEAR_NEAR_U) return 1
  return 1 - 0.55 * ((d - HEAR_NEAR_U) / Math.max(1e-6, farU - HEAR_NEAR_U))
}

function admit(entry, kind, now) {
  const last = _lastAt.get(entry.id)
  if (last !== undefined && now - last < Math.max(DEFAULT_CUE_GAP_MS, entry.gapMs)) return false
  if (now - _windowStart[kind] >= CUE_WINDOW_MS) { _windowStart[kind] = now; _windowCount[kind] = 0 }
  if (_windowCount[kind] >= CUE_BUDGET[kind]) return false
  _windowCount[kind] += 1
  _lastAt.set(entry.id, now)
  return true
}

// 시뮬레이션 step 한가운데서 불리므로 어떤 경우에도 throw하지 않는다 — 소리 하나 때문에 판정이 끊기면 안 된다.
function play(entry, kind, x, z, playerX, playerZ, rate, farU = HEAR_FAR_U) {
  if (!entry) return false
  try {
    const gain = hearingGain(x, z, playerX, playerZ, farU)
    if (gain <= 0) return false
    if (!admit(entry, kind, _now())) return false
    // ±4% 흔들림 — 같은 종이 연달아 내도 기계적으로 똑같이 들리지 않게.
    const jitter = 0.96 + nextUnit() * 0.08
    const base = Number.isFinite(rate) ? rate : entry.rate
    emitSfx({ id: entry.id, volume: entry.volume * gain, rate: Math.min(2, Math.max(0.5, base * jitter)) })
    return true
  } catch {
    return false
  }
}

/** 풀 스폰 직후 첫 시뮬레이션 프레임. 표에 spawn이 없으면 작은 공용 '펑'. */
export function cueEnemySpawnSfx(typeCode, x, z, playerX, playerZ) {
  const entry = _byCode[typeCode]?.spawn ?? DEFAULT_SPAWN_SFX
  return play(entry, 'spawn', x, z, playerX, playerZ)
}

/** 예고 시작(E05 경고, 신규 근접 예고, 투사체 좀비 조준). */
export function cueEnemyTelegraphSfx(typeCode, x, z, playerX, playerZ) {
  return play(_byCode[typeCode]?.telegraph, 'ability', x, z, playerX, playerZ)
}

/** 공격·발사 시작. shotNumber는 salvo의 탄 순번(1부터) — 음정 사다리가 있는 종만 쓴다. */
export function cueEnemyAttackSfx(typeCode, x, z, playerX, playerZ, shotNumber = 0) {
  const entry = _byCode[typeCode]?.attack
  if (!entry) return false
  const rate = entry.rates && shotNumber >= 1 ? entry.rates[(shotNumber - 1) % entry.rates.length] : entry.rate
  return play(entry, 'ability', x, z, playerX, playerZ, rate)
}

/** 사망 개그 한 겹. 사망 발성(랜덤 풀)은 호출측이 따로 그대로 낸다. */
export function cueEnemyDeathSfx(typeCode, x, z, playerX, playerZ) {
  return play(_byCode[typeCode]?.death, 'death', x, z, playerX, playerZ)
}

/** 투사체 좀비 탄의 착지/폭발. */
export function cueShotImpactSfx(shotKind, x, z, playerX, playerZ) {
  return play(SHOT_IMPACT_SFX[shotKind], 'ability', x, z, playerX, playerZ)
}

/** 확장 일반 적 특수행동. phase = 'windup' | 'active'. */
export function cueExpansionBehaviorSfx(behaviorId, phase, x, z, playerX, playerZ) {
  return play(EXPANSION_BEHAVIOR_SFX[behaviorId]?.[phase], 'ability', x, z, playerX, playerZ)
}

/**
 * 앰비언트 신음 타이머(게임 시간). 만기면 true — 호출측이 이번 프레임 가장 가까운 좀비를 골라
 * cueAmbientGroanSfx로 넘긴다. 일시정지 중에는 시뮬레이션이 돌지 않으므로 타이머도 멈춘다.
 */
export function advanceAmbientGroan(deltaMs) {
  if (!(deltaMs > 0)) return false
  _groanLeftMs -= deltaMs
  return _groanLeftMs <= 0
}

export function cueAmbientGroanSfx(x, z, playerX, playerZ) {
  _groanLeftMs = AMBIENT_GROAN_MIN_MS + nextUnit() * AMBIENT_GROAN_SPAN_MS
  const rate = 0.85 + nextUnit() * 0.3
  return play(AMBIENT_GROAN_SFX, 'ambient', x, z, playerX, playerZ, rate, AMBIENT_GROAN_HEAR_U)
}

/** 신음 후보가 없던 만기 프레임: 짧게 다시 기다린다(좀비가 나타나면 곧 신음). */
export function deferAmbientGroan() {
  _groanLeftMs = 1000
}

/** 이 모듈이 낼 수 있는 모든 사운드 id(레지스트리 등록 검사용). */
export function listEnemyAbilitySfxIds() {
  const ids = new Set([DEFAULT_SPAWN_SFX.id, AMBIENT_GROAN_SFX.id])
  for (const entry of Object.values(ENEMY_ABILITY_SFX)) for (const c of Object.values(entry)) ids.add(c.id)
  for (const c of Object.values(SHOT_IMPACT_SFX)) ids.add(c.id)
  for (const entry of Object.values(EXPANSION_BEHAVIOR_SFX)) for (const c of Object.values(entry)) ids.add(c.id)
  return [...ids]
}

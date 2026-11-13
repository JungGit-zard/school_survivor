// 스테이지 로스터 순환 — 2026-11-14 Terry 지시.
//   "스테이지 전체에 걸쳐서 스테이지에 배분된 좀비들이 골고루 분포되게 만들어"
//   "정규 웨이브에 신규좀비가 없고" / "정규 리스폰 웨이브에도 골고루 섞어"
//
// 왜 필요했나: 신규 좀비(E34~E70, 스6은 E19~E21)는 버스트 표의 한두 행(첫 등장·복습)에만 있었고,
// 시간 내내 도는 정규 스폰 — 저밀도 리필(E07×10 + E01×10), 지배 스웜(E01/E02/E05), 스3·스5 반복 증원
// (E01/E07), 탈출구 개방 뒤 오버타임(E01~E07) — 은 전부 기본 E01~E07만 냈다. 그래서 스2·스3 오프닝의
// E37(가까이 가면 사선으로 들이받는 좀비)처럼 "처음에만 나오고 다시는 안 나오는" 종이 생겼다.
//
// 규칙(단일 정본) — 2026-11-14 2차(balanceqa BLOCK 반영: 1차는 스5 클리어율 66% → 8%):
//   1. 데뷔 게이트: 한 종의 첫 순환 기한 = 그 스테이지 표의 작성된 첫 등장 + 간격. 기획자가 소개하기 전에는
//      절대 순환으로 나오지 않는다(1차는 첫 40초 안에 전 종을 쏟아 스5 사수가 데뷔 전부터 쌓였다).
//   2. 같은 HP끼리만 맞바꾼다: 정규 경로가 기본 잡몹(host) 1마리를 낼 때, 기한이 지난 종 중 HP가 host와 정확히
//      같은 종이 있으면 그 1마리를 그 종으로 1:1로 바꾼다(8=E01 / 10=E03 / 16=E07 / 32=E04 / 70=E02·E05).
//      마릿수·웨이브 크기·탈출 뒤 +10% 성장·동시 천장은 그대로다. (8↔10까지 넓히면 스5 보스 구간 E01 자리에
//      E53·E70 사수가 들어가 프로브 클리어율이 75% → 33%로 떨어졌다 — 정확히 같은 HP만.)
//   3. 같은 HP host가 없는 근접·지원 종(예: 스5의 70hp E40·E42·E43, 스2의 10hp E38)의 안전한 복귀: 기한을
//      GRACE(20초) 넘겨도 같은 HP host가 안 왔으면 다른 HP host 1마리와 바꿀 수 있다 — 단 스테이지 전체에서
//      CROSS_TIER_COOLDOWN(30초)에 한 번뿐이다.
//      탄을 쏘는 종(사수 — E04와 shot이 있는 투사체 좀비)은 계층 밖 교체를 절대 받지 않는다(같은 HP host로만 돌아온다).
//      프로브 실측(스5, 10시드 × 7봇): 사수의 계층 밖 교체를 런당 2~3마리(E53·E70)만 허용해도 KITE 클리어율이
//      75% → 28~47%로 떨어졌다. 살아 있는 사수 수 상한(3·6·10)은 스5에서 늘 상한 위라 아무 효과가 없었다.
//      E04 host는 HP가 다른 종으로 바뀌지 않는다.
//   4. 확정은 실제 스폰 때만: 고른 종은 같은 시각 안에서만 '예약'되고, 실제로 addEnemies에 들어가
//      noteRosterRotationSpawn이 불릴 때 기한이 넘어간다. 자리를 못 받아 건너뛴 개체, 20마리가 안 돼 버린
//      저밀도 리필 묶음, 동시 천장에 잘린 개체는 시계를 소모하지 않는다(다음 시각에는 예약이 저절로 풀린다).
// 작성된 등장(첫 등장·복습 행, 형태 버스트, 보스 소환)도 같은 기록 함수로 기한을 다시 잡는다.
//
// 바꾸지 않는 것: 형태 버스트(ring/pincer/swarm/조회 줄/트랙), 런좀비·경비 크루, 보스, 코인 몬스터,
// 스5 전교 호출 레인 펄스, E06(거대, 320hp 단독 계층) host. 기본 E02~E07의 도입 사슬은 작성된 그대로다.

import { getBurstEventsForStage, isBossType } from './burstEvents.js'
import { EXPANSION_STAGES } from './expansionContent.js'
import { PROJECTILE_ZOMBIE_BEHAVIORS } from './projectileZombieBehavior.js'

// 탄을 쏘는 종(사수): E04 + 투사체 좀비 중 shot이 있는 종(E56 보건실·E61 급식판·E62 셔틀런·E66 플라나리아·E67 방패는 아님).
export const ROSTER_ROTATION_SHOOTER_TYPES = Object.freeze(new Set([
  'E04',
  ...Object.values(PROJECTILE_ZOMBIE_BEHAVIORS).filter((behavior) => behavior?.shot).map((behavior) => behavior.id),
]))

export const ROSTER_ROTATION_INTERVAL_SEC = 40
// 무거운 종(기본 HP 32 이상)은 55초.
export const ROSTER_ROTATION_HEAVY_INTERVAL_SEC = 55
export const ROSTER_ROTATION_HEAVY_HP = 32
// 같은 계층 host 판정: host HP / 종 HP가 이 범위 안. 기본은 정확히 같은 HP(1.0)만.
export const ROSTER_ROTATION_TIER_MIN_RATIO = 1
export const ROSTER_ROTATION_TIER_MAX_RATIO = 1
// 계층 밖 교체는 기한을 이만큼 넘긴 뒤에만, 그리고 스테이지 전체에서 쿨다운당 1회만.
export const ROSTER_ROTATION_TIER_GRACE_SEC = 20
export const ROSTER_ROTATION_CROSS_TIER_COOLDOWN_SEC = 30
// 맞바꿀 수 있는 정규 잡몹. E06(거대)·E08(코인)은 넣지 않는다.
export const ROSTER_ROTATION_HOST_TYPES = Object.freeze(['E01', 'E02', 'E03', 'E05', 'E07'])
// E04(원거리)는 같은 계층(32hp 원거리 신규 종: E63·E52·E54)하고만 바꾼다 — 계층 밖 교체를 받지 않는다.
export const ROSTER_ROTATION_SAME_TIER_ONLY_HOST_TYPES = Object.freeze(['E04'])
const HOST_SET = new Set(ROSTER_ROTATION_HOST_TYPES)
const SAME_TIER_ONLY_HOST_SET = new Set(ROSTER_ROTATION_SAME_TIER_ONLY_HOST_TYPES)
// 기본 E01~E08과 크루(RZT/RZG/RZL/RZC)는 순환 대상이 아니다.
const NON_ROSTER_TYPE = /^(E0[1-8]|RZ[A-Z])$/

const debutCache = new Map()

// 스테이지에 배분된 순환 대상 종과 각 종의 작성된 첫 등장(초). 스6 등 확장 스테이지는 enemyIds만.
export function getStageRotationDebuts(stageId) {
  if (debutCache.has(stageId)) return debutCache.get(stageId)
  const expansion = EXPANSION_STAGES[stageId]
  const firstSec = new Map()
  for (const evt of getBurstEventsForStage(stageId) ?? []) {
    for (const type of [evt.type, ...(evt.mixedTypes ?? [])]) {
      if (!type || isBossType(type)) continue
      if (expansion ? !expansion.enemyIds.includes(type) : NON_ROSTER_TYPE.test(type)) continue
      if (!firstSec.has(type) || evt.sec < firstSec.get(type)) firstSec.set(type, evt.sec)
    }
  }
  const debuts = Object.freeze(Object.fromEntries([...firstSec.entries()]
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))))
  debutCache.set(stageId, debuts)
  return debuts
}

// 순환 대상 종 목록(첫 등장 순).
export function getStageRotationRoster(stageId) {
  return Object.keys(getStageRotationDebuts(stageId))
}

export function isRosterRotationHostType(type) {
  return HOST_SET.has(type) || SAME_TIER_ONLY_HOST_SET.has(type)
}

export function rosterRotationIntervalForHp(hp) {
  return hp >= ROSTER_ROTATION_HEAVY_HP ? ROSTER_ROTATION_HEAVY_INTERVAL_SEC : ROSTER_ROTATION_INTERVAL_SEC
}

function sameTier(state, typeHp, hostHp) {
  if (!(typeHp > 0) || !(hostHp > 0)) return false
  const ratio = hostHp / typeHp
  return ratio >= state.tierMinRatio && ratio <= state.tierMaxRatio
}

// 런 1회분 상태. hpOf(type)는 기본 HP 조회(Enemies.jsx는 ENEMY_STATS를 넘긴다).
export function createRosterRotation(stageId, options = {}) {
  const {
    hpOf = () => 0,
    graceSec = ROSTER_ROTATION_TIER_GRACE_SEC,
    crossTierCooldownSec = ROSTER_ROTATION_CROSS_TIER_COOLDOWN_SEC,
    tierMinRatio = ROSTER_ROTATION_TIER_MIN_RATIO,
    tierMaxRatio = ROSTER_ROTATION_TIER_MAX_RATIO,
    intervalSec = ROSTER_ROTATION_INTERVAL_SEC,
    heavyIntervalSec = ROSTER_ROTATION_HEAVY_INTERVAL_SEC,
  } = options
  const debuts = getStageRotationDebuts(stageId)
  const types = Object.keys(debuts)
  const hp = types.map((type) => hpOf(type) ?? 0)
  const interval = hp.map((value) => (value >= ROSTER_ROTATION_HEAVY_HP ? heavyIntervalSec : intervalSec))
  return {
    stageId,
    graceSec,
    crossTierCooldownSec,
    tierMinRatio,
    tierMaxRatio,
    shooter: types.map((type) => ROSTER_ROTATION_SHOOTER_TYPES.has(type)),
    types,
    hp,
    hpOf,
    interval,
    // 데뷔 게이트: 작성된 첫 등장 + 간격 전에는 기한이 오지 않는다.
    due: types.map((type, index) => debuts[type] + interval[index]),
    // 같은 시각 안 예약(확정 전). reservedSec !== 지금이면 무효다.
    reservedSec: types.map(() => -Infinity),
    reservedCross: types.map(() => false),
    crossReservedSec: -Infinity,
    lastCrossSec: -Infinity,
    substitutions: 0,
    crossTierSubstitutions: 0,
  }
}

// 실제로 스폰된 개체(어느 경로든)만 기록한다. 로스터 종이면 기한을 다시 잡고, 이 시각에 예약해 둔
// 계층 밖 교체였으면 쿨다운을 시작한다.
export function noteRosterRotationSpawn(state, type, sec) {
  if (!state || !Number.isFinite(sec)) return
  const index = state.types.indexOf(type)
  if (index < 0) return
  state.due[index] = Math.max(state.due[index], sec + state.interval[index])
  if (state.reservedSec[index] === sec) {
    state.substitutions += 1
    if (state.reservedCross[index]) {
      state.crossTierSubstitutions += 1
      state.lastCrossSec = sec
    }
    state.reservedSec[index] = -Infinity
    state.reservedCross[index] = false
  }
}

// 정규 경로의 host 1마리 → 기한이 지난 로스터 종(있으면) 또는 host 그대로. 예약만 하고 확정은 note에서.
export function pickRosterRotationType(state, hostType, sec) {
  if (!state || !isRosterRotationHostType(hostType) || !Number.isFinite(sec) || state.types.length === 0) return hostType
  const hostHp = state.hpOf(hostType) ?? 0
  const crossAllowed = !SAME_TIER_ONLY_HOST_SET.has(hostType)
    && state.crossReservedSec !== sec
    && sec - state.lastCrossSec >= state.crossTierCooldownSec
  let same = -1
  let cross = -1
  for (let index = 0; index < state.types.length; index += 1) {
    const due = state.due[index]
    if (due > sec || state.reservedSec[index] === sec) continue
    if (sameTier(state, state.hp[index], hostHp)) {
      if (same < 0 || due < state.due[same]) same = index
    } else if (crossAllowed && !state.shooter[index] && sec - due >= state.graceSec && (cross < 0 || due < state.due[cross])) {
      cross = index
    }
  }
  const pick = same >= 0 ? same : cross
  if (pick < 0) return hostType
  state.reservedSec[pick] = sec
  state.reservedCross[pick] = same < 0
  if (same < 0) state.crossReservedSec = sec
  return state.types[pick]
}

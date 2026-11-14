// 스테이지 로스터 순환 — 2026-11-14 Terry 지시.
//   "스테이지 전체에 걸쳐서 스테이지에 배분된 좀비들이 골고루 분포되게 만들어"
//   "정규 웨이브에 신규좀비가 없고" / "정규 리스폰 웨이브에도 골고루 섞어"
//
// 왜 필요했나: 신규 좀비(E34~E70, 스6은 E19~E21)는 버스트 표의 한두 행(첫 등장·복습)에만 있었고,
// 시간 내내 도는 정규 스폰 — 저밀도 리필(E07×10 + E01×10), 지배 스웜(E01/E02/E05), 스3·스5 반복 증원
// (E01/E07), 탈출구 개방 뒤 오버타임(E01~E07) — 은 전부 기본 E01~E07만 냈다. 그래서 스2·스3 오프닝의
// E37(가까이 가면 사선으로 들이받는 좀비)처럼 "처음에만 나오고 다시는 안 나오는" 종이 생겼다.
//
// 규칙(단일 정본) — 2026-11-14 3차(v3). Terry: "어려워져도 되니까 다 분포시켜" / "최근 만든 다채로운 좀비들을
// 다채롭게 웨이브에 모두 섞어. 난이도보다 구현이 우선." / "적붉은색 체력이 많은 좀비의 소환을 지금의 80%로 줄이고
// 대신 다른 신형 좀비를 넣어". 2차(같은 HP만·사수 계층 밖 금지·30초 쿨다운)는 사수 여럿이 데뷔 뒤 다시 안 나왔다.
//   1. 데뷔 게이트(유지): 한 종의 첫 순환 기한 = 그 스테이지 표의 작성된 첫 등장 + 간격. 소개 전에는 절대 안 나온다.
//   2. 기한이 지난 종은 정규 경로의 기본 잡몹(host) 1마리와 1:1로 바뀐다. 기한이 가장 이른(가장 오래 안 나온) 종부터 —
//      HP가 같은 host는 동률일 때만 우선한다. 사수 포함 어느 host든 바로 받는다(유예·스테이지 전체 쿨다운 없음).
//      간격은 20초(무거운 종 30초). 같은 웨이브(같은 시각)에 한 종은 한 번만.
//   3. 다채로운 웨이브: 한 웨이브의 host 자리 ROSTER_ROTATION_VARIETY_EVERY(5)번째마다, 기한이 지난 종이 없어도 데뷔한 종
//      중 가장 오래 안 나온 종을 넣는다 → 20마리 리필에는 신규 종이 최소 4종 섞인다(데뷔한 종이 그만큼 있으면).
//   3-1. 파손 방지 상한만 둔다: 한 웨이브(같은 시각)에 순환으로 들어가는 사수는 최대 ROSTER_ROTATION_MAX_SHOOTERS_PER_WAVE.
//   4. 탱커 감축: 순환을 거친 뒤에도 E05(진홍 0x9a1818, 70hp 돌진 — 가장 많이 남는 붉은 고체력 좀비)로 남은 정규 스폰은
//      5번째마다 1마리를 데뷔한 신규 종(기한과 무관, 기한이 가장 이른 종부터 = 고르게 순환)으로 바꾼다 → E05는 80%,
//      총 마릿수 그대로. 데뷔한 신규 종이 아직 없으면 E05 그대로 둔다. 형태 버스트(ring/pincer)의 E05도 같은 계수로 센다
//      (pickRosterTankType). 보스·마틸다·보스 소환은 손대지 않는다.
//   5. 확정은 실제 스폰 때만: 고른 종은 같은 시각 안에서만 '예약'되고, 실제로 addEnemies에 들어가
//      noteRosterRotationSpawn이 불릴 때 기한·탱커 계수가 넘어간다. 자리를 못 받아 건너뛴 개체, 20마리가 안 돼 버린
//      저밀도 리필 묶음, 동시 천장에 잘린 개체는 시계를 소모하지 않는다(다음 시각에는 예약이 저절로 풀린다).
// 작성된 등장(첫 등장·복습 행, 형태 버스트, 보스 소환)도 같은 기록 함수로 기한을 다시 잡는다.
//
// 바꾸지 않는 것: 형태 버스트(ring/pincer/swarm/조회 줄/트랙)의 위치·E05 외 타입, 런좀비·경비 크루, 보스, 코인 몬스터,
// 스5 전교 호출 레인 펄스, E06(거대, 320hp). 기본 E02~E07의 도입 사슬은 작성된 그대로다.


import { getBurstEventsForStage, isBossType } from './burstEvents.js'
import { EXPANSION_STAGES } from './expansionContent.js'
import { PROJECTILE_ZOMBIE_BEHAVIORS } from './projectileZombieBehavior.js'

// 탄을 쏘는 종(사수): E04 + 투사체 좀비 중 shot이 있는 종(E56 보건실·E61 급식판·E62 셔틀런·E66 플라나리아·E67 방패는 아님).
export const ROSTER_ROTATION_SHOOTER_TYPES = Object.freeze(new Set([
  'E04',
  ...Object.values(PROJECTILE_ZOMBIE_BEHAVIORS).filter((behavior) => behavior?.shot).map((behavior) => behavior.id),
]))

export const ROSTER_ROTATION_INTERVAL_SEC = 20
// 무거운 종(기본 HP 32 이상)은 30초.
export const ROSTER_ROTATION_HEAVY_INTERVAL_SEC = 30
export const ROSTER_ROTATION_HEAVY_HP = 32
// 파손 방지: 한 웨이브(같은 시각)에 순환으로 들어가는 사수 수 상한(화면이 사수로만 차지 않게).
export const ROSTER_ROTATION_MAX_SHOOTERS_PER_WAVE = 4
// 다채로운 웨이브: 한 웨이브(같은 시각) host 자리 N번째마다 데뷔한 신규 종 1마리(기한 무관).
export const ROSTER_ROTATION_VARIETY_EVERY = 5
// 탱커 감축: 이 타입의 정규 스폰 N번째마다 1마리를 신규 종으로(5 → 80%).
export const ROSTER_ROTATION_TANK_TYPE = 'E05'
export const ROSTER_ROTATION_TANK_REPLACE_EVERY = 5
// 맞바꿀 수 있는 정규 잡몹. E06(거대)·E08(코인)은 넣지 않는다.
export const ROSTER_ROTATION_HOST_TYPES = Object.freeze(['E01', 'E02', 'E03', 'E04', 'E05', 'E07'])
const HOST_SET = new Set(ROSTER_ROTATION_HOST_TYPES)
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
  return HOST_SET.has(type)
}

export function rosterRotationIntervalForHp(hp) {
  return hp >= ROSTER_ROTATION_HEAVY_HP ? ROSTER_ROTATION_HEAVY_INTERVAL_SEC : ROSTER_ROTATION_INTERVAL_SEC
}

// 런 1회분 상태. hpOf(type)는 기본 HP 조회(Enemies.jsx는 ENEMY_STATS를 넘긴다).
export function createRosterRotation(stageId, options = {}) {
  const {
    hpOf = () => 0,
    intervalSec = ROSTER_ROTATION_INTERVAL_SEC,
    heavyIntervalSec = ROSTER_ROTATION_HEAVY_INTERVAL_SEC,
    maxShootersPerWave = ROSTER_ROTATION_MAX_SHOOTERS_PER_WAVE,
    varietyEvery = ROSTER_ROTATION_VARIETY_EVERY,
    tankType = ROSTER_ROTATION_TANK_TYPE,
    tankReplaceEvery = ROSTER_ROTATION_TANK_REPLACE_EVERY,
  } = options
  const debuts = getStageRotationDebuts(stageId)
  const types = Object.keys(debuts)
  const hp = types.map((type) => hpOf(type) ?? 0)
  const interval = hp.map((value) => (value >= ROSTER_ROTATION_HEAVY_HP ? heavyIntervalSec : intervalSec))
  return {
    stageId,
    types,
    hp,
    hpOf,
    interval,
    debut: types.map((type) => debuts[type]),
    shooter: types.map((type) => ROSTER_ROTATION_SHOOTER_TYPES.has(type)),
    maxShootersPerWave,
    varietyEvery,
    // 데뷔 게이트: 작성된 첫 등장 + 간격 전에는 기한이 오지 않는다.
    due: types.map((type, index) => debuts[type] + interval[index]),
    // 같은 시각 안 예약(확정 전): reservedSec[i] === 지금일 때만 reserved[i]('rotate' | 'tank' 목록)가 유효하다.
    reservedSec: types.map(() => -Infinity),
    reserved: types.map(() => []),
    waveSec: -Infinity,
    waveShooters: 0,
    waveSlots: 0,
    tankType,
    tankReplaceEvery,
    // 확정된 탱커 자리(E05로 낸 것 + 신규 종으로 바꾼 것) 수와, 이 시각의 확정 전 탱커 자리 수.
    tankSlots: 0,
    tankPendingSec: -Infinity,
    tankPendingKeep: 0,
    tankPendingSwap: 0,
    substitutions: 0,
    tankReplacements: 0,
  }
}

function reservedNow(state, index, sec) {
  return state.reservedSec[index] === sec && state.reserved[index].length > 0
}

function reserve(state, index, sec, kind) {
  if (state.reservedSec[index] !== sec) {
    state.reservedSec[index] = sec
    state.reserved[index] = []
  }
  state.reserved[index].push(kind)
  if (state.shooter[index]) state.waveShooters += 1
}

function syncWave(state, sec) {
  if (state.waveSec !== sec) {
    state.waveSec = sec
    state.waveShooters = 0
    state.waveSlots = 0
  }
  if (state.tankPendingSec !== sec) {
    state.tankPendingSec = sec
    state.tankPendingKeep = 0
    state.tankPendingSwap = 0
  }
}

// 실제로 스폰된 개체(어느 경로든)만 기록한다. 로스터 종이면 기한을 다시 잡고, 이 시각에 예약해 둔 교체였으면 확정한다.
export function noteRosterRotationSpawn(state, type, sec) {
  if (!state || !Number.isFinite(sec)) return
  if (type === state.tankType) {
    if (state.tankPendingSec === sec && state.tankPendingKeep > 0) {
      state.tankPendingKeep -= 1
      state.tankSlots += 1
    }
    return
  }
  const index = state.types.indexOf(type)
  if (index < 0) return
  state.due[index] = Math.max(state.due[index], sec + state.interval[index])
  if (!reservedNow(state, index, sec)) return
  const kind = state.reserved[index].shift()
  state.substitutions += 1
  if (kind === 'tank' && state.tankPendingSec === sec && state.tankPendingSwap > 0) {
    state.tankPendingSwap -= 1
    state.tankSlots += 1
    state.tankReplacements += 1
  }
}

function pickRotation(state, hostType, sec) {
  const hostHp = state.hpOf(hostType) ?? 0
  const shooterRoom = state.waveShooters < state.maxShootersPerWave
  let best = -1
  for (let index = 0; index < state.types.length; index += 1) {
    const due = state.due[index]
    if (due > sec || reservedNow(state, index, sec)) continue
    if (state.shooter[index] && !shooterRoom) continue
    if (best < 0 || due < state.due[best] || (due === state.due[best] && state.hp[index] === hostHp && state.hp[best] !== hostHp)) best = index
  }
  return best
}

// 기한과 무관하게 데뷔한 종 중 기한이 가장 이른(가장 오래 안 나온) 종(다채로운 웨이브·탱커 자리용).
// 같은 시각에 아직 예약 안 된 종 → 사수 상한 안의 종을 먼저 쓴다.
function pickLeastRecentDebuted(state, sec) {
  const shooterRoom = state.waveShooters < state.maxShootersPerWave
  let best = -1
  let bestRank = Infinity
  for (let index = 0; index < state.types.length; index += 1) {
    if (sec < state.debut[index]) continue
    const rank = (reservedNow(state, index, sec) ? 2 : 0) + (state.shooter[index] && !shooterRoom ? 1 : 0)
    if (rank < bestRank || (rank === bestRank && state.due[index] < state.due[best])) {
      best = index
      bestRank = rank
    }
  }
  return best
}

function takeTankSlot(state, hostType, sec) {
  if (hostType !== state.tankType || !(state.tankReplaceEvery > 0)) return hostType
  const slot = state.tankSlots + state.tankPendingKeep + state.tankPendingSwap
  if ((slot + 1) % state.tankReplaceEvery === 0) {
    const pick = pickLeastRecentDebuted(state, sec)
    if (pick >= 0) {
      reserve(state, pick, sec, 'tank')
      state.tankPendingSwap += 1
      return state.types[pick]
    }
  }
  state.tankPendingKeep += 1
  return hostType
}

// 정규 경로의 host 1마리 → 기한이 지난 로스터 종(있으면) 또는 host 그대로. 그대로 남은 E05는 탱커 계수를 탄다.
// 예약만 하고 확정은 note에서.
export function pickRosterRotationType(state, hostType, sec) {
  if (!state || !isRosterRotationHostType(hostType) || !Number.isFinite(sec)) return hostType
  syncWave(state, sec)
  state.waveSlots += 1
  let pick = state.types.length > 0 ? pickRotation(state, hostType, sec) : -1
  if (pick < 0 && state.varietyEvery > 0 && state.waveSlots % state.varietyEvery === 0) {
    pick = pickLeastRecentDebuted(state, sec)
    // 이미 이 웨이브에 들어간 종이거나 사수 상한이면 다채로움 몫으로 겹쳐 넣지 않는다.
    if (pick >= 0 && (reservedNow(state, pick, sec) || (state.shooter[pick] && state.waveShooters >= state.maxShootersPerWave))) pick = -1
  }
  if (pick < 0) return takeTankSlot(state, hostType, sec)
  reserve(state, pick, sec, 'rotate')
  return state.types[pick]
}

// 형태 버스트(ring/pincer 등)의 E05: 위치·나머지는 작성 그대로, 탱커 계수만 탄다(N번째마다 신규 종 1마리).
export function pickRosterTankType(state, hostType, sec) {
  if (!state || hostType !== state.tankType || !Number.isFinite(sec)) return hostType
  syncWave(state, sec)
  return takeTankSlot(state, hostType, sec)
}

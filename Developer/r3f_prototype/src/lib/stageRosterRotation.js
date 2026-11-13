// 스테이지 로스터 순환 — 2026-11-14 Terry 지시.
//   "스테이지 전체에 걸쳐서 스테이지에 배분된 좀비들이 골고루 분포되게 만들어"
//   "정규 웨이브에 신규좀비가 없고" / "정규 리스폰 웨이브에도 골고루 섞어"
//
// 왜 필요했나: 신규 좀비(E34~E70, 스6은 E19~E21)는 버스트 표의 한두 행(첫 등장·복습)에만 있었고,
// 시간 내내 도는 정규 스폰 — 저밀도 리필(E07×10 + E01×10), 지배 스웜(E01/E02/E05), 스3·스5 반복 증원
// (E01/E07), 탈출구 개방 뒤 오버타임(E01~E07) — 은 전부 기본 E01~E07만 냈다. 게다가 캐치업 시계가
// 빈 화면에서 버스트 표를 앞당겨 소비하므로, 실력 있는 플레이어일수록 표를 일찍 다 쓰고 남은 시간은
// 리필만 보게 된다. 그래서 스2·스3 오프닝의 E37(가까이 가면 사선으로 들이받는 좀비)처럼
// "처음에만 나오고 다시는 안 나오는" 종이 생겼다.
//
// 규칙(단일 정본): 스테이지 로스터의 모든 신규 종은 실제 시간 ROSTER_ROTATION_INTERVAL_SEC(40초, 32hp 이상
// 무거운 종은 55초)마다 적어도 한 번 다시 나온다. 정규 스폰 경로가 기본 잡몹(host) 1마리를 내려는 순간 기한이 지난 종이
// 있으면 그 1마리를 그 종으로 맞바꾼다 — 1:1 교체라 마릿수·웨이브 크기·탈출 뒤 +10% 성장·동시 천장은
// 그대로다. HP가 같은 host(8=E01 · 10=E03 · 16=E07 · 32=E04 · 70=E02/E05)를 먼저 고르고, 같은 HP host가
// ROSTER_ROTATION_TIER_GRACE_SEC(10초) 동안 안 오면 아무 host로 바꾼다(대체 HP 차이는 그때만 생긴다).
// 버스트 표의 작성된 등장(첫 등장·복습 행, 형태 버스트, 보스 소환)도 같은 시계에 '등장'으로 기록되므로
// 이미 최근에 나온 종을 굳이 더 끼워 넣지 않는다.
//
// 바꾸지 않는 것: 형태 버스트(ring/pincer/swarm/조회 줄/트랙), 런좀비·경비 크루, 보스, 코인 몬스터,
// 스5 전교 호출 레인 펄스, E06(거대, 320hp 단독 계층) host. E04는 같은 32hp 원거리 신규 종하고만 바꾼다.
// 기본 E02~E07의 도입 사슬(예: 스1 E02@60·E05@120·E06@168)은 작성된 그대로 둔다.

import { getBurstEventsForStage, isBossType } from './burstEvents.js'
import { EXPANSION_STAGES } from './expansionContent.js'

export const ROSTER_ROTATION_INTERVAL_SEC = 40
// 무거운 종(기본 HP 32 이상 — E04/E02/E05 host 계층)은 55초. 가벼운 host 자리에 들어가면 HP가 오르므로
// 빈도를 조금 낮춰 총 HP 상승을 억제한다. 55초 + 유예 10초여도 80초짜리 3등분마다 한 번은 나온다.
export const ROSTER_ROTATION_HEAVY_INTERVAL_SEC = 55
export const ROSTER_ROTATION_HEAVY_HP = 32
export const ROSTER_ROTATION_TIER_GRACE_SEC = 10
// 맞바꿀 수 있는 정규 잡몹. E06(거대)·E08(코인)은 넣지 않는다.
export const ROSTER_ROTATION_HOST_TYPES = Object.freeze(['E01', 'E02', 'E03', 'E05', 'E07'])
// E04(원거리)는 HP가 같은 원거리 신규 종(32hp: E63·E52·E54)과만 맞바꾼다 — 사선 압박(포화점 4기)이 그대로다.
// 유예가 지나도 다른 HP 종으로는 바꾸지 않는다.
export const ROSTER_ROTATION_SAME_TIER_ONLY_HOST_TYPES = Object.freeze(['E04'])
const HOST_SET = new Set(ROSTER_ROTATION_HOST_TYPES)
const SAME_TIER_ONLY_HOST_SET = new Set(ROSTER_ROTATION_SAME_TIER_ONLY_HOST_TYPES)
// 기본 E01~E08과 크루(RZT/RZG/RZL/RZC)는 순환 대상이 아니다.
const NON_ROSTER_TYPE = /^(E0[1-8]|RZ[A-Z])$/

const rosterCache = new Map()

// 스테이지에 배분된 순환 대상 종 = 그 스테이지 버스트 표에 나오는 신규 종(스6 등 확장은 enemyIds).
// 첫 작성 등장 시각 순서로 정렬한다 — 시작 기한도 이 순서로 엇갈려 작성된 도입 순서의 결을 유지한다.
export function getStageRotationRoster(stageId) {
  if (rosterCache.has(stageId)) return rosterCache.get(stageId)
  const expansion = EXPANSION_STAGES[stageId]
  const firstSec = new Map()
  for (const evt of getBurstEventsForStage(stageId) ?? []) {
    for (const type of [evt.type, ...(evt.mixedTypes ?? [])]) {
      if (!type || isBossType(type)) continue
      if (expansion ? !expansion.enemyIds.includes(type) : NON_ROSTER_TYPE.test(type)) continue
      if (!firstSec.has(type) || evt.sec < firstSec.get(type)) firstSec.set(type, evt.sec)
    }
  }
  const roster = Object.freeze([...firstSec.entries()]
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .map(([type]) => type))
  rosterCache.set(stageId, roster)
  return roster
}

export function isRosterRotationHostType(type) {
  return HOST_SET.has(type) || SAME_TIER_ONLY_HOST_SET.has(type)
}

// 런 1회분 상태. hpOf(type)는 기본 HP 조회(Enemies.jsx는 ENEMY_STATS를 넘긴다).
// 시작 기한은 0 ~ 40초 사이에 로스터 순서대로 엇갈려 첫 40초 안에 모든 종이 한 번씩 기한을 맞는다.
export function createRosterRotation(stageId, options = {}) {
  const {
    hpOf = () => 0,
    intervalSec = ROSTER_ROTATION_INTERVAL_SEC,
    heavyIntervalSec = ROSTER_ROTATION_HEAVY_INTERVAL_SEC,
    graceSec = ROSTER_ROTATION_TIER_GRACE_SEC,
  } = options
  const types = getStageRotationRoster(stageId)
  const n = types.length
  const hp = types.map((type) => hpOf(type) ?? 0)
  return {
    stageId,
    graceSec,
    types,
    hp,
    hpOf,
    interval: hp.map((value) => (value >= ROSTER_ROTATION_HEAVY_HP ? heavyIntervalSec : intervalSec)),
    due: types.map((_, index) => (n > 0 ? (index / n) * intervalSec : 0)),
    substitutions: 0,
  }
}

// 어떤 경로로든(작성된 행·형태·소환·순환) 로스터 종이 나왔으면 기한을 다시 잡는다.
export function noteRosterRotationSpawn(state, type, sec) {
  if (!state || !Number.isFinite(sec)) return
  const index = state.types.indexOf(type)
  if (index < 0) return
  state.due[index] = Math.max(state.due[index], sec + state.interval[index])
}

// 정규 경로의 host 1마리 → 기한이 지난 로스터 종(있으면) 또는 host 그대로.
export function pickRosterRotationType(state, hostType, sec) {
  if (!state || !isRosterRotationHostType(hostType) || !Number.isFinite(sec) || state.types.length === 0) return hostType
  const hostHp = state.hpOf(hostType) ?? 0
  const sameTierOnly = SAME_TIER_ONLY_HOST_SET.has(hostType)
  let sameTier = -1
  let anyTier = -1
  for (let index = 0; index < state.types.length; index += 1) {
    const due = state.due[index]
    if (due > sec) continue
    if (state.hp[index] === hostHp && (sameTier < 0 || due < state.due[sameTier])) sameTier = index
    if (!sameTierOnly && sec - due >= state.graceSec && (anyTier < 0 || due < state.due[anyTier])) anyTier = index
  }
  const pick = sameTier >= 0 ? sameTier : anyTier
  if (pick < 0) return hostType
  state.due[pick] = sec + state.interval[pick]
  state.substitutions += 1
  return state.types[pick]
}

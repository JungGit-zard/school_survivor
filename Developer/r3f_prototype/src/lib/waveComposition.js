// 웨이브 구성 규칙 — 2026-11-21 Terry 지시·승인. 스테이지 1~6에서 lib/stageRosterRotation.js(11-14 "다 분포시켜" 순환)를 대신한다.
//   "여러 종류의 좀비가 랜덤으로 섞여 나와서 어떤 좀비가 뭘 하는지 모르겠다. 웨이브마다 밥줄 좀비 한 종이 70% 정도,
//    나머지 몇 종은 특히 강해 보이고 다른 역할을 하는 좀비로."
// 표는 lib/waveStandard.js(스테이지별 W1~W10: 밥줄 1종 + 특수 2~3종). 기획 정본 F:/ezs-work/backup/wave_standard_20261121/plan.md.
//
// 왜 바꿨나: 옛 순환은 한 번 나온 종을 20초마다 다시 넣고 웨이브 5마리째마다 아무 신규 종을 끼워서, 150초쯤이면 그 판의
// 모든 종(15~29종)이 한 화면에 섞였다(화면 안 동시 종 수 중앙값 12~31).
//
// v2(2026-11-22, balanceqa 게이트 실패 뒤): HP만 맞추던 v1은 몸이 더 빠르고 세게 때리는 종으로 바뀌어(E01 → E07 밥줄)
// 스1·스3·스4가 어려워지고, 원거리 몸이 밥줄로 바뀌어 스5가 쉬워졌다. v2는 몸의 '급'(위협)을 지킨다.
//
// 규칙(단일 정본):
//   0. (v2) 먼저 옛 순환(트렁크 규칙)이 이 자리에 낼 종(t0)을 정한다 — 그래야 가벼움·중간·무거움·원거리 몸의 수가 트렁크와 같다.
//      아래 규칙은 t0을 '몸'으로 보고 이 웨이브의 종으로 바꾼다(장부도 t0 기준).
//   1. 웨이브 = 경과 30초 한 칸. 240초 전 W1~W8, 이후 W9·W10을 번갈아(복습 웨이브). 칸이 바뀌면 웨이브 계수를 새로 센다.
//   2. 몸의 급(classOf): 원거리(탄을 쏘는 종) · 거대(기본 HP 200 이상 — E06) · 무거움(HP 60 이상) · 중간(HP 14 이상 — E07 급)
//      · 가벼움(그 밖 — E01·E03 급).
//   3. 정규 경로(작성 행·형태 버스트·반복 증원·저밀도 보충·지배 스웜·오버타임)의 몸 하나가 나올 때:
//      - 그 웨이브 밥줄이나 특수 종이면 그대로(가벼운 특수는 몫 35%까지, 그 밖 급은 50%까지 — 넘으면 가벼운 것만 밥줄로).
//      - 가벼운 몸 → 밥줄. 단 특수 몫이 30%보다 모자라고 같은 급(가벼움) 특수가 있으면 그 특수로.
//      - 거대·무거움·원거리 몸 → 그 웨이브의 같은 급 특수(가장 적게 나온 종 → 체급이 가까운 종). 원거리는 장판·포격 특수도 받는다.
//        같은 급 특수가 없으면: 기본 종(E02·E04·E05·E06)은 제 종 그대로 남고(위협·경험치 그대로), 신규 종은 같은 급 기본 종
//        (거대 E06 · 무거움 E02 · 원거리 E04)으로 바뀐다. 이렇게 남은 기본 종도 특수 몫에 센다.
//      - 중간 몸(E07 급) → 같은 급 특수 → 없으면 기본 E07은 제 종 그대로, 신규 중간 종은 (특수 몫 50% 안에서) 가벼운 특수 → 밥줄.
//        밥줄은 바뀐 몸보다 빠르거나 세게 때리지 않는다.
//      - 신규 특수의 급별 동시 생존 상한(WAVE_NOVEL_SPECIAL_ALIVE_CAP, 스테이지 예외 WAVE_STAGE_ALIVE_CAP_OVERRIDE)을 넘는 몸은
//        기본 종으로 남는다 — 트렁크가 여러 신규 종에 흩어 넣던 몸을 한 종이 몰아 받지 않게.
//      - 같은 옷(look) 동시 10마리 규칙: 특수가 살아 있는 수(+같은 시각 예약)가 10 × 옷 수에 닿았으면 그 특수는 고르지 않는다.
//   4. 맞바꿈만 한다 — 마릿수 그대로, HP는 장부로 지킨다:
//      - 밥줄로 바뀐 몸은 원래 몸 HP를 받는다(밥줄 기본 HP의 0.5~2배 안). 넘치거나 모자란 HP는 장부로 넘긴다.
//      - 특수는 "강화형": 보기 크기 ×1.2(판정 크기는 그대로 — visualScale은 그림에만 쓴다), 장부에 빚이 있으면
//        기본 HP의 최대 ×1.6까지 받아 간다 — 가벼운·중간 특수만(v1 ×2.5·전 특수 강화는 무거운 특수 접촉 피해를 키웠다).
//   5. 손대지 않는 몸: 보스·치프·코인(E08)·런좀비/경비/트렌치코트 크루(RZ*)·편대 종(E105 2인3각·E106 기마전)·마틸다,
//      그리고 순환을 부르지 않는 경로(스6 조회 줄·트랙 고정 좌표, 스5 호출 레인, 보스 소환, 분열·복사·객차).
//   6. 결정론: 난수를 쓰지 않는다(같은 시드 = 같은 스폰).
//   8. (v3, 2026-11-22 — Terry "웨이브마다 밥줄 70%") 밥줄 몫: 밥줄이 아닌 몸은 웨이브의 33%까지(WAVE_NONFODDER_SHARE_MAX).
//      넘치는 몸은 밥줄이 된다 — 예외: 그 웨이브에 처음 나오는 표의 특수, 거대(E06), 원거리(탄 위협은 옮길 수 없다).
//      밥줄로 옮긴 몸의 위협(HP × 속도·접촉 피해 차)은 위협 장부(threatDebt)로 그 뒤 특수의 HP가 된다(가벼움·중간 ×1.6, 무거움 ×1.8).
//      밥줄이 바뀐 몸보다 위협이 크면(음의 장부) 밥줄 HP를 기본의 0.5배까지 덜어 갚는다.
//   9. (v3) 밥줄 보충: 원거리·거대 몸 때문에 밥줄 아닌 몫이 36%를 넘으면 그 몸 옆에 밥줄 1마리를 더 낸다(HP는 장부에서 빼고 경험치 0).
//      이 규칙이 고른 몸만 — 보스 소환·고정 편대는 보충하지 않는다.
//  10. (v3) 바뀐 몸은 원래 몸(t0)의 처치 경험치를 준다(enemyEntityPool.xpOverride) — 레벨 흐름은 트렁크 그대로.
//  11. (v3) 스5 호출 레인도 웨이브 구성을 탄다(composeFixedSpawnType, 규칙 0 없이). 작성 행의 신규 특수는 스폰 시계 칸의 특수여도
//      특수로 남는다(isSpecialNear — 따라잡기·스폰 보류로 행이 경과 시간 칸과 어긋나도 그 웨이브 특수가 사라지지 않게).
//   7. 확정은 실제 스폰 때만: pick은 같은 시각 안에서만 '예약'하고, noteWaveSpawn(실제로 addEnemies에 들어간 몸)이 계수·장부를 넘긴다.
//      150 천장에 잘리거나 자리를 못 받은 몸은 세지 않는다.

import { WAVE_SPECIAL_ROLE, WAVE_STANDARD, WAVE_STANDARD_OVERTIME_START_SEC, WAVE_STANDARD_WAVE_SEC } from './waveStandard.js'
import { isChiefType } from './stageChiefContent.js'
import { LOOK_ALIVE_LIMIT, zombieLookCount } from './zombieLooks.js'
import { getSpawnCatchUpOffsetSec } from './spawnCatchUp.js'
import { ROSTER_ROTATION_SHOOTER_TYPES, noteRosterRotationSpawn, pickRosterRotationType, pickRosterTankType } from './stageRosterRotation.js'

export const WAVE_SPECIAL_SHARE = 0.3
export const WAVE_SPECIAL_SHARE_MAX = 0.35
export const WAVE_CLASS_SPECIAL_SHARE_MAX = 0.5
export const WAVE_SPECIAL_SCALE_MUL = 1.2
export const WAVE_SPECIAL_HP_MUL_MAX = 1.6
export const WAVE_FODDER_HP_RANGE = Object.freeze([0.5, 2])
// v3(2026-11-22): 한 웨이브에서 밥줄이 아닌 몸의 최대 몫(밥줄 목표 65~70%). 넘치는 몸은 밥줄이 되고 그 위협은 특수에게 간다.
export const WAVE_NONFODDER_SHARE_MAX = 0.33
// 웨이브 칸을 스폰 시계로 셀지(false = 경과 시간, v2와 같음). 아래 sync 주석 참고.
export const WAVE_USE_SPAWN_CLOCK = false
const WAVE_QUOTA_KEEP_CLASSES = new Set(['giant', 'ranged'])
// 규칙 9: 밥줄로 못 바꾸는 몸 하나 옆에 더 내는 밥줄 수 상한과 놓는 거리(u).
export const WAVE_EXTRA_FODDER_MAX = 1
export const WAVE_EXTRA_FODDER_OFFSET = 0.45
// 보충은 밥줄 아닌 몫이 이 값을 넘을 때만(밥줄 몫 규칙 33%보다 조금 느슨 — 보충 몸 수를 줄여 위협 증가를 묶는다. 사전 점검:
// 33% 기준 보충은 스5 약한 봇 사망 +5%p).
export const WAVE_EXTRA_TRIGGER_SHARE = 0.36
const NO_EXTRA = Object.freeze([])
// v3 위협 장부로 특수가 더 받을 수 있는 HP 배율 상한(급별). 원거리·거대는 받지 않는다(탄 몰림·거대 접촉 — 게이트 1).
export const WAVE_THREAT_HP_MUL_MAX = Object.freeze({ light: 1.6, mid: 1.6, heavy: 1.8, ranged: 1, giant: 1 })
// 특수 상한 판정의 최소 분모 — 웨이브 첫 행이 특수 행이어도(예: 스1 120초 E05×2) 처음 몇 마리는 특수로 남는다.
export const WAVE_SHARE_MIN_BODIES = 10
export const WAVE_GIANT_HP = 200
export const WAVE_HEAVY_HP = 60
export const WAVE_MID_HP = 14
// 같은 급 특수가 없을 때 신규 종이 바뀌는 기본 종.
export const WAVE_BASIC_FALLBACK = Object.freeze({ giant: 'E06', heavy: 'E02', ranged: 'E04' })
// 신규 특수 종의 급별 동시 생존 상한(트렁크 순환이 신규 종을 흩어 넣던 양과 비슷하게).
export const WAVE_NOVEL_SPECIAL_ALIVE_CAP = Object.freeze({ giant: 1, heavy: 3, ranged: 4, mid: 4, light: 4 })
// 스테이지별 예외: 스5(교무실)는 트렁크에서 신규 사수가 가장 많은 판이라 원거리 상한을 8로(4면 넘치는 몸이 약한 E04가 돼
// 약한 봇 사망률이 84% → 60%로 떨어졌다 — 사전 점검 2026-11-22). v3(웨이브 칸 = 스폰 시계)에서는 8이면 회피 봇 탄 사망이 +9%p라 6. 스3(체육관)은 반대로 무거운 신규 특수(E40 휘두르기)·원거리가
// 몰려 강한 봇 사망이 +8~11%p였다 → 무거움 2·원거리 3.
export const WAVE_STAGE_ALIVE_CAP_OVERRIDE = Object.freeze({
  stage3: Object.freeze({ heavy: 2, ranged: 3 }),
  stage5: Object.freeze({ ranged: 6 }),
})
const BASIC_TYPES = new Set(['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07'])

// XSG·XSL = 크리스마스 한정 산타(lib/santaEvent.js) — E08처럼 웨이브 예산 밖 보상 몸이라 구성 규칙을 타지 않는다.
const NEVER_COMPOSED = new Set(['E08', 'E105', 'E106', 'XSG', 'XSL'])
export function isWaveExemptType(type) {
  return typeof type !== 'string' || /^B\d/.test(type) || /^RZ/.test(type) || NEVER_COMPOSED.has(type) || isChiefType(type)
}

export function hasWaveStandard(stageId) {
  return Boolean(WAVE_STANDARD[stageId])
}

// 경과 초 → 웨이브 번호(0-based). 240초 전 0~7, 이후 8·9 반복.
export function waveIndexAt(sec) {
  const s = Math.max(0, Number(sec) || 0)
  if (s < WAVE_STANDARD_OVERTIME_START_SEC) return Math.min(7, Math.floor(s / WAVE_STANDARD_WAVE_SEC))
  return 8 + (Math.floor((s - WAVE_STANDARD_OVERTIME_START_SEC) / WAVE_STANDARD_WAVE_SEC) % 2)
}
export function getStageWave(stageId, sec) {
  const waves = WAVE_STANDARD[stageId]
  return waves ? waves[waveIndexAt(sec)] : null
}

// options: hpOf(type) = 그 스테이지 실효 기본 HP, statsOf(type) = ENEMY_STATS 행({hp, scale}), aliveOf(type) = 지금 살아 있는 수.
export function createWaveComposer(stageId, options = {}) {
  const waves = WAVE_STANDARD[stageId]
  if (!waves) return null
  const { hpOf = () => 0, statsOf = () => null, aliveOf = () => 0, rotation = null } = options
  return {
    kind: 'wave',
    stageId,
    // 옛 순환(트렁크 규칙) 상태: 먼저 트렁크가 냈을 종(t0)을 정하고, 그 종의 급을 지켜 이 웨이브 종으로 바꾼다(v2 규칙 0).
    rotation,
    waves,
    hpOf,
    statsOf,
    aliveOf,
    windowId: -1,
    wave: null,
    bodies: 0,
    specials: 0,
    spawnedThisWave: new Map(),
    pendingSec: -Infinity,
    pending: new Map(), // final type → [host type…] (같은 시각 예약)
    pendingBodies: 0,
    pendingSpecials: 0,
    pendingLast: null,
    pendingLastSpecial: false,
    debt: 0,
    // v3 위협 장부: 몸을 바꿀 때 빠진(또는 더해진) 위협 = 원래 몸 HP × (속도 × 접촉 피해 차). 특수 HP로 갚는다.
    threatDebt: 0,
    threatHp: 0,
    extraPending: 0,
    extraSerial: 0,
    extraFodder: 0,
    // 기록(테스트·프로브용)
    converted: 0,
    buffed: 0,
    hpIn: 0,
    hpOut: 0,
  }
}

function sync(state, sec) {
  // 웨이브 칸은 경과 시간 기준(v2와 같다). 스폰 시계(경과 + 따라잡기 앞당김) 기준도 시험했으나 작성 행의 사수가 제 웨이브에 몰려
  // 회피 봇 탄 사망이 늘었다(사전 점검 2026-11-22: 스4 회피 v2 13% → 37%, 스5 +9~12%p). WAVE_USE_SPAWN_CLOCK로 남겨 둔다.
  const waveSec = Math.max(0, sec + (WAVE_USE_SPAWN_CLOCK ? getSpawnCatchUpOffsetSec() : 0))
  const windowId = Math.floor(waveSec / WAVE_STANDARD_WAVE_SEC)
  if (state.windowId !== windowId) {
    state.windowId = windowId
    state.wave = state.waves[waveIndexAt(waveSec)]
    state.bodies = 0
    state.specials = 0
    state.spawnedThisWave.clear()
  }
  // 작성 행은 스폰 시계(경과 + 따라잡기 앞당김)로 터져 경과 시간 칸과 어긋난다(스4 168초 행이 경과 120초에 터진 판이 있다). 그 행의
  // 신규 특수가 스폰 시계 칸의 특수면 특수로 남긴다(isSpecialNear) — 웨이브 칸 자체는 경과 시간 그대로.
  state.spawnClockWave = state.waves[waveIndexAt(Math.max(0, sec + getSpawnCatchUpOffsetSec()))]
  if (state.pendingSec !== sec) {
    state.pendingSec = sec
    state.pending.clear()
    state.pendingBodies = 0
    state.pendingSpecials = 0
  }
}

function isSpecialOf(wave, type) {
  return wave.specials.includes(type)
}
// 이 웨이브 특수이거나, 스폰 시계 칸의 특수가 어긋나 온 것(작성 행 — 표의 신규 특수 몸이 직접 올 때만 쓴다).
function isSpecialNear(state, type) {
  return isSpecialOf(state.wave, type) || Boolean(state.spawnClockWave && isSpecialOf(state.spawnClockWave, type))
}

function specialShareWith(state, extra, minBodies = 1) {
  const bodies = Math.max(minBodies, state.bodies + state.pendingBodies + 1)
  return (state.specials + state.pendingSpecials + extra) / bodies
}

function underLookCap(state, type) {
  // 같은 시각에 이미 예약한 몸도 센다(한 묶음이 한도를 한꺼번에 넘지 않게).
  return state.aliveOf(type) + (state.pending.get(type)?.length ?? 0) < LOOK_ALIVE_LIMIT * zombieLookCount(type)
}

// 속도 × 접촉 피해(위협 장부의 단위 — HP 1당 위협).
function rateOf(state, type) {
  const st = state.statsOf(type)
  return (st?.speed ?? 0) * (st?.damage ?? 0)
}

// 몸의 급. 원거리 > 거대 > 무거움 > 중간 > 가벼움.
export function waveClassOf(state, type) {
  if (ROSTER_ROTATION_SHOOTER_TYPES.has(type)) return 'ranged'
  const hp = state.statsOf(type)?.hp ?? 0
  if (hp >= WAVE_GIANT_HP) return 'giant'
  if (hp >= WAVE_HEAVY_HP) return 'heavy'
  if (hp >= WAVE_MID_HP) return 'mid'
  return 'light'
}

// 같은 급 특수 중 이 웨이브에 가장 적게 나온 종 → 체급이 가까운 종. 원거리 몸은 장판·포격 특수(같은 '멀리서 때리는' 몫)도 받는다.
function chooseSpecial(state, hostType, cls) {
  const hostHp = Math.max(1, state.hpOf(hostType) || 1)
  let best = null
  let bestKey = null
  for (const type of state.wave.specials) {
    if (isWaveExemptType(type) || !underLookCap(state, type)) continue
    const typeCls = waveClassOf(state, type)
    // 신규 특수의 동시 생존 상한(급별): 무거운 신규 특수(휘두르기·돌진 공격이 있다)가 덩치 자리를 몰아 받으면 접촉 피해가 커진다
    // (사전 점검 스3 E42 4.9 → 8마리, 접촉 피해 ×3.7). 넘치는 몸은 기본 종(E02·E05·E04 …)으로 남는다.
    const aliveCap = BASIC_TYPES.has(type) ? Infinity : (WAVE_STAGE_ALIVE_CAP_OVERRIDE[state.stageId]?.[typeCls] ?? WAVE_NOVEL_SPECIAL_ALIVE_CAP[typeCls] ?? Infinity)
    if (state.aliveOf(type) + (state.pending.get(type)?.length ?? 0) >= aliveCap) continue
    const areaForRanged = cls === 'ranged' && WAVE_SPECIAL_ROLE[type] === '장판·포격'
    if (typeCls !== cls && !areaForRanged) continue
    const hp = Math.max(1, state.hpOf(type) || 1)
    const used = (state.spawnedThisWave.get(type) ?? 0) + (state.pending.get(type)?.length ?? 0)
    const key = [areaForRanged ? 1 : 0, used, Math.abs(Math.log(hp / hostHp))]
    if (!best || key[0] < bestKey[0] || (key[0] === bestKey[0] && (key[1] < bestKey[1] || (key[1] === bestKey[1] && key[2] < bestKey[2])))) {
      best = type
      bestKey = key
    }
  }
  return best
}

function reserve(state, host, final, special) {
  const list = state.pending.get(final) ?? []
  list.push(host)
  state.pending.set(final, list)
  state.pendingBodies += 1
  if (special) state.pendingSpecials += 1
  state.pendingLast = final
  state.pendingLastSpecial = special
  return final
}

// 방금 한 예약 하나를 되돌린다(v3 밥줄 몫 규칙이 그 몸을 밥줄로 다시 고를 때).
function unreserve(state, final) {
  const list = state.pending.get(final)
  if (!list?.length) return
  list.pop()
  state.pendingBodies -= 1
  if (state.pendingLastSpecial) state.pendingSpecials = Math.max(0, state.pendingSpecials - 1)
  state.pendingLast = null
}

// 정규 경로 몸 하나의 종을 정한다(예약만). 표가 없는 스테이지·손대지 않는 몸은 그대로.
// fixed = true: 트렁크에서 순환을 타지 않던 고정 행(스5 호출 레인)을 웨이브 구성에만 맞춘다(규칙 0 건너뜀 — 트렁크 종 그대로가 t0).
export function pickWaveType(state, hostType, sec, formation = false, fixed = false) {
  if (!state || state.kind !== 'wave' || !Number.isFinite(sec) || isWaveExemptType(hostType)) return hostType
  sync(state, sec)
  // 규칙 0: 트렁크(옛 순환)가 이 자리에 냈을 종. 급 구성(가벼움·중간·무거움·원거리)이 트렁크와 같아져 위협·경험치가 맞는다.
  const type = fixed ? hostType : state.rotation
    ? (formation ? pickRosterTankType(state.rotation, hostType, sec) : pickRosterRotationType(state.rotation, hostType, sec))
    : hostType
  const final = pickByClass(state, type, type === hostType)
  // v3 규칙 8(밥줄 몫): 밥줄이 아닌 몸(특수 + 제 종으로 남은 기본 종)이 웨이브의 WAVE_NONFODDER_SHARE_MAX를 넘으면 그 몸도 밥줄로.
  // 예외: 이 웨이브에 아직 한 번도 안 나온 표의 특수(웨이브마다 특수가 꼭 보이게), 거대(E06), 원거리 몸. 원거리를 밥줄로 바꾸면
  // 탄 위협이 사라진다 — 사전 점검 스5 약한 봇 사망률 83% → 44%, 남은 사수 HP ×1.8로 돌려줘도 83% → 55%.
  // 밥줄로 옮긴 위협은 noteWaveSpawn의 위협 장부가 같은 웨이브 이후 특수의 HP로 돌려준다("적고 센 특수").
  const fodder = state.wave.fodder
  if (final !== fodder && final === state.pendingLast) {
    const firstShow = isSpecialNear(state, final) && !state.spawnedThisWave.get(final) && (state.pending.get(final)?.length ?? 0) <= 1
    const t0Cls = waveClassOf(state, type)
    if (!firstShow && !WAVE_QUOTA_KEEP_CLASSES.has(t0Cls) && specialShareWith(state, 0, WAVE_SHARE_MIN_BODIES) > WAVE_NONFODDER_SHARE_MAX) {
      unreserve(state, final)
      return reserve(state, type, fodder, false)
    }
  }
  return final
}

function pickByClass(state, type, direct = false) {
  const wave = state.wave
  const fodder = wave.fodder
  const cls = waveClassOf(state, type)
  if (type === fodder) {
    if (specialShareWith(state, 0) < WAVE_SPECIAL_SHARE) {
      const special = chooseSpecial(state, type, 'light')
      if (special) return reserve(state, type, special, true)
    }
    return reserve(state, type, fodder, false)
  }
  if (direct && !BASIC_TYPES.has(type) ? isSpecialNear(state, type) : isSpecialOf(wave, type)) {
    const cap = cls === 'light' ? WAVE_SPECIAL_SHARE_MAX : WAVE_CLASS_SPECIAL_SHARE_MAX
    if ((cls !== 'light' || specialShareWith(state, 1, WAVE_SHARE_MIN_BODIES) <= cap) && underLookCap(state, type)) return reserve(state, type, type, true)
    if (cls === 'light') return reserve(state, type, fodder, false)
  }
  if (cls === 'light') {
    if (specialShareWith(state, 0) < WAVE_SPECIAL_SHARE) {
      const special = chooseSpecial(state, type, 'light')
      if (special) return reserve(state, type, special, true)
    }
    return reserve(state, type, fodder, false)
  }
  const special = chooseSpecial(state, type, cls)
  if (special) return reserve(state, type, special, true)
  if (cls === 'mid') {
    // 중간 몸(E07 급 — 빠르고 세게 때림)은 같은 급 특수가 없으면: 기본 E07은 제 종 그대로(트렁크와 같은 위협·속도 — 밥줄 E01로
    // 바꾸면 느린 무리가 쌓여 강한 봇 스3 사망 +11%p, 스1 스폰 −15%: 사전 점검 2026-11-22), 신규 중간 종은 가벼운 특수 → 밥줄로.
    if (type === 'E07') return reserve(state, type, type, true)
    if (specialShareWith(state, 0) < WAVE_CLASS_SPECIAL_SHARE_MAX) {
      const light = chooseSpecial(state, type, 'light')
      if (light) return reserve(state, type, light, true)
    }
    return reserve(state, type, fodder, false)
  }
  // 같은 급 특수가 없다: 기본 종은 제 종 그대로, 신규 종은 같은 급 기본 종으로(위협·경험치를 지킨다).
  const basic = BASIC_TYPES.has(type) ? type : (WAVE_BASIC_FALLBACK[cls] ?? fodder)
  return reserve(state, type, basic, true)
}

// 실제로 스폰된 몸 하나(entry = {type, statOverride})를 확정한다. 밥줄 HP 맞춤·특수 강화(HP·크기)를 entry.statOverride에 쓴다.
// 돌려주는 값: 같은 묶음 끝에 붙일 보충 밥줄 몸 목록(규칙 9 — 없으면 빈 배열).
export function noteWaveSpawn(state, entry, sec) {
  if (!state || state.kind !== 'wave' || !entry || !Number.isFinite(sec)) return NO_EXTRA
  if (isWaveExemptType(entry.type)) { noteRosterRotationSpawn(state.rotation, entry.type, sec); return NO_EXTRA }
  sync(state, sec)
  const type = entry.type
  const wave = state.wave
  if (entry.waveExtraFodder) {
    state.extraPending = Math.max(0, state.extraPending - 1)
    state.extraFodder += 1
    // 보충 밥줄의 HP는 장부에서 뺀다(빚을 음수로) — 뒤따르는 밥줄이 기본의 0.5배까지 덜 받아 판 전체 HP는 그대로, 몸만 늘어난다.
    state.debt -= entry.statOverride?.hp ?? state.statsOf(entry.type)?.hp ?? 0
  }
  const list = state.pending.get(type)
  let host = type
  let picked = false
  if (list?.length) {
    host = list.shift()
    picked = true
    state.pendingBodies -= 1
    if (type !== wave.fodder) state.pendingSpecials = Math.max(0, state.pendingSpecials - 1)
  }
  // 옛 순환 시계는 트렁크가 냈을 종(t0)으로 넘긴다.
  noteRosterRotationSpawn(state.rotation, host, sec)
  // v3: 바뀐 몸은 원래 몸(t0)의 처치 경험치를 준다(enemyEntityPool.xpOverride) — 무거운·중간 몸이 밥줄이 돼도 레벨 흐름은 트렁크 그대로.
  if (host !== type) {
    const hostXp = state.statsOf(host)?.xp
    if (Number.isFinite(hostXp) && hostXp !== state.statsOf(type)?.xp) entry.waveXp = hostXp
  }
  const base = state.statsOf(type)
  const baseHp = base?.hp ?? 0
  const actualHp = entry.statOverride?.hp ?? baseHp
  const effHp = state.hpOf(type) || actualHp
  // 오버타임처럼 실효 HP에 배율이 더 붙은 몸은 host 쪽에도 같은 배율을 건다.
  const mul = effHp > 0 ? actualHp / effHp : 1
  const hostHp = host === type ? actualHp : (state.hpOf(host) || 0) * mul
  state.bodies += 1
  if (host !== type) state.converted += 1
  // 보충 밥줄은 맞바꿈이 아니라 새 몸이다 — 원래 HP 합(hpIn)에 넣지 않는다(그 HP는 위에서 장부 빚으로 뺐다).
  if (!entry.waveExtraFodder) state.hpIn += hostHp
  let outHp = actualHp
  if (host !== type) state.threatDebt += hostHp * (rateOf(state, host) - rateOf(state, type))
  if (type === wave.fodder) {
    const [lo, hi] = WAVE_FODDER_HP_RANGE
    // 원래 몸 HP를 받고 장부를 함께 맞춘다: 빚이 있으면 밥줄도 기본의 2배까지 나눠 받고, 넘친 HP(빚이 음수 — 가벼운 몸이
    // 무거운 특수가 된 경우)는 밥줄을 기본의 0.5배까지 덜어 갚는다.
    // v3: 밥줄이 바뀐 몸보다 빠르거나 세게 때리면(스5 E01 → E03) 그만큼(음의 위협 장부)을 밥줄 HP에서 덜어 갚는다(기본의 0.5배까지).
    const threatPay = state.threatDebt < 0 ? state.threatDebt / Math.max(0.01, rateOf(state, type)) : 0
    const want = hostHp + state.debt + threatPay
    outHp = Math.round(Math.min(actualHp * hi, Math.max(actualHp * lo, want)))
    // 덜어 낸 HP 중 위협 장부 몫을 먼저 갚고, 나머지를 HP 장부로.
    const threatPaid = Math.max(threatPay, Math.min(0, outHp - (hostHp + state.debt)))
    state.threatDebt -= threatPaid * rateOf(state, type)
    state.threatHp += threatPaid
    state.debt += hostHp - outHp + threatPaid
  } else if (isSpecialNear(state, type)) {
    state.specials += 1
    state.spawnedThisWave.set(type, (state.spawnedThisWave.get(type) ?? 0) + 1)
    state.debt += hostHp - actualHp
    // HP 강화는 가벼운·중간 특수만(무거운·원거리 특수를 더 오래 살리면 접촉·탄 피해가 커진다 — 사전 점검 스3).
    const cls = waveClassOf(state, type)
    const buffable = cls === 'light' || cls === 'mid'
    const add = buffable && state.debt > 0 ? Math.min(state.debt, actualHp * (WAVE_SPECIAL_HP_MUL_MAX - 1)) : 0
    state.debt -= add
    // v3: 밥줄로 옮긴 몸의 위협을 HP로 받는다(급별 상한 WAVE_THREAT_HP_MUL_MAX, HP 장부 강화와 합쳐서).
    const rate = rateOf(state, type)
    const room = actualHp * ((WAVE_THREAT_HP_MUL_MAX[cls] ?? 1) - 1) - add
    const addThreat = rate > 0 && room > 0 && state.threatDebt > 0 ? Math.min(room, state.threatDebt / rate) : 0
    state.threatDebt -= addThreat * rate
    outHp = Math.round(actualHp + add + addThreat)
    // 위협 장부에서 HP로 바뀐 몫(반올림 포함) — HP 장부 검산: 낸 HP + 남은 빚 − threatHp = 원래 몸 HP.
    state.threatHp += outHp - actualHp - add
    if (outHp > actualHp) state.buffed += 1
    const scale = (entry.statOverride?.scale ?? base?.scale ?? 1) * WAVE_SPECIAL_SCALE_MUL
    entry.statOverride = { ...(entry.statOverride ?? {}), scale }
    // 발 높이(2026-11-22 threemini): 스폰 높이는 이미 기본 크기로 정해졌다(BASE_COL_Y × scale × 4/3 — 몸 원점 높이가 크기에
    // 비례하는 규칙). 보기 크기만 ×1.2로 키우면 발이 바닥 아래로 0.056×scale 내려가 박힌다(E06 −0.026u). 원점 높이도 같은 배율로
    // 올려 '처음부터 1.2배 크기로 난 좀비'와 같게 둔다. 판정은 XZ 평면이라 높이는 그림에만 쓰인다(스폰 해시도 x·z만 센다).
    if (Array.isArray(entry.pos) && Number.isFinite(entry.pos[1])) entry.pos = [entry.pos[0], entry.pos[1] * WAVE_SPECIAL_SCALE_MUL, entry.pos[2]]
    // 그래픽 연결점: 역할 색 발밑 고리(lib/waveRoleMarker.js → enemyEntityPool.role → components/WaveRoleRingLayer.jsx).
    entry.waveRole = WAVE_SPECIAL_ROLE[type] ?? null
  } else if (picked) {
    // 같은 급 특수가 없어 기본 종으로 남은 몸(규칙 3): 특수 몫에 세고 장부만 맞춘다(강화·크기 없음).
    state.specials += 1
    state.debt += hostHp - actualHp
  }
  if (outHp !== actualHp && outHp > 0) entry.statOverride = { ...(entry.statOverride ?? {}), hp: outHp }
  state.hpOut += outHp > 0 ? outHp : actualHp
  // v3 규칙 9(밥줄 보충): 밥줄로 못 바꾸는 몸(원거리·거대) 때문에 밥줄이 아닌 몫이 33%를 넘으면, 그 옆에 밥줄을 더
  // 낸다(몸 하나당 최대 WAVE_EXTRA_FODDER_MAX). 사수·거대의 위협은 그대로 두고 밥줄 몫만 채운다. 부르는 쪽(addEnemies)이 같은 묶음
  // 끝에 붙여 같은 150 상한·같은 확정 경로를 탄다. 보충 밥줄은 다시 보충을 부르지 않는다.
  // 규칙 9는 이 규칙이 고른 몸(pick을 거친 몸)에만 — 보스 소환·호출 레인·고정 편대 행은 값·구성이 고정이라 보충하지 않는다.
  if (!picked || entry.waveExtraFodder || type === wave.fodder || !Array.isArray(entry.pos) || !WAVE_QUOTA_KEEP_CLASSES.has(waveClassOf(state, type))) return NO_EXTRA
  const need = Math.min(WAVE_EXTRA_FODDER_MAX, Math.ceil(state.specials / WAVE_EXTRA_TRIGGER_SHARE - Math.max(state.bodies, WAVE_SHARE_MIN_BODIES) - state.extraPending))
  if (!(need > 0)) return NO_EXTRA
  const fodderStats = state.statsOf(wave.fodder)
  const usedScale = entry.statOverride?.scale ?? base?.scale ?? 1
  const y = entry.pos[1] * (fodderStats?.scale ?? 1) / (usedScale || 1)
  const fodderHp = Math.round((state.hpOf(wave.fodder) || fodderStats?.hp || 1) * mul)
  const extras = []
  for (let k = 0; k < need; k += 1) {
    const a = (state.extraSerial++ % 6) * (Math.PI / 3)
    extras.push({
      type: wave.fodder,
      pos: [entry.pos[0] + Math.cos(a) * WAVE_EXTRA_FODDER_OFFSET, y, entry.pos[2] + Math.sin(a) * WAVE_EXTRA_FODDER_OFFSET],
      statOverride: fodderHp !== fodderStats?.hp ? { hp: fodderHp } : undefined,
      waveExtraFodder: true,
      // 보충 밥줄은 트렁크에 없던 몸 — 경험치 0(레벨 흐름을 트렁크와 같게. HP도 장부에서 뺀다).
      waveXp: 0,
    })
  }
  state.extraPending += need
  return extras
}

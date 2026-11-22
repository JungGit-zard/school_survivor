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
//   7. 확정은 실제 스폰 때만: pick은 같은 시각 안에서만 '예약'하고, noteWaveSpawn(실제로 addEnemies에 들어간 몸)이 계수·장부를 넘긴다.
//      150 천장에 잘리거나 자리를 못 받은 몸은 세지 않는다.

import { WAVE_SPECIAL_ROLE, WAVE_STANDARD, WAVE_STANDARD_OVERTIME_START_SEC, WAVE_STANDARD_WAVE_SEC } from './waveStandard.js'
import { isChiefType } from './stageChiefContent.js'
import { LOOK_ALIVE_LIMIT, zombieLookCount } from './zombieLooks.js'
import { ROSTER_ROTATION_SHOOTER_TYPES, noteRosterRotationSpawn, pickRosterRotationType, pickRosterTankType } from './stageRosterRotation.js'

export const WAVE_SPECIAL_SHARE = 0.3
export const WAVE_SPECIAL_SHARE_MAX = 0.35
export const WAVE_CLASS_SPECIAL_SHARE_MAX = 0.5
export const WAVE_SPECIAL_SCALE_MUL = 1.2
export const WAVE_SPECIAL_HP_MUL_MAX = 1.6
export const WAVE_FODDER_HP_RANGE = Object.freeze([0.5, 2])
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
// 약한 봇 사망률이 84% → 60%로 떨어졌다 — 사전 점검 2026-11-22). 스3(체육관)은 반대로 무거운 신규 특수(E40 휘두르기)·원거리가
// 몰려 강한 봇 사망이 +8~11%p였다 → 무거움 2·원거리 3.
export const WAVE_STAGE_ALIVE_CAP_OVERRIDE = Object.freeze({
  stage3: Object.freeze({ heavy: 2, ranged: 3 }),
  stage5: Object.freeze({ ranged: 8 }),
})
const BASIC_TYPES = new Set(['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07'])

const NEVER_COMPOSED = new Set(['E08', 'E105', 'E106'])
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
    debt: 0,
    // 기록(테스트·프로브용)
    converted: 0,
    buffed: 0,
    hpIn: 0,
    hpOut: 0,
  }
}

function sync(state, sec) {
  const windowId = Math.floor(Math.max(0, sec) / WAVE_STANDARD_WAVE_SEC)
  if (state.windowId !== windowId) {
    state.windowId = windowId
    state.wave = state.waves[waveIndexAt(sec)]
    state.bodies = 0
    state.specials = 0
    state.spawnedThisWave.clear()
  }
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

function specialShareWith(state, extra, minBodies = 1) {
  const bodies = Math.max(minBodies, state.bodies + state.pendingBodies + 1)
  return (state.specials + state.pendingSpecials + extra) / bodies
}

function underLookCap(state, type) {
  // 같은 시각에 이미 예약한 몸도 센다(한 묶음이 한도를 한꺼번에 넘지 않게).
  return state.aliveOf(type) + (state.pending.get(type)?.length ?? 0) < LOOK_ALIVE_LIMIT * zombieLookCount(type)
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
  return final
}

// 정규 경로 몸 하나의 종을 정한다(예약만). 표가 없는 스테이지·손대지 않는 몸은 그대로.
export function pickWaveType(state, hostType, sec, formation = false) {
  if (!state || state.kind !== 'wave' || !Number.isFinite(sec) || isWaveExemptType(hostType)) return hostType
  sync(state, sec)
  // 규칙 0: 트렁크(옛 순환)가 이 자리에 냈을 종. 급 구성(가벼움·중간·무거움·원거리)이 트렁크와 같아져 위협·경험치가 맞는다.
  const type = state.rotation
    ? (formation ? pickRosterTankType(state.rotation, hostType, sec) : pickRosterRotationType(state.rotation, hostType, sec))
    : hostType
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
  if (isSpecialOf(wave, type)) {
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
export function noteWaveSpawn(state, entry, sec) {
  if (!state || state.kind !== 'wave' || !entry || !Number.isFinite(sec)) return
  if (isWaveExemptType(entry.type)) { noteRosterRotationSpawn(state.rotation, entry.type, sec); return }
  sync(state, sec)
  const type = entry.type
  const wave = state.wave
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
  const base = state.statsOf(type)
  const baseHp = base?.hp ?? 0
  const actualHp = entry.statOverride?.hp ?? baseHp
  const effHp = state.hpOf(type) || actualHp
  // 오버타임처럼 실효 HP에 배율이 더 붙은 몸은 host 쪽에도 같은 배율을 건다.
  const mul = effHp > 0 ? actualHp / effHp : 1
  const hostHp = host === type ? actualHp : (state.hpOf(host) || 0) * mul
  state.bodies += 1
  if (host !== type) state.converted += 1
  state.hpIn += hostHp
  let outHp = actualHp
  if (type === wave.fodder) {
    const [lo, hi] = WAVE_FODDER_HP_RANGE
    // 원래 몸 HP를 받고 장부를 함께 맞춘다: 빚이 있으면 밥줄도 기본의 2배까지 나눠 받고, 넘친 HP(빚이 음수 — 가벼운 몸이
    // 무거운 특수가 된 경우)는 밥줄을 기본의 0.5배까지 덜어 갚는다.
    const want = hostHp + state.debt
    outHp = Math.round(Math.min(actualHp * hi, Math.max(actualHp * lo, want)))
    state.debt += hostHp - outHp
  } else if (isSpecialOf(wave, type)) {
    state.specials += 1
    state.spawnedThisWave.set(type, (state.spawnedThisWave.get(type) ?? 0) + 1)
    state.debt += hostHp - actualHp
    // HP 강화는 가벼운·중간 특수만(무거운·원거리 특수를 더 오래 살리면 접촉·탄 피해가 커진다 — 사전 점검 스3).
    const cls = waveClassOf(state, type)
    const buffable = cls === 'light' || cls === 'mid'
    const add = buffable && state.debt > 0 ? Math.min(state.debt, actualHp * (WAVE_SPECIAL_HP_MUL_MAX - 1)) : 0
    outHp = Math.round(actualHp + add)
    state.debt -= outHp - actualHp
    if (outHp > actualHp) state.buffed += 1
    const scale = (entry.statOverride?.scale ?? base?.scale ?? 1) * WAVE_SPECIAL_SCALE_MUL
    entry.statOverride = { ...(entry.statOverride ?? {}), scale }
    // 그래픽 연결점(2단계, threemini): 역할 색 외곽선/발밑 고리가 읽을 표식. 지금은 아무도 읽지 않는다.
    entry.waveRole = WAVE_SPECIAL_ROLE[type] ?? null
  } else if (picked) {
    // 같은 급 특수가 없어 기본 종으로 남은 몸(규칙 3): 특수 몫에 세고 장부만 맞춘다(강화·크기 없음).
    state.specials += 1
    state.debt += hostHp - actualHp
  }
  if (outHp !== actualHp && outHp > 0) entry.statOverride = { ...(entry.statOverride ?? {}), hp: outHp }
  state.hpOut += outHp > 0 ? outHp : actualHp
}

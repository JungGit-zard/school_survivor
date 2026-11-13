import { describe, it, expect } from 'vitest'
import { ENEMY_STATS } from '../components/Enemy.jsx'
import { buildLowDensityReinforcementBatch, createStageRosterRotation } from '../components/Enemies.jsx'
import {
  getRuntimeSpawnEventsForStage,
  isBossType,
  isRepeatingBurstEvent,
  postExitRepeatWaveIndex,
  postExitWaveCount,
  repeatingBurstSecAtTick,
  repeatingBurstTickCount,
} from './burstEvents.js'
import { LOW_DENSITY_REINFORCEMENT_ENTRIES } from './lowDensityReinforcement.js'
import { EnemyEntityPool } from './enemyEntityPool.js'
import { ENEMY_SIZE_MULTIPLIER, ENEMY_SPAWN_REVEAL_MS, createEnemySimulationRuntime } from './enemySimulation.js'
import { ENEMY_STATE_NOVEL_APPROACH, isNovelAttackState, isNovelTelegraphState } from './novelZombieBehavior.js'
import { PZ_STATE, isProjectileZombieHidden } from './projectileZombieBehavior.js'
import { getStageBounds, getStageConfig } from './stageConfig.js'
import { playerPos } from './refs.js'
import {
  ROSTER_ROTATION_SHOOTER_TYPES,
  ROSTER_ROTATION_CROSS_TIER_COOLDOWN_SEC,
  ROSTER_ROTATION_HEAVY_INTERVAL_SEC,
  ROSTER_ROTATION_INTERVAL_SEC,
  ROSTER_ROTATION_TIER_GRACE_SEC,
  createRosterRotation,
  getStageRotationDebuts,
  getStageRotationRoster,
  noteRosterRotationSpawn,
  pickRosterRotationType,
} from './stageRosterRotation.js'

// 2026-11-14 Terry: "스테이지에 배분된 좀비들이 골고루 분포되게" + "정규 리스폰 웨이브에도 골고루 섞어".
// 2차(balanceqa BLOCK 반영): 데뷔 게이트 + 같은 HP 계층 교체 + 계층 밖 교체는 유예 20초·스테이지 전체 30초 쿨다운.
// 런타임(Enemies.jsx)과 같은 규칙으로 스테이지 전체 시간표를 결정론적으로 돌린다:
//   - 스케줄 웨이브: 버스트 표 단발 행 + 반복 증원 tick(탈출 뒤 +10% 성장 포함). 형태·크루·보스·보상 행은 작성 그대로.
//   - 리스폰 웨이브: 저밀도 리필(E07×10 + E01×10)을 REFILL_EVERY_SEC마다 한 번.
// 정규 행의 host 1마리씩이 pickRosterRotationType을 거치고, 실제로 낸 개체만 noteRosterRotationSpawn으로 확정한다.

const STAGES = ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6']
const DURATION_SEC = 240
const THIRDS = [[0, 80], [80, 160], [160, 240]]
const REFILL_EVERY_SEC = 25
const hpOf = (type) => ENEMY_STATS[type]?.hp ?? 0
// 데뷔 뒤 최대 공백 상한: 무거운 간격 55 + 계층 밖 유예 20 + 스테이지 전체 쿨다운 30 = 105초(+host 대기 여유 5초).
const MAX_GAP_AFTER_DEBUT_SEC = ROSTER_ROTATION_HEAVY_INTERVAL_SEC + ROSTER_ROTATION_TIER_GRACE_SEC + ROSTER_ROTATION_CROSS_TIER_COOLDOWN_SEC + 5

function isRotatableRow(evt) {
  return !evt.formation && !evt.rewardEvent && !isBossType(evt.type)
}

function scheduledMoments(stageId, durationSec) {
  const portalSec = getStageConfig(stageId).escapePortalSec
  const moments = []
  for (const evt of getRuntimeSpawnEventsForStage(stageId)) {
    if (isRepeatingBurstEvent(evt)) {
      for (let tick = 0; tick < repeatingBurstTickCount(evt); tick += 1) {
        const sec = repeatingBurstSecAtTick(evt, tick)
        if (sec === null || sec >= durationSec) continue
        moments.push({ sec, evt, count: postExitWaveCount(evt.count ?? 1, postExitRepeatWaveIndex(evt, tick, portalSec)) })
      }
    } else if (evt.sec < durationSec) {
      moments.push({ sec: evt.sec, evt, count: evt.count ?? 1 })
    }
  }
  return moments
}

function refillMoments(durationSec, everySec) {
  const moments = []
  if (!everySec) return moments
  for (let sec = 15; sec < durationSec; sec += everySec) {
    for (const entry of LOW_DENSITY_REINFORCEMENT_ENTRIES) {
      moments.push({ sec, evt: { type: entry.type, count: entry.count, refill: true }, count: entry.count })
    }
  }
  return moments
}

function simulate(stageId, { rotation = true, scheduled = true, refillEverySec = REFILL_EVERY_SEC, durationSec = DURATION_SEC } = {}) {
  const state = rotation ? createRosterRotation(stageId, { hpOf }) : null
  const moments = [
    ...(scheduled ? scheduledMoments(stageId, durationSec) : []),
    ...refillMoments(durationSec, refillEverySec),
  ].sort((a, b) => a.sec - b.sec)
  const spawns = []
  for (const { sec, evt, count } of moments) {
    for (let index = 0; index < count; index += 1) {
      const authored = evt.mixedTypes ? evt.mixedTypes[index % evt.mixedTypes.length] : evt.type
      const type = isRotatableRow(evt) ? pickRosterRotationType(state, authored, sec) : authored
      noteRosterRotationSpawn(state, type, sec)
      spawns.push({ sec, type, formation: evt.formation ?? null })
    }
  }
  return { spawns, state }
}

function typesInThird(spawns, [from, to]) {
  return new Set(spawns.filter((s) => s.sec >= from && s.sec < to).map((s) => s.type))
}

function totalHp(spawns) {
  return spawns.reduce((sum, s) => sum + hpOf(s.type), 0)
}

// 예외(정당화): 사수는 같은 HP host로만 돌아온다(계층 밖 교체 금지 — 스5 프로브 실측 근거는 stageRosterRotation.js 머리말).
// 리스폰 리필 host가 E01(8)·E07(16)이라 8·16hp 사수는 항상 돌아오지만, 10·32·70hp 사수는 그 스테이지 표에
// E03·E04·E02·E05 정규 행이 있을 때만 돌아온다. 이 종들은 "순환 전보다 덜 나오지 않는다"만 단언한다.
//   현재 대상: 스2 E63(32) · 스3 E68(10)·E57(70) · 스4 E70(10)·E59(70) · 스5 E53·E70(10)·E52·E54(32)·E57·E55(70) 등.
function exactHostOnlyShooter(type) {
  const hp = hpOf(type)
  return ROSTER_ROTATION_SHOOTER_TYPES.has(type) && hp !== hpOf('E01') && hp !== hpOf('E07')
}

// 데뷔(작성된 첫 등장) 이후에 시작하는 3등분마다 그 종이 나왔는지. 빠진 칸을 "E37@80"처럼 돌려준다.
function missingThirdsAfterDebut(stageId, spawns) {
  const debuts = getStageRotationDebuts(stageId)
  return Object.keys(debuts).filter((type) => !exactHostOnlyShooter(type)).flatMap((type) => THIRDS
    .filter((third) => third[0] >= debuts[type] && !typesInThird(spawns, third).has(type))
    .map((third) => `${type}@${third[0]}`))
}

function maxGapAfterDebut(stageId, spawns) {
  const debuts = getStageRotationDebuts(stageId)
  let worst = { gap: 0, type: null }
  for (const [type, debut] of Object.entries(debuts)) {
    if (exactHostOnlyShooter(type)) continue
    const secs = [...new Set(spawns.filter((s) => s.type === type && s.sec >= debut).map((s) => s.sec))]
    let prev = debut
    for (const sec of [...secs, DURATION_SEC]) {
      if (sec - prev > worst.gap) worst = { gap: sec - prev, type, from: prev }
      prev = sec
    }
  }
  return worst
}

describe('스테이지 로스터 = 버스트 표에 배분된 신규 종 + 작성된 첫 등장(데뷔)', () => {
  it('S1~S6 모두 순환 대상이 비어 있지 않고 기본 E01~E08·보스·크루를 넣지 않는다', () => {
    for (const stageId of STAGES) {
      const roster = getStageRotationRoster(stageId)
      expect(roster.length, stageId).toBeGreaterThan(0)
      for (const type of roster) {
        expect(type, `${stageId} ${type}`).not.toMatch(/^(E0[1-8]|RZ[A-Z]|B\d\d)$/)
        expect(hpOf(type), `${stageId} ${type} hp`).toBeGreaterThan(0)
      }
    }
    expect(getStageRotationRoster('stage6')).toEqual(['E19', 'E20', 'E21'])
    expect(getStageRotationRoster('stage1')).not.toContain('E04')
    expect(getStageRotationDebuts('stage2')).toMatchObject({ E37: 5, E47: 60, E63: 72, E51: 144, E46: 184 })
    expect(getStageRotationDebuts('stage5')).toMatchObject({ E53: 5, E57: 24, E55: 184, E40: 216 })
  })
})

describe.each(STAGES)('%s — 스테이지 전체 시간표 시뮬레이션', (stageId) => {
  const debuts = getStageRotationDebuts(stageId)

  it('데뷔 게이트: 어떤 종도 작성된 첫 등장보다 먼저 나오지 않는다(리필 포함)', () => {
    for (const refillEverySec of [0, REFILL_EVERY_SEC]) {
      const { spawns } = simulate(stageId, { refillEverySec })
      for (const [type, debut] of Object.entries(debuts)) {
        const first = spawns.find((s) => s.type === type)
        expect(first?.sec ?? Infinity, `${stageId} ${type}`).toBeGreaterThanOrEqual(debut)
      }
    }
  })

  // 스6(E19~E21)은 원래 표가 이미 데뷔 뒤 3등분마다 세 종을 다 냈다 — 순환은 거의 손대지 않는 안전망이다.
  it('순환 전(작성된 표 + 리필)에는 데뷔 뒤 3등분에서 빠지는 신규 종이 있었다 — 고친 문제의 재현(스6 제외)', () => {
    const missing = missingThirdsAfterDebut(stageId, simulate(stageId, { rotation: false }).spawns)
    if (stageId === 'stage6') expect(missing).toEqual([])
    else expect(missing.length, `${stageId} 순환 전 누락`).toBeGreaterThan(0)
  })

  it('스케줄 웨이브 + 리스폰 리필: 배분된 모든 종(같은 HP host만 쓰는 사수 제외)이 데뷔 뒤 시작하는 3등분마다 다시 나온다', () => {
    expect(missingThirdsAfterDebut(stageId, simulate(stageId).spawns), stageId).toEqual([])
  })

  it('같은 HP host만 쓰는 사수도 순환 전보다 덜 나오지 않는다', () => {
    for (const refillEverySec of [0, REFILL_EVERY_SEC]) {
      const before = simulate(stageId, { rotation: false, refillEverySec }).spawns
      const after = simulate(stageId, { refillEverySec }).spawns
      for (const type of getStageRotationRoster(stageId).filter(exactHostOnlyShooter)) {
        const n = (list) => list.filter((s) => s.type === type).length
        expect(n(after), `${stageId} ${type}`).toBeGreaterThanOrEqual(n(before))
      }
    }
  })

  // 스케줄 웨이브만(리필 없음): S1·S3·S6은 정규 행 host가 충분해 전부 덮는다. S2·S4·S5는 버스트 표의 대부분이 형태 버스트·
  // E04 벽·크루·전교 호출이라(손대지 않는 특수 이벤트) 맞바꿀 정규 host가 부족하다 — 예: 스4 160~240초 정규 host는 E05×2뿐.
  // 이 셋은 빈칸이 순환 전보다 확실히 줄었는지만 본다(실제 판은 리필·지배 스웜·반복 증원이 나머지를 채운다).
  it('스케줄 웨이브만(리필 없음): host가 충분한 스테이지는 전부, 나머지도 빈칸이 순환 전보다 준다', () => {
    const after = missingThirdsAfterDebut(stageId, simulate(stageId, { refillEverySec: 0 }).spawns)
    if (['stage1', 'stage3', 'stage6'].includes(stageId)) {
      expect(after, stageId).toEqual([])
    } else {
      const before = missingThirdsAfterDebut(stageId, simulate(stageId, { rotation: false, refillEverySec: 0 }).spawns)
      expect(after.length, `${stageId} ${after.join(' ')}`).toBeLessThan(before.length)
    }
  })

  it(`데뷔 뒤 어떤 종도 ${MAX_GAP_AFTER_DEBUT_SEC}초(무거운 간격 + 유예 + 계층 밖 쿨다운) 넘게 비지 않는다 — 리필 포함`, () => {
    const worst = maxGapAfterDebut(stageId, simulate(stageId).spawns)
    expect(worst.gap, `${stageId} ${worst.type} from ${worst.from}s`).toBeLessThanOrEqual(MAX_GAP_AFTER_DEBUT_SEC)
  })

  it('총 스폰 마릿수는 순환 전과 같다(1:1 교체), 총 HP 변화는 ±5% 안', () => {
    for (const refillEverySec of [0, REFILL_EVERY_SEC]) {
      const before = simulate(stageId, { rotation: false, refillEverySec })
      const after = simulate(stageId, { refillEverySec })
      expect(after.spawns.length).toBe(before.spawns.length)
      const delta = totalHp(after.spawns) / totalHp(before.spawns) - 1
      expect(Math.abs(delta), `${stageId} refill=${refillEverySec} HP delta ${(delta * 100).toFixed(1)}%`).toBeLessThanOrEqual(0.05)
    }
  })

  it('계층 밖 교체는 스테이지 전체에서 30초에 한 번을 넘지 않는다', () => {
    for (const refillEverySec of [0, REFILL_EVERY_SEC]) {
      const { state } = simulate(stageId, { refillEverySec })
      expect(state.crossTierSubstitutions).toBeLessThanOrEqual(Math.ceil(DURATION_SEC / ROSTER_ROTATION_CROSS_TIER_COOLDOWN_SEC))
    }
  })

  it('형태 버스트·보스·코인·E06·크루는 순환이 건드리지 않고, E04는 32hp 원거리 신규 종으로만 바뀐다', () => {
    const before = simulate(stageId, { rotation: false })
    const after = simulate(stageId)
    const keep = (s) => s.type === 'E06' || s.type === 'E08' || isBossType(s.type) || /^RZ/.test(s.type)
    const count = (list, pred) => list.spawns.filter(pred).length
    expect(count(after, keep)).toBe(count(before, keep))
    const ranged32 = (s) => s.type === 'E04' || (hpOf(s.type) === hpOf('E04') && s.type !== 'E04')
    expect(count(after, ranged32)).toBeGreaterThanOrEqual(count(before, (s) => s.type === 'E04'))
    const formationTypes = (list) => list.spawns.filter((s) => s.formation).map((s) => s.type).join(',')
    expect(formationTypes(after)).toBe(formationTypes(before))
  })
})

describe('스2·스3 오프닝 전용이던 E37(가까이 가면 사선으로 들이받는 좀비)', () => {
  // 순환 전: 스3은 5초 오프닝 2기가 전부였다. 스2는 5초 5기 + 보스전 150초 2기 + 탈출구 개방 뒤 216초 1기.
  const moments = (spawns) => [...new Set(spawns.filter((s) => s.type === 'E37').map((s) => s.sec))]
  it.each(['stage2', 'stage3'])('%s: 리스폰 포함 시 데뷔 뒤 약 40초마다(최대 공백 60초 이하) 다시 나온다', (stageId) => {
    const before = simulate(stageId, { rotation: false, refillEverySec: 0 })
    if (stageId === 'stage3') expect(moments(before.spawns)).toEqual([5])
    const after = moments(simulate(stageId).spawns)
    expect(after.length, `${stageId} ${after.join(',')}`).toBeGreaterThanOrEqual(5)
    let prev = 5
    for (const sec of [...after, DURATION_SEC]) {
      expect(sec - prev, `${stageId} E37 gap ending ${sec}s (${after.join(',')})`).toBeLessThanOrEqual(60)
      prev = sec
    }
  })
  it('스3은 스케줄 웨이브만으로도(25초·10초 반복 증원) 약 40~50초마다 다시 나온다', () => {
    const after = moments(simulate('stage3', { refillEverySec: 0 }).spawns)
    expect(after.length).toBeGreaterThanOrEqual(5)
  })
})

describe('탈출 뒤(오버타임 포함) 리스폰도 계속 섞인다', () => {
  it('240초 이후 오버타임(+10%/회차) 흐름에서도 데뷔한 종이 다시 나오고 마릿수는 그대로다', () => {
    for (const stageId of STAGES) {
      const state = createRosterRotation(stageId, { hpOf })
      const seen = new Set()
      let units = 0
      for (let sec = 240; sec < 420; sec += 30) {
        for (let index = 0; index < postExitWaveCount(30, (sec - 240) / 30); index += 1) {
          // 오버타임 혼합 풀(Enemies.jsx): 스1은 E01·E02·E03·E05·E06·E07, 나머지는 E04도 섞인다.
          const pool = stageId === 'stage1' ? ['E01', 'E02', 'E03', 'E05', 'E07'] : ['E01', 'E02', 'E03', 'E04', 'E05', 'E07']
          const host = pool[index % pool.length]
          const type = pickRosterRotationType(state, host, sec)
          noteRosterRotationSpawn(state, type, sec)
          units += 1
          seen.add(type)
        }
      }
      expect(units).toBe([0, 1, 2, 3, 4, 5].reduce((n, i) => n + postExitWaveCount(30, i), 0))
      for (const type of getStageRotationRoster(stageId)) expect(seen.has(type), `${stageId} ${type}`).toBe(true)
    }
  })
})

describe('순환 규칙 단위', () => {
  const fresh = (stageId) => {
    const state = createRosterRotation(stageId, { hpOf })
    state.due.fill(Infinity)
    return state
  }

  it('host가 아닌 타입(E06·E08·보스·크루)은 절대 바꾸지 않는다', () => {
    const state = createRosterRotation('stage5', { hpOf })
    for (const type of ['E06', 'E08', 'B10', 'RZT']) expect(pickRosterRotationType(state, type, 999)).toBe(type)
  })

  it('데뷔 게이트: 첫 기한 = 작성된 첫 등장 + 간격', () => {
    const state = createRosterRotation('stage2', { hpOf })
    const at = (type) => state.due[state.types.indexOf(type)]
    expect(at('E37')).toBe(5 + ROSTER_ROTATION_INTERVAL_SEC)
    expect(at('E63')).toBe(72 + ROSTER_ROTATION_HEAVY_INTERVAL_SEC)
    expect(pickRosterRotationType(state, 'E01', 44)).toBe('E01')
    expect(pickRosterRotationType(state, 'E01', 45)).toBe('E37')
  })

  it('정확히 같은 HP host를 먼저 쓰고, 유예 전에는 HP가 다른 host로 바꾸지 않는다', () => {
    const state = fresh('stage2')
    const e37 = state.types.indexOf('E37') // hp 8
    state.due[e37] = 10
    expect(pickRosterRotationType(state, 'E02', 12)).toBe('E02') // 70hp host, 유예 전
    expect(pickRosterRotationType(state, 'E03', 12)).toBe('E03') // 10hp host도 유예 전엔 아니다(8 ≠ 10)
    expect(pickRosterRotationType(state, 'E01', 12)).toBe('E37') // 8hp host = 같은 HP
    noteRosterRotationSpawn(state, 'E37', 12)
    expect(state.due[e37]).toBe(12 + ROSTER_ROTATION_INTERVAL_SEC)
    state.due[e37] = 10
    expect(pickRosterRotationType(state, 'E02', 10 + ROSTER_ROTATION_TIER_GRACE_SEC)).toBe('E37') // 유예 뒤 계층 밖
  })

  it('사수(탄을 쏘는 종)는 계층 밖 교체를 절대 받지 않고 같은 HP host로만 돌아온다', () => {
    const state = fresh('stage5')
    const e57 = state.types.indexOf('E57') // 70hp 사수(출석부 카드)
    const e70 = state.types.indexOf('E70') // 10hp 사수(술래)
    const e40 = state.types.indexOf('E40') // 70hp 근접
    state.due[e57] = 0
    state.due[e70] = 0
    expect(pickRosterRotationType(state, 'E01', 100)).toBe('E01') // 유예·쿨다운이 다 지나도
    expect(pickRosterRotationType(state, 'E05', 100)).toBe('E57') // 같은 HP(70) host면 돌아온다
    expect(pickRosterRotationType(state, 'E03', 100)).toBe('E70') // 같은 HP(10) host면 돌아온다
    state.due[e40] = 0
    expect(pickRosterRotationType(state, 'E01', 100)).toBe('E40') // 근접은 계층 밖 교체 가능
  })

  it('계층 밖 교체는 스테이지 전체에서 쿨다운당 1회 — 같은 묶음 안에서도 1회', () => {
    const state = fresh('stage5')
    const e40 = state.types.indexOf('E40') // 70hp 근접
    const e42 = state.types.indexOf('E42') // 70hp 근접
    state.due[e40] = 0
    state.due[e42] = 0
    expect(pickRosterRotationType(state, 'E01', 100)).toBe('E40')
    expect(pickRosterRotationType(state, 'E01', 100)).toBe('E01') // 같은 시각 두 번째 계층 밖 교체 금지
    noteRosterRotationSpawn(state, 'E40', 100)
    expect(pickRosterRotationType(state, 'E01', 100 + ROSTER_ROTATION_CROSS_TIER_COOLDOWN_SEC - 1)).toBe('E01')
    expect(pickRosterRotationType(state, 'E01', 100 + ROSTER_ROTATION_CROSS_TIER_COOLDOWN_SEC)).toBe('E42')
  })

  it('E04 host는 같은 32hp 원거리 신규 종(E63 등)하고만 바뀌고, 유예가 지나도 다른 종은 받지 않는다', () => {
    const state = fresh('stage2')
    const e37 = state.types.indexOf('E37')
    const e63 = state.types.indexOf('E63')
    expect(hpOf('E63')).toBe(hpOf('E04'))
    state.due[e37] = 0
    expect(pickRosterRotationType(state, 'E04', 100)).toBe('E04')
    state.due[e63] = 0
    expect(pickRosterRotationType(state, 'E04', 100)).toBe('E63')
    noteRosterRotationSpawn(state, 'E63', 100)
    expect(state.due[e63]).toBe(100 + ROSTER_ROTATION_HEAVY_INTERVAL_SEC)
  })

  it('실제로 스폰되지 않은 선택(자리 없음·묶음 폐기·천장)은 시계를 소모하지 않는다', () => {
    const state = fresh('stage2')
    const e37 = state.types.indexOf('E37')
    state.due[e37] = 10
    expect(pickRosterRotationType(state, 'E01', 50)).toBe('E37') // 예약만
    expect(pickRosterRotationType(state, 'E01', 50)).toBe('E01') // 같은 시각에는 중복 예약 안 됨
    expect(state.due[e37]).toBe(10) // 확정 전이라 기한 그대로
    expect(state.substitutions).toBe(0)
    expect(pickRosterRotationType(state, 'E01', 51)).toBe('E37') // 다음 시각: 예약이 풀려 다시 후보
    noteRosterRotationSpawn(state, 'E37', 51)
    expect(state.due[e37]).toBe(51 + ROSTER_ROTATION_INTERVAL_SEC)
    expect(state.substitutions).toBe(1)
  })

  it('작성된 등장도 기한을 다시 잡아 최근에 나온 종을 더 끼워 넣지 않는다', () => {
    const state = fresh('stage2')
    const e37 = state.types.indexOf('E37')
    state.due[e37] = 0
    noteRosterRotationSpawn(state, 'E37', 5)
    expect(pickRosterRotationType(state, 'E01', 20)).toBe('E01')
  })
})

describe('저밀도 리필(정규 리스폰) 묶음 — 시계를 고정한 결정론 검사', () => {
  const build = (stageId, sec) => {
    const prior = { x: playerPos.x, z: playerPos.z }
    playerPos.x = 0; playerPos.z = 0
    try {
      const cache = { id: stageId, bounds: getStageBounds(stageId), obstacles: [], rosterRotation: createStageRosterRotation(stageId), rosterRotationClock: () => sec }
      return { cache, batch: buildLowDensityReinforcementBatch(cache, 20, () => 0.25) }
    } finally { playerPos.x = prior.x; playerPos.z = prior.z }
  }
  const count = (batch) => batch.reduce((acc, e) => ({ ...acc, [e.type]: (acc[e.type] ?? 0) + 1 }), {})

  it('스1 0초: 아무 종도 데뷔 전이라 정확히 E07×10 + E01×10', () => {
    expect(count(build('stage1', 0).batch)).toEqual({ E07: 10, E01: 10 })
  })

  it('스1 100초: 기한이 온 종만 1마리씩 섞이고 마릿수는 20 그대로다', () => {
    const { batch } = build('stage1', 100)
    // 데뷔+40초가 지난 종: E66(60→100, 16hp = E07 자리, 같은 HP), E34(24→64, 36초 지나 유예 20초를 넘김).
    // E07 묶음이 먼저 만들어지므로 E34는 HP가 다른 E07 자리로 계층 밖 교체된다(스테이지 전체 30초 쿨다운 1회 소비).
    // E35(72→112)·E36(108→148)은 아직 기한 전이다.
    expect(count(batch)).toEqual({ E07: 8, E66: 1, E34: 1, E01: 10 })
  })

  it('리필 묶음을 버리면(20마리 미만 등) 시계가 그대로라 다음 리필에 같은 종이 다시 섞인다', () => {
    const first = build('stage1', 100)
    const again = buildLowDensityReinforcementBatch(first.cache, 20, () => 0.25) // 같은 캐시·같은 시각, 확정(note) 없음
    expect(count(again)).toEqual({ E07: 10, E01: 10 }) // 같은 시각엔 예약이 남아 중복 섞지 않는다
    first.cache.rosterRotationClock = () => 101
    expect(count(buildLowDensityReinforcementBatch(first.cache, 20, () => 0.25))).toEqual({ E07: 8, E66: 1, E34: 1, E01: 10 })
  })
})

// 순환으로 스테이지 한복판(리스폰)에서 다시 나와도 행동이 처음 등장 때와 같아야 한다.
// 풀 슬롯 재사용(앞 판 E01이 쓰던 칸) + 늦은 시계(200초) + 리스폰 링 거리(4~8.5u)에서 스폰한다.
describe('리스폰으로 스테이지 중반에 나온 신규 종도 처음처럼 동작한다', () => {
  const BOUNDS = { halfX: 9.36, halfZ: 16 }

  function respawnAndRun(id, { startDist, seconds = 30, elapsedStart = 200 }) {
    const pool = new EnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    // 앞서 이 슬롯을 쓰던 E01을 지우고 같은 칸에 다시 스폰한다(슬롯 재사용 잔상 검사).
    const old = pool.spawn({ type: 'E01', x: 3, y: 0, z: 3, hp: 8, maxHp: 8, visualScale: ENEMY_SIZE_MULTIPLIER, spawnTimer: ENEMY_SPAWN_REVEAL_MS + 1 })
    for (let frame = 0; frame < 30; frame += 1) runtime.step(pool, { delta: 1 / 60, playerX: 0, playerZ: 0, ...BOUNDS, elapsedSec: elapsedStart - 1 + frame / 60, activeProjectileCount: 0, onContact: () => {} })
    pool.despawn(old)
    const hp = 1e9
    pool.spawn({ type: id, x: -startDist, y: 0, z: 0, hp, maxHp: hp, visualScale: ENEMY_SIZE_MULTIPLIER, spawnTimer: ENEMY_SPAWN_REVEAL_MS + 1 })
    const states = new Set()
    let damage = 0
    let startedHidden = null
    const delta = 1 / 60
    for (let frame = 0; frame < seconds / delta; frame += 1) {
      runtime.step(pool, {
        delta, playerX: 0, playerZ: 0, ...BOUNDS, elapsedSec: elapsedStart + frame * delta,
        activeProjectileCount: 0, screenBounds: { minX: -12, maxX: 12, minZ: -12, maxZ: 12 }, projectileZombieShotCount: 0,
        onContact: (_i, _g, _x, _y, _z, value) => { damage += value },
      })
      if (startedHidden === null) startedHidden = isProjectileZombieHidden(pool, 0)
      states.add(pool.state[0])
    }
    return { states, damage, startedHidden }
  }

  it.each([4.0, 8.5])('E37(스2·스3 "가까이 가면 사선으로 들이받는" 좀비): %su 리스폰 → 접근 → 예고 → 돌진으로 실제 피해', (startDist) => {
    const r = respawnAndRun('E37', { startDist })
    expect(r.states.has(ENEMY_STATE_NOVEL_APPROACH)).toBe(true)
    expect([...r.states].some((state) => isNovelTelegraphState(state)), 'telegraph').toBe(true)
    expect([...r.states].some((state) => isNovelAttackState(state)), 'attack').toBe(true)
    expect(r.damage).toBeGreaterThan(0)
  })

  it('E58(매복형): 리스폰 직후 바닥에 숨은 채 시작하고, 가까워지면 일어나 공격 단계로 넘어간다', () => {
    const r = respawnAndRun('E58', { startDist: 6 })
    expect(r.startedHidden).toBe(true)
    expect([...r.states].some((state) => state !== PZ_STATE.APPROACH)).toBe(true)
  })
})

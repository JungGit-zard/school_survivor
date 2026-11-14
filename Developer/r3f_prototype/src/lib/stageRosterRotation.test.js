import { describe, it, expect } from 'vitest'
import { ENEMY_STATS } from '../components/Enemy.jsx'
import { ZOMBIE_PALETTE } from '../components/ZombieMesh.jsx'
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
  ROSTER_ROTATION_HEAVY_INTERVAL_SEC,
  ROSTER_ROTATION_INTERVAL_SEC,
  ROSTER_ROTATION_MAX_SHOOTERS_PER_WAVE,
  ROSTER_ROTATION_TANK_REPLACE_EVERY,
  ROSTER_ROTATION_TANK_TYPE,
  createRosterRotation,
  getStageRotationDebuts,
  getStageRotationRoster,
  noteRosterRotationSpawn,
  pickRosterRotationType,
  pickRosterTankType,
} from './stageRosterRotation.js'

// 2026-11-14 Terry: "스테이지에 배분된 좀비들이 골고루 분포되게" + "정규 리스폰 웨이브에도 골고루 섞어".
// 3차(v3): "어려워져도 되니까 다 분포시켜" / "다채롭게 웨이브에 모두 섞어. 난이도보다 구현이 우선" — 사수 포함 전 종이
// 데뷔 뒤 계속 돌아오고, 붉은 고체력 탱커(E05)는 80%로 줄여 그 자리를 신규 종에 준다.
// 런타임(Enemies.jsx)과 같은 규칙으로 스테이지 전체 시간표를 결정론적으로 돌린다:
//   - 스케줄 웨이브: 버스트 표 단발 행 + 반복 증원 tick(탈출 뒤 +10% 성장 포함). 크루·보스·보상 행은 작성 그대로,
//     형태 버스트는 E05 탱커 계수만 탄다.
//   - 리스폰 웨이브: 저밀도 리필(E07×10 + E01×10)을 REFILL_EVERY_SEC마다 한 번.
// 정규 행의 host 1마리씩이 pickRosterRotationType을 거치고, 실제로 낸 개체만 noteRosterRotationSpawn으로 확정한다.

const STAGES = ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6']
const DURATION_SEC = 240
const THIRDS = [[0, 80], [80, 160], [160, 240]]
const REFILL_EVERY_SEC = 25
const hpOf = (type) => ENEMY_STATS[type]?.hp ?? 0
// 데뷔 뒤 최대 공백 상한(리필 포함): 무거운 간격 30 + 리필 주기 25 + 여유 15.
const MAX_GAP_AFTER_DEBUT_SEC = ROSTER_ROTATION_HEAVY_INTERVAL_SEC + REFILL_EVERY_SEC + 15

function isRotatableRow(evt) {
  return !evt.formation && !evt.rewardEvent && !isBossType(evt.type)
}

function isTankCountedFormationRow(evt) {
  return Boolean(evt.formation) && !evt.rewardEvent && !isBossType(evt.type)
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

// options = createRosterRotation 옵션(예: tankReplaceEvery: 0 = 탱커 감축 끔).
function simulate(stageId, { rotation = true, scheduled = true, refillEverySec = REFILL_EVERY_SEC, durationSec = DURATION_SEC, options = {} } = {}) {
  const state = rotation ? createRosterRotation(stageId, { hpOf, ...options }) : null
  const moments = [
    ...(scheduled ? scheduledMoments(stageId, durationSec) : []),
    ...refillMoments(durationSec, refillEverySec),
  ].sort((a, b) => a.sec - b.sec)
  const spawns = []
  for (const { sec, evt, count } of moments) {
    for (let index = 0; index < count; index += 1) {
      const authored = evt.mixedTypes ? evt.mixedTypes[index % evt.mixedTypes.length] : evt.type
      const type = isRotatableRow(evt)
        ? pickRosterRotationType(state, authored, sec)
        : isTankCountedFormationRow(evt) ? pickRosterTankType(state, authored, sec) : authored
      noteRosterRotationSpawn(state, type, sec)
      spawns.push({ sec, type, authored, formation: evt.formation ?? null, refill: Boolean(evt.refill) })
    }
  }
  return { spawns, state }
}

function typesInThird(spawns, [from, to]) {
  return new Set(spawns.filter((s) => s.sec >= from && s.sec < to).map((s) => s.type))
}

// 데뷔(작성된 첫 등장) 이후에 시작하는 3등분마다 그 종이 나왔는지. 빠진 칸을 "E37@80"처럼 돌려준다.
function missingThirdsAfterDebut(stageId, spawns, filter = () => true) {
  const debuts = getStageRotationDebuts(stageId)
  return Object.keys(debuts).filter(filter).flatMap((type) => THIRDS
    .filter((third) => third[0] >= debuts[type] && !typesInThird(spawns, third).has(type))
    .map((third) => `${type}@${third[0]}`))
}

function maxGapAfterDebut(stageId, spawns) {
  const debuts = getStageRotationDebuts(stageId)
  let worst = { gap: 0, type: null }
  for (const [type, debut] of Object.entries(debuts)) {
    const secs = [...new Set(spawns.filter((s) => s.type === type && s.sec >= debut).map((s) => s.sec))]
    let prev = debut
    for (const sec of [...secs, DURATION_SEC]) {
      if (sec - prev > worst.gap) worst = { gap: sec - prev, type, from: prev }
      prev = sec
    }
  }
  return worst
}

const countType = (spawns, type) => spawns.filter((s) => s.type === type).length

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
    // 스6: 확장 데이터 enemyIds(E19~E21) + 2026-11-14 표에 작성된 블록 좀비(E79·E71·E73 첫 등장, E76 스4 복습).
    expect(getStageRotationRoster('stage6')).toEqual(['E19', 'E79', 'E20', 'E21', 'E71', 'E73', 'E76'])
    expect(getStageRotationRoster('stage1')).not.toContain('E04')
    expect(getStageRotationDebuts('stage2')).toMatchObject({ E37: 5, E47: 60, E63: 72, E51: 144, E46: 184 })
    expect(getStageRotationDebuts('stage5')).toMatchObject({ E53: 5, E57: 24, E55: 184, E40: 216 })
  })

  it('감축 대상 탱커 = E05: 기본 잡몹 중 붉은 몸통(진홍 0x9a1818) + 고체력(70)인 정규 스폰 종', () => {
    expect(ROSTER_ROTATION_TANK_TYPE).toBe('E05')
    expect(ROSTER_ROTATION_TANK_REPLACE_EVERY).toBe(5)
    expect(ZOMBIE_PALETTE.E05.body).toBe(0x9a1818)
    expect(hpOf('E05')).toBe(70)
    // 같은 70hp인 E02는 보라색이다(붉은 계열이 아니다).
    expect(ZOMBIE_PALETTE.E02.body).toBe(0x7a28b8)
  })
})

describe.each(STAGES)('%s — 스테이지 전체 시간표 시뮬레이션', (stageId) => {
  const debuts = getStageRotationDebuts(stageId)

  it('데뷔 게이트: 어떤 종도 작성된 첫 등장보다 먼저 나오지 않는다(리필·탱커 교체 포함)', () => {
    for (const refillEverySec of [0, REFILL_EVERY_SEC]) {
      const { spawns } = simulate(stageId, { refillEverySec })
      for (const [type, debut] of Object.entries(debuts)) {
        const first = spawns.find((s) => s.type === type)
        expect(first?.sec ?? Infinity, `${stageId} ${type}`).toBeGreaterThanOrEqual(debut)
      }
    }
  })

  // 스6(E19~E21)은 원래 표가 이미 데뷔 뒤 3등분마다 세 종을 다 냈다 — 순환은 거의 손대지 않는 안전망이다.
  // (2026-11-14 블록 좀비는 스6에서도 한 행씩만 작성돼 순환 전에는 빠진다 — 그 재현은 다른 스테이지와 같다.)
  it('순환 전(작성된 표 + 리필)에는 데뷔 뒤 3등분에서 빠지는 신규 종이 있었다 — 고친 문제의 재현(스6 제외)', () => {
    const missing = missingThirdsAfterDebut(stageId, simulate(stageId, { rotation: false }).spawns)
    if (stageId === 'stage6') {
      expect(missing.filter((cell) => /^E(19|20|21)@/.test(cell))).toEqual([])
      expect(missing.length, 'stage6 블록 좀비 순환 전 누락').toBeGreaterThan(0)
    }
    else expect(missing.length, `${stageId} 순환 전 누락`).toBeGreaterThan(0)
  })

  it('스케줄 웨이브 + 리스폰 리필: 배분된 모든 종(사수 포함)이 데뷔 뒤 시작하는 3등분마다 다시 나온다', () => {
    expect(missingThirdsAfterDebut(stageId, simulate(stageId).spawns), stageId).toEqual([])
  })

  it('사수(탄을 쏘는 종)도 데뷔 뒤 3등분마다 돌아오고, 데뷔 뒤 순환으로 최소 1번은 다시 나온다', () => {
    const { spawns } = simulate(stageId)
    const shooters = getStageRotationRoster(stageId).filter((type) => ROSTER_ROTATION_SHOOTER_TYPES.has(type))
    expect(missingThirdsAfterDebut(stageId, spawns, (type) => ROSTER_ROTATION_SHOOTER_TYPES.has(type))).toEqual([])
    // 데뷔 + 간격 뒤에 정규 웨이브가 한 번 이상 남은 사수만(스1 E49·스4 E59·스5 E55처럼 184초 데뷔 종은 240초 전에 끝난다).
    for (const type of shooters.filter((t) => debuts[t] + ROSTER_ROTATION_HEAVY_INTERVAL_SEC + REFILL_EVERY_SEC <= DURATION_SEC)) {
      const rotated = spawns.filter((s) => s.type === type && s.authored !== type)
      expect(rotated.length, `${stageId} ${type}`).toBeGreaterThan(0)
    }
  })

  it(`데뷔 뒤 어떤 종도 ${MAX_GAP_AFTER_DEBUT_SEC}초 넘게 비지 않는다 — 리필 포함`, () => {
    const worst = maxGapAfterDebut(stageId, simulate(stageId).spawns)
    expect(worst.gap, `${stageId} ${worst.type} from ${worst.from}s`).toBeLessThanOrEqual(MAX_GAP_AFTER_DEBUT_SEC)
  })

  it('총 스폰 마릿수는 순환 전과 같다(1:1 교체)', () => {
    for (const refillEverySec of [0, REFILL_EVERY_SEC]) {
      const before = simulate(stageId, { rotation: false, refillEverySec })
      const after = simulate(stageId, { refillEverySec })
      expect(after.spawns.length).toBe(before.spawns.length)
    }
  })

  it(`한 웨이브(같은 시각)에 순환으로 들어간 사수는 ${ROSTER_ROTATION_MAX_SHOOTERS_PER_WAVE}마리를 넘지 않는다`, () => {
    const { spawns } = simulate(stageId)
    const bySec = new Map()
    for (const s of spawns) {
      if (s.type === s.authored || !ROSTER_ROTATION_SHOOTER_TYPES.has(s.type)) continue
      bySec.set(s.sec, (bySec.get(s.sec) ?? 0) + 1)
    }
    for (const [sec, n] of bySec) expect(n, `${stageId} ${sec}s`).toBeLessThanOrEqual(ROSTER_ROTATION_MAX_SHOOTERS_PER_WAVE)
  })

  it('형태 버스트의 위치·타입은 그대로(E05만 탱커 계수로 신규 종), 보스·코인·E06·크루는 그대로다', () => {
    const before = simulate(stageId, { rotation: false })
    const after = simulate(stageId)
    const keep = (s) => s.type === 'E06' || s.type === 'E08' || isBossType(s.type) || /^RZ/.test(s.type)
    const count = (list, pred) => list.spawns.filter(pred).length
    expect(count(after, keep)).toBe(count(before, keep))
    const formationBefore = before.spawns.filter((s) => s.formation)
    const formationAfter = after.spawns.filter((s) => s.formation)
    expect(formationAfter.length).toBe(formationBefore.length)
    formationAfter.forEach((s, index) => {
      if (formationBefore[index].type === ROSTER_ROTATION_TANK_TYPE) {
        expect(s.type === ROSTER_ROTATION_TANK_TYPE || getStageRotationRoster(stageId).includes(s.type), `${stageId} ${s.sec}s ${s.type}`).toBe(true)
      } else {
        expect(s.type).toBe(formationBefore[index].type)
      }
    })
  })

  it('탱커 감축: E05는 감축을 끈 같은 판의 80%(±1), 총 마릿수 그대로, 바뀐 자리는 전부 데뷔한 신규 종', () => {
    for (const refillEverySec of [0, REFILL_EVERY_SEC]) {
      const noCut = simulate(stageId, { refillEverySec, options: { tankReplaceEvery: 0 } })
      const cut = simulate(stageId, { refillEverySec })
      expect(cut.spawns.length).toBe(noCut.spawns.length)
      const baseline = countType(noCut.spawns, 'E05')
      const after = countType(cut.spawns, 'E05')
      expect(Math.abs(after - baseline * 0.8), `${stageId} refill=${refillEverySec} E05 ${baseline} → ${after}`).toBeLessThanOrEqual(1)
      // 계수: 탱커 자리 = E05로 낸 것 + 바꾼 것, 바꾼 것 = 자리 / 5(내림) — 데뷔한 종이 없던 자리는 E05로 남는다.
      expect(cut.state.tankSlots).toBe(after + cut.state.tankReplacements)
      expect(cut.state.tankReplacements).toBeLessThanOrEqual(Math.floor(cut.state.tankSlots / 5))
      const replaced = cut.spawns.filter((s) => s.authored === 'E05' && s.type !== 'E05')
      for (const s of replaced) {
        expect(getStageRotationRoster(stageId), `${stageId} ${s.sec}s ${s.type}`).toContain(s.type)
        expect(s.sec, `${stageId} ${s.type}`).toBeGreaterThanOrEqual(debuts[s.type])
      }
    }
  })
})

describe('다채로운 웨이브 — 데뷔한 신규 종이 여럿이면 한 정규 웨이브에 여러 종이 섞인다', () => {
  it.each(['stage1', 'stage2', 'stage3', 'stage4', 'stage5'])('%s: 120초 이후 10마리 이상 정규 웨이브(리필·반복 증원·정규 행)마다 서로 다른 신규 종 2종 이상', (stageId) => {
    const { spawns } = simulate(stageId)
    const roster = new Set(getStageRotationRoster(stageId))
    const waves = new Map()
    for (const s of spawns) {
      if (s.sec < 120 || s.formation || !['E01', 'E02', 'E03', 'E04', 'E05', 'E07'].includes(s.authored)) continue
      const wave = waves.get(s.sec) ?? { slots: 0, types: new Set() }
      wave.slots += 1
      if (roster.has(s.type) && s.type !== s.authored) wave.types.add(s.type)
      waves.set(s.sec, wave)
    }
    const big = [...waves].filter(([, wave]) => wave.slots >= 10)
    expect(big.length, stageId).toBeGreaterThan(0)
    for (const [sec, wave] of big) expect(wave.types.size, `${stageId} ${sec}s ${[...wave.types].join(',')}`).toBeGreaterThanOrEqual(2)
  })
})

describe('스2·스3 오프닝 전용이던 E37(가까이 가면 사선으로 들이받는 좀비)', () => {
  // 순환 전: 스3은 5초 오프닝 2기가 전부였다. 스2는 5초 5기 + 보스전 150초 2기 + 탈출구 개방 뒤 216초 1기.
  const moments = (spawns) => [...new Set(spawns.filter((s) => s.type === 'E37').map((s) => s.sec))]
  it.each(['stage2', 'stage3'])('%s: 리스폰 포함 시 데뷔 뒤 약 20~30초마다(최대 공백 60초 이하) 다시 나온다', (stageId) => {
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
  it('스3은 스케줄 웨이브만으로도(25초·10초 반복 증원) 다시 나온다', () => {
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
  const fresh = (stageId, options = {}) => {
    const state = createRosterRotation(stageId, { hpOf, ...options })
    state.due.fill(Infinity)
    return state
  }

  it('host가 아닌 타입(E06·E08·보스·크루)은 절대 바꾸지 않는다', () => {
    const state = createRosterRotation('stage5', { hpOf })
    for (const type of ['E06', 'E08', 'B10', 'RZT']) expect(pickRosterRotationType(state, type, 999)).toBe(type)
    for (const type of ['E06', 'E08', 'B10', 'E01']) expect(pickRosterTankType(state, type, 999)).toBe(type)
  })

  it('데뷔 게이트: 첫 기한 = 작성된 첫 등장 + 간격(20초, 32hp 이상 30초)', () => {
    const state = createRosterRotation('stage2', { hpOf })
    const at = (type) => state.due[state.types.indexOf(type)]
    expect(at('E37')).toBe(5 + ROSTER_ROTATION_INTERVAL_SEC)
    expect(at('E63')).toBe(72 + ROSTER_ROTATION_HEAVY_INTERVAL_SEC)
    expect(pickRosterRotationType(state, 'E01', 24)).toBe('E01')
    expect(pickRosterRotationType(state, 'E01', 25)).toBe('E37')
  })

  it('기한이 가장 이른 종부터(같은 HP는 동률일 때만 우선), HP가 다른 host로도 바로 바꾼다(유예·쿨다운 없음)', () => {
    const state = fresh('stage2')
    const e37 = state.types.indexOf('E37') // hp 8
    state.due[e37] = 10
    expect(pickRosterRotationType(state, 'E02', 12)).toBe('E37') // 70hp host도 바로
    const tie = fresh('stage2')
    tie.due[tie.types.indexOf('E37')] = 10
    tie.due[tie.types.indexOf('E38')] = 10 // 10hp
    expect(pickRosterRotationType(tie, 'E01', 12)).toBe('E37') // 동률이면 8hp host = 같은 HP 우선
    const older = fresh('stage2')
    older.due[older.types.indexOf('E37')] = 10
    older.due[older.types.indexOf('E38')] = 9 // 더 오래 기다림
    expect(pickRosterRotationType(older, 'E01', 12)).toBe('E38') // 굶는 종이 없게 기한 순이 먼저
    noteRosterRotationSpawn(older, 'E38', 12)
    expect(older.due[older.types.indexOf('E38')]).toBe(12 + ROSTER_ROTATION_INTERVAL_SEC)
  })

  it('사수도 HP가 다른 host로 바로 돌아온다(2차의 계층 밖 금지 해제)', () => {
    const state = fresh('stage5')
    const e57 = state.types.indexOf('E57') // 70hp 사수
    const e70 = state.types.indexOf('E70') // 10hp 사수
    state.due[e57] = 0
    state.due[e70] = 0
    expect(pickRosterRotationType(state, 'E05', 100)).toBe('E57') // 같은 HP 우선
    expect(pickRosterRotationType(state, 'E01', 100)).toBe('E70') // 다른 HP host도 받는다
  })

  it(`한 웨이브(같은 시각)에 사수는 ${ROSTER_ROTATION_MAX_SHOOTERS_PER_WAVE}마리까지, 같은 종은 한 번만`, () => {
    const state = fresh('stage5')
    const shooters = state.types.filter((type) => ROSTER_ROTATION_SHOOTER_TYPES.has(type))
    expect(shooters.length).toBeGreaterThan(ROSTER_ROTATION_MAX_SHOOTERS_PER_WAVE)
    for (const type of shooters) state.due[state.types.indexOf(type)] = 0
    const picks = Array.from({ length: shooters.length * 2 }, () => pickRosterRotationType(state, 'E01', 100))
    const shot = picks.filter((type) => ROSTER_ROTATION_SHOOTER_TYPES.has(type))
    expect(shot.length).toBe(ROSTER_ROTATION_MAX_SHOOTERS_PER_WAVE)
    expect(new Set(shot).size).toBe(ROSTER_ROTATION_MAX_SHOOTERS_PER_WAVE)
    // 다음 웨이브는 상한이 풀린다.
    expect(shooters).toContain(pickRosterRotationType(state, 'E01', 101))
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

  // 탱커 계수만 따로 본다(다채로움 몫 끔). 둘을 함께 켠 판은 위 스테이지 시뮬레이션이 본다.
  it('탱커 계수: 순환 뒤 E05로 남은 정규 스폰 5번째마다 1마리가 데뷔한 신규 종(가장 오래 안 나온 종)으로', () => {
    const state = fresh('stage4', { varietyEvery: 0 })
    // 한 웨이브(같은 시각)에 10마리: 먼저 다 고르고(예약) 실제 스폰 때 확정한다(Enemies.jsx addEnemies 순서).
    const seq = Array.from({ length: 10 }, () => pickRosterRotationType(state, 'E05', 200))
    for (const type of seq) noteRosterRotationSpawn(state, type, 200)
    expect(seq.filter((type) => type === 'E05').length).toBe(8)
    expect(seq[4]).not.toBe('E05')
    expect(seq[9]).not.toBe('E05')
    expect(seq[4]).not.toBe(seq[9]) // 같은 웨이브에서 같은 종을 두 번 쓰지 않는다
    expect(state.tankSlots).toBe(10)
    expect(state.tankReplacements).toBe(2)
  })

  it('탱커 계수: 데뷔한 신규 종이 없으면 E05 그대로, 스폰 안 된 선택은 계수를 소모하지 않는다', () => {
    const early = fresh('stage1', { varietyEvery: 0 })
    for (let n = 0; n < 10; n += 1) {
      const type = pickRosterRotationType(early, 'E05', 10) // 스1 첫 데뷔는 24초
      expect(type).toBe('E05')
      noteRosterRotationSpawn(early, type, 10)
    }
    expect(early.tankReplacements).toBe(0)
    const state = fresh('stage4', { varietyEvery: 0 })
    for (let n = 0; n < 4; n += 1) noteRosterRotationSpawn(state, pickRosterRotationType(state, 'E05', 200), 200)
    expect(pickRosterRotationType(state, 'E05', 201)).not.toBe('E05') // 5번째 — 버려짐(확정 안 함)
    expect(pickRosterRotationType(state, 'E05', 202)).not.toBe('E05') // 다음 시각에도 여전히 5번째 자리
  })

  it('탱커 계수: 형태 버스트 E05도 같은 계수를 탄다(pickRosterTankType), tankReplaceEvery 0이면 끈다', () => {
    const state = fresh('stage4')
    const seq = Array.from({ length: 5 }, () => {
      const type = pickRosterTankType(state, 'E05', 120)
      noteRosterRotationSpawn(state, type, 120)
      return type
    })
    expect(seq.slice(0, 4)).toEqual(['E05', 'E05', 'E05', 'E05'])
    expect(seq[4]).not.toBe('E05')
    const off = fresh('stage4', { tankReplaceEvery: 0 })
    for (let n = 0; n < 10; n += 1) expect(pickRosterTankType(off, 'E05', 120)).toBe('E05')
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

  it('스1 150초: 기한이 온 신규 종이 한 묶음에 여러 종 섞이고 마릿수는 20 그대로다', () => {
    const { batch } = build('stage1', 150)
    // 데뷔+20초(70hp E62·E56은 +30초)가 지난 종: E34(24) E66·E82(60) E35(72) E36·E77(108) E62(120→150) — 기한 순으로 E07 자리 1~7.
    // E56(144 데뷔, 기한 174)은 기한 전이지만 10번째 자리(다채로움 몫, 5번째마다)로 들어간다. E49·E78(184)는 데뷔 전.
    expect(count(batch)).toEqual({ E07: 2, E34: 1, E66: 1, E82: 1, E35: 1, E36: 1, E77: 1, E62: 1, E56: 1, E01: 10 })
  })

  it('리필 묶음을 버리면(20마리 미만 등) 시계가 그대로라 다음 리필에 같은 종이 다시 섞인다', () => {
    const first = build('stage1', 150)
    const again = buildLowDensityReinforcementBatch(first.cache, 20, () => 0.25) // 같은 캐시·같은 시각, 확정(note) 없음
    expect(count(again)).toEqual({ E07: 10, E01: 10 }) // 같은 시각엔 예약이 남아 중복 섞지 않는다
    first.cache.rosterRotationClock = () => 151
    expect(count(buildLowDensityReinforcementBatch(first.cache, 20, () => 0.25))).toEqual({ E07: 2, E34: 1, E66: 1, E82: 1, E35: 1, E36: 1, E77: 1, E62: 1, E56: 1, E01: 10 })
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

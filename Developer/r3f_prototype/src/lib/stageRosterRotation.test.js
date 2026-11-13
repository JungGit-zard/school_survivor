import { describe, it, expect } from 'vitest'
import { ENEMY_STATS } from '../components/Enemy.jsx'
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
import { getStageConfig } from './stageConfig.js'
import {
  ROSTER_ROTATION_HEAVY_INTERVAL_SEC,
  ROSTER_ROTATION_INTERVAL_SEC,
  ROSTER_ROTATION_TIER_GRACE_SEC,
  createRosterRotation,
  getStageRotationRoster,
  noteRosterRotationSpawn,
  pickRosterRotationType,
} from './stageRosterRotation.js'

// 2026-11-14 Terry: "스테이지에 배분된 좀비들이 골고루 분포되게" + "정규 리스폰 웨이브에도 골고루 섞어".
// 런타임(Enemies.jsx)과 같은 규칙으로 스테이지 전체 시간표를 결정론적으로 돌린다:
//   - 스케줄 웨이브: 버스트 표 단발 행 + 반복 증원 tick(탈출 뒤 +10% 성장 포함). 형태·크루·보스·보상 행은 작성 그대로.
//   - 리스폰 웨이브: 저밀도 리필(E07×10 + E01×10)을 REFILL_EVERY_SEC마다 한 번.
// 순환이 켜지면 정규 행의 host 1마리씩이 pickRosterRotationType을 거친다(런타임과 같은 함수).

const STAGES = ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6']
const DURATION_SEC = 240
const THIRDS = [[0, 80], [80, 160], [160, 240]]
const REFILL_EVERY_SEC = 25
const hpOf = (type) => ENEMY_STATS[type]?.hp ?? 0

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

describe('스테이지 로스터 = 버스트 표에 배분된 신규 종', () => {
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
  })
})

describe.each(STAGES)('%s — 스테이지 전체 시간표 시뮬레이션', (stageId) => {
  const roster = getStageRotationRoster(stageId)

  // 스6(E19~E21)은 원래 표가 이미 3등분마다 세 종을 다 냈다 — 순환은 거의 손대지 않는 안전망이다.
  it('순환 전(작성된 표 + 리필)에는 3등분 중 어딘가에서 빠지는 신규 종이 있었다 — 고친 문제의 재현(스6 제외)', () => {
    const { spawns } = simulate(stageId, { rotation: false })
    const missing = roster.filter((type) => THIRDS.some((third) => !typesInThird(spawns, third).has(type)))
    if (stageId === 'stage6') expect(missing).toEqual([])
    else expect(missing.length, `${stageId} 순환 전 누락`).toBeGreaterThan(0)
  })

  it('스케줄 웨이브 + 리스폰 리필: 배분된 모든 종이 처음·중간·끝 3등분 각각에 나온다', () => {
    const { spawns } = simulate(stageId)
    for (const third of THIRDS) {
      const seen = typesInThird(spawns, third)
      for (const type of roster) expect(seen.has(type), `${stageId} ${type} @${third.join('-')}s`).toBe(true)
    }
  })

  // 스케줄 웨이브만(리필 없음): S1·S3·S6은 정규 행 host가 충분해 3등분 전부를 덮는다.
  // S2·S4·S5는 버스트 표의 대부분이 형태 버스트(ring/pincer/swarm)·E04 벽·크루·전교 호출이라
  // (손대지 않기로 한 특수 이벤트) 맞바꿀 정규 host가 3등분마다 로스터 수보다 적다 — 예: 스4 0~80초 정규 host 7기 vs 로스터 11종.
  // 이 세 스테이지는 리스폰(리필·지배 스웜·반복 증원) 흐름이 나머지를 채운다(위·아래 단언). 여기서는 순환 전보다 빈칸이 확실히 줄었는지만 본다.
  it('스케줄 웨이브만(리필 없음): host가 충분한 스테이지는 3등분 전부, 나머지도 빈칸이 순환 전보다 준다', () => {
    const missing = (spawns) => roster.flatMap((type) => THIRDS.filter((third) => !typesInThird(spawns, third).has(type)).map((third) => `${type}@${third[0]}`))
    const after = missing(simulate(stageId, { refillEverySec: 0 }).spawns)
    if (['stage1', 'stage3', 'stage6'].includes(stageId)) {
      expect(after, stageId).toEqual([])
    } else {
      const before = missing(simulate(stageId, { rotation: false, refillEverySec: 0 }).spawns)
      expect(after.length, `${stageId} ${after.join(' ')}`).toBeLessThan(before.length)
    }
  })

  it('리스폰 리필만(버스트 표를 캐치업으로 다 써 버린 경우)으로도 3등분 각각에 모든 종이 섞인다', () => {
    const { spawns } = simulate(stageId, { scheduled: false })
    for (const third of THIRDS) {
      const seen = typesInThird(spawns, third)
      for (const type of roster) expect(seen.has(type), `${stageId} ${type} @${third.join('-')}s`).toBe(true)
    }
  })

  it('어떤 종도 가벼운 순환 간격(40초)의 2배 넘게 비지 않는다(골고루) — 리필 포함', () => {
    const { spawns } = simulate(stageId)
    for (const type of roster) {
      const secs = [...new Set(spawns.filter((s) => s.type === type).map((s) => s.sec))]
      let prev = 0
      for (const sec of [...secs, DURATION_SEC]) {
        expect(sec - prev, `${stageId} ${type} gap ending ${sec}s`).toBeLessThanOrEqual(ROSTER_ROTATION_INTERVAL_SEC * 2)
        prev = sec
      }
    }
  })

  // HP 변화 상한 12%: 스5(19종 중 70hp 5종, 정규 행에 E02/E05 host 없음)가 +10.9%로 가장 크다 — 보고서 밸런스 노트 참조.
  it('총 스폰 마릿수는 순환 전과 같다(1:1 교체), 총 HP 변화는 ±12% 안', () => {
    const before = simulate(stageId, { rotation: false })
    const after = simulate(stageId)
    expect(after.spawns.length).toBe(before.spawns.length)
    const delta = totalHp(after.spawns) / totalHp(before.spawns) - 1
    expect(Math.abs(delta), `${stageId} HP delta ${(delta * 100).toFixed(1)}%`).toBeLessThanOrEqual(0.12)
  })

  it('형태 버스트·보스·코인·E06·크루는 순환이 건드리지 않고, E04는 32hp 원거리 신규 종으로만 바뀐다', () => {
    const before = simulate(stageId, { rotation: false })
    const after = simulate(stageId)
    const keep = (s) => s.type === 'E06' || s.type === 'E08' || isBossType(s.type) || /^RZ/.test(s.type)
    const count = (list, pred) => list.spawns.filter(pred).length
    expect(count(after, keep)).toBe(count(before, keep))
    const ranged32 = (s) => s.type === 'E04' || (hpOf(s.type) === hpOf('E04') && s.type !== 'E04')
    expect(count(after, ranged32)).toBeGreaterThanOrEqual(count(before, (s) => s.type === 'E04'))
    // 형태 버스트 행은 한 마리도 바뀌지 않는다.
    const formationTypes = (list) => list.spawns.filter((s) => s.formation).map((s) => s.type).join(',')
    expect(formationTypes(after)).toBe(formationTypes(before))
  })
})

describe('스2·스3 오프닝 전용이던 E37(가까이 가면 사선으로 들이받는 좀비)', () => {
  // 순환 전: 스3은 5초 오프닝 2기가 전부였다. 스2는 5초 5기 + 보스전 150초 2기 + 탈출구 개방 뒤 216초 1기라
  // 바로 탈출하는 판에서는 사실상 오프닝과 보스전 한복판에서만 보였다(등장 시점 3곳).
  const moments = (spawns) => new Set(spawns.filter((s) => s.type === 'E37').map((s) => s.sec)).size
  it.each(['stage2', 'stage3'])('%s: 순환 뒤에는 중간·끝 3등분에도 다시 나오고 등장 시점이 늘어난다', (stageId) => {
    const before = simulate(stageId, { rotation: false, refillEverySec: 0 })
    expect(getStageRotationRoster(stageId)).toContain('E37')
    if (stageId === 'stage3') expect(THIRDS.slice(1).every((third) => !typesInThird(before.spawns, third).has('E37'))).toBe(true)
    for (const refillEverySec of [0, REFILL_EVERY_SEC]) {
      expect(moments(simulate(stageId, { refillEverySec }).spawns), `${stageId} refill=${refillEverySec}`).toBeGreaterThanOrEqual(moments(before.spawns) + (refillEverySec ? 3 : 1))
      const after = simulate(stageId, { refillEverySec })
      expect(typesInThird(after.spawns, THIRDS[1]).has('E37'), `${stageId} mid refill=${refillEverySec}`).toBe(true)
      expect(typesInThird(after.spawns, THIRDS[2]).has('E37'), `${stageId} late refill=${refillEverySec}`).toBe(true)
    }
  })
})

describe('탈출 뒤(오버타임 포함) 리스폰도 계속 섞인다', () => {
  it('240초 이후 오버타임(+10%/회차) 흐름에서도 모든 종이 다시 나오고 마릿수는 그대로다', () => {
    for (const stageId of STAGES) {
      const state = createRosterRotation(stageId, { hpOf })
      const seen = new Map()
      let units = 0
      for (let sec = 240; sec < 400; sec += 30) {
        for (let index = 0; index < postExitWaveCount(30, (sec - 240) / 30); index += 1) {
          const host = ['E01', 'E02', 'E03', 'E05', 'E07'][index % 5]
          const type = pickRosterRotationType(state, host, sec)
          units += 1
          if (!seen.has(type)) seen.set(type, sec)
        }
      }
      expect(units).toBe([0, 1, 2, 3, 4, 5].reduce((n, i) => n + postExitWaveCount(30, i), 0))
      for (const type of getStageRotationRoster(stageId)) expect(seen.has(type), `${stageId} ${type}`).toBe(true)
    }
  })
})

describe('순환 규칙 단위', () => {
  it('host가 아닌 타입(E06·E08·보스·크루)은 절대 바꾸지 않는다', () => {
    const state = createRosterRotation('stage5', { hpOf })
    for (const type of ['E06', 'E08', 'B10', 'RZT']) expect(pickRosterRotationType(state, type, 999)).toBe(type)
  })

  it('같은 HP host를 먼저 쓰고, 유예 전에는 다른 HP host로 바꾸지 않는다', () => {
    const state = createRosterRotation('stage2', { hpOf })
    state.due.fill(Infinity)
    const e37 = state.types.indexOf('E37') // hp 8 = E01
    state.due[e37] = 10
    expect(pickRosterRotationType(state, 'E02', 12)).toBe('E02') // 70hp host, 유예 전
    expect(pickRosterRotationType(state, 'E01', 12)).toBe('E37')
    expect(state.due[e37]).toBe(12 + ROSTER_ROTATION_INTERVAL_SEC)
    state.due[e37] = 10
    expect(pickRosterRotationType(state, 'E02', 10 + ROSTER_ROTATION_TIER_GRACE_SEC)).toBe('E37') // 유예 지난 뒤에는 아무 host
  })

  it('E04 host는 같은 32hp 원거리 신규 종(E63 등)하고만 바뀌고, 유예가 지나도 다른 종은 받지 않는다', () => {
    const state = createRosterRotation('stage2', { hpOf })
    state.due.fill(Infinity)
    const e37 = state.types.indexOf('E37')
    const e63 = state.types.indexOf('E63')
    expect(hpOf('E63')).toBe(hpOf('E04'))
    state.due[e37] = 0
    expect(pickRosterRotationType(state, 'E04', 100)).toBe('E04')
    state.due[e63] = 0
    expect(pickRosterRotationType(state, 'E04', 100)).toBe('E63')
    expect(state.due[e63]).toBe(100 + ROSTER_ROTATION_HEAVY_INTERVAL_SEC)
  })

  it('작성된 등장도 기한을 다시 잡아 최근에 나온 종을 더 끼워 넣지 않는다', () => {
    const state = createRosterRotation('stage2', { hpOf })
    state.due.fill(Infinity)
    const e37 = state.types.indexOf('E37')
    state.due[e37] = 0
    noteRosterRotationSpawn(state, 'E37', 5)
    expect(pickRosterRotationType(state, 'E01', 20)).toBe('E01')
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

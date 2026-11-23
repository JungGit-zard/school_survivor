import { describe, expect, it } from 'vitest'
import {
  SANTA_GIFT_SPAWN_SECS,
  SANTA_GIFT_STATS,
  SANTA_GIFT_TYPE,
  SANTA_GIFT_TYPE_CODE,
  SANTA_KILL_BONUS,
  SANTA_RUNTIME_EVENTS,
  SANTA_SLEIGH_SPAWN_SECS,
  SANTA_SLEIGH_STATS,
  SANTA_SLEIGH_TYPE,
  SANTA_SLEIGH_TYPE_CODE,
  getSantaRuntimeEvents,
  isSantaEvent,
  isSantaEventActive,
} from './santaEvent.js'
import { getRuntimeSpawnEventsForStage, isRepeatingBurstEvent, shouldRetryRewardBurst } from './burstEvents.js'
import { ENEMY_TYPE_CODES, enemyTypeFromCode, enemyTypeToCode } from './enemyEntityPool.js'
import {
  ENEMY_RUNTIME_DAMAGE,
  ENEMY_RUNTIME_HP,
  ENEMY_RUNTIME_SPEED,
  ENEMY_STATE_COIN_FLEE,
  ENEMY_STATE_COIN_LURE,
  ENEMY_EVENT_DESPAWN,
  E08_COIN_HOME_RETURN_RADIUS,
  createEnemySimulationRuntime,
  ignoresObstacles,
} from './enemySimulation.js'
import { createEnemyEntityPool } from './enemyEntityPool.js'
import { isWaveExemptType } from './waveComposition.js'

// 로컬 시각 생성자 — 테스트 머신 시간대와 무관하게 "플레이어 기기 시계" 의미를 그대로 검사한다.
const local = (y, m, d, h = 0, min = 0, s = 0, ms = 0) => new Date(y, m - 1, d, h, min, s, ms)
const RELEASED = ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6']

describe('santa event date gate (local clock, through 2026-12-25)', () => {
  it('is active from today through the last millisecond of 12-25 local', () => {
    expect(isSantaEventActive(local(2026, 11, 24, 9))).toBe(true)
    expect(isSantaEventActive(local(2026, 12, 1))).toBe(true)
    expect(isSantaEventActive(local(2026, 12, 25, 0, 0))).toBe(true)
    expect(isSantaEventActive(local(2026, 12, 25, 23, 59, 59, 999))).toBe(true)
  })

  it('turns off at 12-26 00:00 local and stays off afterwards', () => {
    expect(isSantaEventActive(local(2026, 12, 26, 0, 0, 0, 0))).toBe(false)
    expect(isSantaEventActive(local(2026, 12, 26, 12))).toBe(false)
    expect(isSantaEventActive(local(2027, 1, 1))).toBe(false)
  })

  it('treats an invalid date as inactive', () => {
    expect(isSantaEventActive(new Date(Number.NaN))).toBe(false)
    expect(isSantaEventActive('2026-12-01')).toBe(false)
  })
})

describe('santa runtime schedule', () => {
  const ACTIVE = local(2026, 12, 10, 20)
  const AFTER = local(2026, 12, 26, 0, 0, 1)

  it('adds XSG at 47/122/196 s and XSL at 78/202 s on released stages 1-6 while active', () => {
    for (const stageId of RELEASED) {
      const events = getSantaRuntimeEvents(stageId, ACTIVE)
      expect(events.filter((e) => e.type === SANTA_GIFT_TYPE).map((e) => e.sec), stageId).toEqual([47, 122, 196])
      expect(events.filter((e) => e.type === SANTA_SLEIGH_TYPE).map((e) => e.sec), stageId).toEqual([78, 202])
      for (const evt of events) {
        expect(evt.count).toBe(1)
        expect(isSantaEvent(evt)).toBe(true)
        expect(isRepeatingBurstEvent(evt)).toBe(false)
        // 자리를 못 받으면 E08처럼 30초 창 안에서만 재시도한다.
        expect(shouldRetryRewardBurst(evt, false, evt.sec + 1)).toBe(true)
        expect(shouldRetryRewardBurst(evt, false, evt.sec + 30)).toBe(false)
      }
    }
  })

  it('adds nothing after the window, so stages behave exactly as today', () => {
    for (const stageId of RELEASED) expect(getSantaRuntimeEvents(stageId, AFTER)).toEqual([])
  })

  it('never reaches draft stages 7-10 or unknown/racer ids, even while active', () => {
    for (const stageId of ['stage7', 'stage8', 'stage9', 'stage10', 'sltera', 'tutorial', undefined, null]) {
      expect(getSantaRuntimeEvents(stageId, ACTIVE), String(stageId)).toEqual([])
    }
  })

  it('keeps the base spawn tables untouched (santa rows are only appended at run start)', () => {
    for (const stageId of RELEASED) {
      expect(getRuntimeSpawnEventsForStage(stageId).some((e) => e.type === SANTA_GIFT_TYPE || e.type === SANTA_SLEIGH_TYPE)).toBe(false)
    }
  })

  it('does not land on the same second as any existing one-shot burst on stages 1-6', () => {
    for (const stageId of RELEASED) {
      const taken = new Set(getRuntimeSpawnEventsForStage(stageId).filter((e) => !isRepeatingBurstEvent(e)).map((e) => e.sec))
      for (const sec of [...SANTA_GIFT_SPAWN_SECS, ...SANTA_SLEIGH_SPAWN_SECS]) expect(taken.has(sec), `${stageId}@${sec}`).toBe(false)
    }
    expect(SANTA_RUNTIME_EVENTS).toHaveLength(5)
  })

  it('stays outside the wave-composition rules like E08', () => {
    expect(isWaveExemptType(SANTA_GIFT_TYPE)).toBe(true)
    expect(isWaveExemptType(SANTA_SLEIGH_TYPE)).toBe(true)
  })
})

describe('santa type registration', () => {
  it('appends XSG=113 and XSL=114 to the pool type table', () => {
    expect(ENEMY_TYPE_CODES.XSG).toBe(SANTA_GIFT_TYPE_CODE)
    expect(ENEMY_TYPE_CODES.XSL).toBe(SANTA_SLEIGH_TYPE_CODE)
    expect(enemyTypeToCode('XSG')).toBe(113)
    expect(enemyTypeToCode('XSL')).toBe(114)
    expect(enemyTypeFromCode(113)).toBe('XSG')
    expect(enemyTypeFromCode(114)).toBe('XSL')
    expect(SANTA_KILL_BONUS).toEqual({ textbook: 0, gold: 2 })
  })

  it('fills the runtime tables from the santa stats', () => {
    expect(ENEMY_RUNTIME_HP[113]).toBe(Math.fround(SANTA_GIFT_STATS.hp))
    expect(ENEMY_RUNTIME_SPEED[113]).toBe(Math.fround(SANTA_GIFT_STATS.speed))
    expect(ENEMY_RUNTIME_DAMAGE[113]).toBe(0)
    expect(ENEMY_RUNTIME_HP[114]).toBe(Math.fround(SANTA_SLEIGH_STATS.hp))
    expect(ENEMY_RUNTIME_SPEED[114]).toBe(Math.fround(SANTA_SLEIGH_STATS.speed))
    expect(ENEMY_RUNTIME_DAMAGE[114]).toBe(Math.fround(SANTA_SLEIGH_STATS.damage))
    expect(ignoresObstacles(114)).toBe(true)
    expect(ignoresObstacles(113)).toBe(false)
  })
})

function spawn(pool, type, x, z, overrides = {}) {
  return pool.spawn({ type, x, y: 0, z, hp: 100, maxHp: 100, visualScale: 1, spawnTimer: 300, ...overrides })
}
const ctx = (overrides = {}) => ({ delta: 1 / 60, playerX: 0, playerZ: 0, halfX: 12, halfZ: 12, elapsedSec: 100, ...overrides })

describe('santa behaviour in the pooled simulation', () => {
  it('XSG wanders near home, flees once it spots Rosari, deals no contact damage and is leashed back home', () => {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const santa = spawn(pool, 'XSG', 6, 0)
    for (let f = 0; f < 60; f += 1) runtime.step(pool, ctx({ elapsedSec: 100 + f / 60 }))
    expect(pool.state[santa.index]).toBe(ENEMY_STATE_COIN_LURE)
    expect(pool.active[santa.index]).toBe(1)

    let damage = 0
    const onContact = (_i, _g, _x, _y, _z, value) => { damage += value }
    // Rosari walks right next to it → it runs away.
    runtime.step(pool, ctx({ playerX: 3.5, playerZ: 0, elapsedSec: 102, onContact }))
    expect(pool.state[santa.index]).toBe(ENEMY_STATE_COIN_FLEE)
    const x0 = pool.posX[santa.index]
    for (let f = 0; f < 30; f += 1) runtime.step(pool, ctx({ playerX: 3.5, playerZ: 0, elapsedSec: 102 + f / 60, onContact }))
    expect(pool.posX[santa.index]).toBeGreaterThan(x0)
    expect(damage).toBe(0)

    // Rosari leaves → it walks back to its home ring instead of escaping for good.
    for (let f = 0; f < 60 * 20; f += 1) runtime.step(pool, ctx({ playerX: -11, playerZ: -11, elapsedSec: 104 + f / 60 }))
    expect(pool.active[santa.index]).toBe(1)
    expect(pool.state[santa.index]).toBe(ENEMY_STATE_COIN_LURE)
    expect(Math.hypot(pool.posX[santa.index] - pool.homeX[santa.index], pool.posZ[santa.index] - pool.homeZ[santa.index]))
      .toBeLessThanOrEqual(E08_COIN_HOME_RETURN_RADIUS + 0.05)
  })

  it('XSL runs straight down its lane like the run crew, hits on contact and leaves (no reward) past the far edge', () => {
    const pool = createEnemyEntityPool()
    const runtime = createEnemySimulationRuntime()
    const sleigh = spawn(pool, 'XSL', 0, -10, { runDirX: 0, runDirZ: 1 })
    let damage = 0
    let despawned = 0
    const onContact = (_i, _g, _x, _y, _z, value) => { damage += value }
    const onDespawn = () => { despawned += 1 }
    runtime.step(pool, ctx({ playerX: 5, playerZ: 0, onDespawn }))
    expect(pool.velZ[sleigh.index]).toBeCloseTo(SANTA_SLEIGH_STATS.speed, 4)
    expect(pool.velX[sleigh.index]).toBe(0)
    // Player standing in the lane takes the crew-runner contact damage.
    for (let f = 0; f < 60 * 10 && damage === 0; f += 1) runtime.step(pool, ctx({ playerX: 0, playerZ: pool.posZ[sleigh.index] + 0.2, onContact, onDespawn }))
    expect(damage).toBe(SANTA_SLEIGH_STATS.damage)
    for (let f = 0; f < 60 * 40 && pool.active[sleigh.index]; f += 1) runtime.step(pool, ctx({ playerX: 8, playerZ: 0, onDespawn }))
    expect(pool.active[sleigh.index]).toBe(0)
    expect(despawned).toBe(1)
    expect(ENEMY_EVENT_DESPAWN).toBeGreaterThan(0)
  })
})
